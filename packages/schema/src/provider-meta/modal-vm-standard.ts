import { defineProviderMeta } from "../provider-meta.ts";
import { modalPricing, modalTransport } from "./_modal.ts";

export default defineProviderMeta("modal-vm-standard", {
	displayName: "Modal (VM, standard pool)",
	vendor: "Modal",
	quotaDomain: "modal",
	website: "https://modal.com",
	sdkPackage: "modal",
	package: { directory: "modal", entry: "vm-standard" },
	artifact: { kind: "image" },
	inputs: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
	isolation: {
		class: "microVM",
		technology: "microVM (VM runtime)",
		notes:
			"Modal's VM runtime on the general instance pool: identical to modal-vm except creates leave experimentalOptions.performance_sensitive unset, so CPU variance is higher (https://modal.com/docs/guide/performance-sensitive-sandboxes).",
	},
	pricing: modalPricing,
	maturity: {
		status: "beta",
		notes:
			"Control variant for modal-vm: same runtime, bursting and image, without performance-sensitive scheduling. Not in the default matrix.",
	},
	specPinning: "settable",
	transport: modalTransport,
});
