import { defineProviderMeta } from "../provider-meta.ts";
import { daytonaTransport, daytonaV2Pricing } from "./_daytona.ts";

export default defineProviderMeta("daytona-vm-zen5", {
	displayName: "Daytona (VM)",
	vendor: "Daytona",
	quotaDomain: "daytona",
	website: "https://daytona.io",
	sdkPackage: "@daytona/sdk",
	package: { directory: "daytona", entry: "vm-zen5" },
	artifact: { kind: "baked", nameSuffix: "-zen5" },
	inputs: ["DAYTONA_API_KEY"],
	isolation: {
		class: "microVM",
		technology: "microVM (Linux VM)",
		notes:
			"Boots the toolchain image (imported by the bake as a v2 image) on Daytona's v2 control plane, where every Linux sandbox is a VM. Region us-east-ash-1 (amd64), CPU type pinned to zen5 (AMD EPYC Zen 5). Fixed: the guarantee equals the ceiling at the benchmark spec (2 cores = 4 vCPU, 8 GiB memory, 40 GiB disk), so the sandbox cannot burst.",
	},
	pricing: daytonaV2Pricing.zen5Fixed,
	maturity: {
		status: "beta",
		notes: "The validated reference variant: the benchmark spec held exactly, on Zen 5.",
	},
	specPinning: "settable",
	transport: daytonaTransport,
});
