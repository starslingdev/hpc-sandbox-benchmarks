import { defineProviderMeta } from "../provider-meta.ts";
import { modalPricing, modalTransport } from "./_modal.ts";

export default defineProviderMeta("modal-gvisor", {
	displayName: "Modal (gVisor)",
	vendor: "Modal",
	quotaDomain: "modal",
	website: "https://modal.com",
	sdkPackage: "modal",
	package: { directory: "modal", entry: "gvisor" },
	artifact: { kind: "image" },
	inputs: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
	isolation: {
		class: "userspace",
		technology: "gVisor container",
		notes:
			"Modal's default sandbox runtime. CPU and memory can burst beyond the request. Billing: 1 `cpu` unit per guest vCPU, from our 2026-11-23 probe (cpu=cpuLimit 2/4/8 billed 2.00/4.00/8.00 units; the guest shows at least 2 processors; the shipped cpu 0.125 / no-limit shape is billed by usage); this rests on billing evidence, not a Modal confirmation. Creates set experimentalOptions.performance_sensitive so Modal schedules onto its low-variance CPU pool (https://modal.com/docs/guide/performance-sensitive-sandboxes).",
	},
	pricing: modalPricing,
	maturity: {
		status: "ga",
		notes: "V2 backend with bursting and performance-sensitive CPU scheduling.",
	},
	specPinning: "settable",
	transport: modalTransport,
});
