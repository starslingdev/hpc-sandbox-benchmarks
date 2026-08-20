import type { PricingQuantityRule } from "../provider-pricing.ts";

export const namespaceComputeUnitQuantityRule: PricingQuantityRule = {
	kind: "max",
	terms: [
		{ dimension: "vcpus", unitsPerTargetUnit: 1 },
		{ dimension: "memoryGb", unitsPerTargetUnit: 0.5 },
	],
};
