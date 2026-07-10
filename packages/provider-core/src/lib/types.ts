// The harness-facing adapter contract. Identity (`name`, `requiredEnvVars`) is owned by the schema's
// ProviderMeta; this module owns only how to construct a provider and the benchmark's create-time
// policy. The aggregator (@sandbox-benchmarks/providers) joins the two registries by id
// (PROVIDERS × adapters, both keyed by ProviderId).
import type { ProviderId, ProviderProbes, ProviderTransport } from "@sandbox-benchmarks/schema";
import type { CreateSandboxOptions, ExplicitComputeConfig } from "computesdk";

/**
 * The full provider shape computesdk models. computesdk 4.x doesn't export a `DirectProvider` type
 * directly, but it does export {@link ExplicitComputeConfig}, whose `provider` field IS one — so we
 * recover the exact contract structurally instead of falling back to `any`.
 */
type ComputeProvider = NonNullable<ExplicitComputeConfig["provider"]>;

/**
 * Snapshot manager surface as the harness probes it. Deliberately variant-tolerant on the returned
 * snapshot shape: wrappers type `create` with their own vendor snapshot (`@computesdk/vercel`
 * returns the raw `@vercel/sandbox` Snapshot, which carries `snapshotId` instead of computesdk's
 * `id`), so a concrete return type here would force every such wrapper through an unknown-cast.
 * The harness's lifecycle probe normalizes the returned shape behind runtime guards instead.
 */
export interface ProviderSnapshots {
	create(sandboxId: string, options?: { name?: string }): Promise<unknown>;
	delete(snapshotId: string): Promise<unknown>;
}

/**
 * A configured computesdk provider, as returned by a @computesdk/* factory — the surface the
 * harness actually drives. The `sandbox` manager keeps computesdk's full typing (it is the whole
 * benchmark path); `snapshot`/`template` are optional probe/bake surfaces kept variant-tolerant,
 * because wrappers instantiate them with vendor-specific generics that don't all satisfy
 * computesdk's declared manager contract (see {@link ProviderSnapshots}).
 */
export type DirectProvider = Omit<ComputeProvider, "snapshot" | "template"> & {
	/** Snapshot manager if the wrapper exposes one; probed by the lifecycle benchmark. */
	snapshot?: ProviderSnapshots;
	/** Template manager if the wrapper exposes one; unused by the harness. */
	template?: unknown;
};

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
}

/** A provider as the harness consumes it: schema-owned identity joined with the harness adapter. */
export interface ProviderConfig extends ProviderAdapter {
	/** Provider id — the schema {@link ProviderId} this adapter is bound to. */
	name: ProviderId;
	/** Env vars that must all be set to run (the schema ProviderMeta's list; the join mirrors it). */
	requiredEnvVars: string[];
	/** Exec transport capability (schema-owned), from which the harness picks a per-step transport. */
	transport: ProviderTransport;
	/** Probe capability (schema-owned): what the lifecycle benchmark may honestly measure here. */
	probes: ProviderProbes;
}
