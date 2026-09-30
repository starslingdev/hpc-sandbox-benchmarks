import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("freestyle", {
	displayName: "Freestyle",
	vendor: "Freestyle",
	website: "https://www.freestyle.sh",
	sdkPackage: "freestyle",
	artifact: { kind: "baked", source: "native-snapshot" },
	inputs: [
		"FREESTYLE_API_KEY",
		{
			name: "FREESTYLE_SNAPSHOT_ID",
			source: { kind: "variable" },
			required: false,
			description:
				"Required for benchmark execution: immutable sh-... ID from the native bake report. Not needed to bake.",
		},
		{
			name: "FREESTYLE_BASE_SNAPSHOT_ID",
			source: { kind: "variable" },
			required: false,
			description:
				"Optional bake base: immutable sh-... ID recorded in /freestyle-snapshot-build.json; empty bootstraps freestyle/ubuntu.",
		},
	],
	runtimeIdentity: "unprivileged",
	isolation: {
		class: "vm",
		technology: "KVM virtual machine",
		notes:
			"Full Linux VMs booted from a native custom snapshot derived from Freestyle Ubuntu 24.04, with the shared pinned toolchain and a clean system PATH. The driver verifies the requested shape before returning a session. This is an Ubuntu VM, while OCI-based providers use Debian 13.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu",
				resource: "cpu",
				billingBasis: "provisioned",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.04032,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.0129,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
			{
				id: "disk",
				resource: "disk",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.000086,
				quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory"] },
		notes:
			"Standard allocated-resource rates, metered per second. Paused VMs accrue storage only. Monthly allowances and prepaid plan minimums do not discount the intrinsic CPU-plus-memory rate; custom enterprise pricing is excluded. The 40 GiB disk target requires Hobby or higher because Free caps disk at 32 GiB.",
		sources: [
			{
				label: "Freestyle pricing and limits",
				url: "https://www.freestyle.sh/docs/vms/pricing-and-limits",
				checkedAt: "2026-09-29",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Opt-in native SDK driver with a regenerable custom snapshot recipe. FREESTYLE_SNAPSHOT_ID pins an immutable snapshot ID; release builds record that ID. Default-matrix promotion requires live conformance and complete Mastra metric coverage on the selected snapshot.",
	},
	specPinning: "settable",
	transport: { streaming: false, syncCapMs: 60_000, detachedPoll: true },
});
