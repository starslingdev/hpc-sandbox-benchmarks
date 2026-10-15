import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("digitalocean", {
	displayName: "DigitalOcean MicroVMs",
	vendor: "DigitalOcean",
	website: "https://www.digitalocean.com/products/microvms",
	// No client library covers MicroVMs yet (see packages/digitalocean/README.md).
	sdkPackage: "DigitalOcean MicroVMs API",
	// Boots the shared public toolchain image straight from ghcr.io (`source.oci_ref`); nothing baked.
	artifact: { kind: "image" },
	inputs: ["DIGITAL_OCEAN_TOKEN"],
	isolation: {
		class: "microVM",
		technology: "microVM (container image in its own kernel)",
		notes:
			"Each MicroVM runs one OCI image in a Firecracker VM with its own guest kernel (6.1 observed); commands run inside the workload container (containerd-runc) as root, so the isolation probe reads `container` unless machineVmm is read first. The guest sees its own allocation: nproc and MemTotal match the size.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "size-8x16",
				resource: "cpu_memory",
				billingBasis: "provisioned",
				vendorUnit: "8 vCPU / 16 GiB size",
				usdPerUnitHour: 0.312,
				// Sizes are fixed pairs; the 4 vCPU / 8 GiB target is served by one 8 vCPU / 16 GiB MicroVM.
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 0.25 },
				notes: "8 x $0.022 per vCPU-hour + 16 x $0.0085 per GiB-hour.",
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["size-8x16"] },
		notes:
			"Per-second compute billing at the allocated size, only while running (not while creating, pausing or paused). Disk ($0.05 per GiB-month of used storage) and egress ($0.01/GiB) are usage-billed and excluded from benchmark economics.",
		sources: [
			{
				label: "DigitalOcean MicroVMs pricing",
				url: "https://docs.digitalocean.com/products/microvms/details/pricing/",
				checkedAt: "2026-10-14",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Public preview (MKC1 only). Validated live: driver-check passes every port check, and the CPU suites ran end to end on the shared toolchain image. Opt-in: the team's disk limit (400 GiB) fits one 8 vCPU / 16 GiB MicroVM (320 GB) at a time.",
	},
	// Fixed vCPU / memory pairs (1/2, 2/4, 8/16, 16/32), each with its own fixed disk.
	specPinning: "fixed",
	transport: {
		streaming: false,
		// Exec dies past ~41s (HTTP 524), well inside its documented 60s; longer steps detach.
		syncCapMs: 30_000,
		detachedPoll: true,
	},
});
