import { defineProviderMeta } from "../provider-meta.ts";
import { modalPricing, modalTransport } from "./_modal.ts";

export default defineProviderMeta("modal-vm", {
	displayName: "Modal (VM)",
	vendor: "Modal",
	quotaDomain: "modal",
	website: "https://modal.com",
	sdkPackage: "modal",
	package: { directory: "modal", entry: "vm" },
	artifact: { kind: "image" },
	inputs: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
	isolation: {
		class: "microVM",
		technology: "microVM (VM runtime)",
		notes:
			"Modal's VM runtime — a gVisor-free KVM microVM, selected per-create via runtime: vm with CPU and memory bursting (same pushed toolchain image as modal-gvisor).",
	},
	pricing: modalPricing,
	maturity: {
		status: "beta",
		notes:
			"Isolation variant sharing Modal credentials/pricing with modal-gvisor; selects runtime: vm at create. Carries committed runs and is in the default matrix set.",
	},
	specPinning: "settable",
	transport: modalTransport,
});
