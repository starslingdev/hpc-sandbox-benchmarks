import { defineProviderMeta } from "../provider-meta.ts";
import { modalPricing, modalTransport } from "./_modal.ts";

export default defineProviderMeta("modal-gvisor-standard", {
	displayName: "Modal (gVisor, standard pool)",
	vendor: "Modal",
	quotaDomain: "modal",
	website: "https://modal.com",
	sdkPackage: "modal",
	package: { directory: "modal", entry: "gvisor-standard" },
	artifact: { kind: "image" },
	inputs: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
	isolation: {
		class: "userspace",
		technology: "gVisor container",
		notes:
			"Modal's default sandbox runtime on the general instance pool: identical to modal-gvisor except creates leave experimentalOptions.performance_sensitive unset, so sandboxes can land on any instance type Modal offers and CPU variance is higher (https://modal.com/docs/guide/performance-sensitive-sandboxes).",
	},
	pricing: modalPricing,
	maturity: {
		status: "beta",
		notes:
			"Control variant for modal-gvisor: same V2 backend, bursting and image, without performance-sensitive scheduling. Not in the default matrix.",
	},
	specPinning: "settable",
	transport: modalTransport,
});
