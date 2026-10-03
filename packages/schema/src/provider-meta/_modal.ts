import type { ProviderPricing } from "../provider-pricing.ts";

export const modalPricing: ProviderPricing = {
	model: "published",
	components: [
		{
			id: "cpu",
			resource: "cpu",
			billingBasis: "max_request_or_usage",
			vendorUnit: "requested CPU unit (vendor physical-core rate)",
			usdPerUnitHour: 0.141912,
			quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			notes:
				"Requested CPU maps one-to-one to vendor CPU units, but the billed max(request, usage) quantity must come from provider-observed usage.",
		},
		{
			id: "memory",
			resource: "memory",
			billingBasis: "max_request_or_usage",
			vendorUnit: "GiB",
			usdPerUnitHour: 0.024012,
			quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			notes: "$0.00000667/GiB-s; a request-equals-limit configuration does not prove billed usage.",
		},
	],
	adjustments: [
		{
			kind: "allowance",
			plan: "all",
			resource: "disk",
			quantity: 1024,
			unit: "GiB-month",
			scope: "monthly",
		},
	],
	targetHourlyCost: {
		kind: "usage_dependent",
		reason:
			"Modal bills max(request, usage); request-equals-limit does not substitute for provider-observed billed quantities.",
	},
	notes:
		"Published CPU and memory rates are retained as catalog metadata, but no exact benchmark cost is inferred without sandbox-scoped billed usage.",
	sources: [{ label: "Modal pricing", url: "https://modal.com/pricing", checkedAt: "2026-08-08" }],
};
