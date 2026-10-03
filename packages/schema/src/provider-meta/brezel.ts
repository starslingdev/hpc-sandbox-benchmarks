import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("brezel", {
	displayName: "Brezel",
	vendor: "InferCrane",
	website: "https://github.com/infercrane/brezel",
	sdkPackage: "@infercrane/brezel",
	artifact: { kind: "none" },
	inputs: [
		"BREZEL_API_KEY",
		{ name: "BREZEL_API_URL", source: { kind: "variable" } },
		{ name: "BREZEL_PROJECT_ID", source: { kind: "variable" } },
		{ name: "BREZEL_ENVIRONMENT_REVISION", source: { kind: "variable" } },
	],
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM",
		notes:
			"Self-hosted Firecracker sandboxes. The benchmark environment revision is manually qualified and immutable; this repository does not build or publish it.",
	},
	pricing: {
		model: "unavailable",
		reason: "self_hosted",
		notes:
			"Brezel is self-hosted, so cost depends on the operator's host, storage, and network rather than a published per-sandbox rate.",
	},
	maturity: {
		status: "beta",
		notes:
			"Native SDK driver for create, command execution, files, inventory, ambiguous-create recovery, and convergent teardown. The credential must target a project dedicated to Starsling: every sandbox without confirmed backend removal in that project is benchmark-owned. Publication requires a separately qualified Linux/KVM endpoint and a manually pinned BREZEL_ENVIRONMENT_REVISION with the benchmark toolchain and 4 vCPU / 8 GiB target shape.",
	},
	// The qualified environment executes commands as its unprivileged guest user.
	runtimeIdentity: "unprivileged",
	specPinning: "fixed",
	transport: {
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
