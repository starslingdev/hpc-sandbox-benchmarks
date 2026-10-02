// Provider identity & economics — the static facts the comparison surfaces next to results:
// isolation technology, pricing model, maturity, and whether the SDK can pin a target spec.
// Provider identity itself lives in the dependency-free `provider-ids.ts` leaf; this registry owns
// the metadata keyed by that identity and answers the facts other packages would otherwise restate
// (package location, provenance constant, chart label, declared isolation class).
//
// Validation status is deliberately NOT declared here: a provider is "validated" exactly when a
// committed run carries real metrics for it (computed downstream), "pending" otherwise.

import type { ProviderId } from "./provider-ids.ts";
import { PROVIDER_IDS } from "./provider-ids.ts";
import { REGISTRY } from "./provider-meta/index.ts";
import type {
	IsolationClass,
	NormalizedProviderInput,
	ProviderArtifact,
	ProviderMetaSource,
	ProviderPackageLocation,
	ProviderPreAuth,
	ProviderRunnerPolicy,
	ProviderSdkPackage,
} from "./provider-meta.ts";
import { normalizeProviderInput } from "./provider-meta.ts";
import type { PricingComponent, PricingQuantityTerm, ProviderPricing } from "./provider-pricing.ts";

export type {
	ArtifactPhase,
	BaseImageUse,
	CandidateArtifact,
	CandidateArtifactRefs,
} from "./provider-artifacts.ts";
export {
	bakedArtifactName,
	baseImageUse,
	candidateArtifact,
	isBakedProviderId,
	isMirroredProviderId,
	releaseUnscopable,
} from "./provider-artifacts.ts";
export type { ProviderId } from "./provider-ids.ts";
export { PROVIDER_IDS } from "./provider-ids.ts";
export type {
	BakedProviderId,
	BuiltProviderId,
	ImageProviderId,
	MirroredProviderId,
	StockProviderId,
} from "./provider-meta/index.ts";
export { REGISTRY } from "./provider-meta/index.ts";
export type {
	IsolationClass,
	NormalizedProviderInput,
	ProviderArtifact,
	ProviderInput,
	ProviderInputDescriptor,
	ProviderInputSource,
	ProviderPackageLocation,
	ProviderPreAuth,
	ProviderRunnerPolicy,
	ProviderSdkPackage,
} from "./provider-meta.ts";
export { PROVIDER_PRE_AUTH_CONTRACTS, PROVIDER_PRE_AUTH_POLICIES } from "./provider-meta.ts";
export * from "./provider-pricing.ts";

import type { TargetSpec } from "./target-spec.ts";
import { TARGET_SPEC } from "./target-spec.ts";

export type { TargetSpec } from "./target-spec.ts";
export { TARGET_SPEC } from "./target-spec.ts";

/** Can the SDK request a pinned target spec (vCPU / memory) at create() time? */
export type SpecPinning = "settable" | "fixed" | "unknown";

/**
 * The per-step exec transport the harness's `StepRunner` reads. It is not provider metadata: the CLI
 * composition root projects it from the selected driver module's execution policy, so the module
 * that owns the vendor's exec behaviour is the only place its cap and durable route are declared.
 *
 * - `streaming`: whether stdout/stderr arrive incrementally. No transport decision reads it.
 * - `syncCapMs`: the longest single synchronous exec the step may risk, or `null` when uncapped. A
 *   step whose timeout budget could reach it must not go synchronous.
 * - `detachedPoll`: whether a step can run detached (background launch plus observable completion),
 *   the durable path for steps that would outlast `syncCapMs`. Observable does NOT require a
 *   filesystem API: `StepRunner.runDetached` polls the done file over the filesystem where one works
 *   and `cat`s it over exec where none does. Reading this as "needs a filesystem" once stranded a
 *   55-minute benchmark on a synchronous exec its server cut at ~4m19s.
 */
export interface ProviderTransport {
	/** Does exec deliver stdout/stderr incrementally? The driver projection reports false today. */
	streaming: boolean;
	/** Conservative bound (ms) on a safe single synchronous exec round-trip; `null` when uncapped. */
	syncCapMs: number | null;
	/** Can a step run detached (background exec + observable completion — filesystem poll where exposed,
	 *  `cat` over exec otherwise), the durable long-step path? */
	detachedPoll: boolean;
}

/** Isolation technology a provider runs sandboxes under. */
export interface ProviderIsolation {
	/** e.g. "Firecracker microVM", "gVisor container", "unknown". */
	technology: string;
	/** Stable declared class used by figures and normalization; never inferred from display text. */
	class: IsolationClass;
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
	/** Stable identifier joined against the generated driver loader; one of {@link ProviderId}. */
	id: ProviderId;
	displayName: string;
	/** Stable vendor label shared by isolation variants. */
	vendor: string;
	/** The account whose quota this provider consumes; see {@link quotaDomain}. */
	quotaDomain: string;
	website: string;
	/** The vendor library the provider package pins; see {@link ProviderSdkPackage}. */
	sdkPackage: ProviderSdkPackage;
	/** Declared only for isolation variants; read through {@link providerPackage}. */
	package?: ProviderPackageLocation;
	/** Declared only where it differs from the default; read through {@link figureLabel}. */
	figureLabel?: string;
	/** Artifact lifecycle declared independently of vendor API syntax. */
	artifact: ProviderArtifact;
	/** Normalized provider inputs; consumers never handle descriptor shorthand. */
	inputs: readonly NormalizedProviderInput[];
	/** Compatibility view for the current harness; derived from required inputs. */
	requiredEnvVars: string[];
	isolation: ProviderIsolation;
	pricing: ProviderPricing;
	maturity: ProviderMaturity;
	specPinning: SpecPinning;
	/** Optional GitHub runner route plus its coupled setup-cache and reaping-budget policy. */
	runner?: ProviderRunnerPolicy;
	/** Optional CI authentication preparation owned by generated wiring. */
	preAuth?: ProviderPreAuth;
	/**
	 * Identity the benchmark lane runs as in-sandbox. Omitted means `"root"`: setup, the baked PTS
	 * state and every adapter target root, and the providers that DO inject an unprivileged user are
	 * the exception worth declaring — e2b and novita each pin their exec back to root explicitly in
	 * their drivers, so only a provider with no such lever is `"unprivileged"`.
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
 * shared pricing/identity at runtime. The generated driver loader is keyed by the same ids, so a
 * provider without a driver module fails generation rather than drifting.
 */
export const PROVIDERS: readonly ProviderMeta[] = deepFreeze(
	PROVIDER_IDS.map((id) => {
		const source = REGISTRY[id];
		const inputs = source.inputs.map(normalizeProviderInput);
		return {
			id,
			...source,
			quotaDomain: quotaDomain(id),
			inputs,
			requiredEnvVars: inputs.filter((input) => input.required).map((input) => input.name),
		};
	}),
);

/**
 * The vendor account a provider's sandboxes are charged to and queued behind. Isolation variants
 * that share credentials share one domain (daytona-vm and daytona-container → `daytona`); every
 * other provider is its own. This one lookup names the Actions concurrency group (generated wiring),
 * the account journal branch and the experiment plan's batches, so they cannot disagree.
 */
export function quotaDomain(id: ProviderId): string {
	// Widen from the descriptor's literal type: most descriptors omit the field, so it is not on the
	// registry's union type, only on the declared source shape.
	const meta: ProviderMetaSource = REGISTRY[id];
	return meta.quotaDomain ?? id;
}

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

/** Where a provider's driver module lives, derived from its id unless it is an isolation variant. */
export interface ProviderPackage {
	/** `packages/<directory>`; isolation variants of one vendor share it. */
	readonly directory: string;
	/** `@sandbox-benchmarks/<directory>`. */
	readonly packageName: string;
	/** The package export the driver module is published under (`.` or `./<entry>`). */
	readonly subpath: string;
	/** The import specifier the generated loader uses. */
	readonly specifier: string;
	/** The driver module's source file, relative to the repository root. */
	readonly file: string;
}

/** Resolve a provider to its package entry without loading its implementation. */
export function providerPackage(id: ProviderId): ProviderPackage {
	const meta: ProviderMetaSource = REGISTRY[id];
	const { directory, entry } = meta.package ?? { directory: id, entry: "index" };
	const packageName = `@sandbox-benchmarks/${directory}`;
	return {
		directory,
		packageName,
		subpath: entry === "index" ? "." : `./${entry}`,
		specifier: entry === "index" ? packageName : `${packageName}/${entry}`,
		file: `packages/${directory}/src/${entry}.ts`,
	};
}

/** The generated provenance constant for one provider package: `<DIRECTORY>_PROVENANCE`. */
export function provenanceConstant(directory: string): string {
	return `${directory.toUpperCase().replaceAll("-", "_")}_PROVENANCE`;
}

/**
 * The concise label a chart uses for a provider. Isolation variants sharing one package are one
 * vendor on a chart; every other provider uses its display name unless it declares a shorter one.
 */
export function figureLabel(id: ProviderId): string {
	const meta: ProviderMetaSource = REGISTRY[id];
	if (meta.figureLabel !== undefined) return meta.figureLabel;
	const { directory } = providerPackage(id);
	const shared = PROVIDER_IDS.some(
		(other) => other !== id && providerPackage(other).directory === directory,
	);
	return shared ? meta.vendor : meta.displayName;
}

/** The coarse isolation class a guest probe can contradict. */
export type DeclaredIsolationClass = "gvisor" | "container" | "vm";

/**
 * Collapse the declared isolation class to the vocabulary the guest probe speaks. Userspace kernels
 * are gVisor today; microVMs and full VMs are both a hardware boundary. Unknown declares nothing.
 */
export function declaredIsolationClass(id: ProviderId): DeclaredIsolationClass | undefined {
	return probeClassOf(REGISTRY[id].isolation.class);
}

/** Exhaustive over every declarable class, not only those today's registry narrows to. */
function probeClassOf(declared: IsolationClass): DeclaredIsolationClass | undefined {
	switch (declared) {
		case "userspace":
			return "gvisor";
		case "vm":
		case "microVM":
			return "vm";
		case "container":
			return "container";
		case "unknown":
			return undefined;
	}
}
