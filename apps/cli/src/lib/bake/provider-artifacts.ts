// Release composition for provider artifacts. The registry decides which providers participate;
// this module owns the provider-specific builder implementation for exactly those partitions.

import { config } from "@sandbox-benchmarks/providers/config";
import type {
	ArtifactPhase,
	BakedProviderId,
	MirroredProviderId,
	ProviderArtifact,
	ProviderId,
} from "@sandbox-benchmarks/schema/providers";
import {
	bakedArtifactName,
	isBakedProviderId,
	isMirroredProviderId,
	REGISTRY,
} from "@sandbox-benchmarks/schema/providers";
import { bakeDaytonaContainerSnapshot, bakeDaytonaVmSnapshot } from "./daytona.ts";
import { bakeE2bTemplate } from "./e2b.ts";
import { promoteImage } from "./image.ts";
import { bakeNovitaTemplate } from "./novita.ts";
import { bakeRunloopBlueprint } from "./runloop.ts";
import type { Log } from "./types.ts";

export type BakeProviderArtifact = (name: string, baseImage: string, log: Log) => Promise<void>;

/**
 * Exhaustive over baked providers and impossible to populate for any other artifact lifecycle.
 * Candidate bake and version promote call this same map; only the derived name differs.
 */
export const BAKED_ARTIFACT_BUILDERS = {
	e2b: bakeE2bTemplate,
	"daytona-vm": bakeDaytonaVmSnapshot,
	"daytona-container": bakeDaytonaContainerSnapshot,
	novita: bakeNovitaTemplate,
	runloop: bakeRunloopBlueprint,
} as const satisfies Record<BakedProviderId, BakeProviderArtifact>;

export function buildBakedProviderArtifact(
	id: BakedProviderId,
	phase: ArtifactPhase,
	baseImage: string,
	log: Log,
): Promise<void> {
	return BAKED_ARTIFACT_BUILDERS[id](bakedArtifactName(id, phase), baseImage, log);
}

type PromoteMirror = (log: Log) => Promise<void>;

/** Mirrored artifacts publish by retagging an already-staged candidate, not by baking the base. */
const MIRRORED_ARTIFACT_PROMOTERS = {
	vercel: (log) => promoteImage(log, config.vercelImageCandidate, config.vercelImageVersion),
} as const satisfies Record<MirroredProviderId, PromoteMirror>;

export function promoteMirroredProviderArtifact(id: MirroredProviderId, log: Log): Promise<void> {
	return MIRRORED_ARTIFACT_PROMOTERS[id](log);
}

/** Human-readable release action for providers without a baked artifact. */
export function nonBakedArtifactAction(
	id: Exclude<ProviderId, BakedProviderId>,
	phase: ArtifactPhase,
): string {
	return nonBakedArtifactActionFor(id, REGISTRY[id].artifact, phase);
}

function nonBakedArtifactActionFor(
	id: ProviderId,
	artifact: ProviderArtifact,
	phase: ArtifactPhase,
): string {
	const published = phase === "candidate" ? "candidate" : "published version";
	switch (artifact.kind) {
		case "image":
			return `boots the ${published} image directly — no provider artifact to build`;
		case "none":
			return "boots the vendor stock image — no provider artifact to build";
		case "mirror":
			return phase === "candidate"
				? `boots the candidate image staged in ${artifact.repository} — no sandbox artifact to build`
				: `publishes the staged image into ${artifact.repository}`;
		case "built":
			return `builds recipe ${artifact.recipe} at runtime — no release artifact to build`;
		case "baked":
			// The type excludes baked ids; retain a runtime assertion for corrupted/generated JS callers.
			throw new Error(`baked provider ${id} must use buildBakedProviderArtifact`);
	}
}

export { isBakedProviderId, isMirroredProviderId };
