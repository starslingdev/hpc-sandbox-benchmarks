// Provider identity & economics — the static facts the comparison surfaces next to results:
// isolation technology, pricing model, maturity, and whether the SDK can pin a target spec.
// This is the SINGLE owner of Provider identity (`id`, `requiredEnvVars`); the harness adapter
// in @sandbox-benchmarks/providers joins against it by id and refuses any one-sided provider.
//
// Validation status is deliberately NOT declared here: a provider is "validated" exactly when a
// committed run carries real metrics for it (computed downstream), "pending" otherwise.

import { type } from "arktype";
import type { ProviderId } from "./identifiers.ts";

export type { ProviderId } from "./identifiers.ts";

import type { TargetSpec } from "./run.ts";
import { targetSpecSchema } from "./run.ts";

/**
 * Canonical provider ids — the single vocabulary every registry joins on. Adding an id forces a
 * matching {@link REGISTRY} entry (the Record type below makes a missing or extra id a compile
 * error) and, downstream, a harness adapter in @sandbox-benchmarks/providers.
 */

/** Can the SDK request a pinned target spec (vCPU / memory) at create() time? */
export type SpecPinning = "settable" | "fixed" | "unknown";

/**
 * How a provider's command-exec transport behaves *through its ComputeSDK adapter* — the facts the
 * harness needs to pick a per-step transport instead of hardcoding one provider's quirks (the original
 * sin this models away: the harness forced Daytona's detached+poll on every provider). Owned here
 * alongside the other declared capabilities ({@link SpecPinning}, isolation, maturity) because it is a
 * static, comparable property of the integration, and the schema already names the `@computesdk/*`
 * adapter via {@link ProviderMeta.sdkPackage}.
 *
 * Three independent capabilities, each load-bearing for transport selection:
 *
 *   - `streaming` — does the adapter deliver stdout/stderr incrementally (computesdk's
 *     `onStdout`/`onStderr`)? Most shipped adapters drop those callbacks, so a long synchronous exec
 *     buffers silently; run.cloud's native SDK adapter passes them through. Modeled because a streaming
 *     path keeps a connection productive past an idle gateway cap.
 *   - `syncCapMs` — the configured durability threshold for a single *synchronous* exec round-trip,
 *     or `null` when validated as uncapped. It may encode a vendor-enforced limit or a conservative
 *     repository policy where long-lived synchronous transport has not been validated. The harness
 *     compares each step's timeout budget against it: a step that could reach it must not go
 *     synchronous. Daytona returns a
 *     server-side HTTP 408 on multi-minute synchronous execs while the process keeps running
 *     (`docs/evidence/daytona-exec-transport.md`); E2B's `commands.run` defaults to a 60s command
 *     timeout the computesdk wrapper never overrides.
 *   - `detachedPoll` — can the provider run a step fully detached (background exec + OBSERVABLE
 *     completion), the durable path for steps that would outlast `syncCapMs`? Without it there is no
 *     alternative, so such a step stays synchronous and best-effort.
 *
 *     Observable does NOT require a filesystem API. `StepRunner.runDetached` polls the done-file over
 *     the sandbox filesystem where one works and `cat`s it over exec where none does, so an adapter
 *     with no `filesystem` table still detaches. Reading this as "needs a filesystem" is what produced
 *     namespace's wrong `detachedPoll: false` — which stranded a 55-minute benchmark on a synchronous
 *     exec that its own server cut at ~4m19s. If a provider can background a command and answer a
 *     later exec, it can detach.
 */
export interface ProviderTransport {
	/** Does the ComputeSDK adapter stream stdout/stderr chunks (`onStdout`/`onStderr`)? */
	streaming: boolean;
	/** Conservative bound (ms) on a safe single synchronous exec round-trip; `null` when uncapped. */
	syncCapMs: number | null;
	/** Can a step run detached (background exec + observable completion — filesystem poll where exposed,
	 *  `cat` over exec otherwise), the durable long-step path? */
	detachedPoll: boolean;
}

const nonemptyStringSchema = type("string >= 1");
const finiteNonnegativeNumberSchema = type("number >= 0").narrow(Number.isFinite);
const finitePositiveNumberSchema = type("number > 0").narrow(Number.isFinite);

/** A strict Gregorian calendar date, not merely an ISO-shaped string. */
export const isoDateSchema = type("string")
	.matching("^\\d{4}-\\d{2}-\\d{2}$")
	.narrow((value) => {
		const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
		const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
		const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		return month >= 1 && month <= 12 && day >= 1 && day <= (daysInMonth[month - 1] ?? 0);
	});
export type IsoDate = typeof isoDateSchema.infer;

/** An absolute public evidence URL using the only protocols accepted by the registry. */
export const pricingUrlSchema = type("string.url").narrow((value) => {
	const protocol = new URL(value).protocol;
	return protocol === "http:" || protocol === "https:";
});

export const pricingResourceSchema = type("'cpu' | 'memory' | 'cpu_memory' | 'disk'");
export type PricingResource = typeof pricingResourceSchema.infer;

export const pricingQuantityDimensionSchema = targetSpecSchema.keyof();
export type PricingQuantityDimension = typeof pricingQuantityDimensionSchema.infer;

/** One conversion from a Run target dimension to vendor billing units. */
export const pricingQuantityTermSchema = type({
	dimension: pricingQuantityDimensionSchema,
	unitsPerTargetUnit: finitePositiveNumberSchema,
}).onUndeclaredKey("reject");
export type PricingQuantityTerm = typeof pricingQuantityTermSchema.infer;

/** How a component's vendor-unit quantity is derived from the Run's requested target shape. */
const linearPricingQuantityRuleSchema = type({
	kind: "'linear'",
	dimension: pricingQuantityDimensionSchema,
	unitsPerTargetUnit: finitePositiveNumberSchema,
}).onUndeclaredKey("reject");
const maxPricingQuantityRuleSchema = type({
	kind: "'max'",
	terms: pricingQuantityTermSchema.array().atLeastLength(2),
}).onUndeclaredKey("reject");
export const pricingQuantityRuleSchema = linearPricingQuantityRuleSchema.or(
	maxPricingQuantityRuleSchema,
);
export type PricingQuantityRule = typeof pricingQuantityRuleSchema.infer;

/** A published rate normalized to one vendor unit-hour, without erasing its original unit. */
export const pricingComponentSchema = type({
	id: nonemptyStringSchema,
	resource: pricingResourceSchema,
	billingBasis: "'provisioned' | 'active' | 'max_request_or_usage' | 'provisioned_plus_burst'",
	vendorUnit: nonemptyStringSchema,
	usdPerUnitHour: finiteNonnegativeNumberSchema,
	quantityRule: pricingQuantityRuleSchema,
	"tier?": nonemptyStringSchema,
	"notes?": nonemptyStringSchema,
}).onUndeclaredKey("reject");
export type PricingComponent = typeof pricingComponentSchema.infer;

/** A plan charge or included quantity. These are cited metadata and never discount the headline. */
export const pricingAdjustmentSchema = type({
	kind: "'allowance' | 'fee'",
	plan: nonemptyStringSchema,
	resource: pricingResourceSchema.or("'plan'"),
	quantity: finiteNonnegativeNumberSchema,
	unit: nonemptyStringSchema,
	scope: "'per_sandbox' | 'monthly'",
	"notes?": nonemptyStringSchema,
});
export type PricingAdjustment = typeof pricingAdjustmentSchema.infer;

/** Official evidence for a rate or billing rule, checked on the issue's research date. */
export const pricingSourceSchema = type({
	label: nonemptyStringSchema,
	url: pricingUrlSchema,
	checkedAt: isoDateSchema,
});
export type PricingSource = typeof pricingSourceSchema.infer;

export const exactTargetHourlyCostSchema = type({
	kind: "'exact'",
	componentIds: nonemptyStringSchema.array().atLeastLength(1),
});
export const usageDependentTargetHourlyCostSchema = type({
	kind: "'usage_dependent'",
	reason: nonemptyStringSchema,
});
export const planDependentTargetHourlyCostSchema = type({
	kind: "'plan_dependent'",
	reason: nonemptyStringSchema,
});
export const targetHourlyCostSchema = exactTargetHourlyCostSchema
	.or(usageDependentTargetHourlyCostSchema)
	.or(planDependentTargetHourlyCostSchema);
export type TargetHourlyCost = typeof targetHourlyCostSchema.infer;

/** Published pricing with component identity and exact-cost references enforced together. */
export const publishedProviderPricingSchema = type({
	model: "'published'",
	components: pricingComponentSchema.array().atLeastLength(1),
	"adjustments?": pricingAdjustmentSchema.array(),
	targetHourlyCost: targetHourlyCostSchema,
	notes: nonemptyStringSchema,
	sources: pricingSourceSchema.array().atLeastLength(1),
}).narrow((pricing, ctx) => {
	const componentIds = new Set<string>();
	for (const component of pricing.components) {
		if (componentIds.has(component.id)) {
			return ctx.mustBe("published pricing whose component ids are unique");
		}
		componentIds.add(component.id);
	}
	if (pricing.targetHourlyCost.kind === "exact") {
		const exactIds = new Set<string>();
		for (const id of pricing.targetHourlyCost.componentIds) {
			if (exactIds.has(id)) {
				return ctx.mustBe("published pricing whose exact component ids are unique");
			}
			exactIds.add(id);
			if (!componentIds.has(id)) {
				return ctx.mustBe(
					`published pricing whose exact cost references a component (unknown: ${id})`,
				);
			}
		}
	}
	return true;
});

export const unavailableProviderPricingSchema = type({
	model: "'unavailable'",
	reason: "'self_hosted' | 'unpublished'",
	notes: nonemptyStringSchema,
	"sources?": pricingSourceSchema.array(),
});

export const providerPricingSchema = publishedProviderPricingSchema.or(
	unavailableProviderPricingSchema,
);
export type ProviderPricing = typeof providerPricingSchema.infer;

/** Isolation technology a provider runs sandboxes under. */
export interface ProviderIsolation {
	/** e.g. "Firecracker microVM", "gVisor container", "unknown". */
	technology: string;
	notes?: string;
}

/** How production-ready a provider's integration is. */
export interface ProviderMaturity {
	status: "ga" | "beta" | "unknown";
	notes?: string;
}

/**
 * Which identity a provider's benchmark lane runs as INSIDE the sandbox.
 *
 * `"unprivileged"` deliberately does not name the user: the point is the privilege level, which is
 * what the toolchain has to accommodate (separate PTS state, no writes to root-owned trees). The
 * account name is the provider's business and has changed without notice.
 */
export type ProviderRuntimeIdentity = "root" | "unprivileged";

/** The static description of a sandbox provider, owned by the schema. */
export interface ProviderMeta {
	/** Stable identifier joined against the harness adapter map; one of {@link ProviderId}. */
	id: ProviderId;
	displayName: string;
	website: string;
	/** The npm package the harness adapter wraps, e.g. "@computesdk/e2b". */
	sdkPackage: string;
	/** Credentials the harness needs; any missing one produces a skip marker. */
	requiredEnvVars: string[];
	isolation: ProviderIsolation;
	pricing: ProviderPricing;
	maturity: ProviderMaturity;
	specPinning: SpecPinning;
	/** How the provider's exec transport behaves — the harness selects sync vs detached from this. */
	transport: ProviderTransport;
	/**
	 * Identity the benchmark lane runs as in-sandbox. Omitted means `"root"`: setup, the baked PTS
	 * state and every adapter target root, and the providers that DO inject an unprivileged user are
	 * the exception worth declaring — e2b and novita each pin their exec back to root explicitly
	 * (e2b-root.ts), so only a provider with no such lever is `"unprivileged"`.
	 *
	 * This exists so the job summary flags DRIFT rather than a supported configuration: a hardcoded
	 * "expected root" marks every Runloop replicate anomalous on a perfectly healthy run, which trains
	 * readers to ignore the warning that was added to catch a real identity change.
	 */
	runtimeIdentity?: ProviderRuntimeIdentity;
}

/**
 * The pinned cross-provider target spec: 4 vCPU, 8 GiB RAM, 40 GB disk. Every provider is created at
 * this exact shape so the numbers are like-for-like. 8 GiB RAM fits inside every provider's
 * reproducible envelope (E2B caps sandbox RAM at 8 GiB). vCPU is pinned at 4 because Blaxel couples
 * CPU to RAM (cores = memory_MB / 2048, no independent knob), so 8 GiB RAM there forces exactly 4
 * vCPU — targeting 4 lets Blaxel match on every axis instead of carrying a permanent comparability
 * caveat, while the others set 4 vCPU directly (Modal per-create; e2b/daytona/novita at bake time).
 * This assumes every provider can provision 4 vCPU at 8 GiB; one that can't would flip to mismatched,
 * so re-verify each provider's observed vCPU after a bump. Disk, by contrast, is sized for the
 * realworld suites' working set: a cold monorepo install + full build needs ~30 GiB free (mastra's
 * `minDiskGb`), and at 20 GB a
 * Daytona sandbox had only 16.7 GiB free, silently skipping mastra/openclaw. Disk is NOT a comparison
 * axis and is excluded from {@link hourlyCostAtTargetSpec}, so a larger disk can't bias the ranking.
 *
 * Providers that expose a per-sandbox/snapshot disk get 40 GiB (Daytona, via the snapshot's
 * `resources.disk`); Modal has no disk knob but its gVisor root reports effectively unbounded disk,
 * so it clears the gate anyway. Blaxel's sandbox root is a RAM-derived tmpfs with no independent disk
 * knob, so it mounts a 40 GiB volume at the PTS data dir where the heavy suites write (see
 * packages/providers/src/lib/blaxel-volume.ts) — clearing the gate like the others. Only e2b/novita
 * (the `@e2b/cli` `template create` takes only `--cpu-count`/`--memory-mb`), namespace
 * (`NamespaceConfig` has no disk field at all), and Vercel (resources exposes only vCPUs) still
 * CANNOT express disk:
 * they run with actuals recorded and the heavy suites skip there, surfaced as an explicit coverage gap
 * in the leaderboard, never silently dropped.
 */
export const TARGET_SPEC = { vcpus: 4, memoryGb: 8, diskGb: 40 } as const satisfies TargetSpec;

// Per-vendor pricing/transport, hoisted to one const per vendor ahead of the isolation-variant
// fan-out later in this stack (Daytona → VM + container; Modal → gVisor + VM). A vendor bills one
// way and its `@computesdk/*` adapter execs one way regardless of which isolation a sandbox uses, so
// hoisting these lets a vendor's variant entries share one const instead of each carrying its own —
// making it impossible for their rates or transport bounds to drift apart.

/** Daytona's published billing, shared by its isolation variants. */
const daytonaPricing: ProviderPricing = {
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
		{
			id: "disk",
			resource: "disk",
			billingBasis: "provisioned",
			vendorUnit: "GiB",
			usdPerUnitHour: 0.000108,
			quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
		},
	],
	adjustments: [
		{
			kind: "allowance",
			plan: "all",
			resource: "disk",
			quantity: 5,
			unit: "GiB",
			scope: "per_sandbox",
			notes: "The first 5 GiB applies to storage, not memory.",
		},
	],
	targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory"] },
	notes:
		"Per-second provisioned CPU, memory, and disk pricing; disk is excluded from benchmark economics.",
	sources: [
		{ label: "Daytona pricing", url: "https://www.daytona.io/pricing", checkedAt: "2026-08-08" },
	],
};

/** Daytona's exec transport, shared by its isolation variants. */
const daytonaTransport: ProviderTransport = {
	// The single-round-trip-capped reference case: the Daytona server returns HTTP 408 on a
	// multi-minute synchronous `executeCommand` while the process keeps running server-side, and
	// `@computesdk/daytona` ignores onStdout/onStderr (hardcoding `stderr:""`) — no streaming to
	// keep the connection productive. See docs/evidence/daytona-exec-transport.md. The exact
	// server threshold is unmeasured (sub-second probes succeed; multi-minute execs 408), so the
	// bound is a conservative 60s policy: budget anything longer to the detached+poll path
	// (`background` via nohup + the pollable filesystem).
	streaming: false,
	syncCapMs: 60_000,
	detachedPoll: true,
};

/** Modal's published billing, shared by its isolation variants. */
const modalPricing: ProviderPricing = {
	model: "published",
	components: [
		{
			id: "cpu",
			resource: "cpu",
			billingBasis: "max_request_or_usage",
			vendorUnit: "requested CPU unit (vendor physical-core rate)",
			usdPerUnitHour: 0.141912,
			quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
			notes:
				"Requested CPU maps one-to-one to vendor CPU units, but the billed max(request, usage) quantity must come from provider-observed usage.",
		},
		{
			id: "memory",
			resource: "memory",
			billingBasis: "max_request_or_usage",
			vendorUnit: "GiB",
			usdPerUnitHour: 0.024012,
			quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
			notes: "$0.00000667/GiB-s; a request-equals-limit configuration does not prove billed usage.",
		},
	],
	adjustments: [
		{
			kind: "allowance",
			plan: "all",
			resource: "disk",
			quantity: 1024,
			unit: "GiB-month",
			scope: "monthly",
		},
	],
	targetHourlyCost: {
		kind: "usage_dependent",
		reason:
			"Modal bills max(request, usage); request-equals-limit does not substitute for provider-observed billed quantities.",
	},
	notes:
		"Published CPU and memory rates are retained as catalog metadata, but no exact benchmark cost is inferred without sandbox-scoped billed usage.",
	sources: [{ label: "Modal pricing", url: "https://modal.com/pricing", checkedAt: "2026-08-08" }],
};

/** Modal's exec transport, shared by its isolation variants. */
const modalTransport: ProviderTransport = {
	// `@computesdk/modal` runs `sandbox.exec([...])` and `process.wait()`s the result, with no
	// separate per-exec timeout. There is no hard server gateway cap, but the exec stdio stream
	// is not reliable over benchmark-length execs: a ~66-minute better-auth run completed
	// in-sandbox (manifest exit_code 0) while the harness-side stream died with gRPC INTERNAL
	// "Failed to read exec stdio stream" (ZEHA3277, 2026-07-10), losing the step result. Cap
	// synchronous execs at 30 minutes so suite-length steps take the detached+poll path, which
	// survives a dropped stream; short setup steps keep the cheaper direct exec.
	streaming: false,
	syncCapMs: 30 * 60_000,
	detachedPoll: true,
};

/** Namespace bills whichever requested dimension consumes more compute units. */
const namespaceComputeUnitQuantityRule: PricingQuantityRule = {
	kind: "max",
	terms: [
		{ dimension: "vcpus", unitsPerTargetUnit: 1 },
		{ dimension: "memoryGb", unitsPerTargetUnit: 0.5 },
	],
};

/**
 * The registry, keyed by {@link ProviderId} — the inspiration is the harness adapter map, which
 * keys the *behavioural* half of a provider the same way. A keyed Record (rather than an array of
 * objects each repeating its `id`) buys three things for free: ids are unique by construction, the
 * `Record<ProviderId, …>` type forces exactly one entry per id, and the `id` is attached from the
 * key when the array form is built so it can never drift from its key.
 *
 * Published rates retain their vendor units and billing basis while normalizing the arithmetic to
 * USD/unit-hour. The explicit target-cost classification decides whether those components form a
 * complete deterministic headline. Disk is retained as metadata but excluded from exact component
 * lists; allowances and plan fees likewise never turn one account's consumption into a universal rate.
 */
const REGISTRY: Record<ProviderId, Omit<ProviderMeta, "id">> = {
	e2b: {
		displayName: "E2B",
		website: "https://e2b.dev",
		sdkPackage: "@computesdk/e2b",
		requiredEnvVars: ["E2B_API_KEY"],
		isolation: { technology: "Firecracker microVM" },
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
	},
	"daytona-vm": {
		displayName: "Daytona (VM)",
		website: "https://daytona.io",
		sdkPackage: "@computesdk/daytona",
		requiredEnvVars: ["DAYTONA_API_KEY"],
		isolation: {
			technology: "microVM (Linux VM)",
			notes:
				"Boots a snapshot baked with SandboxClass.LINUX_VM on Daytona's Linux-VM runners (region us-west-2, via DAYTONA_TARGET). Snapshot-based images; orgs locked to a dedicated region need their own snapshot (DAYTONA_SNAPSHOT). The prior single `daytona` entry mislabeled this as a container — the baked class has always been a microVM.",
		},
		pricing: daytonaPricing,
		maturity: {
			status: "ga",
			notes: "The validated reference provider for this harness (pre-baked toolchain snapshot).",
		},
		specPinning: "settable",
		transport: daytonaTransport,
	},
	"daytona-container": {
		displayName: "Daytona (container)",
		website: "https://daytona.io",
		sdkPackage: "@computesdk/daytona",
		requiredEnvVars: ["DAYTONA_API_KEY"],
		isolation: {
			technology: "container (Sysbox/OCI)",
			notes:
				"Boots its own snapshot baked with SandboxClass.CONTAINER on Daytona's container runners in region `us` (Daytona's default class uses Sysbox-based OCI containers, not gVisor). Separate snapshot from daytona-vm because the sandbox class is fixed at snapshot-bake time, not per-create.",
		},
		pricing: daytonaPricing,
		maturity: {
			status: "beta",
			notes:
				"New isolation variant sharing Daytona credentials/pricing with daytona-vm; boots a container-class snapshot in region `us`. Not yet a committed run.",
		},
		specPinning: "settable",
		transport: daytonaTransport,
	},
	blaxel: {
		displayName: "Blaxel",
		website: "https://blaxel.ai",
		sdkPackage: "@computesdk/blaxel",
		requiredEnvVars: ["BL_API_KEY", "BL_WORKSPACE"],
		isolation: {
			technology: "microVM",
			notes:
				"Blaxel sandboxes (sub-25ms boot claim). CPU is COUPLED to RAM (measured: cores = memory MB / 2048) with no cgroup cpu.max, and the sandbox root is a RAM-overlay tmpfs with no independent disk knob (storageMb/diskPercent are accepted but silently ignored on this plan). The adapter pins memory=8192 -> 8 GiB RAM and 4 vCPU (specMatched=true covers that effective vCPU/memory pair only), and mounts a 40 GiB volume at the PTS data dir so the separate disk gate clears (see blaxel-volume.ts). The target's vCPU is 4 precisely so Blaxel's coupled point lands on-spec — the dimensions stay coupled, so a different target shape would put Blaxel off-spec again.",
		},
		pricing: {
			model: "published",
			components: [
				{
					id: "active-compute",
					resource: "cpu_memory",
					billingBasis: "active",
					vendorUnit: "GB RAM",
					usdPerUnitHour: 0.0414,
					quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
					notes:
						"$0.0000115/GB-RAM-s; CPU is bundled with memory and suspended sandboxes stop accruing compute.",
				},
			],
			targetHourlyCost: {
				kind: "usage_dependent",
				reason:
					"The complete charge depends on active time; the target rate alone only gives a 100%-active estimate.",
			},
			notes: "Memory-sized bundled CPU is billed only while active.",
			sources: [
				{ label: "Blaxel pricing", url: "https://blaxel.ai/pricing", checkedAt: "2026-08-08" },
				{
					label: "Sandbox billing behavior",
					url: "https://docs.blaxel.ai/Sandboxes/Overview",
					checkedAt: "2026-08-08",
				},
			],
		},
		maturity: {
			status: "beta",
			notes:
				"Now carries committed runs and is in the default matrix set. memory=8192 hits the 4 vCPU / 8 GiB target (specMatched=true is that vCPU/memory check only); the 40 GiB volume (mounted at the PTS data dir) separately lets the realworld suites (mastra 30, openclaw 25) clear the disk gate instead of skipping.",
		},
		// memory=8192 lands on the target's 8 GiB / 4 vCPU point because the target's vCPU was chosen to
		// sit on Blaxel's RAM/CPU coupling curve (specMatched only judges that pair). The 40 GiB volume
		// is the separate disk-gate path, not part of specMatched. The dimensions are still coupled --
		// you can't set CPU and RAM independently -- so "fixed" remains the honest capability: this
		// particular target is reachable, an arbitrary one would not be.
		specPinning: "fixed",
		transport: {
			// `@computesdk/blaxel` execs through the sandbox gateway; long synchronous execs are not
			// validated, so apply the conservative 60s policy bound and use the detached+poll path
			// (background nohup + pollable filesystem, both supported by the wrapper) for long steps.
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	"microsandbox-local": {
		displayName: "Microsandbox (local)",
		website: "https://microsandbox.dev",
		sdkPackage: "microsandbox",
		// This is an explicit capability opt-in rather than a credential. Local runs require a host
		// with KVM on Linux or Hypervisor.framework on macOS and should skip everywhere else.
		requiredEnvVars: ["MICROSANDBOX_LOCAL_BENCH"],
		isolation: {
			technology: "libkrun microVM (local)",
			notes:
				"Runs on the benchmark harness machine itself with no control-plane or network hop. Results measure that host's hardware and are identified separately from Microsandbox Cloud.",
		},
		pricing: {
			model: "unavailable",
			reason: "self_hosted",
			notes:
				"Self-hosted execution has no vendor compute rate; infrastructure cost depends on the machine running the harness.",
			sources: [
				{ label: "Microsandbox project", url: "https://microsandbox.dev", checkedAt: "2026-08-08" },
			],
		},
		maturity: {
			status: "beta",
			notes:
				"Direct SDK adapter with exec, filesystem, lifecycle, list, and local snapshots. Opt-in until a comparable committed run exists.",
		},
		specPinning: "settable",
		transport: {
			// Streaming callbacks are not adapted, but background exec plus the agent filesystem provides
			// the durable detached+poll path. `syncCapMs` is a real number, not null, precisely so that
			// path is reachable: `selectTransport` short-circuits a null cap to "sync" REGARDLESS of
			// `detachedPoll`, which would leave every benchmark-length step as one synchronous exec whose
			// output exists only in the agent response — nothing to read back if that exec drops. Native
			// in-process control has no gateway timeout, so this cap is a durability policy rather than a
			// vendor limit; it matches the cloud variant so both backends detach at the same boundary.
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	"codex-cloud": {
		displayName: "ChatGPT Codex Cloud",
		website: "https://openai.com/codex/",
		sdkPackage: "none",
		// Host-ingest opt-in: suites run on the Codex Cloud session VM itself, then raw results are
		// staged and normalized. There is no remote sandbox API, so keep it out of the default matrix.
		requiredEnvVars: ["CODEX_CLOUD_BENCH"],
		isolation: {
			technology: "Cloud Hypervisor microVM + OCI container",
			notes:
				"Codex Cloud sessions run in an OCI container inside a Cloud Hypervisor guest (ACPI OEM CLOUDH), with virtio devices exposed by KVM. Results measure the Codex Cloud host fleet, not a provider SDK sandbox.",
		},
		pricing: {
			model: "unavailable",
			reason: "self_hosted",
			notes:
				"Codex Cloud session compute is bundled into ChatGPT plans; there is no published per-vCPU sandbox rate comparable to the other providers.",
			sources: [{ label: "OpenAI Codex", url: "https://openai.com/codex/", checkedAt: "2026-08-21" }],
		},
		maturity: {
			status: "beta",
			notes:
				"Host-ingest path only. The harness adapter refuses remote create; use mise suite tasks on the session VM and normalize staged results.",
		},
		specPinning: "fixed",
		transport: {
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	"claude-cloud": {
		displayName: "Claude Cloud",
		website: "https://claude.com",
		sdkPackage: "none",
		// Host-ingest opt-in, same posture as cursor-cloud-agent: suites run on the Claude Code remote
		// session VM itself, then raw `benchmark-results/` are staged into
		// `data/raw/<runId>/claude-cloud/<suite>/` and normalized. No remote sandbox API — keep it out
		// of the default matrix.
		requiredEnvVars: ["CLAUDE_CLOUD_BENCH"],
		isolation: {
			technology: "Firecracker microVM",
			notes:
				"Claude Code remote session VMs are Firecracker guests (ACPI OEM FIRECK, OEM table FCVMDSDT, creator FCAT) with virtio balloon/blk/net/rng/vsock over PCI. The isolation probe classified the runtime `firecracker` at `confirmed` confidence and found no container runtime above threshold, so the workload runs directly in the guest rather than in a nested OCI container. Results measure that host fleet, not a provider SDK sandbox.",
		},
		pricing: {
			model: "unavailable",
			reason: "self_hosted",
			notes:
				"Remote session compute is bundled into the Claude subscription; there is no published per-vCPU sandbox rate comparable to the other providers.",
			sources: [{ label: "Claude", url: "https://claude.com", checkedAt: "2026-08-20" }],
		},
		maturity: {
			status: "beta",
			notes:
				"Host-ingest path only. The harness adapter refuses remote create; use mise suite tasks on the session VM and normalize staged results.",
		},
		specPinning: "fixed",
		transport: {
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	"cursor-cloud-agent": {
		displayName: "Cursor Cloud Agent",
		website: "https://cursor.com",
		sdkPackage: "none",
		// Host-ingest opt-in: suites run on the Cloud Agent VM itself (Firecracker microVM + OCI), then
		// raw `benchmark-results/` are staged into `data/raw/<runId>/cursor-cloud-agent/<suite>/` and
		// normalized. No remote sandbox API — keep it out of the default matrix.
		requiredEnvVars: ["CURSOR_CLOUD_AGENT_BENCH"],
		isolation: {
			technology: "Firecracker microVM + OCI container",
			notes:
				"Cursor Cloud Agent VMs are Firecracker guests (ACPI OEM FIRECK) running an OCI/docker workload. Results measure that host fleet, not a provider SDK sandbox.",
		},
		pricing: {
			model: "unavailable",
			reason: "self_hosted",
			notes:
				"Cloud Agent compute is part of the Cursor product; there is no published per-vCPU sandbox rate comparable to the other providers.",
			sources: [{ label: "Cursor", url: "https://cursor.com", checkedAt: "2026-08-14" }],
		},
		maturity: {
			status: "beta",
			notes:
				"Host-ingest path only. The harness adapter refuses remote create; use mise suite tasks on the agent and normalize staged results.",
		},
		specPinning: "fixed",
		transport: {
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	"microsandbox-cloud": {
		displayName: "Microsandbox Cloud",
		website: "https://microsandbox.dev",
		sdkPackage: "microsandbox",
		// MSB_API_URL is only an override for staging/private deployments. The SDK defaults to
		// api.microsandbox.dev, so the key alone is the cloud-selection and credential gate.
		requiredEnvVars: ["MSB_API_KEY"],
		isolation: {
			technology: "libkrun microVM (cloud)",
			notes:
				"The Microsandbox SDK talks to msb-cloud; Nomad schedules the same libkrun microVM runtime on remote hosts. Kept distinct from local runs so datasets never mix host-local and cloud measurements.",
		},
		pricing: {
			model: "published",
			components: [
				{
					id: "cpu-overage",
					resource: "cpu",
					billingBasis: "provisioned",
					vendorUnit: "vCPU",
					usdPerUnitHour: 0.05,
					quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
					tier: "Builder overage",
				},
				{
					id: "memory-overage",
					resource: "memory",
					billingBasis: "provisioned",
					vendorUnit: "GiB",
					usdPerUnitHour: 0.0162,
					quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
					tier: "Builder overage",
				},
				{
					id: "disk-overage",
					resource: "disk",
					billingBasis: "provisioned",
					vendorUnit: "GiB",
					usdPerUnitHour: 0.0001,
					quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
					tier: "Builder overage",
				},
			],
			adjustments: [
				{
					kind: "fee",
					plan: "Builder",
					resource: "plan",
					quantity: 49,
					unit: "USD",
					scope: "monthly",
				},
				{
					kind: "allowance",
					plan: "Builder",
					resource: "cpu",
					quantity: 500,
					unit: "vCPU-hour",
					scope: "monthly",
				},
				{
					kind: "allowance",
					plan: "Builder",
					resource: "memory",
					quantity: 2000,
					unit: "GiB-hour",
					scope: "monthly",
				},
				{
					kind: "allowance",
					plan: "Builder",
					resource: "disk",
					quantity: 2000,
					unit: "GiB-hour",
					scope: "monthly",
				},
			],
			targetHourlyCost: {
				kind: "plan_dependent",
				reason:
					"The charge depends on plan fees, remaining monthly pools, and overage consumption.",
			},
			notes:
				"Published Builder plan pools and overage rates are retained without converting them into one account-independent hourly total.",
			sources: [
				{
					label: "Microsandbox pricing",
					url: "https://microsandbox.dev/pricing",
					checkedAt: "2026-08-08",
				},
			],
		},
		maturity: {
			status: "beta",
			notes:
				"Create, readiness, exec, filesystem, list, and graceful teardown are supported. Cloud snapshots and published ports are not yet available.",
		},
		specPinning: "settable",
		transport: {
			// The adapter does not expose streaming callbacks. Use detached+filesystem polling for any
			// benchmark-length step so a long-lived remote WebSocket is not the durability boundary.
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	"modal-gvisor": {
		displayName: "Modal (gVisor)",
		website: "https://modal.com",
		sdkPackage: "@computesdk/modal",
		requiredEnvVars: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
		isolation: {
			technology: "gVisor container",
			notes:
				"Modal's default sandbox runtime. scalableSandboxes enabled in the harness; nproc tracks the requested cpu 1:1.",
		},
		pricing: modalPricing,
		maturity: { status: "ga", notes: "scalableSandboxes enabled in the harness." },
		specPinning: "settable",
		transport: modalTransport,
	},
	"modal-vm": {
		displayName: "Modal (VM)",
		website: "https://modal.com",
		sdkPackage: "@computesdk/modal",
		requiredEnvVars: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
		isolation: {
			technology: "microVM (VM runtime)",
			notes:
				"Modal's experimental VM runtime — a gVisor-free KVM microVM, selected per-create via experimentalOptions {vm_runtime:true} (no separate image; same pushed toolchain image as modal-gvisor).",
		},
		pricing: modalPricing,
		maturity: {
			status: "beta",
			notes:
				"Isolation variant sharing Modal credentials/pricing with modal-gvisor; adds experimentalOptions {vm_runtime:true} at create. Now carries committed runs and is in the default matrix set.",
		},
		specPinning: "settable",
		transport: modalTransport,
	},
	novita: {
		displayName: "Novita",
		website: "https://novita.ai/sandbox",
		// Novita's control plane speaks the E2B protocol, so the harness drives it through the e2b
		// wrapper with its connection methods backed by novita-sandbox (Novita's fork of the e2b SDK)
		// — see the novita adapter's compat module.
		sdkPackage: "@computesdk/e2b",
		requiredEnvVars: ["NOVITA_API_KEY"],
		isolation: {
			technology: "microVM",
			notes:
				"Dedicated microVM per sandbox; E2B-protocol-compatible control plane (us-phx-1.sandbox.novita.ai) driven through @computesdk/e2b with novita-sandbox-backed connection methods.",
		},
		pricing: {
			model: "published",
			components: [
				{
					id: "cpu",
					resource: "cpu",
					billingBasis: "provisioned",
					vendorUnit: "vCPU",
					usdPerUnitHour: 0.03528,
					quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
				},
				{
					id: "memory",
					resource: "memory",
					billingBasis: "provisioned",
					vendorUnit: "GiB",
					usdPerUnitHour: 0.01152,
					quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
				},
				{
					id: "disk",
					resource: "disk",
					billingBasis: "provisioned",
					vendorUnit: "GB",
					usdPerUnitHour: 0.00009,
					quantityRule: { kind: "linear", dimension: "diskGb", unitsPerTargetUnit: 1 },
				},
			],
			adjustments: [
				{
					kind: "allowance",
					plan: "all",
					resource: "disk",
					quantity: 60,
					unit: "GB",
					scope: "monthly",
					notes:
						"Account-wide persistent-storage allowance for paused sandboxes; running sandboxes instead include 20 GB of ephemeral storage.",
				},
			],
			targetHourlyCost: { kind: "exact", componentIds: ["cpu", "memory"] },
			notes:
				"Provisioned CPU and memory pricing; running ephemeral and paused persistent storage remain outside benchmark economics.",
			sources: [
				{
					label: "Novita Sandbox pricing",
					url: "https://novita.ai/docs/guides/sandbox-pricing",
					checkedAt: "2026-08-08",
				},
			],
		},
		maturity: {
			status: "beta",
			notes:
				"E2B-compatible API; boots the pre-baked toolchain template created on Novita's control plane by the bake pipeline (novita-sandbox Template.build). Pay-as-you-go caps sandboxes at 8 vCPU / 8 GB RAM. Not yet a committed run.",
		},
		// E2B protocol: resources come from the template (cpu/memory pinned at template create), not
		// the per-sandbox create() call.
		specPinning: "fixed",
		transport: {
			// Same wrapper (and therefore the same caps) as e2b: `sandbox.commands.run(cmd)` with no
			// options applies the E2B SDK's default 60s command timeout, and onStdout/onStderr are never
			// passed through. The compat API exposes the same filesystem + `background`, so detached+poll
			// is the long-step path.
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	runloop: {
		displayName: "Runloop",
		website: "https://runloop.ai",
		sdkPackage: "@computesdk/runloop",
		requiredEnvVars: ["RUNLOOP_API_KEY"],
		isolation: {
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
	},
	namespace: {
		displayName: "Namespace",
		website: "https://namespace.so",
		sdkPackage: "@computesdk/namespace",
		// NSC_TOKEN_FILE, not NSC_TOKEN: CI federates via GitHub's OIDC identity (nscloud-setup +
		// `nsc auth exchange-github-token`, no stored secret), which lands the token at the CLI's
		// standard cache path, wired to NSC_TOKEN_FILE — never a bare bearer string in the environment.
		// This gate is a strict AND (missingCreds has no OR-group concept), so a local run with a bare
		// NSC_TOKEN alone still skips even though @computesdk/namespace's own fallback chain would
		// accept it — for local dev, mint a file instead (`nsc token create --token_file <path>` after
		// `nsc auth login`) and point NSC_TOKEN_FILE at it, mirroring what CI does.
		requiredEnvVars: ["NSC_TOKEN_FILE"],
		isolation: {
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
				"Validated live end-to-end once the exec transport was corrected below: system 3/3 metrics, and realworld-better-auth 10/10 metrics with zero gaps on a 570s benchmark step (2.2x the ~4m19s synchronous ceiling). The wrapper's `methods.sandbox` declares no `filesystem` table, so computesdk falls back to its UnsupportedFileSystem (a truthy stub whose every op throws). This note previously claimed that made realworld suites skip here; the better-auth run above disproves it — nothing outside StepRunner.runDetached's done-file poll uses `sandbox.filesystem`, and that degrades to `cat` over exec, so no suite is gated on it. Should a real filesystem ever be needed, the official @namespacelabs/sdk exposes ComputeService.GetSSHConfig (per-instance scoped key + username + endpoint); not wired, since it means managing keys and bypassing the @computesdk/* wrapper this repo standardizes on.",
		},
		// virtualCpu/memoryMegabytes are independent, uncoupled knobs on the factory config (unlike
		// blaxel's memory-derived cpu/disk), so the 4 vCPU / 8 GiB target spec is exactly expressible.
		specPinning: "settable",
		transport: {
			// `runCommand` POSTs to the CommandService's RunCommandSync RPC and awaits the full response.
			// This was declared uncapped ("no evidence of a server-side cap") until a live smoke produced
			// the evidence: run 30314097333 lost `mise run benchmark:system:all` at 4m18.8s to a bare
			// "Namespace command execution failed: The operation timed out." after two of the suite's three
			// PTS profiles had completed — pybench and sqlite-speedtest wrote their XML, git did not.
			//
			// 120s, not the ~259s observed: the measurement is a single data point, and the bare message
			// (no HTTP status) does not distinguish a Namespace-side cap from a client fetch timeout in the
			// SDK's `fetch`. Detaching makes that distinction moot — every exec becomes short — so the cap
			// is set well under the observation rather than tuned to it. Short steps stay synchronous; only
			// a step BUDGETED past 120s detaches, which is the suite benchmark and the setup installs.
			streaming: false,
			syncCapMs: 120_000,
			// A finite cap requires a durable alternative, and this provider has one despite exposing no
			// filesystem: StepRunner.runDetached polls the done-file over exec (pollDoneViaCat) when the
			// filesystem is absent OR is computesdk's throwing UnsupportedFileSystem stub, which is what
			// this adapter gets — so this declaration depends on that degradation path (isUnsupportedFilesystem).
			// Each poll is a sub-second exec far under the cap, so a multi-minute benchmark survives as a
			// sequence of short calls.
			detachedPoll: true,
		},
	},
	vercel: {
		displayName: "Vercel Sandbox",
		website: "https://vercel.com/docs/sandbox",
		sdkPackage: "@vercel/sandbox",
		requiredEnvVars: ["VERCEL_OIDC_TOKEN"],
		isolation: {
			technology: "Firecracker microVM",
			notes:
				"Runs on Vercel's Hive build infrastructure and boots the shared Debian toolchain image mirrored into Vercel Container Registry.",
		},
		pricing: {
			model: "published",
			components: [
				{
					id: "active-cpu",
					resource: "cpu",
					billingBasis: "active",
					vendorUnit: "vCPU",
					usdPerUnitHour: 0.128,
					quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 1 },
				},
				{
					id: "memory",
					resource: "memory",
					billingBasis: "provisioned",
					vendorUnit: "GB",
					usdPerUnitHour: 0.0212,
					quantityRule: { kind: "linear", dimension: "memoryGb", unitsPerTargetUnit: 1 },
				},
			],
			adjustments: [
				{
					kind: "allowance",
					plan: "Hobby",
					resource: "cpu",
					quantity: 5,
					unit: "active vCPU-hour",
					scope: "monthly",
				},
			],
			targetHourlyCost: {
				kind: "usage_dependent",
				reason:
					"CPU is billed only while active, and Runs do not retain billable active-CPU utilization.",
			},
			notes: "Provisioned memory plus active CPU; $0.6816/hr is only a 100%-active reference.",
			sources: [
				{
					label: "Vercel Sandbox pricing",
					url: "https://vercel.com/docs/sandbox/pricing",
					checkedAt: "2026-08-08",
				},
			],
		},
		maturity: {
			status: "beta",
			notes:
				"Custom ComputeSDK provider based on the upstream adapter and updated for the latest Vercel SDK; opt-in until a committed validation run exists.",
		},
		// Only vCPU is requested; Vercel derives memory at a fixed 2048 MB/vCPU ratio. Four vCPU
		// therefore reaches this benchmark's 8 GiB target, but the dimensions are not independent.
		specPinning: "fixed",
		transport: {
			// No hard vendor cap is claimed: long synchronous transport is unvalidated, so the repository's
			// conservative 60s durability policy routes longer work to current-session detach + exec polling.
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		},
	},
	runcloud: {
		displayName: "run.cloud",
		website: "https://run.cloud",
		sdkPackage: "@run-cloud/sdk",
		requiredEnvVars: ["RUN_CLOUD_API_KEY"],
		isolation: {
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
	},
};

// Validate the authored registry exactly once. Consumers thereafter receive trusted inferred pricing
// values; hourly-cost calculation does not repeat boundary validation in its hot path.
for (const [providerId, meta] of Object.entries(REGISTRY) as [
	ProviderId,
	Omit<ProviderMeta, "id">,
][]) {
	const result = providerPricingSchema(meta.pricing);
	if (result instanceof type.errors) {
		throw new Error(`${providerId}: invalid provider pricing: ${result.summary}`);
	}
}

/** Recursively freeze a value so the shared registry can't be mutated by a downstream consumer. */
function deepFreeze<T>(value: T): T {
	for (const key of Object.getOwnPropertyNames(value)) {
		const child = (value as Record<string, unknown>)[key];
		if (child !== null && typeof child === "object") {
			deepFreeze(child);
		}
	}
	Object.freeze(value);
	return value;
}

/**
 * Every provider the benchmark knows about, in declaration order. Derived from {@link REGISTRY} so
 * the `id` and its key can never disagree, and deep-frozen so a downstream consumer can't mutate
 * shared pricing/identity at runtime. @sandbox-benchmarks/providers binds an adapter to each id via
 * a matching `Record<ProviderId, …>`, so adding a provider here without an adapter there (or vice
 * versa) is a compile error in that package — the two registries cannot drift.
 */
export const PROVIDERS: readonly ProviderMeta[] = deepFreeze(
	(Object.entries(REGISTRY) as [ProviderId, Omit<ProviderMeta, "id">][]).map(([id, meta]) => ({
		id,
		...meta,
	})),
);

/**
 * Retired provider ids that committed run documents still carry, each mapped to the current variant
 * that subsumed it. When a provider is split into isolation variants its pre-split runs keep the old
 * `providerId`; this table lets {@link getProvider} still resolve them to the variant that inherited
 * the old behaviour, so a historical leaderboard keeps its display names and economics instead of
 * degrading to a bare id. New runs always write a current variant id, so the aliases only ever match
 * old data.
 */
export const LEGACY_PROVIDER_ALIASES: Readonly<Record<string, ProviderId>> = Object.freeze({
	// `modal` → modal-gvisor, NOT modal-vm: pre-split `modal` ran Modal's default gVisor runtime
	// (scalableSandboxes, no vm_runtime); the VM runtime is a later, separate variant. Every committed
	// `modal` run predates that switch, so its data is gVisor. (The single `modal` entry on the base
	// branch shows "VM" only because this stack sits on top of that later change — that is the current
	// adapter config, not the runtime the historical runs were collected under.)
	modal: "modal-gvisor",
	daytona: "daytona-vm",
});

/**
 * Look up a provider's metadata by id. A known {@link ProviderId} literal always resolves; an
 * arbitrary string (e.g. an id read back from a run document) may not — but a retired id in
 * {@link LEGACY_PROVIDER_ALIASES} resolves to the variant that subsumed it.
 */
export function getProvider(id: ProviderId): ProviderMeta;
export function getProvider(id: string): ProviderMeta | undefined;
export function getProvider(id: string): ProviderMeta | undefined {
	// A linear scan over a handful of frozen entries — no module-load Map to drift out of sync, and
	// the entries are immutable, so returning the reference directly is safe.
	const canonical = LEGACY_PROVIDER_ALIASES[id] ?? id;
	return PROVIDERS.find((p) => p.id === canonical);
}

/**
 * The identity a provider is EXPECTED to run its benchmark lane as. Unknown ids (a run document from
 * a retired provider) fall back to `"root"`, the toolchain's default.
 */
export function expectedRuntimeIdentity(providerId: string): ProviderRuntimeIdentity {
	return getProvider(providerId)?.runtimeIdentity ?? "root";
}

/**
 * Does an OBSERVED in-sandbox user contradict what the provider declares?
 *
 * Compares privilege level, not account name: a provider declared `"unprivileged"` may run as `user`,
 * `sandbox`, or anything else and that is not news. What IS news either way is a switch — an
 * unprivileged identity where root was expected (setup and the baked PTS state assume root) or root
 * where an unprivileged user was expected (a provider silently gained privileges).
 *
 * An absent observation is never drift: not every provider's probe reports a user.
 */
export function isUnexpectedRuntimeUser(providerId: string, user: string | undefined): boolean {
	if (!user) return false;
	return (user === "root" ? "root" : "unprivileged") !== expectedRuntimeIdentity(providerId);
}

/** Derive one pricing component's vendor billing-unit quantity from a supplied Run target shape. */
export function pricingQuantityAtTargetSpec(
	component: PricingComponent,
	targetSpec: TargetSpec,
): number {
	const quantityFor = ({ dimension, unitsPerTargetUnit }: PricingQuantityTerm): number => {
		const targetUnits = targetSpec[dimension];
		if (targetUnits === undefined) {
			throw new Error(`cannot derive ${component.id} quantity without targetSpec.${dimension}`);
		}
		return targetUnits * unitsPerTargetUnit;
	};

	const rule = component.quantityRule;
	return rule.kind === "linear" ? quantityFor(rule) : Math.max(...rule.terms.map(quantityFor));
}

/**
 * Complete deterministic CPU + memory cost at a target spec. Published rates remain
 * inspectable when this returns `null`: usage- and plan-dependent totals are not headline scalars.
 */
export function hourlyCostAtTargetSpec(
	meta: ProviderMeta,
	targetSpec: TargetSpec = TARGET_SPEC,
): number | null {
	const pricing = meta.pricing;
	if (pricing.model !== "published" || pricing.targetHourlyCost.kind !== "exact") return null;
	const components = new Map(pricing.components.map((component) => [component.id, component]));
	return pricing.targetHourlyCost.componentIds.reduce((total, id) => {
		// Registry initialization has already established referential integrity.
		const component = components.get(id) as PricingComponent;
		return total + component.usdPerUnitHour * pricingQuantityAtTargetSpec(component, targetSpec);
	}, 0);
}
