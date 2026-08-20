// Pure Tier-1 projections of the registry's artifact lifecycle (ADR-0006). This leaf deliberately
// contains no vendor API syntax: request keys and provider-specific build behavior belong to drivers
// and the release composition root respectively.

import type { ProviderId } from "./provider-ids.ts";
import type { BakedProviderId, MirroredProviderId } from "./provider-meta/index.ts";
import { REGISTRY } from "./provider-meta/index.ts";
import type { ProviderArtifact } from "./provider-meta.ts";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "./toolchain.ts";

export type ArtifactPhase = "candidate" | "version";
export type BaseImageUse = "bakes" | "boots" | "none";

/** Runtime narrowing paired with the compiler-derived {@link BakedProviderId} partition. */
export function isBakedProviderId(id: ProviderId): id is BakedProviderId {
	return REGISTRY[id].artifact.kind === "baked";
}

/** Runtime narrowing paired with the compiler-derived {@link MirroredProviderId} partition. */
export function isMirroredProviderId(id: ProviderId): id is MirroredProviderId {
	return REGISTRY[id].artifact.kind === "mirror";
}

/**
 * How a provider relates to the shared toolchain base. This is a direct lifecycle projection:
 * baked artifacts derive from it, image/built artifacts boot it, and stock/mirrored artifacts do
 * not read it in the sandbox release lane.
 */
export function baseImageUse(id: ProviderId): BaseImageUse {
	return baseImageUseForArtifact(REGISTRY[id].artifact);
}

function baseImageUseForArtifact(artifact: ProviderArtifact): BaseImageUse {
	switch (artifact.kind) {
		case "baked":
			return "bakes";
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
