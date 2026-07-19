// Pure mapping from a provider id to the create-options that boot its *candidate* artifact, so the
// bake can validate exactly what it just built (not the public version). Kept pure + injectable so
// it's unit-testable without the env-backed config.
import type { ProviderId } from "@sandbox-benchmarks/schema";

export interface CandidateRefs {
	e2bTemplateCandidate: string;
	/** Candidate LINUX_VM snapshot for daytona-vm. */
	daytonaSnapshotCandidate: string;
	/** Candidate CONTAINER snapshot for daytona-container (its own snapshot + region). */
	daytonaContainerSnapshotCandidate: string;
	/** Candidate template on Novita's E2B-compatible control plane (its own namespace). */
	novitaTemplateCandidate: string;
	toolchainImageCandidate: string;
	/** daytona-vm runner target (us-west-2; undefined → account default). */
	daytonaVmTarget?: string;
	/** daytona-container runner target (`us`; undefined → account default). */
	daytonaContainerTarget?: string;
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
		case "daytona-vm":
			return {
				snapshotId: refs.daytonaSnapshotCandidate,
				...(refs.daytonaVmTarget ? { target: refs.daytonaVmTarget } : {}),
			};
		case "daytona-container":
			return {
				snapshotId: refs.daytonaContainerSnapshotCandidate,
				...(refs.daytonaContainerTarget ? { target: refs.daytonaContainerTarget } : {}),
			};
		case "modal-gvisor":
			return { templateId: refs.toolchainImageCandidate };
		case "modal-vm":
			// Same candidate image as modal-gvisor; the VM runtime is selected via experimentalOptions.
			return {
				templateId: refs.toolchainImageCandidate,
				experimentalOptions: { vm_runtime: true },
			};
		case "blaxel":
			// Stock base image — no candidate artifact to point at.
			return {};
		case "novita":
			// Same mapping as e2b (snapshotId → template name), against Novita's control plane.
			return { snapshotId: refs.novitaTemplateCandidate };
	}
}
