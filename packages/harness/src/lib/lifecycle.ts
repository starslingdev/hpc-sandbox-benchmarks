/**
 * Lifecycle & control-plane measurement — the harness-measured Dimensions PTS cannot see.
 *
 * A PTS profile times work done INSIDE an already-running sandbox; it is blind to how fast a provider
 * spawns, execs, snapshots, and tears a sandbox down, and to how quickly its control-plane API answers.
 * This module times those provider SDK calls directly and labels each timing with the matching
 * {@link HARNESS_METRIC_IDS} id, so a {@link RawRun}'s `operation` is a catalogued Metric id by
 * construction — the harness-side analogue of the PTS `<Result>`→id mapping.
 *
 * {@link measureLifecycle} drives ONE cold-start cycle (spawn → exec → control-plane probes → snapshot
 * → teardown) against a structural {@link LifecycleCompute}, so it is unit-testable against a fake with
 * no real SDK. Spawn is the bookend that must succeed (a failure has nothing to tear down, so it
 * rejects); every middle step is best-effort (a flaky exec/probe records a skip, never losing the
 * spawn/teardown samples); teardown always runs in `finally` and never throws out of it. Repeat the
 * cycle for a cold-start distribution — that is what {@link benchmarkLifecycle} (in index.ts) does.
 */
import type { Aggregates, HarnessMetricId, RawRun, SkipMarker } from "@sandbox-benchmarks/schema";
import { aggregate, HARNESS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import { now } from "./internal.ts";

/** The slice of a computesdk sandbox the lifecycle driver times (its `Sandbox` satisfies this). */
export interface LifecycleSandbox {
	readonly sandboxId: string;
	runCommand(command: string, options?: { background?: boolean }): Promise<{ exitCode: number }>;
	getInfo(): Promise<unknown>;
	destroy(): Promise<unknown>;
}

/** The slice of a computesdk snapshot manager the driver times (its `ProviderSnapshotManager` satisfies this). */
export interface LifecycleSnapshots {
	create(sandboxId: string, options?: { name?: string }): Promise<{ id: string }>;
	delete(snapshotId: string): Promise<unknown>;
}

/** The slice of a computesdk provider the driver needs (its `DirectProvider` satisfies this). */
export interface LifecycleCompute {
	sandbox: {
		create(options?: unknown): Promise<LifecycleSandbox>;
		/** Present on providers whose SDK can enumerate sandboxes — the control-plane list probe. */
		list?(): Promise<unknown[]>;
	};
	/** Present on providers whose SDK exposes snapshots — the lifecycle snapshot probe. */
	snapshot?: LifecycleSnapshots;
}

export interface MeasureLifecycleOptions {
	/** Provider id stamped onto every emitted {@link RawRun}. */
	provider: string;
	/** Create-time options forwarded verbatim to `sandbox.create` (the pinned spec/image). */
	createOptions?: unknown;
	/** Trivial command timed for the exec round-trip floor. Default `"true"`. */
	execCommand?: string;
	/** How many times to probe each control-plane read within the one sandbox. Default `1`. */
	controlPlaneSamples?: number;
	/** Attempt a snapshot (recorded as a skip when the SDK exposes none, or when false). Default `true`. */
	snapshot?: boolean;
}

/** One cold-start cycle's output: a timing Sample per measured op, a skip per op that couldn't run. */
export interface LifecycleMeasurement {
	samples: RawRun[];
	skips: SkipMarker[];
}

/** A measured operation's distribution, keyed by the catalogued Metric id its Samples belong to. */
export interface LifecycleAggregate {
	metricId: HarnessMetricId;
	aggregates: Aggregates;
}

interface Timed<T> {
	value: T;
	ms: number;
}

/** Time an async (or sync) operation, flooring to a strictly-positive duration like {@link timeOperation}. */
async function time<T>(run: () => Promise<T> | T): Promise<Timed<T>> {
	const start = now();
	const value = await run();
	// `rawRunSchema` requires `durationMs > 0`; a sub-tick op can observe a 0 delta, so floor to EPSILON.
	return { value, ms: Math.max(now() - start, Number.EPSILON) };
}

const reasonOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Measure one full lifecycle cycle against `compute`, returning a timing Sample per op and a skip per op
 * that was unsupported or failed. See the module header for the spawn-rejects / middle-best-effort /
 * teardown-always-runs contract.
 */
export async function measureLifecycle(
	compute: LifecycleCompute,
	options: MeasureLifecycleOptions,
): Promise<LifecycleMeasurement> {
	const { provider } = options;
	const execCommand = options.execCommand ?? "true";
	const controlPlaneSamples = Math.max(1, Math.floor(options.controlPlaneSamples ?? 1));
	const wantSnapshot = options.snapshot ?? true;

	const samples: RawRun[] = [];
	const skips: SkipMarker[] = [];
	const sample = (operation: HarnessMetricId, ms: number): void => {
		samples.push({ provider, operation, durationMs: ms });
	};
	// Reuse SkipMarker's `suite` slot for the skipped op's Metric id — it identifies what didn't run.
	const skip = (operation: HarnessMetricId, reason: string): void => {
		skips.push({ suite: operation, reason });
	};
	// A timed step that records a Sample on success and a skip (never a throw) on failure.
	const step = async (operation: HarnessMetricId, run: () => Promise<unknown>): Promise<void> => {
		try {
			sample(operation, (await time(run)).ms);
		} catch (err) {
			skip(operation, reasonOf(err));
		}
	};

	// Spawn: the opening bookend. A failure has no sandbox to tear down, so it rejects and the caller
	// records the failed cold-start cycle.
	const spawned = await time(() => compute.sandbox.create(options.createOptions));
	sample(HARNESS_METRIC_IDS.spawn, spawned.ms);
	const sandbox = spawned.value;

	try {
		// Exec: a trivial command round-trip — the exec-path latency floor, independent of the work done.
		await step(HARNESS_METRIC_IDS.exec, () => sandbox.runCommand(execCommand));

		// Control-plane read: getInfo, sampled within this one (cheap) sandbox to build a distribution
		// without paying a fresh spawn/teardown per Sample.
		for (let i = 0; i < controlPlaneSamples; i++) {
			await step(HARNESS_METRIC_IDS.controlPlaneInfo, () => sandbox.getInfo());
		}

		// Control-plane enumeration: list, when the SDK exposes it. Bind `this` so the captured method
		// keeps its receiver, and narrow on a const (property narrowing wouldn't survive the closure).
		const listSandboxes = compute.sandbox.list?.bind(compute.sandbox);
		if (listSandboxes) {
			await step(HARNESS_METRIC_IDS.controlPlaneList, () => listSandboxes());
		} else {
			skip(HARNESS_METRIC_IDS.controlPlaneList, "provider SDK exposes no sandbox list operation");
		}

		// Snapshot: when requested and the SDK exposes a snapshot manager. Best-effort delete afterwards
		// so a measured snapshot never leaks into the account.
		const snapshots = compute.snapshot;
		if (!wantSnapshot) {
			skip(HARNESS_METRIC_IDS.snapshot, "snapshot measurement disabled for this run");
		} else if (!snapshots) {
			skip(HARNESS_METRIC_IDS.snapshot, "provider SDK exposes no snapshot operation");
		} else {
			try {
				const snap = await time(() => snapshots.create(sandbox.sandboxId));
				sample(HARNESS_METRIC_IDS.snapshot, snap.ms);
				await Promise.resolve(snapshots.delete(snap.value.id)).catch(() => undefined);
			} catch (err) {
				skip(HARNESS_METRIC_IDS.snapshot, reasonOf(err));
			}
		}
	} finally {
		// Teardown: the closing bookend — always attempted. A throw out of `finally` would mask an
		// in-flight error, so a failed destroy is a skip, not a throw; the leak is the caller's to notice.
		try {
			sample(HARNESS_METRIC_IDS.teardown, (await time(() => sandbox.destroy())).ms);
		} catch (err) {
			skip(HARNESS_METRIC_IDS.teardown, reasonOf(err));
		}
	}

	return { samples, skips };
}

/**
 * Group {@link RawRun} Samples by their Metric id and aggregate each into the canonical distribution,
 * in {@link HARNESS_METRIC_IDS} declaration order. Operations with no Samples (all skipped) are omitted
 * rather than aggregated — `aggregate()` requires at least one Sample.
 */
export function aggregateLifecycle(samples: readonly RawRun[]): LifecycleAggregate[] {
	const out: LifecycleAggregate[] = [];
	for (const metricId of Object.values(HARNESS_METRIC_IDS)) {
		const durations = samples.filter((s) => s.operation === metricId).map((s) => s.durationMs);
		if (durations.length > 0) out.push({ metricId, aggregates: aggregate(durations) });
	}
	return out;
}
