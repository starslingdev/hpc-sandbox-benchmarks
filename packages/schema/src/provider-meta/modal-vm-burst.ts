import { defineProviderMeta } from "../provider-meta.ts";
import { modalPricing, modalTransport } from "./_modal.ts";

export default defineProviderMeta("modal-vm-burst", {
	displayName: "Modal (VM, burst)",
	vendor: "Modal",
	quotaDomain: "modal",
	website: "https://modal.com",
	sdkPackage: "modal",
	package: { directory: "modal", entry: "vm-burst" },
	artifact: { kind: "image" },
	inputs: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
	isolation: {
		class: "microVM",
		technology: "microVM (VM runtime)",
		notes:
			"Modal's VM runtime — a gVisor-free KVM microVM, selected per-create via runtime: vm with CPU and memory bursting between the shared BURST_BOUNDS floor and ceiling (2-8 vCPU, 8-16 GiB; `cpu`/`cpuLimit` are vCPU, and on the VM runtime 1 vCPU = 1 core = 1 billed `cpu` unit, confirmed by Modal 2026-11-23) and experimentalOptions.performance_sensitive (same pushed toolchain image as modal-gvisor; https://modal.com/docs/guide/performance-sensitive-sandboxes).",
	},
	pricing: modalPricing,
	maturity: {
		status: "beta",
		notes:
			"Isolation variant sharing Modal credentials/pricing with modal-gvisor; selects runtime: vm at create. Successor to the pre-split `modal-vm` runs (see LEGACY_PROVIDER_ALIASES), which bursted the same way. Carries committed runs and is in the default matrix set.",
	},
	specPinning: "settable",
	transport: modalTransport,
});
