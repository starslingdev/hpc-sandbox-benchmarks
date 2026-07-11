// Provider identity & economics — the static facts the comparison surfaces next to results:
// isolation technology, pricing model, maturity, and whether the SDK can pin a target spec.
// This is the SINGLE owner of Provider identity (`id`, `requiredEnvVars`); the harness adapter
// in @sandbox-benchmarks/providers joins against it by id and refuses any one-sided provider.
//
// Validation status is deliberately NOT declared here: a provider is "validated" exactly when a
// committed run carries real metrics for it (computed downstream), "pending" otherwise.

/**
 * Canonical provider ids — the single vocabulary every registry joins on. Adding an id forces a
 * matching {@link REGISTRY} entry (the Record type below makes a missing or extra id a compile
 * error) and, downstream, a harness adapter in @sandbox-benchmarks/providers.
 */
export type ProviderId = "e2b" | "daytona" | "modal" | "blaxel" | "novita";

/** Can the SDK request a pinned target spec (vCPU / memory) at create() time? */
export type SpecPinning = "settable" | "fixed" | "unknown";

/**
 * How a provider's command-exec transport behaves *through its `@computesdk/*` adapter* — the facts the
 * harness needs to pick a per-step transport instead of hardcoding one provider's quirks (the original
 * sin this models away: the harness forced Daytona's detached+poll on every provider). Owned here
 * alongside the other declared capabilities ({@link SpecPinning}, isolation, maturity) because it is a
 * static, comparable property of the integration, and the schema already names the `@computesdk/*`
 * adapter via {@link ProviderMeta.sdkPackage}.
 *
 * Three independent capabilities, each load-bearing for transport selection:
 *
 *   - `streaming` — does the adapter deliver stdout/stderr incrementally (computesdk's
 *     `onStdout`/`onStderr`)? All three shipped adapters drop those callbacks, so a long synchronous
 *     exec buffers silently. Modeled because a streaming path keeps a connection productive past an
 *     idle gateway cap; today it is uniformly `false`, so it does not yet tip the harness's choice.
 *   - `syncCapMs` — the longest a single *synchronous* exec round-trip is safe before the provider
 *     caps it, or `null` when uncapped. The conservative policy bound the harness compares a step's
 *     timeout budget against: a step that could run past it must not go synchronous. Daytona returns a
 *     server-side HTTP 408 on multi-minute synchronous execs while the process keeps running
 *     (`docs/evidence/daytona-exec-transport.md`); E2B's `commands.run` defaults to a 60s command
 *     timeout the computesdk wrapper never overrides.
 *   - `detachedPoll` — can the provider run a step fully detached (background exec + a pollable
 *     filesystem), the durable path for steps that would outlast `syncCapMs`? Without it there is no
 *     alternative, so such a step stays synchronous and best-effort.
 */
export interface ProviderTransport {
	/** Does the `@computesdk/*` adapter stream stdout/stderr chunks (`onStdout`/`onStderr`)? */
	streaming: boolean;
	/** Conservative bound (ms) on a safe single synchronous exec round-trip; `null` when uncapped. */
	syncCapMs: number | null;
	/** Can a step run detached (background exec + filesystem poll), the durable long-step path? */
	detachedPoll: boolean;
}

/**
 * How a provider bills. A discriminated union so a vetted `per_vcpu_hour` rate cannot be declared
 * without its `usdPerVcpuHour` — the missing-rate case is a compile error, not a silent `null`.
 */
export type ProviderPricing =
	| {
			model: "per_vcpu_hour";
			/** USD per vCPU-hour at the pinned target spec. */
			usdPerVcpuHour: number;
			/** USD per GiB of memory per hour, when memory is billed separately. */
			usdPerGibHour?: number;
			/** Memory (GiB) billed at $0 before {@link usdPerGibHour} applies, e.g. Daytona's first 5 GiB. */
			includedMemoryGb?: number;
			/**
			 * USD per GiB of disk per hour at the pinned target spec. `0` means free at that spec
			 * (e.g. within a free tier); omitted entirely when the provider publishes no overage rate.
			 * Recorded for display only — deliberately excluded from {@link hourlyCostAtTargetSpec} so
			 * an unpublished disk rate can't bias the ranking.
			 */
			usdPerGibDiskHour?: number;
			notes: string;
			sourceUrl?: string;
	  }
	| {
			/** No vetted rate in repo config; {@link hourlyCostAtTargetSpec} returns `null`. */
			model: "unknown";
			notes: string;
			sourceUrl?: string;
	  };

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
}

/**
 * The pinned cross-provider target spec: 2 vCPU, 8 GiB RAM, 20 GB disk. Sized to fit inside every
 * provider's reproducible envelope — E2B caps sandbox RAM at 8 GiB — so anyone can rerun the
 * benchmark on the same shape. Providers that can't express a dimension run with actuals recorded
 * and the mismatch disclosed downstream.
 */
export const TARGET_SPEC = { vcpus: 2, memoryGb: 8, diskGb: 20 } as const;

/**
 * Modal provisions and prices in physical CPU cores, where 1 physical core = 2 vCPU. This is the one
 * source of that factor: the Modal pricing entry below normalizes its per-physical-core rate to
 * per-vCPU by it, and the harness adapter divides {@link TARGET_SPEC}.vcpus by it to reserve the
 * matching number of cores (Modal's `SandboxCreateParams.cpu` is physical cores, not vCPUs).
 */
export const VCPUS_PER_PHYSICAL_CORE = 2;

/**
 * The registry, keyed by {@link ProviderId} — the inspiration is the harness adapter map, which
 * keys the *behavioural* half of a provider the same way. A keyed Record (rather than an array of
 * objects each repeating its `id`) buys three things for free: ids are unique by construction, the
 * `Record<ProviderId, …>` type forces exactly one entry per id, and the `id` is attached from the
 * key when the array form is built so it can never drift from its key.
 *
 * Pricing is normalized to USD per vCPU-hour and per GiB-hour from each provider's published
 * per-second rates (see each entry's sourceUrl), cross-checked against the computesdk benchmark
 * pricing table: https://github.com/computesdk/benchmarks/blob/master/pricing.json
 * Disk is recorded per entry (`usdPerGibDiskHour`) but excluded from {@link hourlyCostAtTargetSpec},
 * since overage rates are not uniformly published (E2B publishes none; Modal is free under its
 * 1 TiB/mo tier) and a missing rate would otherwise read as free. Egress is omitted entirely.
 */
const REGISTRY: Record<ProviderId, Omit<ProviderMeta, "id">> = {
	e2b: {
		displayName: "E2B",
		website: "https://e2b.dev",
		sdkPackage: "@computesdk/e2b",
		requiredEnvVars: ["E2B_API_KEY"],
		isolation: { technology: "Firecracker microVM" },
		pricing: {
			model: "per_vcpu_hour",
			// $0.000014/vCPU-s × 3600 = $0.0504/vCPU-hr; $0.0000045/GiB-s × 3600 = $0.0162/GiB-hr.
			usdPerVcpuHour: 0.0504,
			usdPerGibHour: 0.0162,
			notes:
				"Published per-second rates (exact): $0.000014/vCPU-s, $0.0000045/GiB-s. Storage 10 GiB included (20 on Pro); no published overage rate.",
			sourceUrl: "https://e2b.dev/pricing",
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
	daytona: {
		displayName: "Daytona",
		website: "https://daytona.io",
		sdkPackage: "@computesdk/daytona",
		requiredEnvVars: ["DAYTONA_API_KEY"],
		isolation: {
			technology: "container (OCI)",
			notes:
				"Snapshot-based images; orgs locked to a dedicated region need their own snapshot (DAYTONA_SNAPSHOT).",
		},
		pricing: {
			model: "per_vcpu_hour",
			// $0.000014/vCPU-s × 3600 = $0.0504/vCPU-hr; $0.0000045/GiB-s × 3600 = $0.0162/GiB-hr.
			usdPerVcpuHour: 0.0504,
			usdPerGibHour: 0.0162,
			// First 5 GiB of memory ship free, so only the remainder is billed at the target spec.
			includedMemoryGb: 5,
			// $0.00000003/GiB-s × 3600 = $0.000108/GiB-hr (first 5 GiB free).
			usdPerGibDiskHour: 0.000108,
			notes:
				"Published per-second rates (exact): $0.000014/vCPU-s, $0.0000045/GiB-s (first 5 GiB memory free). Disk $0.00000003/GiB-s (first 5 GiB free).",
			sourceUrl: "https://www.daytona.io/pricing",
		},
		maturity: {
			status: "ga",
			notes: "The validated reference provider for this harness (pre-baked toolchain snapshot).",
		},
		specPinning: "settable",
		transport: {
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
		},
	},
	blaxel: {
		displayName: "Blaxel",
		website: "https://blaxel.ai",
		sdkPackage: "@computesdk/blaxel",
		requiredEnvVars: ["BL_API_KEY", "BL_WORKSPACE"],
		isolation: {
			technology: "microVM",
			notes:
				"Blaxel sandboxes (sub-25ms boot claim). Spec dimensions are COUPLED: CPU cores = memory MB / 2048 and disk is a tmpfs overlay at ~78% of memory, so the 2 vCPU / 8 GiB / 20 GB target spec is inexpressible -- the adapter runs oversized (16 GiB => 8-core allocation, ~12.5 GiB disk) and relies on observed-specs disclosure (specMatched=false) downstream.",
		},
		pricing: {
			model: "unknown",
			notes: "Not yet vetted against a published per-second rate.",
			sourceUrl: "https://blaxel.ai/pricing",
		},
		maturity: {
			status: "beta",
			notes:
				"Local e2e validation wiring; not yet a committed run. Realworld suites with minDiskGb > ~12.5 (mastra 30, openclaw 25) skip on the harness disk gate until Blaxel exposes disk independently of memory.",
		},
		// Values ARE settable, but the CPU/disk coupling makes the shared target spec unreachable --
		// "fixed" is the honest capability for cross-provider comparability purposes.
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
	modal: {
		displayName: "Modal",
		website: "https://modal.com",
		sdkPackage: "@computesdk/modal",
		requiredEnvVars: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
		isolation: {
			technology: "gVisor container",
			notes: "scalableSandboxes enabled in the harness; nproc tracks the requested cpu 1:1.",
		},
		pricing: {
			model: "per_vcpu_hour",
			// Sandbox non-preemptible rates. CPU: $0.00003942/physical-core-s ÷ VCPUS_PER_PHYSICAL_CORE × 3600 = $0.070956/vCPU-hr.
			// Memory: $0.00000672/GiB-s × 3600 = $0.024192/GiB-hr.
			usdPerVcpuHour: 0.070956,
			usdPerGibHour: 0.024192,
			// Volumes: 1 TiB/mo free, then $0.09/GiB/mo. The 20 GB target spec sits inside the free
			// tier, so the marginal disk rate at TARGET_SPEC is 0 (known, not unknown).
			usdPerGibDiskHour: 0,
			notes:
				"Sandbox non-preemptible rates (exact): CPU $0.00003942/physical-core-s (1 physical core = 2 vCPU), memory $0.00000672/GiB-s. Regional multipliers (1.25×–2.5×) compound. Volumes: 1 TiB/mo free, then $0.09/GiB/mo.",
			sourceUrl: "https://modal.com/pricing",
		},
		maturity: { status: "ga", notes: "scalableSandboxes enabled in the harness." },
		specPinning: "settable",
		transport: {
			// `@computesdk/modal` runs `sandbox.exec([...])` and `process.wait()`s the result, with no
			// separate per-exec timeout — a synchronous exec is bounded only by the create-time sandbox
			// lifetime, not a server gateway cap (`syncCapMs: null`). It still doesn't surface
			// onStdout/onStderr (it reads the piped streams to completion), and `background` + filesystem
			// are available, so detached+poll remains an option even though direct exec is the default.
			// ENG-64 validates this end-to-end against a live multi-minute suite.
			streaming: false,
			syncCapMs: null,
			detachedPoll: true,
		},
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
			model: "per_vcpu_hour",
			// $0.0000098/vCPU-s × 3600 = $0.03528/vCPU-hr; $0.0000032/GiB-s × 3600 = $0.01152/GiB-hr.
			usdPerVcpuHour: 0.03528,
			usdPerGibHour: 0.01152,
			// Storage $0.00009/GB-hr with the first 60 GB free — the 20 GB target spec sits inside the
			// free tier, so the marginal disk rate at TARGET_SPEC is 0 (known, not unknown).
			usdPerGibDiskHour: 0,
			notes:
				"Published per-second rates (exact): $0.0000098/vCPU-s, $0.0000032/GiB-s. Storage $0.00009/GB-hr (first 60 GB free).",
			sourceUrl: "https://novita.ai/sandbox",
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
};

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
 * Look up a provider's metadata by id. A known {@link ProviderId} literal always resolves; an
 * arbitrary string (e.g. an id read back from a run document) may not.
 */
export function getProvider(id: ProviderId): ProviderMeta;
export function getProvider(id: string): ProviderMeta | undefined;
export function getProvider(id: string): ProviderMeta | undefined {
	// A linear scan over a handful of frozen entries — no module-load Map to drift out of sync, and
	// the entries are immutable, so returning the reference directly is safe.
	return PROVIDERS.find((p) => p.id === id);
}

/**
 * Hourly vCPU + memory cost of a provider at the pinned target spec, or `null` when no vetted rate
 * exists. A provider's included-memory allowance is billed at $0 first; disk (`usdPerGibDiskHour`)
 * is intentionally excluded — see {@link REGISTRY} for why.
 */
export function hourlyCostAtTargetSpec(meta: ProviderMeta): number | null {
	// The union guarantees `usdPerVcpuHour` is present on the `per_vcpu_hour` arm, so narrowing on
	// `model` is enough — no defensive undefined check needed.
	if (meta.pricing.model !== "per_vcpu_hour") {
		return null;
	}
	const cpuCost = meta.pricing.usdPerVcpuHour * TARGET_SPEC.vcpus;
	const billableMemoryGb = Math.max(0, TARGET_SPEC.memoryGb - (meta.pricing.includedMemoryGb ?? 0));
	const memCost = (meta.pricing.usdPerGibHour ?? 0) * billableMemoryGb;
	return cpuCost + memCost;
}
