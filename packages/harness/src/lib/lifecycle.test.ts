import { describe, expect, it } from "bun:test";
import type { RawRun } from "@sandbox-benchmarks/schema";
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
}

/** A fake compute that records its call order, so the driver's chain is checkable without a real SDK. */
function fakeCompute(opts: FakeOptions = {}): { compute: LifecycleCompute; calls: FakeCalls } {
	const calls: FakeCalls = { order: [], deletedSnapshots: [] };
	const sandbox: LifecycleSandbox = {
		sandboxId: "sb-1",
		async runCommand(command) {
			calls.order.push(`exec:${command}`);
			if (opts.failExec) throw new Error("exec boom");
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

const reasonFor = (skips: { suite: string; reason: string }[], op: string): string | undefined =>
	skips.find((s) => s.suite === op)?.reason;

describe("measureLifecycle", () => {
	it("times the full spawn→exec→info→list→snapshot→teardown chain in order", async () => {
		const { compute, calls } = fakeCompute({ withSnapshot: true, withList: true });
		const { samples, skips } = await measureLifecycle(compute, {
			provider: "e2b",
			controlPlaneSamples: 2,
		});

		expect(calls.order).toEqual([
			"create",
			"exec:true",
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
			[HARNESS_METRIC_IDS.exec]: 1,
			[HARNESS_METRIC_IDS.controlPlaneInfo]: 2,
			[HARNESS_METRIC_IDS.controlPlaneList]: 2,
			[HARNESS_METRIC_IDS.snapshot]: 1,
			[HARNESS_METRIC_IDS.teardown]: 1,
		});
		// Every Sample carries the provider and a strictly-positive duration (the RawRun contract).
		expect(samples.every((s) => s.provider === "e2b" && s.durationMs > 0)).toBe(true);
		expect(skips).toEqual([]);
		// The measured snapshot is cleaned up, never leaked.
		expect(calls.deletedSnapshots).toEqual(["snap-1"]);
	});

	it("honors a custom exec command", async () => {
		const { compute, calls } = fakeCompute();
		await measureLifecycle(compute, { provider: "e2b", execCommand: "uname -a" });
		expect(calls.order).toContain("exec:uname -a");
	});

	it("records a skip (not a sample) when the SDK exposes no snapshot or list operation", async () => {
		const { compute } = fakeCompute(); // no snapshot manager, no list
		const { samples, skips } = await measureLifecycle(compute, { provider: "modal" });

		const ops = countByOp(samples);
		expect(ops[HARNESS_METRIC_IDS.snapshot]).toBeUndefined();
		expect(ops[HARNESS_METRIC_IDS.controlPlaneList]).toBeUndefined();
		// Spawn/exec/info/teardown still measured.
		expect(ops[HARNESS_METRIC_IDS.spawn]).toBe(1);
		expect(ops[HARNESS_METRIC_IDS.teardown]).toBe(1);
		expect(reasonFor(skips, HARNESS_METRIC_IDS.snapshot)).toMatch(/no snapshot operation/);
		expect(reasonFor(skips, HARNESS_METRIC_IDS.controlPlaneList)).toMatch(
			/no sandbox list operation/,
		);
	});

	it("records a skip when snapshot measurement is disabled, without calling the SDK", async () => {
		const { compute, calls } = fakeCompute({ withSnapshot: true });
		const { samples, skips } = await measureLifecycle(compute, {
			provider: "e2b",
			snapshot: false,
		});
		expect(calls.order.some((c) => c.startsWith("snapshot:"))).toBe(false);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.snapshot]).toBeUndefined();
		expect(reasonFor(skips, HARNESS_METRIC_IDS.snapshot)).toMatch(/disabled/);
	});

	it("turns a mid-chain exec failure into a skip and still tears down", async () => {
		const { compute, calls } = fakeCompute({ failExec: true });
		const { samples, skips } = await measureLifecycle(compute, { provider: "e2b" });
		// exec failed → no exec sample, but a skip carrying the error message.
		expect(countByOp(samples)[HARNESS_METRIC_IDS.exec]).toBeUndefined();
		expect(reasonFor(skips, HARNESS_METRIC_IDS.exec)).toBe("exec boom");
		// Teardown still ran and was sampled.
		expect(calls.order).toContain("destroy");
		expect(countByOp(samples)[HARNESS_METRIC_IDS.teardown]).toBe(1);
	});

	it("skips every failed control-plane probe but keeps measuring", async () => {
		const { compute } = fakeCompute({ failInfo: true });
		const { samples, skips } = await measureLifecycle(compute, {
			provider: "e2b",
			controlPlaneSamples: 3,
		});
		expect(countByOp(samples)[HARNESS_METRIC_IDS.controlPlaneInfo]).toBeUndefined();
		// Each failed probe records its own skip.
		expect(skips.filter((s) => s.suite === HARNESS_METRIC_IDS.controlPlaneInfo).length).toBe(3);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.spawn]).toBe(1);
	});

	it("rejects when spawn fails — there is no sandbox to tear down", async () => {
		const { compute, calls } = fakeCompute({ failCreate: true });
		await expect(measureLifecycle(compute, { provider: "e2b" })).rejects.toThrow("create boom");
		expect(calls.order).toEqual(["create"]);
	});

	it("records a teardown failure as a skip rather than throwing out of finally", async () => {
		const { compute } = fakeCompute({ failDestroy: true });
		const { samples, skips } = await measureLifecycle(compute, { provider: "e2b" });
		expect(countByOp(samples)[HARNESS_METRIC_IDS.spawn]).toBe(1);
		expect(countByOp(samples)[HARNESS_METRIC_IDS.teardown]).toBeUndefined();
		expect(reasonFor(skips, HARNESS_METRIC_IDS.teardown)).toBe("destroy boom");
	});

	it("records a snapshot-create failure as a skip", async () => {
		const { compute } = fakeCompute({ withSnapshot: true, failSnapshotCreate: true });
		const { samples, skips } = await measureLifecycle(compute, { provider: "e2b" });
		expect(countByOp(samples)[HARNESS_METRIC_IDS.snapshot]).toBeUndefined();
		expect(reasonFor(skips, HARNESS_METRIC_IDS.snapshot)).toBe("snapshot boom");
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
