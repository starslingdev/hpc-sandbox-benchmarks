// Pure mapping from a provider id to the create-options that boot its *candidate* artifact, so the
// bake can validate exactly what it just built (not the public version). Kept pure + injectable so
// it's unit-testable without the env-backed config.
import type { ProviderId } from "@sandbox-benchmarks/schema";

export interface CandidateRefs {
	e2bTemplateCandidate: string;
	daytonaSnapshotCandidate: string;
	/** Candidate template on Novita's E2B-compatible control plane (its own namespace). */
	novitaTemplateCandidate: string;
	toolchainImageCandidate: string;
	/** Candidate blaxel-variant image (base + sandbox-api injected — see images/blaxel/Dockerfile). */
	toolchainImageBlaxelCandidate: string;
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
		case "blaxel":
			// computesdk's blaxel wrapper resolves `image` last (spread after its factory default), so
			// this overrides the adapter's published-version image for the validate boot.
			return { image: refs.toolchainImageBlaxelCandidate };
		case "novita":
			// Same mapping as e2b (snapshotId → template name), against Novita's control plane.
			return { snapshotId: refs.novitaTemplateCandidate };
	}
}
