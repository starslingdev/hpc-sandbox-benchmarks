/**
 * Lifecycle & control-plane measurement — the harness-measured Dimensions PTS cannot see.
 *
 * A PTS profile times work done INSIDE an already-running sandbox; it is blind to how fast a provider
 * spawns, execs, snapshots, and tears a sandbox down, and to how quickly its control-plane API answers.
 * This module times those provider SDK calls directly and labels each timing with the matching
 * {@link HARNESS_METRIC_IDS} id, so a {@link RawRun}'s `operation` is a catalogued Metric id by
 * construction — the harness-side analogue of the PTS `<Result>`→id mapping.
 *
 * {@link measureLifecycle} drives ONE cold-start cycle (spawn → readiness probe → exec → control-plane
 * probes → payload exec → snapshot → teardown) against a structural {@link LifecycleCompute}, so it is
 * unit-testable against a fake with no real SDK. `spawn` times only create-resolve (the handle is not
 * yet usable); a readiness loop then retries a trivial exec until it succeeds, yielding the HONEST cold
 * start (`lifecycle_cold_start_ms`, t0→first success) and the readiness gap (`time_to_first_exec_ms`,
 * create→first success) — the latency `spawn` alone cannot see. Spawn is the bookend that must succeed
 * (a failure has nothing to tear down, so it rejects); every middle step is best-effort (a flaky
 * exec/probe records a FAILED gap, never losing the spawn/teardown samples); teardown always runs in
 * `finally` and never throws out of it. Repeat the cycle for a cold-start distribution — that is what
 * {@link benchmarkLifecycle} (in index.ts) does.
 */
import type { Aggregates, HarnessMetricId, RawRun, ResultGap } from "@sandbox-benchmarks/schema";
import { aggregate, HARNESS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import { now as defaultNow, time } from "./internal.ts";

/** The trivial command whose first successful (exitCode 0) return marks the sandbox ready. */
const READINESS_CMD = "echo ok";
/** Writes exactly 64KiB (65536 bytes) to stdout — exec overhead including output streaming. Uses `tr`
 *  rather than `base64` so the stream is exactly 64KiB, matching the metric's name (base64 expands the
 *  input ~33%, overstating the payload). */
const PAYLOAD_CMD = "head -c 65536 /dev/zero | tr '\\0' 'a'";
/** Real wall-clock delay between readiness retries; swapped for a no-op in tests. */
const realDelay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
	/** Attempt a snapshot (recorded as a skipped gap when the SDK exposes none, or when false). Default `true`. */
	snapshot?: boolean;
	/** Readiness probes (`echo ok`) per cold start before giving up. Default `40`. */
	readinessMaxAttempts?: number;
	/** Delay between failed readiness probes, in ms. Default `250`. */
	readinessRetryDelayMs?: number;
	/** Time a 64KiB-stdout exec (recorded as the payload control-plane Metric). Default `true`. */
	payload?: boolean;
	/** Injectable monotonic clock (ms) for cold-start timestamps. Default the harness internal clock. */
	now?: () => number;
	/** Injectable readiness-retry delay; tests pass a no-op so they never really sleep. Default real `setTimeout`. */
	delay?: (ms: number) => Promise<void>;
}

/** One cold-start cycle's output: a timing Sample per measured op, a gap per op that produced none. */
export interface LifecycleMeasurement {
	samples: RawRun[];
	/** Operation-scoped gaps — `skipped` (not attempted) or `failed` (attempted, errored). */
	gaps: ResultGap[];
}

/** A measured operation's distribution, keyed by the catalogued Metric id its Samples belong to. */
export interface LifecycleAggregate {
	metricId: HarnessMetricId;
	aggregates: Aggregates;
}

const reasonOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Measure one full lifecycle cycle against `compute`, returning a timing Sample per op and a gap per op
 * that produced none — `skipped` when it was never attempted (disabled, or the SDK has no such call),
 * `failed` when it was attempted and threw. See the module header for the spawn-rejects /
 * middle-best-effort / teardown-always-runs contract.
 */
export async function measureLifecycle(
	compute: LifecycleCompute,
	options: MeasureLifecycleOptions,
): Promise<LifecycleMeasurement> {
	const { provider } = options;
	const execCommand = options.execCommand ?? "true";
	// `?? 1` only catches undefined; a NaN/Infinity slipping through would make `i < samples` never
	// run (or never stop), so a non-finite value falls back to a single probe.
	const rawSamples = options.controlPlaneSamples ?? 1;
	const controlPlaneSamples = Number.isFinite(rawSamples) ? Math.max(1, Math.floor(rawSamples)) : 1;
	const wantSnapshot = options.snapshot ?? true;
	const wantPayload = options.payload ?? true;
	// Same non-finite guard as controlPlaneSamples: a NaN bound would make the readiness loop never run.
	const rawAttempts = options.readinessMaxAttempts ?? 40;
	const readinessMaxAttempts = Number.isFinite(rawAttempts)
		? Math.max(1, Math.floor(rawAttempts))
		: 40;
	// Same non-finite guard as readinessMaxAttempts; also clamp negatives (a negative delay is meaningless).
	const rawDelayMs = options.readinessRetryDelayMs ?? 250;
	const readinessRetryDelayMs = Number.isFinite(rawDelayMs) ? Math.max(0, rawDelayMs) : 250;
	const clock = options.now ?? defaultNow;
	const delay = options.delay ?? realDelay;

	const samples: RawRun[] = [];
	const gaps: ResultGap[] = [];
	const sample = (operation: HarnessMetricId, ms: number): void => {
		samples.push({ provider, operation, durationMs: ms });
	};
	// An operation-scoped gap: the Metric id names what produced no Sample, and `outcome` says why.
	//
	// The two arms are NOT interchangeable, and this is the layer that knows which is which. `skip` is a
	// decision — the run turned the probe off, or the provider's SDK has no such call — and says nothing
	// about reliability. `fail` is an outage: the call was made and it threw. Recording a throw as a skip
	// (as this did while both shared one helper) publishes a provider's control-plane failure as though
	// we had chosen not to measure it, which is precisely backwards.
	const skip = (operation: HarnessMetricId, reason: string): void => {
		gaps.push({ scope: "operation", id: operation, outcome: "skipped", reason });
	};
	const fail = (operation: HarnessMetricId, reason: string): void => {
		gaps.push({ scope: "operation", id: operation, outcome: "failed", reason });
	};
	// A timed step that records a Sample on success and a FAILED gap (never a throw) on error.
	const step = async (operation: HarnessMetricId, run: () => Promise<unknown>): Promise<void> => {
		try {
			sample(operation, (await time(run)).ms);
		} catch (err) {
			fail(operation, reasonOf(err));
		}
	};

	// Floor cold-start deltas to a strictly-positive duration (the rawRunSchema contract `time()` also
	// upholds): a sub-tick op can read two equal clock values, and durationMs must be > 0.
	const floor = (ms: number): number => Math.max(ms, Number.EPSILON);

	// Spawn: the opening bookend, timed create-resolve ONLY — the returned handle is not necessarily
	// usable yet (the readiness loop below measures when it becomes so). A failure has no sandbox to tear
	// down, so it rejects and the caller records the failed cold-start cycle.
	const t0 = clock();
	const sandbox = await compute.sandbox.create(options.createOptions);
	const createdAt = clock();
	sample(HARNESS_METRIC_IDS.spawn, floor(createdAt - t0));

	try {
		// Readiness: retry a trivial exec until it returns exitCode 0 — the FIRST success marks a usable
		// sandbox. cold_start (t0→ready) is the honest cold start spawn alone can't see; first_exec
		// (create→ready) isolates the readiness wait. A probe that throws counts as not-ready and retries.
		let readyAt: number | undefined;
		for (let attempt = 1; attempt <= readinessMaxAttempts; attempt++) {
			let ready = false;
			try {
				ready = (await sandbox.runCommand(READINESS_CMD)).exitCode === 0;
			} catch {
				ready = false;
			}
			if (ready) {
				readyAt = clock();
				break;
			}
			if (attempt < readinessMaxAttempts) await delay(readinessRetryDelayMs);
		}
		if (readyAt === undefined) {
			// Never went ready: record both readiness Metrics as FAILURES rather than fabricate a timing.
			// The sandbox was spawned and probed to exhaustion and never came up — that is the loudest
			// reliability signal this harness can produce, and calling it a "skip" would file it as a
			// deliberate omission.
			const reason = `sandbox never ready: no successful "${READINESS_CMD}" in ${readinessMaxAttempts} attempts`;
			fail(HARNESS_METRIC_IDS.firstExec, reason);
			fail(HARNESS_METRIC_IDS.coldStart, reason);
		} else {
			sample(HARNESS_METRIC_IDS.firstExec, floor(readyAt - createdAt));
			sample(HARNESS_METRIC_IDS.coldStart, floor(readyAt - t0));
		}

		// Exec: a trivial command round-trip — the exec-path latency floor, independent of the work done.
		await step(HARNESS_METRIC_IDS.exec, () => sandbox.runCommand(execCommand));

		// Payload: a 64KiB-stdout exec — exec overhead including output streaming, above the trivial floor.
		if (wantPayload) {
			await step(HARNESS_METRIC_IDS.execPayload64k, () => sandbox.runCommand(PAYLOAD_CMD));
		} else {
			skip(HARNESS_METRIC_IDS.execPayload64k, "64KiB payload exec disabled for this run");
		}

		// Control-plane read: getInfo, sampled within this one (cheap) sandbox to build a distribution
		// without paying a fresh spawn/teardown per Sample.
		for (let i = 0; i < controlPlaneSamples; i++) {
			await step(HARNESS_METRIC_IDS.controlPlaneInfo, () => sandbox.getInfo());
		}

		// Control-plane enumeration: list, when the SDK exposes it. Bind `this` so the captured method
		// keeps its receiver, and narrow on a const (property narrowing wouldn't survive the closure).
		const listSandboxes = compute.sandbox.list?.bind(compute.sandbox);
		if (listSandboxes) {
			// Sampled `controlPlaneSamples` times like getInfo — list is a control-plane read too, so the
			// configured probe depth governs both reads, not just info.
			for (let i = 0; i < controlPlaneSamples; i++) {
				await step(HARNESS_METRIC_IDS.controlPlaneList, () => listSandboxes());
			}
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
				// Best-effort cleanup: a failed delete shouldn't fail the cycle, but it can leak a snapshot,
				// so surface it (mirrors the destroy-failure warning) instead of swallowing it silently.
				await snapshots.delete(snap.value.id).catch((err) => {
					console.warn(`[lifecycle] snapshot cleanup failed (${snap.value.id}): ${reasonOf(err)}`);
				});
			} catch (err) {
				fail(HARNESS_METRIC_IDS.snapshot, reasonOf(err));
			}
		}
	} finally {
		// Teardown: the closing bookend — always attempted. A throw out of `finally` would mask an
		// in-flight error, so a failed destroy is recorded as a failed gap, not rethrown; the leak is the
		// caller's to notice.
		try {
			sample(HARNESS_METRIC_IDS.teardown, (await time(() => sandbox.destroy())).ms);
		} catch (err) {
			fail(HARNESS_METRIC_IDS.teardown, reasonOf(err));
		}
	}

	return { samples, gaps };
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
