import { defineProviderMeta } from "../provider-meta.ts";
import { daytonaTransport, daytonaV2Pricing } from "./_daytona.ts";

export default defineProviderMeta("daytona-vm-zen5-burst", {
	displayName: "Daytona (VM, Zen 5, burst)",
	vendor: "Daytona",
	quotaDomain: "daytona",
	website: "https://daytona.io",
	sdkPackage: "@daytona/sdk",
	package: { directory: "daytona", entry: "vm-zen5-burst" },
	artifact: { kind: "baked", nameSuffix: "-zen5-burst" },
	inputs: ["DAYTONA_API_KEY"],
	isolation: {
		class: "microVM",
		technology: "microVM (Linux VM)",
		notes:
			"Boots the toolchain image (imported by the bake as a v2 image) on Daytona's v2 control plane, where every Linux sandbox is a VM. Region us-east-ash-1 (amd64), CPU type pinned to zen5 (AMD EPYC Zen 5). Burst, mirroring modal-vm: a 1-core (2 vCPU) CPU guarantee, the smallest Daytona grants beside 8 GiB of reserved memory, with no CPU ceiling below the plan cap (10 cores = 20 vCPU), and memory reserved at the 8 GiB benchmark spec (the VM hotplugs extra memory too slowly to burst it).",
	},
	pricing: daytonaV2Pricing.zen5Burst,
	maturity: {
		status: "beta",
		notes:
			"Zen 5 with CPU bursting above a minimal guarantee, comparable to modal-vm. Successor to the pre-split daytona-vm runs (see LEGACY_PROVIDER_ALIASES).",
	},
	specPinning: "settable",
	transport: daytonaTransport,
});
