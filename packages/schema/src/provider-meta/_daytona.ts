import type { ProviderPricing } from "../provider-pricing.ts";
import type { ProviderTransport } from "../providers.ts";

/** Daytona's v0 (container) billing: per-vCPU provisioned rates. */
export const daytonaPricing: ProviderPricing = {
	model: "published",
	components: [
		{
			id: "cpu",
			resource: "cpu",
			billingBasis: "provisioned",
			vendorUnit: "vCPU",
			usdPerUnitHour: 0.0504,
			quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
		},
		{
			id: "memory",
			resource: "memory",
			billingBasis: "provisioned",
			vendorUnit: "GiB",
			usdPerUnitHour: 0.0162,
			quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
		},
		{
			id: "disk",
			resource: "disk",
			billingBasis: "provisioned",
			vendorUnit: "GiB",
			usdPerUnitHour: 0.000108,
			quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
		},
	],
	adjustments: [
		{
			kind: "allowance",
			plan: "all",
			resource: "disk",
			quantity: 5,
			unit: "GiB",
			scope: "per_sandbox",
			notes: "The first 5 GiB applies to storage, not memory.",
		},
	],
	targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory"] },
	notes:
		"Per-second provisioned CPU, memory, and disk pricing; disk is excluded from benchmark economics.",
	sources: [
		{ label: "Daytona pricing", url: "https://www.daytona.io/pricing", checkedAt: "2026-11-16" },
	],
};

/** Daytona's v2 (Linux VM) card: per core-hour by CPU generation (a core is 2 vCPU), billed per
 *  minute at max(measured, guarantee). daytona-vm pins Zen 5; ephemeral NVMe is free. */
export const daytonaV2Pricing: ProviderPricing = {
	model: "published",
	components: [
		{
			id: "cpu-zen5",
			resource: "cpu",
			billingBasis: "max_request_or_usage",
			vendorUnit: "core (2 vCPU), AMD Zen 5",
			usdPerUnitHour: 0.235,
			quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 0.5 },
			tier: "on-demand",
		},
		{
			id: "memory",
			resource: "memory",
			billingBasis: "max_request_or_usage",
			vendorUnit: "GiB",
			usdPerUnitHour: 0.0162,
			quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			tier: "on-demand",
		},
	],
	targetHourlyCost: { kind: "usage_dependent", reason: "Bursts above the guarantee bill extra." },
	notes:
		"v2 on-demand rates: benchmark sandboxes are not preemptible, so the cheaper preemptible card ($0.164/core-hr Zen 5, $0.0113/GiB-hr) never applies. Ephemeral NVMe is free.",
	sources: [
		{ label: "Daytona pricing", url: "https://www.daytona.com/pricing", checkedAt: "2026-11-16" },
	],
};

export const daytonaTransport: ProviderTransport = {
	// The single-round-trip-capped reference case: the Daytona server returns HTTP 408 on a
	// multi-minute synchronous `executeCommand` while the process keeps running server-side, and
	// `@computesdk/daytona` ignores onStdout/onStderr (hardcoding `stderr:""`) — no streaming to
	// keep the connection productive. See docs/evidence/daytona-exec-transport.md. The exact
	// server threshold is unmeasured (sub-second probes succeed; multi-minute execs 408), so the
	// bound is a conservative 60s policy: budget anything longer to the detached+poll path
	// (`background` via nohup + the pollable filesystem).
	streaming: false,
	syncCapMs: 60_000,
	detachedPoll: true,
};
