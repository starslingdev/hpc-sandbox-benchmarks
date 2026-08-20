import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("e2b", {
	displayName: "E2B",
	vendor: "E2B",
	website: "https://e2b.dev",
	sdkPackage: "@computesdk/e2b",
	artifact: { kind: "baked" },
	inputs: ["E2B_API_KEY", { name: "E2B_TEMPLATE", source: { kind: "variable" }, required: false }],
	isolation: {
		class: "microVM",
		technology: "Firecracker microVM",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "cpu",
				resource: "cpu",
				billingBasis: "provisioned",
				vendorUnit: "vCPU",
				usdPerUnitHour: 0.0504,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			},
			{
				id: "memory",
				resource: "memory",
				billingBasis: "provisioned",
				vendorUnit: "GiB",
				usdPerUnitHour: 0.0162,
				quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			},
		],
		adjustments: [
			{
				kind: "allowance",
				plan: "base",
				resource: "disk",
				quantity: 10,
				unit: "GiB",
				scope: "per_sandbox",
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory"] },
		notes:
			"Provisioned CPU and memory rates; storage allowances do not discount compute economics.",
		sources: [{ label: "E2B pricing", url: "https://e2b.dev/pricing", checkedAt: "2026-08-08" }],
	},
	maturity: { status: "ga", notes: "Custom images via e2b template build." },
	specPinning: "fixed",
	transport: {
		// `@computesdk/e2b` calls `sandbox.commands.run(cmd)` with no options, so the E2B SDK applies
		// its default 60s command timeout (`Commands.defaultProcessConnectionTimeout = 6e4`) and the
		// onStdout/onStderr callbacks are never passed through. A step budgeted past ~60s must detach;
		// E2B exposes a filesystem + `background`, so detached+poll is available.
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
