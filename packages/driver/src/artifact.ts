// @sandbox-benchmarks/driver/artifact — the seam through which the release lane builds a provider
// artifact without knowing the vendor (ADR-0023 §2). Arktype-free: it is types and one freeze.
//
// The caller derives the name, pins the base by digest, parses credentials and decides whether an
// existing artifact may be replaced; the provider package translates that into its vendor's build
// API (an SDK call, a remote Docker build through a pinned CLI, or a native snapshot) and returns
// exactly the ref its driver will boot. Nothing else crosses the seam.

import type { EnvOf, ProviderId, TargetSpec } from "@sandbox-benchmarks/driver";

export interface ArtifactBuildRequest<Env> {
	/** The registry-derived artifact name (`bakedArtifactName(id, phase)`); deterministic per version. */
	readonly name: string;
	/** Always pinned by the caller; a builder never resolves a mutable tag. */
	readonly base: { readonly digestRef: string };
	/**
	 * On a version build, the immutable ref of the candidate artifact the release lane has just
	 * revalidated. A builder whose artifact is a native snapshot rather than an image derived from
	 * the OCI base (Freestyle) promotes these bytes instead of rebuilding on a possibly newer stock
	 * base; image builders ignore it. Absent on a candidate build.
	 */
	readonly candidate?: { readonly ref: string };
	/**
	 * The toolchain images directory (`packages/templates/images`). Builders that upload a Docker
	 * context to a remote builder through a vendor CLI (e2b, Blaxel) assemble it from here; the
	 * release lane resolves the path so a provider package never locates another package's files
	 * relative to its own source.
	 */
	readonly imagesDir: string;
	/** The target the artifact is sized for, where the vendor's build API takes resources. */
	readonly spec: TargetSpec;
	/** The provider's declared inputs, already parsed. */
	readonly env: Env;
	/** Whether an existing artifact of this name may be replaced (candidate, forced republish). */
	readonly replace: "allowed" | "forbidden";
	readonly log: (line: string) => void;
	readonly signal: AbortSignal;
}

export interface ArtifactBuildResult {
	/** Exactly what the candidate boot passes as `ResolvedArtifact.ref` (a name or an immutable id). */
	readonly ref: string;
	/**
	 * How a previous artifact of the same name was replaced, so the release lane can say what a
	 * forced republish cost. `destructive`: the vendor has no overwrite, so the name was deleted
	 * and then recreated (Daytona); between the two it resolved to nothing. A builder that fails
	 * after such a delete must say in its error that the name no longer resolves.
	 */
	readonly replaced: "none" | "atomic" | "destructive";
}

export interface ArtifactBuilder<P extends ProviderId, Env = EnvOf<P>> {
	readonly provider: P;
	build(request: ArtifactBuildRequest<Env>): Promise<ArtifactBuildResult>;
}

/** Define a provider's artifact builder: its package's `./artifact` export. */
export function defineArtifactBuilder<P extends ProviderId, Env = EnvOf<P>>(
	provider: P,
	build: (request: ArtifactBuildRequest<Env>) => Promise<ArtifactBuildResult>,
): ArtifactBuilder<P, Env> {
	return Object.freeze({ provider, build });
}
