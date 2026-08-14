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
	/** Candidate Blueprint on Runloop's control plane. */
	runloopBlueprintCandidate: string;
	toolchainImageCandidate: string;
	/** Candidate image mirrored into the linked project's Vercel Container Registry. */
	vercelImageCandidate: string;
	/** daytona-vm runner target (us-west-2; undefined → account default). */
	daytonaVmTarget?: string;
	/** daytona-container runner target (us-west-2; undefined → account default). */
	daytonaContainerTarget?: string;
}

/**
 * How a provider relates to the shared toolchain BASE image — the classification the scoped release
 * needs, kept beside {@link candidateCreateOptions} because it is the same per-provider knowledge and
 * must stay exhaustive over `ProviderId` in the same way.
 *
 *   • `bakes` — builds its own artifact FROM the base (a template, snapshot, or Runloop Blueprint), so
 *     the artifact's bytes are decided at bake time by whichever base it was handed.
 *   • `boots` — no artifact of its own; it boots the base image by ref at create time.
 *   • `none`  — never references the base at all: blaxel boots a vendor stock image, and
 *     vercel boots its own VCR mirror (staged from the base by the build phase, not by this ref).
 */
export type BaseImageUse = "bakes" | "boots" | "none";

/** {@link BaseImageUse} for one provider. */
export function baseImageUse(id: ProviderId): BaseImageUse {
	switch (id) {
		case "e2b":
		case "daytona-vm":
		case "daytona-container":
		case "novita":
		case "runloop":
			return "bakes";
		case "modal-gvisor":
		case "modal-vm":
		case "microsandbox-local":
		case "microsandbox-cloud":
		case "namespace":
		case "runcloud":
		case "tama":
			return "boots";
		case "blaxel":
		case "vercel":
			return "none";
	}
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
			// Same candidate image as modal-gvisor; the VM runtime is selected by the adapter's base
			// createOptions (experimentalOptions:{vm_runtime:true}), which validate-run.ts preserves
			// through the spread — so this candidate override, like modal-gvisor's, is only the templateId.
			return { templateId: refs.toolchainImageCandidate };
		case "microsandbox-local":
		case "microsandbox-cloud":
			// Both backends consume the same OCI image reference; only their SDK backend differs.
			return { templateId: refs.toolchainImageCandidate };
		case "blaxel":
			// Stock base image — no candidate artifact to point at.
			return {};
		case "novita":
			// Same mapping as e2b (snapshotId → template name), against Novita's control plane.
			return { snapshotId: refs.novitaTemplateCandidate };
		case "runloop":
			return { blueprint_name: refs.runloopBlueprintCandidate };
		case "namespace":
			// No template/snapshot system — points create() at the candidate image directly, same as modal.
			return { image: refs.toolchainImageCandidate };
		case "runcloud":
			// The native SDK boots an arbitrary OCI image directly; there is no template to bake.
			return { image: refs.toolchainImageCandidate };
		case "tama":
			// `tama new --image` pulls an arbitrary OCI ref at create time, so the candidate boots the same
			// way the published version does; there is no provider-side artifact.
			return { image: refs.toolchainImageCandidate };
		case "vercel":
			return { templateId: refs.vercelImageCandidate };
	}
}
