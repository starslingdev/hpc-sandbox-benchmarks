import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("munito", {
	displayName: "Munito Sandboxes",
	vendor: "Munito",
	website: "https://munito.ai",
	sdkPackage: "@munitoai/cli",
	// Boots Munito's own `base` template; the API takes no image.
	artifact: { kind: "none" },
	inputs: [
		"MUNITO_API_KEY",
		{ name: "MUNITO_SANDBOXES_URL", source: { kind: "variable" }, required: false },
	],
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM",
		notes: "Each sandbox is a Firecracker microVM with its own guest kernel. Commands run as root.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu",
				resource: "cpu",
				billingBasis: "provisioned",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.0072,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
				tier: "Up to 8 vCPUs and 16 GiB",
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.0009,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
				tier: "Up to 8 vCPUs and 16 GiB",
			},
		],
		adjustments: [
			{
				kind: "fee",
				plan: "Starter",
				resource: "plan",
				quantity: 15,
				unit: "USD/month",
				scope: "monthly",
				notes:
					"The price of a plan comes back as credits for its month, and usage takes them first. The trial runs 2 sandboxes at once, so a benchmark run needs a plan.",
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory"] },
		notes:
			"Per-second billing of the full size while a sandbox runs; a paused or stopped sandbox pays for no time. The root disk has no price of its own. The 4 vCPU / 8 GiB target is the `large` preset at $0.036/hr. Above 8 vCPUs and 16 GiB, a size pays $0.0128 per vCPU-hour and $0.0016 per GiB-hour.",
		sources: [
			{
				label: "Munito Sandboxes pricing",
				url: "https://docs.munito.ai/sandboxes/pricing",
				checkedAt: "2026-11-14",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Public preview. Native REST driver for create, readiness, command exec with streamed output, files, inventory by a metadata marker, and delete teardown; opt-in. A create sets the root disk from 10 to 100 GiB, so the benchmark's 40 GB target maps onto it. The stock `base` template is Debian 12 with a runtime-installed toolchain rather than the shared toolchain image.",
	},
	// A create names a preset or sets vCPUs and memory itself, and sets its disk.
	specPinning: "settable",
	transport: {
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
