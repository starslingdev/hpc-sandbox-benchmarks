// The harness-facing adapter contract. Identity (`name`, `requiredEnvVars`) is owned by the schema's
// ProviderMeta; this module owns only how to construct a provider and the benchmark's create-time
// policy. `index.ts` joins the two registries by id (PROVIDERS × adapters, both keyed by ProviderId).
import type { ProviderId, ProviderTransport } from "@sandbox-benchmarks/schema";
import type { CreateSandboxOptions, ExplicitComputeConfig } from "computesdk";

/**
 * A configured computesdk provider, as returned by a @computesdk/* factory.
 *
 * computesdk 4.x doesn't export a `DirectProvider` type directly, but it does export
 * {@link ExplicitComputeConfig}, whose `provider` field IS one — so we recover the exact contract
 * structurally instead of falling back to `any`.
 */
export type DirectProvider = NonNullable<ExplicitComputeConfig["provider"]>;

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
