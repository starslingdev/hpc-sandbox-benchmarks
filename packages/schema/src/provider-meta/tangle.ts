import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("tangle", {
	displayName: "Tangle Sandbox",
	vendor: "Tangle",
	website: "https://sandbox.tangle.tools",
	sdkPackage: "@tangle-network/sandbox",
	// The create's `environment` takes an arbitrary OCI reference, so the shared toolchain image is
	// booted directly; there is no provider-side template to bake.
	artifact: { kind: "image" },
	inputs: [
		"TANGLE_API_KEY",
		{ name: "TANGLE_SANDBOX_BASE_URL", source: { kind: "variable" }, required: false },
	],
	isolation: {
		class: "unknown",
		technology: "Deployment-dependent (Docker observed during qualification)",
		notes:
			"Prior qualification observed a Docker-backed container. This adapter does not select a driver, and the platform also supports microVM and operator-backed drivers. Run the in-guest isolation probe for each benchmark and publish its observed class; the qualification observation is not a public default guarantee.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu",
				resource: "cpu",
				billingBasis: "provisioned",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.010445613415710504,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GB",
				usdPerUnitHour: 0.007050789055604591,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
			{
				id: "disk",
				resource: "disk",
				billingBasis: "provisioned",
				vendorUnit: "GB",
				usdPerUnitHour: 0.0007344571932921447,
				quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory", "disk"] },
		notes:
			"The published `general` pool rate card (source: reference-constants) bills requested resources per second while running, with a $0.04/hr minimum across CPU, memory and disk; the 4 vCPU / 8 GB / 40 GB component sum is about $0.128/hr if admitted. Memory and disk rates are per GB, treated here as GiB; the unit conversion remains unverified. Maximum shapes and paid-plan concurrency are not publicly established. Stopped-sandbox and snapshot storage charges are unknown.",
		sources: [
			{
				label: "Tangle Sandbox rate card",
				url: "https://sandbox.tangle.tools/v1/pricing/sandboxes",
				checkedAt: "2026-10-13",
			},
			{
				label: "Tangle public subscription plans",
				url: "https://id.tangle.tools/api/v1/plans",
				checkedAt: "2026-10-13",
			},
		],
		adjustments: [
			{
				kind: "fee",
				plan: "Pro",
				resource: "plan",
				quantity: 29.99,
				unit: "USD/month",
				scope: "monthly",
				notes:
					"Public Pro subscription price; the plan data does not establish target-shape admission or a concurrent-sandbox limit.",
			},
			{
				kind: "allowance",
				plan: "Pro",
				resource: "plan",
				quantity: 29.99,
				unit: "USD",
				scope: "monthly",
				notes:
					"Monthly usage credit, which does not discount the headline resource rate. Unused-credit rollover is not published.",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Native @tangle-network/sandbox driver (isolated, agent-free, ephemeral create booting the shared toolchain image; blocking exec; spawned background processes; delete observed to 404). Opt-in until driver-check passes and a committed validation run exists.",
	},
	// The hosted runtime injects an unprivileged guest UID.
	runtimeIdentity: "unprivileged",
	specPinning: "settable",
	transport: {
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
