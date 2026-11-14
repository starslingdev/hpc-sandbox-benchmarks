import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("tangle", {
	displayName: "Tangle Sandbox",
	vendor: "Tangle",
	website: "https://sandbox.tangle.tools",
	sdkPackage: "@tangle-network/sandbox",
	// The create's `environment` boots the shared toolchain image directly; nothing to bake.
	artifact: { kind: "image" },
	inputs: ["TANGLE_API_KEY"],
	isolation: {
		class: "unknown",
		technology: "Deployment-dependent (Docker observed during qualification)",
		notes:
			"Prior qualification observed a Docker-backed container; the platform also offers microVM drivers, so publish the in-guest probe's class per run.",
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
			"Published `general` pool rate card: requested resources billed per second while running (about $0.128/hr at the target, $0.04/hr minimum); the GB-to-GiB conversion is unverified.",
		sources: [
			{
				label: "Tangle Sandbox rate card",
				url: "https://sandbox.tangle.tools/v1/pricing/sandboxes",
				checkedAt: "2026-10-13",
			},
			{
				label: "Tangle subscription plans",
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
					"Required for the 4 vCPU target (the free plan caps sandboxes at 2 vCPU); includes an equal monthly usage credit.",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Native SDK driver booting the shared toolchain image as uid 1000 without a passwd entry; opt-in until a committed validation run exists.",
	},
	// The hosted runtime injects an unprivileged guest UID.
	runtimeIdentity: "unprivileged",
	specPinning: "settable",
	transport: { streaming: false, syncCapMs: 60_000, detachedPoll: true },
});
