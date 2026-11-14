import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("briq", {
	displayName: "briq",
	vendor: "briq",
	website: "https://briq.cloud",
	sdkPackage: "@briq-cloud/sdk",
	// Boots the shared public toolchain image straight from ghcr.io; nothing is baked.
	artifact: { kind: "image" },
	inputs: [
		"BRIQ_API_KEY",
		{ name: "BRIQ_API_URL", source: { kind: "variable" }, default: "https://api.briq.cloud" },
	],
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM (one container image per sandbox)",
		notes:
			"Each sandbox runs one OCI image in its own microVM with its own guest kernel. The guest sees its own allocation: nproc and MemTotal match the size.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "size-large",
				resource: "cpu_memory",
				billingBasis: "provisioned",
				vendorUnit: "large size (4 vCPU / 8 GiB)",
				// 5.8 euro cents per hour at the 1.1127 USD per EUR display rate of 2026-11-11.
				usdPerUnitHour: 0.0645,
				// Sizes are fixed pairs, so this linear rule holds only for targets served by the large
				// size (the 4 vCPU / 8 GiB target is); packages/briq's tests pin that mapping.
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 0.25 },
				notes: "5.8 euro cents per hour, billed per second while the sandbox runs.",
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["size-large"] },
		notes:
			"Billed in euro per second at the size's rate while the sandbox runs; a sleeping sandbox is not billed for compute. The dollar figure converts the euro rate at the display rate the price list publishes, so it moves with that rate. The 40 GB volume each sandbox holds is billed only above the plan's included disk (the Team plan includes 500 GB) and is excluded from benchmark economics.",
		sources: [
			{
				label: "briq price list (JSON, euro cents per hour and the USD display rate)",
				url: "https://api.briq.cloud/v1/pricing",
				checkedAt: "2026-11-12",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Native SDK driver (@briq-cloud/sdk) for create, command execution, inventory, ambiguous-create recovery and convergent teardown. The credential must belong to a team used only for this benchmark: every sandbox in it is benchmark-owned. The 4 vCPU / 8 GiB target needs a size the key's policy allows; the 40 GB target is a volume mounted at the toolchain's state directory (/var/lib/phoronix-test-suite), which the kit proves with df after boot.",
	},
	specPinning: "fixed",
	transport: {
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
