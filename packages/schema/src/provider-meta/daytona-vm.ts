import { defineProviderMeta } from "../provider-meta.ts";
import { daytonaPricing, daytonaTransport } from "./_daytona.ts";

export default defineProviderMeta("daytona-vm", {
	displayName: "Daytona (VM)",
	vendor: "Daytona",
	quotaDomain: "daytona",
	website: "https://daytona.io",
	sdkPackage: "@daytona/sdk",
	package: { directory: "daytona", entry: "vm" },
	artifact: { kind: "baked" },
	inputs: [
		"DAYTONA_API_KEY",
		{ name: "DAYTONA_TARGET", source: { kind: "variable" }, default: "us-east-ash-1" },
		{ name: "DAYTONA_SNAPSHOT", source: { kind: "variable" }, required: false },
	],
	isolation: {
		class: "microVM",
		technology: "microVM (Linux VM)",
		notes:
			"Boots the toolchain image (imported by the bake as a v2 image) on Daytona's v2 control plane, where every Linux sandbox is a VM; region us-east-ash-1 (DAYTONA_TARGET), whose hosts are AMD EPYC Zen 5. CPU and memory are pinned at create (request = limit).",
	},
	pricing: daytonaPricing,
	maturity: {
		status: "ga",
		notes: "The validated reference provider for this harness (pre-baked toolchain snapshot).",
	},
	specPinning: "settable",
	transport: daytonaTransport,
});
