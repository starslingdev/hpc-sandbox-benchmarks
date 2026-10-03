import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("runloop", {
	displayName: "Runloop",
	vendor: "Runloop",
	website: "https://runloop.ai",
	sdkPackage: "@computesdk/runloop",
	artifact: { kind: "baked" },
	inputs: [
		"RUNLOOP_API_KEY",
		{ name: "RUNLOOP_BLUEPRINT", source: { kind: "variable" }, required: false },
	],
	isolation: {
		class: "microVM",
		technology: "microVM",
		notes:
			"Runloop Devboxes are isolated, ephemeral virtual machines. This adapter boots a version-scoped Blueprint built from the shared toolchain image and retains per-run custom sizing.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu",
				resource: "cpu",
				billingBasis: "provisioned",
				vendorUnit: "CPU",
				usdPerUnitHour: 0.108,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GB",
				usdPerUnitHour: 0.0252,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
			{
				id: "disk",
				resource: "disk",
				billingBasis: "provisioned",
				vendorUnit: "GB",
				usdPerUnitHour: 0.00034236,
				quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory"] },
		notes:
			"Provisioned Devbox CPU and memory rates; active storage is excluded from benchmark economics.",
		sources: [
			{ label: "Runloop pricing", url: "https://runloop.ai/pricing", checkedAt: "2026-08-08" },
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Official ComputeSDK adapter with a released toolchain Blueprint plus custom CPU, memory, and disk sizing; opt-in until a committed benchmark run validates the integration.",
	},
	// Devboxes run commands as their own unprivileged Blueprint user, and the adapter exposes no
	// root lever the way e2b/novita do — so the toolchain accommodates it (PTS_STATE_SELECT_SH in
	// toolchain.ts) instead of the summary flagging every replicate.
	runtimeIdentity: "unprivileged",
	// CUSTOM_SIZE exposes independent CPU, memory, and disk fields and can express 4 / 8 / 40 exactly.
	specPinning: "settable",
	transport: {
		// The adapter waits for completed command output and does not forward streaming callbacks.
		// Keep long steps off one control-plane request by using its background exec plus filesystem
		// polling path; short setup commands remain synchronous.
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
