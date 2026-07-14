import { describe, expect, it } from "bun:test";
import type { RawRun, ResultGap } from "@sandbox-benchmarks/schema";
import { HARNESS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import type { LifecycleCompute, LifecycleSandbox } from "./lifecycle.ts";
import { aggregateLifecycle, measureLifecycle } from "./lifecycle.ts";

interface FakeCalls {
	order: string[];
	deletedSnapshots: string[];
}

interface FakeOptions {
	withSnapshot?: boolean;
	withList?: boolean;
	failCreate?: boolean;
	failExec?: boolean;
	failInfo?: boolean;
	failDestroy?: boolean;
	failSnapshotCreate?: boolean;
	/** Number of leading `runCommand` calls that report exitCode 1 (not-ready) before succeeding. */
	notReadyFor?: number;
}

/**
 * Test injection: a monotonic clock that ticks one ms per read, and a delay that never really sleeps.
 * The driver's readiness loop retries `echo ok`, so without a no-op delay a not-ready path would block
 * the test for `readinessMaxAttempts × readinessRetryDelayMs` of real time.
 */
function fastClock(): () => number {
	let t = 0;
	return () => ++t;
}
const noDelay = async (): Promise<void> => {};

/** A fake compute that records its call order, so the driver's chain is checkable without a real SDK. */
function fakeCompute(opts: FakeOptions = {}): { compute: LifecycleCompute; calls: FakeCalls } {
	const calls: FakeCalls = { order: [], deletedSnapshots: [] };
	let readinessProbes = 0;
	const sandbox: LifecycleSandbox = {
		sandboxId: "sb-1",
		async runCommand(command) {
			calls.order.push(`exec:${command}`);
			if (opts.failExec) throw new Error("exec boom");
			// The readiness loop probes "echo ok"; report it not-ready (exitCode 1) for the first
			// `notReadyFor` attempts so the cold-start retry path is exercised without a real SDK.
			if (command === "echo ok") {
				readinessProbes += 1;
				if (opts.notReadyFor && readinessProbes <= opts.notReadyFor) return { exitCode: 1 };
			}
			return { exitCode: 0 };
		},
		async getInfo() {
			calls.order.push("getInfo");
			if (opts.failInfo) throw new Error("info boom");
			return { status: "running" };
		},
		async destroy() {
			calls.order.push("destroy");
			if (opts.failDestroy) throw new Error("destroy boom");
			return undefined;
		},
	};
	const sandboxManager: LifecycleCompute["sandbox"] = {
		async create() {
			calls.order.push("create");
			if (opts.failCreate) throw new Error("create boom");
			return sandbox;
		},
	};
	if (opts.withList) {
		sandboxManager.list = async () => {
			calls.order.push("list");
			return [sandbox];
		};
	}
	const compute: LifecycleCompute = { sandbox: sandboxManager };
	if (opts.withSnapshot) {
		compute.snapshot = {
			async create(sandboxId) {
				calls.order.push(`snapshot:${sandboxId}`);
				if (opts.failSnapshotCreate) throw new Error("snapshot boom");
				return { id: "snap-1" };
			},
			async delete(snapshotId) {
				calls.deletedSnapshots.push(snapshotId);
				return undefined;
			},
		};
	}
	return { compute, calls };
}

/** Map of Metric id → number of Samples that carry it. */
function countByOp(samples: RawRun[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const s of samples) counts[s.operation] = (counts[s.operation] ?? 0) + 1;
	return counts;
}

// A lifecycle gap is operation-scoped: `id` is the Metric id that produced no Sample.
const gapFor = (gaps: ResultGap[], op: string): ResultGap | undefined =>
	gaps.find((g) => g.id === op);
const reasonFor = (gaps: ResultGap[], op: string): string | undefined => gapFor(gaps, op)?.reason;
const outcomeFor = (gaps: ResultGap[], op: string): string | undefined => gapFor(gaps, op)?.outcome;

describe("measureLifecycle", () => {
	it("times the full spawn→readiness→exec→payload→info→list→snapshot→teardown chain in order", async () => {
		const { compute, calls } = fakeCompute({ withSnapshot: true, withList: true });
		const { samples, gaps } = await measureLifecycle(compute, {
			provider: "e2b",
			controlPlaneSamples: 2,
			now: fastClock(),
			delay: noDelay,
		});

		expect(calls.order).toEqual([
			"create",
			"exec:echo ok", // readiness probe — first success marks the sandbox usable
			"exec:true", // exec round-trip floor
			"exec:head -c 65536 /dev/zero | tr '\\0' 'a'", // 64KiB payload exec
			"getInfo",
			"getInfo",
			"list",
			"list",
			"snapshot:sb-1",
			"destroy",
		]);
		// controlPlaneSamples:2 governs BOTH control-plane reads — getInfo and list each probed twice.
		expect(countByOp(samples)).toEqual({
			[HARNESS_METRIC_IDS.spawn]: 1,
			[HARNESS_METRIC_IDS.coldStart]: 1,
			[HARNESS_METRIC_IDS.firstExec]: 1,
			[HARNESS_METRIC_IDS.exec]: 1,
			[HARNESS_METRIC_IDS.execPayload64k]: 1,
			[HARNESS_METRIC_IDS.controlPlaneInfo]: 2,
			[HARNESS_METRIC_IDS.controlPlaneList]: 2,
			[HARNESS_METRIC_IDS.snapshot]: 1,
			[HARNESS_METRIC_IDS.teardown]: 1,
		});
		// Every Sample carries the provider and a strictly-positive duration (the RawRun contract).
		expect(samples.every((s) => s.provider === "e2b" && s.durationMs > 0)).toBe(true);
		expect(gaps).toEqual([]);
		// The measured snapshot is cleaned up, never leaked.
		expect(calls.deletedSnapshots).toEqual(["snap-1"]);
	});

	it("retries the readiness probe until the first success, then records cold-start honestly", async () => {
		// Two not-ready probes (exitCode 1) then success: cold_start spans t0→3rd probe, first_exec
		// create→3rd probe — both bigger than the create-resolve spawn delta alone.
		const { compute, calls } = fakeCompute({ notReadyFor: 2 });
		const { samples, gaps } = await measureLifecycle(compute, {
			provider: "e2b",
			now: fastClock(),
			delay: noDelay,
		});
		// create, three echo-ok probes (two not-ready + one ready), then exec floor + payload.
		expect(calls.order.slice(0, 4)).toEqual([
			"create",
			"exec:echo ok",
			"exec:echo ok",
			"exec:echo ok",
		]);
		const ops = countByOp(samples);
		expect(ops[HARNESS_METRIC_IDS.coldStart]).toBe(1);
		expect(ops[HARNESS_METRIC_IDS.firstExec]).toBe(1);
		// cold_start (t0→ready) strictly exceeds first_exec (create→ready) — it also carries create.
		const cold = samples.find((s) => s.operation === HARNESS_METRIC_IDS.coldStart);
		const first = samples.find((s) => s.operation === HARNESS_METRIC_IDS.firstExec);
		expect(cold?.durationMs).toBeGreaterThan(first?.durationMs ?? 0);
		// A recovered readiness is NOT a gap (only the unsupported snapshot/list ops on this bare fake).
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.coldStart)).toBeUndefined();
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.firstExec)).toBeUndefined();
	});

	it("fails both readiness Metrics when the sandbox never goes ready, capped at readinessMaxAttempts", async () => {
		// notReadyFor exceeds the attempt cap → never ready; the loop must stop at the cap, not spin.
		const { compute, calls } = fakeCompute({ notReadyFor: 10 });
		const { samples, gaps } = await measureLifecycle(compute, {
			provider: "e2b",
			readinessMaxAttempts: 3,
			now: fastClock(),
			delay: noDelay,
		});
		expect(calls.order.filter((c) => c === "exec:echo ok").length).toBe(3);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.coldStart]).toBeUndefined();
		expect(countByOp(samples)[HARNESS_METRIC_IDS.firstExec]).toBeUndefined();
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.coldStart)).toMatch(/never ready/);
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.firstExec)).toMatch(/never ready/);
		// The sandbox was spawned and probed to exhaustion: an outage, never a deliberate omission.
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.coldStart)).toBe("failed");
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.firstExec)).toBe("failed");
		// Spawn and teardown still measured around the unusable sandbox.
		expect(countByOp(samples)[HARNESS_METRIC_IDS.spawn]).toBe(1);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.teardown]).toBe(1);
	});

	it("records a skip when the 64KiB payload exec is disabled, without calling it", async () => {
		const { compute, calls } = fakeCompute();
		const { samples, gaps } = await measureLifecycle(compute, {
			provider: "e2b",
			payload: false,
			now: fastClock(),
			delay: noDelay,
		});
		expect(calls.order.some((c) => c.includes("/dev/zero | tr"))).toBe(false);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.execPayload64k]).toBeUndefined();
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.execPayload64k)).toMatch(/disabled/);
		// Never attempted (the run turned it off) — a decision, not a reliability fact.
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.execPayload64k)).toBe("skipped");
	});

	it("honors a custom exec command", async () => {
		const { compute, calls } = fakeCompute();
		await measureLifecycle(compute, {
			provider: "e2b",
			execCommand: "uname -a",
			now: fastClock(),
			delay: noDelay,
		});
		expect(calls.order).toContain("exec:uname -a");
	});

	it("records a skip (not a sample) when the SDK exposes no snapshot or list operation", async () => {
		const { compute } = fakeCompute(); // no snapshot manager, no list
		const { samples, gaps } = await measureLifecycle(compute, { provider: "modal" });

		const ops = countByOp(samples);
		expect(ops[HARNESS_METRIC_IDS.snapshot]).toBeUndefined();
		expect(ops[HARNESS_METRIC_IDS.controlPlaneList]).toBeUndefined();
		// Spawn/exec/info/teardown still measured.
		expect(ops[HARNESS_METRIC_IDS.spawn]).toBe(1);
		expect(ops[HARNESS_METRIC_IDS.teardown]).toBe(1);
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.snapshot)).toMatch(/no snapshot operation/);
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.controlPlaneList)).toMatch(
			/no sandbox list operation/,
		);
		// The SDK exposes no such call, so neither was ever attempted — a skip, not an outage.
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.snapshot)).toBe("skipped");
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.controlPlaneList)).toBe("skipped");
	});

	it("records a skip when snapshot measurement is disabled, without calling the SDK", async () => {
		const { compute, calls } = fakeCompute({ withSnapshot: true });
		const { samples, gaps } = await measureLifecycle(compute, {
			provider: "e2b",
			snapshot: false,
		});
		expect(calls.order.some((c) => c.startsWith("snapshot:"))).toBe(false);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.snapshot]).toBeUndefined();
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.snapshot)).toMatch(/disabled/);
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.snapshot)).toBe("skipped");
	});

	it("turns a mid-chain exec failure into a failed gap and still tears down", async () => {
		// A throwing runCommand also fails every readiness probe, so cap attempts + inject a no-op delay
		// to keep the retry loop fast.
		const { compute, calls } = fakeCompute({ failExec: true });
		const { samples, gaps } = await measureLifecycle(compute, {
			provider: "e2b",
			readinessMaxAttempts: 2,
			now: fastClock(),
			delay: noDelay,
		});
		// exec was attempted and threw → no exec sample, but a FAILED gap carrying the error message.
		expect(countByOp(samples)[HARNESS_METRIC_IDS.exec]).toBeUndefined();
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.exec)).toBe("exec boom");
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.exec)).toBe("failed");
		// A never-ready sandbox fails both readiness Metrics.
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.coldStart)).toMatch(/never ready/);
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.coldStart)).toBe("failed");
		// Teardown still ran and was sampled.
		expect(calls.order).toContain("destroy");
		expect(countByOp(samples)[HARNESS_METRIC_IDS.teardown]).toBe(1);
	});

	it("fails every failed control-plane probe but keeps measuring", async () => {
		const { compute } = fakeCompute({ failInfo: true });
		const { samples, gaps } = await measureLifecycle(compute, {
			provider: "e2b",
			controlPlaneSamples: 3,
		});
		expect(countByOp(samples)[HARNESS_METRIC_IDS.controlPlaneInfo]).toBeUndefined();
		// Each failed probe records its own failed gap.
		const infoGaps = gaps.filter((g) => g.id === HARNESS_METRIC_IDS.controlPlaneInfo);
		expect(infoGaps.length).toBe(3);
		expect(infoGaps.every((g) => g.outcome === "failed")).toBe(true);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.spawn]).toBe(1);
	});

	it("rejects when spawn fails — there is no sandbox to tear down", async () => {
		const { compute, calls } = fakeCompute({ failCreate: true });
		await expect(measureLifecycle(compute, { provider: "e2b" })).rejects.toThrow("create boom");
		expect(calls.order).toEqual(["create"]);
	});

	it("records a teardown failure as a failed gap rather than throwing out of finally", async () => {
		const { compute } = fakeCompute({ failDestroy: true });
		const { samples, gaps } = await measureLifecycle(compute, { provider: "e2b" });
		expect(countByOp(samples)[HARNESS_METRIC_IDS.spawn]).toBe(1);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.teardown]).toBeUndefined();
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.teardown)).toBe("destroy boom");
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.teardown)).toBe("failed");
	});

	it("records a snapshot-create failure as a failed gap", async () => {
		const { compute } = fakeCompute({ withSnapshot: true, failSnapshotCreate: true });
		const { samples, gaps } = await measureLifecycle(compute, { provider: "e2b" });
		expect(countByOp(samples)[HARNESS_METRIC_IDS.snapshot]).toBeUndefined();
		expect(reasonFor(gaps, HARNESS_METRIC_IDS.snapshot)).toBe("snapshot boom");
		expect(outcomeFor(gaps, HARNESS_METRIC_IDS.snapshot)).toBe("failed");
	});
});

describe("aggregateLifecycle", () => {
	const raw = (operation: string, durationMs: number): RawRun => ({
		provider: "e2b",
		operation,
		durationMs,
	});

	it("groups Samples by Metric id and aggregates, in HARNESS_METRIC_IDS order", () => {
		const aggregates = aggregateLifecycle([
			raw(HARNESS_METRIC_IDS.controlPlaneInfo, 10),
			raw(HARNESS_METRIC_IDS.spawn, 200),
			raw(HARNESS_METRIC_IDS.controlPlaneInfo, 20),
			raw(HARNESS_METRIC_IDS.spawn, 100),
			raw(HARNESS_METRIC_IDS.controlPlaneInfo, 30),
		]);
		// spawn precedes control-plane info (declaration order), regardless of Sample order.
		expect(aggregates.map((a) => a.metricId)).toEqual([
			HARNESS_METRIC_IDS.spawn,
			HARNESS_METRIC_IDS.controlPlaneInfo,
		]);
		const spawn = aggregates[0];
		const info = aggregates[1];
		expect(spawn?.aggregates.n).toBe(2);
		expect(spawn?.aggregates.p50).toBe(150);
		expect(info?.aggregates.n).toBe(3);
		expect(info?.aggregates.p50).toBe(20);
	});

	it("omits operations with no Samples", () => {
		const aggregates = aggregateLifecycle([raw(HARNESS_METRIC_IDS.teardown, 5)]);
		expect(aggregates.map((a) => a.metricId)).toEqual([HARNESS_METRIC_IDS.teardown]);
	});

	it("returns an empty list for no Samples", () => {
		expect(aggregateLifecycle([])).toEqual([]);
	});
});
