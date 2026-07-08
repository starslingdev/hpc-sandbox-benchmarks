// Pure mapping from a provider id to the create-options that boot its *candidate* artifact, so the
// bake can validate exactly what it just built (not the public version). Kept pure + injectable so
// it's unit-testable without the env-backed config.
import type { ProviderId } from "@sandbox-benchmarks/schema";

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
		case "blaxel":
			// Stock base image — no candidate artifact to point at.
			return {};
	}
}
