// Pure mapping from a provider id to the create-options that boot its *candidate* artifact, so the
// bake can validate exactly what it just built (not the public version). Kept pure + injectable so
// it's unit-testable without the env-backed config.
import type { ProviderId } from "@sandbox-benchmarks/schema";

/**
 * Providers with no candidate artifact, and why — the single message source the bake, promote, and
 * validate loops all consume. These boot stock environments (base image / gateway / default
 * template) that can never pass the pinned toolchain smoke, so the loops must SKIP validating them
 * rather than boot-and-fail: a red bake that means "stock image lacks the toolchain" would be
 * indistinguishable from a real toolchain regression on the providers that do bake.
 */
export const NO_ARTIFACT: Partial<Record<ProviderId, string>> = {
	blaxel: "blaxel boots the stock base image — no candidate artifact",
	vercel: "vercel boots the stock Amazon Linux image — no candidate artifact",
	cloudrun: "cloudrun executes inside the pre-deployed gateway service — no candidate artifact",
	novita: "novita boots its default template — no candidate artifact",
};

export interface CandidateRefs {
	e2bTemplateCandidate: string;
	daytonaSnapshotCandidate: string;
	toolchainImageCandidate: string;
	/** Daytona runner target for the active region (undefined → account default). */
	daytonaTarget?: string;
}

/** Create-options overrides that point a provider at its candidate artifact for the validate boot. */
export function candidateCreateOptions(
	id: ProviderId,
	refs: CandidateRefs,
): Record<string, unknown> {
	switch (id) {
		case "e2b":
			// computesdk maps snapshotId → the e2b template id/name.
			return { snapshotId: refs.e2bTemplateCandidate };
		case "daytona":
			return {
				snapshotId: refs.daytonaSnapshotCandidate,
				...(refs.daytonaTarget ? { target: refs.daytonaTarget } : {}),
			};
		case "modal":
			return { templateId: refs.toolchainImageCandidate };
		// No candidate artifact to point at (see NO_ARTIFACT) — stock environments boot as-is.
		case "blaxel":
		case "vercel":
		case "cloudrun":
		case "novita":
			return {};
	}
}
