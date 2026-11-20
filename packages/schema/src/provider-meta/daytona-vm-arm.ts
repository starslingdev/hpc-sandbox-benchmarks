import { defineProviderMeta } from "../provider-meta.ts";
import { daytonaTransport, daytonaV2Pricing } from "./_daytona.ts";

export default defineProviderMeta("daytona-vm-arm", {
	displayName: "Daytona (VM, arm64, fixed)",
	vendor: "Daytona",
	quotaDomain: "daytona",
	website: "https://daytona.io",
	sdkPackage: "@daytona/sdk",
	package: { directory: "daytona", entry: "vm-arm" },
	artifact: { kind: "baked", nameSuffix: "-arm" },
	inputs: ["DAYTONA_API_KEY"],
	isolation: {
		class: "microVM",
		technology: "microVM (Linux VM)",
		notes:
			"Boots the toolchain image (an arm64 import of it) on Daytona's v2 control plane in us-east-iad-1, arm64, with no cpuType pin (graviton pins stay in creating; an unpinned arm64 create boots aarch64). Fixed: the guarantee equals the ceiling at the benchmark spec (2 cores = 4 vCPU, 8 GiB memory, 40 GiB disk).",
	},
	pricing: daytonaV2Pricing.armFixed,
	maturity: {
		status: "beta",
		notes:
			"Requires an arm64 build of the toolchain image; the published image is amd64 only, so the bake and boot fail until one exists. Best-effort in the release plan until then.",
	},
	specPinning: "settable",
	transport: daytonaTransport,
});
