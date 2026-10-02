// Prototype of `@sandbox-benchmarks/driver/artifact` (arktype-free): the seam through which the
// release lane builds a provider artifact without knowing the vendor. The caller derives the name,
// pins the base by digest, and parses credentials; the provider package translates that into its
// vendor's build API and returns exactly the ref its driver will boot.

import type { ProviderId } from "@sandbox-benchmarks/driver";

export interface ArtifactBuildRequest<Env> {
	/** `bakedArtifactName(id, phase)`; deterministic per toolchain version. */
	readonly name: string;
	/** Always pinned by the caller; a builder never resolves a mutable tag. */
	readonly base: { readonly digestRef: string };
	readonly spec: { readonly vcpus: number; readonly memoryGb: number; readonly diskGb?: number };
	/** The provider's declared inputs, already parsed (EnvOf<P> in the real module). */
	readonly env: Env;
	/** Whether an existing artifact of this name may be replaced (candidate) or must not (version). */
	readonly replace: "allowed" | "forbidden";
	readonly log: (line: string) => void;
	readonly signal: AbortSignal;
}

export interface ArtifactBuildResult {
	/** Exactly what the candidate boot passes as ResolvedArtifact.ref. */
	readonly ref: string;
	/** How a previous artifact of the same name was replaced; states what promote must log. */
	readonly replaced: "none" | "atomic" | "destructive";
}

export interface ArtifactBuilder<P extends ProviderId, Env> {
	readonly provider: P;
	build(request: ArtifactBuildRequest<Env>): Promise<ArtifactBuildResult>;
}

export function defineArtifactBuilder<P extends ProviderId, Env>(
	provider: P,
	build: (request: ArtifactBuildRequest<Env>) => Promise<ArtifactBuildResult>,
): ArtifactBuilder<P, Env> {
	return Object.freeze({ provider, build });
}
