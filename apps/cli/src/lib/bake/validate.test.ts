import { describe, expect, it } from "bun:test";
import type { CandidateRefs } from "./validate.ts";
import { candidateCreateOptions } from "./validate.ts";

const refs: CandidateRefs = {
	e2bTemplateCandidate: "tc-v1-candidate",
	daytonaSnapshotCandidate: "snap-v1-candidate",
	daytonaContainerSnapshotCandidate: "snap-v1-container-candidate",
	// Distinct from the e2b value so the novita case fails if it ever reads the e2b field.
	novitaTemplateCandidate: "tc-v1-novita-candidate",
	toolchainImageCandidate: "ghcr.io/o/tc:v1-candidate",
	daytonaVmTarget: "us-west-2",
	daytonaContainerTarget: "us",
};

describe("candidateCreateOptions", () => {
	it("points e2b at the candidate template via snapshotId", () => {
		expect(candidateCreateOptions("e2b", refs)).toEqual({ snapshotId: "tc-v1-candidate" });
	});

	it("points daytona-vm at its candidate snapshot + region target", () => {
		expect(candidateCreateOptions("daytona-vm", refs)).toEqual({
			snapshotId: "snap-v1-candidate",
			target: "us-west-2",
		});
	});

	it("points daytona-container at its own candidate snapshot + region target", () => {
		expect(candidateCreateOptions("daytona-container", refs)).toEqual({
			snapshotId: "snap-v1-container-candidate",
			target: "us",
		});
	});

	it("omits the daytona-vm target when the region has none (account default)", () => {
		expect(candidateCreateOptions("daytona-vm", { ...refs, daytonaVmTarget: undefined })).toEqual({
			snapshotId: "snap-v1-candidate",
		});
	});

	it("points novita at its candidate template via snapshotId (e2b mapping, Novita's control plane)", () => {
		expect(candidateCreateOptions("novita", refs)).toEqual({
			snapshotId: "tc-v1-novita-candidate",
		});
	});

	it("points modal at the candidate image via templateId", () => {
		expect(candidateCreateOptions("modal", refs)).toEqual({
			templateId: "ghcr.io/o/tc:v1-candidate",
		});
	});
});
