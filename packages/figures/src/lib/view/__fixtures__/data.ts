/**
 * A synthetic dataset for the figure tests.
 *
 * Deliberately NOT the committed run. The live artifact has `backfill: null` and no
 * single-measurement rows, so a disclosure or "best" rule tested against it passes no
 * matter what the code does — the vacuous green this repo's guard discipline exists to
 * kill, and exactly how a dropped-disclosure bug survived review once already.
 *
 * This fixture carries, on purpose: a backfilled cell, an off-spec provider, a row with
 * only ONE measured value (nothing may be marked best), and a row with a missing cell.
 */

import type { MetricCell } from "../../../domain/index.ts";
import { parseSandboxBenchmarkData } from "../../../domain/index.ts";

const cell = (p50: number, extra: Partial<MetricCell> = {}): MetricCell => ({
	p50,
	n: 3,
	r: 3,
	rep: [p50, p50, p50],
	...extra,
});

const provider = (id: string, name: string, specMatched: boolean) => ({
	id,
	name,
	specMatched,
	priceUsdHr: 1,
	specs: {
		vcpus: 4,
		cpuModel: null,
		cpuModels: null,
		cpuCacheSize: null,
		virtualization: null,
		isolation: "vm",
		memoryGb: 8,
		diskGb: 40,
		fileSystem: null,
		mountOptions: null,
		diskScheduler: null,
		diskBlockSize: null,
		kernel: null,
		os: null,
		egressFamily: null,
		asn: null,
		asnOrg: null,
		geo: null,
		egressFromShard: false,
		region: null,
		regionPinned: null,
	},
});

/*
 * Built THROUGH the parse, not cast past it. The cast this replaced
 * (`as unknown as SandboxBenchmarkData`) is what let a fixture describe a document the
 * real artifact never could — and since the live run carries none of the shapes below,
 * three guards would have kept passing against an impossible dataset. Now the fixture
 * has to be a document `parseSandboxBenchmarkData` accepts, or every test that imports
 * it fails at import.
 */
export const FIXTURE = parseSandboxBenchmarkData({
	provenance: { runFile: "f", catalogFile: "c", catalogSourceSha: "s", generator: "g" },
	run: {
		runId: "12345",
		commit: "abc",
		date: "2026-01-01",
		schemaVersion: "3",
		targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	},
	backfill: {
		runFile: "old.json",
		runId: "999",
		commit: "def",
		date: "2025-12-01",
		targetSpec: { vcpus: 8, memoryGb: 16, diskGb: 80 },
		cells: [{ provider: "beta", metricId: "disk_iops" }],
	},
	providers: [provider("alpha", "Alpha", true), provider("beta", "Beta", false)],
	excludedProviders: [],
	environmentFlags: [],
	phaseOrder: ["build"],
	suites: [
		{
			id: "realworld-demo",
			name: "Demo",
			minDiskGb: null,
			tasks: [
				{
					id: "realworld_demo_task_install",
					label: "install",
					shortLabel: "install",
					phase: "build",
				},
			],
			bars: [],
			incomplete: [],
		},
	],
	dimensionGroups: [
		{
			dimension: "disk",
			rows: [
				{
					id: "disk_iops",
					label: "disk IOPS",
					unit: "IOPS",
					direction: "HIB",
					headline: true,
					derived: false,
					values: { alpha: cell(1000), beta: cell(4000, { backfilled: true }) },
				},
				{
					// Only ONE provider measured: nothing may be marked best.
					id: "disk_lonely",
					label: "lonely disk metric",
					unit: "IOPS",
					direction: "HIB",
					headline: false,
					derived: false,
					values: { alpha: cell(500), beta: null },
				},
			],
		},
		{
			dimension: "realworld",
			rows: [
				{
					id: "realworld-demo_total",
					label: "Demo: total",
					unit: "s",
					direction: "LIB",
					headline: false,
					derived: true,
					values: { alpha: cell(100), beta: cell(400) },
				},
				{
					id: "realworld_demo_task_install",
					label: "Demo: install",
					unit: "s",
					direction: "LIB",
					headline: false,
					derived: false,
					indent: true,
					values: { alpha: cell(40), beta: cell(160) },
				},
			],
		},
	],
	coverageGaps: [],
});
