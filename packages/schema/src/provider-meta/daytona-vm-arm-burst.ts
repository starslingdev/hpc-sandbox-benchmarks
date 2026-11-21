import { defineProviderMeta } from "../provider-meta.ts";
import { daytonaTransport, daytonaV2Pricing } from "./_daytona.ts";

export default defineProviderMeta("daytona-vm-arm-burst", {
	displayName: "Daytona (VM, arm, burst)",
	vendor: "Daytona",
	quotaDomain: "daytona",
	website: "https://daytona.io",
	sdkPackage: "@daytona/sdk",
	package: { directory: "daytona", entry: "vm-arm-burst" },
	artifact: { kind: "baked", nameSuffix: "-arm-burst" },
	inputs: ["DAYTONA_API_KEY"],
	isolation: {
		class: "microVM",
		technology: "microVM (Linux VM)",
		notes:
			"Boots the toolchain image (an arm64 import of it) on Daytona's v2 control plane in us-east-iad-1, arm64, with no cpuType pin. Burst, mirroring modal-vm: a 1-core (2 vCPU) CPU guarantee, the smallest Daytona grants beside 8 GiB of reserved memory, with no CPU ceiling below the plan cap (10 cores = 20 vCPU), and memory reserved at the 8 GiB benchmark spec.",
	},
	pricing: daytonaV2Pricing.armBurst,
	maturity: {
		status: "beta",
		notes:
			"Requires an arm64 build of the toolchain image; the published image is amd64 only, so the bake and boot fail until one exists. Best-effort in the release plan until then.",
	},
	specPinning: "settable",
	transport: daytonaTransport,
});
