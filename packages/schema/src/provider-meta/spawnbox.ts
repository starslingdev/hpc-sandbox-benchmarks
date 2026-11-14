import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("spawnbox", {
	displayName: "Spawnbox",
	vendor: "TulipFarm",
	website: "https://github.com/TulipFarm/spawnbox",
	// No client library is published; the adapter targets the documented `/v1` HTTP API.
	sdkPackage: "Spawnbox HTTP API",
	// The operator builds a Spawnbox template whose `base` is the shared toolchain image; the adapter
	// boots that template and proves its `base` is exactly the resolved image ref.
	artifact: { kind: "image" },
	inputs: ["SPAWNBOX_API_KEY", { name: "SPAWNBOX_URL", source: { kind: "variable" } }],
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM",
		notes:
			"Self-hosted. Each sandbox is a Firecracker microVM restored from a template snapshot, with its own guest kernel. On a host without KVM, Spawnbox falls back to gVisor; a benchmark host must have KVM.",
	},
	pricing: {
		model: "unavailable",
		reason: "self_hosted",
		notes:
			"Spawnbox is open-source and self-hosted, so cost depends on the operator's host, storage, and network rather than a published per-sandbox rate.",
	},
	maturity: {
		status: "beta",
		notes:
			"HTTP API driver for create, command execution, files, inventory, ambiguous-create recovery by label, and teardown. The endpoint is operator-run: results depend on the host it runs on.",
	},
	// The template pins 4 vCPU / 8 GiB / 40 GiB; a create request cannot change it.
	specPinning: "fixed",
	transport: {
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
