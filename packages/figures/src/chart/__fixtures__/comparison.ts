/**
 * Two synthetic runs of one suite for the comparison chart tests. On purpose: an environment
 * that got faster, one that got slower, one charted only in the newer run, one only in the
 * older, an off-spec provider, a task only the newer run exercised (excluded from both bars),
 * and an environment that completed the suite in neither run.
 */

import { buildComparisonFigureModel } from "../../comparison-model.ts";
import type { RealworldFigureModel } from "../../model.ts";

const CLONE = "realworld_demo_task_git_clone";
const INSTALL = "realworld_demo_task_cold_install";
const TEST = "realworld_demo_task_test_core";

export const METRICS = [
	{ id: CLONE, label: "Demo: git clone" },
	{ id: INSTALL, label: "Demo: cold install" },
	{ id: TEST, label: "Demo: test core" },
];

const PROVIDERS = [
	{ id: "alpha", name: "Alpha", specMatched: true },
	{ id: "beta", name: "Beta", specMatched: false },
	{ id: "gamma", name: "Gamma", specMatched: true },
	{ id: "delta", name: "Delta", specMatched: true },
	{ id: "omega", name: "Omega", specMatched: true },
];

const bar = (provider: string, clone: number, install: number, test?: number) => ({
	provider,
	totalS: clone + install + (test ?? 0),
	segments: [
		{ id: CLONE, phase: "clone" as const, p50: clone, n: 3 },
		{ id: INSTALL, phase: "install" as const, p50: install, n: 3 },
		...(test === undefined ? [] : [{ id: TEST, phase: "test" as const, p50: test, n: 3 }]),
	],
});

export const BEFORE = {
	providers: PROVIDERS,
	suites: [
		{
			id: "realworld-demo",
			name: "Demo",
			minDiskGb: 30,
			tasks: [
				{ id: CLONE, phase: "clone" },
				{ id: INSTALL, phase: "install" },
			],
			droppedTasks: [],
			bars: [bar("alpha", 40, 160), bar("beta", 50, 160), bar("delta", 60, 240)],
			incomplete: [
				{ provider: "gamma", outcome: "failed", reason: "install exceeded stop" },
				{ provider: "omega", outcome: "failed", reason: "sandbox lost" },
			],
		},
	],
} satisfies RealworldFigureModel;

export const AFTER = {
	providers: PROVIDERS,
	suites: [
		{
			id: "realworld-demo",
			name: "Demo",
			minDiskGb: 30,
			tasks: [
				{ id: CLONE, phase: "clone" },
				{ id: INSTALL, phase: "install" },
				{ id: TEST, phase: "test" },
			],
			droppedTasks: [],
			bars: [bar("alpha", 30, 120, 500), bar("beta", 60, 160, 500), bar("gamma", 20, 80, 500)],
			incomplete: [
				{ provider: "delta", outcome: "failed", reason: "typecheck failed" },
				{ provider: "omega", outcome: "failed", reason: "quota exceeded" },
			],
		},
	],
} satisfies RealworldFigureModel;

export const COMPARISON = buildComparisonFigureModel({
	before: {
		run: { id: "111", label: "Aug 2026", generatedAt: "2026-08-14T00:00:00Z" },
		model: BEFORE,
	},
	after: {
		run: { id: "222", label: "Sep 2026", generatedAt: "2026-09-14T00:00:00Z" },
		model: AFTER,
	},
	metrics: METRICS,
});
