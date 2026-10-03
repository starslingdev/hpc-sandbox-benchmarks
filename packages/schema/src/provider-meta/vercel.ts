import { defineProviderMeta } from "../provider-meta.ts";
import { VERCEL_VCR_REPOSITORY } from "../toolchain.ts";

export default defineProviderMeta("vercel", {
	displayName: "Vercel Sandbox",
	vendor: "Vercel",
	website: "https://vercel.com/docs/sandbox",
	sdkPackage: "@vercel/sandbox",
	artifact: { kind: "mirror", repository: VERCEL_VCR_REPOSITORY },
	inputs: [
		{ name: "VERCEL_OIDC_TOKEN", source: { kind: "step-env", step: "vercel-auth" } },
		{ name: "VERCEL_TEAM_SLUG", source: { kind: "variable" }, required: false },
		{ name: "VERCEL_PROJECT_NAME", source: { kind: "variable" }, required: false },
	],
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM",
		notes:
			"Runs on Vercel's Hive build infrastructure and boots the shared Debian toolchain image mirrored into Vercel Container Registry.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "active-cpu",
				resource: "cpu",
				billingBasis: "active",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.128,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GB",
				usdPerUnitHour: 0.0212,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
		],
		adjustments: [
			{
				kind: "allowance",
				plan: "Hobby",
				resource: "cpu",
				quantity: 5,
				unit: "active vCPU-hour",
				scope: "monthly",
			},
		],
		targetHourlyCost: {
			kind: "usage_dependent",
			reason:
				"CPU is billed only while active, and Runs do not retain billable active-CPU utilization.",
		},
		notes: "Provisioned memory plus active CPU; $0.6816/hr is only a 100%-active reference.",
		sources: [
			{
				label: "Vercel Sandbox pricing",
				url: "https://vercel.com/docs/sandbox/pricing",
				checkedAt: "2026-08-08",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Custom ComputeSDK provider based on the upstream adapter and updated for the latest Vercel SDK; opt-in until a committed validation run exists.",
	},
	// Only vCPU is requested; Vercel derives memory at a fixed 2048 MB/vCPU ratio. Four vCPU
	// therefore reaches this benchmark's 8 GiB target, but the dimensions are not independent.
	specPinning: "fixed",
	transport: {
		// No hard vendor cap is claimed: long synchronous transport is unvalidated, so the repository's
		// conservative 60s durability policy routes longer work to current-session detach + exec polling.
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
	preAuth: "vercel-auth",
});
