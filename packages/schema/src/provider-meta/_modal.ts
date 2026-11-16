import type { ProviderPricing } from "../provider-pricing.ts";
import type { ProviderTransport } from "../providers.ts";

export const modalPricing: ProviderPricing = {
	model: "published",
	components: [
		{
			id: "cpu",
			resource: "cpu",
			billingBasis: "max_request_or_usage",
			vendorUnit: "physical core (2 vCPU)",
			usdPerUnitHour: 0.141912,
			quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 0.5 },
			tier: "on-demand",
			notes:
				"$0.00003942/core-s (sandbox rate). The billed max(request, usage) quantity must come from provider-observed usage.",
		},
		{
			id: "memory",
			resource: "memory",
			billingBasis: "max_request_or_usage",
			vendorUnit: "GiB",
			usdPerUnitHour: 0.024012,
			quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			tier: "on-demand",
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
		"On-demand rates: CPU sandboxes are not subject to preemption, so no preemptible discount applies. No exact benchmark cost is inferred without sandbox-scoped billed usage.",
	sources: [{ label: "Modal pricing", url: "https://modal.com/pricing", checkedAt: "2026-11-16" }],
};

export const modalTransport: ProviderTransport = {
	// The native Modal driver runs `sandbox.exec([...])` and waits for the result, with no
	// separate per-exec timeout. There is no hard server gateway cap, but the exec stdio stream
	// is not reliable over benchmark-length execs: a ~66-minute better-auth run completed
	// in-sandbox (manifest exit_code 0) while the harness-side stream died with gRPC INTERNAL
	// "Failed to read exec stdio stream" (ZEHA3277, 2026-07-10), losing the step result. Cap
	// synchronous execs at 30 minutes so suite-length steps take the detached+poll path, which
	// survives a dropped stream; short setup steps keep the cheaper direct exec.
	streaming: false,
	syncCapMs: 30 * 60_000,
	detachedPoll: true,
};
