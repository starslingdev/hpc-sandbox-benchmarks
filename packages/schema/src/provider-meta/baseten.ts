import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("baseten", {
	displayName: "Baseten Sandboxes",
	vendor: "Baseten",
	website: "https://docs.baseten.co/sandboxes/overview",
	sdkPackage: "@basetenlabs/sandbox",
	// A sandbox image must run Baseten's sandbox API server, so the shared toolchain cannot boot as
	// is: the release bakes it into a Baseten image (see packages/baseten/README.md).
	artifact: { kind: "baked" },
	inputs: ["BASETEN_API_KEY"],
	isolation: {
		class: "unknown",
		technology: "Baseten sandbox runtime (undocumented)",
		notes:
			"Baseten does not document the isolation technology. Images run Blaxel's sandbox API binary, CPU is coupled to memory (2048 MiB per vCPU up to 8 GiB), and the root filesystem is memory-backed, so the benchmark mounts a per-sandbox 40 GiB persistent volume where PTS and HOME write.",
	},
	pricing: {
		model: "unavailable",
		reason: "unpublished",
		notes:
			"Baseten publishes no sandbox CPU, memory or volume rate. The sandboxes docs say only that sandboxes are free during the pre-release (until 2026-11-16) and that a sandbox on standby bills only its storage.",
		sources: [
			{
				label: "Baseten Sandboxes overview",
				url: "https://docs.baseten.co/sandboxes/overview",
				checkedAt: "2026-11-14",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Pre-release. Not yet validated live. Opt-in. The default quota is 10 concurrent sandboxes per organization, and a per-account memory cap applies that Baseten does not publish.",
	},
	// memory=8192 lands on 4 vCPU through Baseten's fixed memory-to-vCPU table; the SDK has no CPU knob.
	specPinning: "fixed",
	transport: {
		// The process API's synchronous exec has no documented limit; long steps run as native
		// background processes, as on Blaxel, whose sandbox API Baseten serves.
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
