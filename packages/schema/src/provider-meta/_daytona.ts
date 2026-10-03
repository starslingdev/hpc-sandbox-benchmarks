import type { ProviderPricing } from "../provider-pricing.ts";
import type { ProviderTransport } from "../providers.ts";

/** Daytona's published billing, shared by its isolation variants. */
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
		{ label: "Daytona pricing", url: "https://www.daytona.io/pricing", checkedAt: "2026-08-08" },
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
