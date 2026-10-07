import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("createos", {
	displayName: "CreateOS",
	vendor: "NodeOps",
	website: "https://createos.sh/products/sandbox",
	sdkPackage: "@nodeops-createos/sandbox",
	artifact: { kind: "none" },
	inputs: [
		"CREATEOS_API_KEY",
		{
			name: "CREATEOS_SANDBOX_BASE_URL",
			source: { kind: "variable" },
			required: false,
			default: "https://api.sb.createos.sh",
		},
	],
	runtimeIdentity: "root",
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM",
		notes:
			"Dedicated Linux kernel with a 4 vCPU / 8 GiB shape and a 40 GiB overlay. The driver boots devbox:1 and installs the shared benchmark toolchain at runtime.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu",
				resource: "cpu",
				billingBasis: "provisioned",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.03616363,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.01159025,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
			{
				id: "disk",
				resource: "disk",
				billingBasis: "provisioned",
				vendorUnit: "GB",
				usdPerUnitHour: 0.0001584,
				quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory", "disk"] },
		notes: "Per-second compute and storage billing; egress is unmetered.",
		sources: [
			{
				label: "CreateOS Sandbox pricing",
				url: "https://createos.sh/products/sandbox",
				checkedAt: "2026-09-30",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Native SDK driver. Boots the mutable devbox:1 catalog image and installs the shared toolchain at runtime; default-matrix promotion requires a committed validation run.",
	},
	specPinning: "fixed",
	transport: { streaming: false, syncCapMs: 60_000, detachedPoll: true },
});
