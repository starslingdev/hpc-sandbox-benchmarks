// Pure Tier-1 projections of the registry's artifact lifecycle (ADR-0006). This leaf deliberately
// contains no vendor API syntax: request keys and provider-specific build behavior belong to drivers
// and the release composition root respectively.

import type { ProviderId } from "./provider-ids.ts";
import { PROVIDER_IDS } from "./provider-ids.ts";
import type { BakedProviderId, MirroredProviderId } from "./provider-meta/index.ts";
import { REGISTRY } from "./provider-meta/index.ts";
import type { ProviderArtifact } from "./provider-meta.ts";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "./toolchain.ts";

export type ArtifactPhase = "candidate" | "version";

/** Baked providers whose artifact is a native snapshot prepared in a booted sandbox. */
export type NativeSnapshotProviderId = {
	[P in BakedProviderId]: (typeof REGISTRY)[P]["artifact"] extends {
		readonly source: "native-snapshot";
	}
		? P
		: never;
}[BakedProviderId];
export type BaseImageUse = "bakes" | "boots" | "none";

/** Runtime narrowing paired with the compiler-derived {@link BakedProviderId} partition. */
export function isBakedProviderId(id: ProviderId): id is BakedProviderId {
	return REGISTRY[id].artifact.kind === "baked";
}

/** Runtime narrowing paired with the compiler-derived {@link NativeSnapshotProviderId} partition. */
export function isNativeSnapshotProviderId(id: ProviderId): id is NativeSnapshotProviderId {
	const artifact: ProviderArtifact = REGISTRY[id].artifact;
	return artifact.kind === "baked" && artifact.source === "native-snapshot";
}

/** Runtime narrowing paired with the compiler-derived {@link MirroredProviderId} partition. */
export function isMirroredProviderId(id: ProviderId): id is MirroredProviderId {
	return REGISTRY[id].artifact.kind === "mirror";
}

/**
 * How a provider relates to the shared toolchain base. This is a direct lifecycle projection:
 * OCI-backed baked artifacts derive from it and image/built artifacts boot it. Native snapshots
 * share the installation recipe; stock/mirrored artifacts also do not read the OCI base.
 */
export function baseImageUse(id: ProviderId): BaseImageUse {
	return baseImageUseForArtifact(REGISTRY[id].artifact);
}

function baseImageUseForArtifact(artifact: ProviderArtifact): BaseImageUse {
	switch (artifact.kind) {
		case "baked":
			return artifact.source === "native-snapshot" ? "none" : "bakes";
		case "image":
		case "built":
			return "boots";
		case "none":
		case "mirror":
			return "none";
	}
}

/**
 * Canonical provider-side name for a baked artifact. Providers live in separate control-plane
 * namespaces, so only a declared suffix is needed to distinguish variants sharing one account.
 */
export function bakedArtifactName(id: BakedProviderId, phase: ArtifactPhase): string {
	const artifact = REGISTRY[id].artifact;
	const suffix = "nameSuffix" in artifact ? (artifact.nameSuffix ?? "") : "";
	const versionName = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}${suffix}`;
	return phase === "candidate" ? `${versionName}-candidate` : versionName;
}

/** The refs a release lane resolved for this candidate, keyed by artifact kind rather than provider. */
export interface CandidateArtifactRefs {
	/** The (digest-pinned) candidate toolchain image that image and built artifacts boot. */
	readonly toolchainImage: string;
	/** Candidate refs mirrored into a provider's own registry namespace. */
	readonly mirrored: Readonly<Partial<Record<MirroredProviderId, string>>>;
	/** Immutable ids returned by builders whose artifact name is not the boot ref (native snapshots). */
	readonly buildResults: Readonly<Partial<Record<BakedProviderId, string>>>;
}

export type CandidateArtifact =
	| { readonly kind: "none" }
	| { readonly kind: Exclude<ProviderArtifact["kind"], "none">; readonly ref: string };

/**
 * The candidate artifact a provider boots for release validation. Vendor create options are not
 * part of the answer: how a ref becomes a create request is the driver's business.
 */
export function candidateArtifact(id: ProviderId, refs: CandidateArtifactRefs): CandidateArtifact {
	return candidateForArtifact(id, REGISTRY[id].artifact, refs);
}

/**
 * The exhaustive descriptor→candidate mapping, taking the descriptor as a parameter so the switch
 * covers every artifact kind the type declares, not only those today's registry narrows to.
 */
function candidateForArtifact(
	id: ProviderId,
	artifact: ProviderArtifact,
	refs: CandidateArtifactRefs,
): CandidateArtifact {
	switch (artifact.kind) {
		case "none":
			return { kind: "none" };
		case "image":
		case "built":
			return { kind: artifact.kind, ref: refs.toolchainImage };
		case "mirror": {
			const ref = isMirroredProviderId(id) ? refs.mirrored[id] : undefined;
			if (ref === undefined) throw new Error(`${id} mirrored candidate ref was not resolved`);
			return { kind: "mirror", ref };
		}
		case "baked": {
			if (!isBakedProviderId(id)) throw new Error(`${id} is not in the baked partition`);
			if (artifact.source !== "native-snapshot")
				return { kind: "baked", ref: bakedArtifactName(id, "candidate") };
			// A native snapshot boots the builder's immutable result, not the derived name.
			const ref = refs.buildResults[id];
			if (ref === undefined) throw new Error(`${id} candidate snapshot ID was not resolved`);
			return { kind: "baked", ref };
		}
	}
}

/**
 * Providers a scoped release cannot name, with the reason. A provider that boots an image this
 * repository does not build has nothing to publish, so naming it in a scoped dispatch could only
 * fail after approval; an unscoped release still validates it best-effort.
 */
export function releaseUnscopable(): Readonly<Partial<Record<ProviderId, string>>> {
	return Object.fromEntries(
		PROVIDER_IDS.filter((id) => REGISTRY[id].artifact.kind === "none").map((id) => [
			id,
			"it boots an image this repository does not build or publish; credentialed validation alone cannot produce a scoped backfill",
		]),
	);
}
