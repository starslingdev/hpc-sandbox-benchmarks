/**
 * A synthetic metric figure model for the metric chart tests — deliberately not the committed
 * dataset. It carries a statistical tie at the top (two `best` badges), an off-spec provider,
 * an interval that reaches past the scale cap (the cut case), one that reaches exactly the cap,
 * a row with no interval, and an environment disclosed as unmeasured.
 */
import type { MetricFigureModel } from "../../metric-model.ts";

export const METRIC_FIXTURE = {
	providers: [
		{ id: "alpha", name: "Alpha", specMatched: true },
		{ id: "beta", name: "Beta", specMatched: false },
		{ id: "gamma", name: "Gamma", specMatched: true },
		{ id: "delta", name: "Delta", specMatched: true },
	],
	metrics: [
		{
			id: "demo_throughput",
			label: "Demo throughput",
			dimension: "cpu",
			unit: "ops/s",
			direction: "HIB",
			headline: true,
			derived: false,
			rows: [
				{ provider: "alpha", value: 200, lo: 180, hi: 300, rank: 1, n: 6, sandboxes: 3 },
				{ provider: "beta", value: 190, lo: 150, hi: 230, rank: 1, n: 6, sandboxes: 3 },
				{ provider: "gamma", value: 50, lo: 50, hi: 50, rank: 3, n: 1, sandboxes: 1 },
			],
			unmeasured: [{ provider: "delta", outcome: "failed", reason: "sandbox lost" }],
		},
	],
} satisfies MetricFigureModel;
