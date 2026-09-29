import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("freestyle", {
	displayName: "Freestyle",
	vendor: "Freestyle",
	website: "https://www.freestyle.sh",
	sdkPackage: "freestyle",
	artifact: { kind: "none" },
	inputs: ["FREESTYLE_API_KEY"],
	runtimeIdentity: "unprivileged",
	isolation: {
		class: "vm",
		technology: "KVM virtual machine",
		notes:
			"Full Linux VMs booted from freestyle/ubuntu (Ubuntu 24.04). The driver grows the snapshot's resources to the requested shape before returning a session. The shared toolchain is installed at runtime.",
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
			"Opt-in native SDK driver. Boots vendor stock Ubuntu 24.04 rather than the shared Debian 13 image; runtime setup installs the pinned benchmark tools. The stock snapshot slug is mutable. Default-matrix promotion and published benchmark results require separate validation.",
	},
	specPinning: "settable",
	transport: { streaming: false, syncCapMs: 60_000, detachedPoll: true },
});
