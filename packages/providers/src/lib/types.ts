// The harness-facing adapter contract. Identity (`name`, `requiredEnvVars`) is owned by the schema's
// ProviderMeta; this module owns only how to construct a provider and the benchmark's create-time
// policy. `index.ts` joins the two registries by id (PROVIDERS × adapters, both keyed by ProviderId).
import type {
	ProviderCostCell,
	ProviderCostEvidence,
	ProviderId,
	ProviderTransport,
	SdkProvenance,
} from "@sandbox-benchmarks/schema";
import type { CreateSandboxOptions, ExplicitComputeConfig } from "computesdk";

/**
 * A configured computesdk provider, as returned by a @computesdk/* factory.
 *
 * computesdk 4.x doesn't export a `DirectProvider` type directly, but it does export
 * {@link ExplicitComputeConfig}, whose `provider` field IS one — so we recover the exact contract
 * structurally instead of falling back to `any`.
 */
export type DirectProvider = NonNullable<ExplicitComputeConfig["provider"]>;

export interface SandboxTeardownResult {
	completed: boolean;
	attemptedAt: string;
	completedAt?: string;
}

export interface CostEvidenceCaptureInput {
	cell: ProviderCostCell;
	providerId: ProviderId;
	sandboxId: string;
	teardown: SandboxTeardownResult;
}

export interface ProviderCostEvidenceCapability {
	sdk: SdkProvenance;
	captureAfterTeardown(input: CostEvidenceCaptureInput): Promise<ProviderCostEvidence>;
}

/**
 * What the harness needs to drive a provider that the framework can't infer:
 * how to construct it, and the benchmark's pinned create-time options.
 *
 * The @computesdk/* wrappers already provide the universal sandbox (runCommand with daemon-backed
 * streaming, filesystem, destroy), so there is deliberately nothing here that re-implements them.
 */
export interface ProviderAdapter {
	/** Construct the computesdk provider for this vendor (a @computesdk/* factory call). Lazy so the
	 *  registry can be imported without credentials. */
	createCompute: () => DirectProvider;
	/** Create-time options passed to `compute.sandbox.create` — the pinned target spec and toolchain
	 *  image. Benchmark policy (ADR-0003), not a framework default; omitted when there is nothing to
	 *  pin. */
	createOptions?: CreateSandboxOptions;
	/** Overrides the schema ProviderMeta's `requiredEnvVars` when the credential set is resolved at
	 *  runtime (e.g. daytona's per-region API key var). Falls back to the schema default when absent. */
	requiredEnvVars?: string[];
	/** Overrides the harness's default per-attempt create timeout for providers whose `create` does not
	 *  return until the sandbox is fully booted — the toolchain image pull then happens INSIDE the
	 *  create call rather than behind a readiness probe. `null` disables the harness race when the
	 *  adapter owns a bounded readiness wait and must finish its own failed-allocation cleanup before
	 *  the caller can safely exit. Omitted when the default is adequate. */
	createTimeoutMs?: number | null;
	/** Worst-case wall time one `create` can spend before it settles, as bounded by the ADAPTER itself.
	 *  Required whenever `createTimeoutMs` is `null` (enforced at registry load by
	 *  {@link assertCreateCeilingDeclared}): with the harness race off, this is the only thing that
	 *  tells the retry loop how much budget an attempt can consume, and without it the loop can start
	 *  an attempt that outlives the retry budget it promised. Meaningless — and omitted — when the
	 *  harness bounds the attempt itself, because there `createTimeoutMs` already IS the ceiling. */
	createAttemptCeilingMs?: number;
	/** Optional provider-owned billing hook, invoked only after the harness has attempted teardown. */
	costEvidence?: ProviderCostEvidenceCapability;
}

/** A provider as the harness consumes it: schema-owned identity joined with the harness adapter. */
export interface ProviderConfig extends ProviderAdapter {
	/** Provider id — the schema {@link ProviderId} this adapter is bound to. */
	name: ProviderId;
	/** Env vars that must all be set to run (mirrored from the schema ProviderMeta). */
	requiredEnvVars: string[];
	/** Exec transport capability (schema-owned), from which the harness picks a per-step transport. */
	transport: ProviderTransport;
}
