import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("microsandbox-cloud", {
	displayName: "Microsandbox Cloud",
	vendor: "Microsandbox",
	website: "https://microsandbox.dev",
	sdkPackage: "microsandbox",
	artifact: { kind: "image" },
	// MSB_API_URL is only an override for staging/private deployments. The SDK defaults to
	// api.microsandbox.dev, so the key alone is the cloud-selection and credential gate.
	inputs: ["MSB_API_KEY", { name: "MSB_API_URL", source: { kind: "variable" }, required: false }],
	isolation: {
		class: "microVM",
		technology: "libkrun microVM (cloud)",
		notes:
			"The Microsandbox SDK talks to msb-cloud; Nomad schedules the same libkrun microVM runtime on remote hosts.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu",
				resource: "cpu",
				billingBasis: "provisioned",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.048,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.003,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
			{
				id: "disk",
				resource: "disk",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.0000625,
				quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
				notes: "NVMe root disk; it bills until deleted, even while the sandbox is stopped.",
			},
		],
		adjustments: [
			{
				kind: "fee",
				plan: "Builder (includes $20 usage credit)",
				resource: "plan",
				quantity: 20,
				unit: "USD",
				scope: "monthly",
				notes: "The free trial caps a sandbox at 2 vCPU / 1 GiB, so the target needs Builder.",
			},
		],
		targetHourlyCost: {
			kind: "plan_dependent",
			reason: "The charge depends on plan fees, remaining monthly pools, and overage consumption.",
		},
		notes:
			"Private-beta rates. Builder's $20/month is a usage credit, not a resource pool; CPU and memory stop billing when a sandbox stops.",
		sources: [
			{
				label: "Microsandbox pricing",
				url: "https://microsandbox.dev/pricing",
				checkedAt: "2026-11-16",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Create, readiness, exec, filesystem, list, and graceful teardown are supported. Cloud snapshots and published ports are not yet available.",
	},
	specPinning: "settable",
	transport: {
		// The adapter does not expose streaming callbacks. Use detached+filesystem polling for any
		// benchmark-length step so a long-lived remote WebSocket is not the durability boundary.
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
