import { describe, expect, it } from "bun:test";
import {
	amortizationBreakEvenRunsPerMonth,
	amortizedCostPerRun,
	burstCostPerRun,
} from "./index.ts";

describe("cost-model helpers (burst vs fixed-infra amortization)", () => {
	it("burstCostPerRun scales linearly with runtime", () => {
		// $3.60/hr → $0.001/s; a 10s run costs $0.01, double the runtime → double the cost.
		expect(burstCostPerRun(3.6, 10_000)).toBeCloseTo(0.01, 12);
		expect(burstCostPerRun(3.6, 20_000)).toBeCloseTo(0.02, 12);
		expect(burstCostPerRun(3.6, 0)).toBe(0);
	});

	it("amortizedCostPerRun spreads a fixed monthly bill across runs (falls as utilization rises)", () => {
		expect(amortizedCostPerRun(300, 1000)).toBeCloseTo(0.3, 12);
		expect(amortizedCostPerRun(300, 3000)).toBeCloseTo(0.1, 12);
		// A reserved box that serves no runs amortizes its bill over nothing — never reads as free.
		expect(amortizedCostPerRun(300, 0)).toBe(Number.POSITIVE_INFINITY);
		expect(amortizedCostPerRun(300, -1)).toBe(Number.POSITIVE_INFINITY);
	});

	it("amortizationBreakEvenRunsPerMonth is where amortized cost equals burst cost", () => {
		const monthlyUsd = 300;
		const hourlyUsd = 3.6;
		const runtimeMs = 60_000; // a 1-minute run → $0.06 burst
		const breakEven = amortizationBreakEvenRunsPerMonth(monthlyUsd, hourlyUsd, runtimeMs);
		// At break-even, the two models cost the same per run.
		expect(amortizedCostPerRun(monthlyUsd, breakEven)).toBeCloseTo(
			burstCostPerRun(hourlyUsd, runtimeMs),
			12,
		);
		// A zero-cost run has nothing to amortize against, so break-even is unreachable.
		expect(amortizationBreakEvenRunsPerMonth(monthlyUsd, hourlyUsd, 0)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});
});
