import { defineProviderMeta } from "../provider-meta.ts";
import { modalPricing, modalTransport } from "./_modal.ts";

export default defineProviderMeta("modal-vm-fixed", {
	displayName: "Modal (VM)",
	vendor: "Modal",
	quotaDomain: "modal",
	website: "https://modal.com",
	sdkPackage: "modal",
	package: { directory: "modal", entry: "vm-fixed" },
	artifact: { kind: "image" },
	inputs: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
	isolation: {
		class: "microVM",
		technology: "microVM (VM runtime)",
		notes:
			"Modal's VM runtime — a gVisor-free KVM microVM, selected per-create via runtime: vm with the CPU pinned (reservation equals hard limit = 4, which the guest sees as 4 vCPU and Modal bills as 4 cores: 1 vCPU = 1 core on the VM runtime, confirmed by Modal 2026-11-23), memory pinned, and experimentalOptions.performance_sensitive (same pushed toolchain image as modal-gvisor; https://modal.com/docs/guide/performance-sensitive-sandboxes).",
	},
	pricing: modalPricing,
	maturity: {
		status: "beta",
		notes:
			"Fixed-CPU Modal VM: cpu = cpuLimit at the benchmark spec, so it cannot burst. Shares Modal credentials/pricing and the toolchain image with the other Modal variants.",
	},
	specPinning: "settable",
	transport: modalTransport,
});
