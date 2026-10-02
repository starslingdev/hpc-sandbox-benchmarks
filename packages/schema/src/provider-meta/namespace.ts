import { defineProviderMeta } from "../provider-meta.ts";
import { namespaceComputeUnitQuantityRule } from "./_namespace.ts";

export default defineProviderMeta("namespace", {
	displayName: "Namespace",
	vendor: "Namespace",
	website: "https://namespace.so",
	sdkPackage: "@namespacelabs/sdk",
	artifact: { kind: "image" },
	// NSC_TOKEN_FILE, not NSC_TOKEN: CI federates via GitHub's OIDC identity into one pinned tenant
	// (`nsc auth exchange-oidc-token --tenant_id`, the id held in the NAMESPACE_TENANT_ID secret), then
	// mints a scoped token file wired to NSC_TOKEN_FILE — never a bare bearer string in the environment.
	// This gate is a strict AND (the driver env has no OR-group concept), so a local run with a bare
	// NSC_TOKEN alone still skips even though the Namespace SDK's own fallback chain would
	// accept it — for local dev, mint a file instead (`nsc token create --token_file <path>` after
	// `nsc auth login`) and point NSC_TOKEN_FILE at it, mirroring what CI does.
	inputs: [
		{
			name: "NSC_TOKEN_FILE",
			source: { kind: "step-output", step: "namespace", output: "token-file" },
		},
	],
	isolation: {
		class: "microVM",
		technology: "microVM (dedicated instance)",
		notes:
			"Namespace runs each instance on its own hardware/network (namespace.so/docs/architecture/compute). The @computesdk/namespace wrapper deploys one container workload per instance via the Compute API's `containers` shape, and defines no template/snapshot managers (unexposed, same clean skip as novita) — and, unlike every other provider here, no filesystem manager either.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "prepaid",
				resource: "cpu_memory",
				billingBasis: "provisioned",
				vendorUnit: "compute-unit minute",
				usdPerUnitHour: 0.06,
				quantityRule: namespaceComputeUnitQuantityRule,
				tier: "prepaid",
				notes: "$0.001 per compute-unit minute × 60.",
			},
			{
				id: "overage",
				resource: "cpu_memory",
				billingBasis: "provisioned",
				vendorUnit: "compute-unit minute",
				usdPerUnitHour: 0.09,
				quantityRule: namespaceComputeUnitQuantityRule,
				tier: "overage",
				notes: "$0.0015 per compute-unit minute × 60.",
			},
		],
		adjustments: [
			{
				kind: "fee",
				plan: "Team",
				resource: "plan",
				quantity: 100,
				unit: "USD",
				scope: "monthly",
			},
			{
				kind: "allowance",
				plan: "Team",
				resource: "cpu_memory",
				quantity: 100_000,
				unit: "compute-unit minute",
				scope: "monthly",
			},
		],
		targetHourlyCost: {
			kind: "plan_dependent",
			reason:
				"The applicable prepaid or overage tier and remaining included pool depend on the workspace plan.",
		},
		notes: "Published prepaid and overage compute-unit rates with plan-dependent applicability.",
		sources: [
			{
				label: "Namespace pricing",
				url: "https://namespace.so/pricing",
				checkedAt: "2026-08-08",
			},
			{
				label: "Billing and limits",
				url: "https://namespace.so/docs/workspaces/billing-and-limits",
				checkedAt: "2026-08-08",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Validated live end-to-end once the exec transport was corrected: system 3/3 metrics, and realworld-better-auth 10/10 metrics with zero gaps on a 570s benchmark step (2.2x the ~4m19s synchronous ceiling). The wrapper's `methods.sandbox` declares no `filesystem` table, so computesdk falls back to its UnsupportedFileSystem (a truthy stub whose every op throws). This note previously claimed that made realworld suites skip here; the better-auth run above disproves it — nothing outside StepRunner.runDetached's done-file poll uses `sandbox.filesystem`, and that degrades to `cat` over exec, so no suite is gated on it. Should a real filesystem ever be needed, the official @namespacelabs/sdk exposes ComputeService.GetSSHConfig (per-instance scoped key + username + endpoint); not wired, since it means managing keys and bypassing the @computesdk/* wrapper this repo standardizes on.",
	},
	// virtualCpu/memoryMegabytes are independent, uncoupled knobs on the factory config (unlike
	// blaxel's memory-derived cpu/disk), so the 4 vCPU / 8 GiB target spec is exactly expressible.
	specPinning: "settable",
	preAuth: "namespace-token",
});
