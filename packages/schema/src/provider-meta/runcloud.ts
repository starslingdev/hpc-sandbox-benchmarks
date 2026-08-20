import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("runcloud", {
	displayName: "run.cloud",
	vendor: "run.cloud",
	website: "https://run.cloud",
	sdkPackage: "@run-cloud/sdk",
	artifact: { kind: "image" },
	inputs: ["RUN_CLOUD_API_KEY"],
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM",
		notes:
			"Dedicated microVM sandboxes booting an arbitrary OCI image; CPU, memory, and writable disk are independently requested at create time.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu-floor",
				resource: "cpu",
				billingBasis: "provisioned_plus_burst",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.008856,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
				notes:
					"Reserved floor; CPU consumed above the requested size is metered separately at the same physical-core rate.",
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.0029943,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
		],
		targetHourlyCost: {
			kind: "usage_dependent",
			reason:
				"The reserved floor excludes uncapped CPU burst above the requested size, and Runs do not retain that billable usage.",
		},
		notes: "$0.0593784/hr is the target reservation floor, not a complete target-hour total.",
		sources: [
			{ label: "run.cloud pricing", url: "https://run.cloud/pricing", checkedAt: "2026-08-08" },
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Direct adapter over @run-cloud/sdk with create, lifecycle, streaming exec, and public tunnel support; opt-in until a committed validation run exists.",
	},
	specPinning: "settable",
	transport: {
		// The native WebSocket exec delivers stdout/stderr chunks incrementally. Keep the repository's
		// conservative 60s policy for unvalidated long-lived streams; longer work daemonizes and polls
		// the harness-owned done file through short execs.
		streaming: true,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
