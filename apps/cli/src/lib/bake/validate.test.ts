import { describe, expect, it } from "bun:test";
import type { CandidateRefs } from "./validate.ts";
import { candidateCreateOptions } from "./validate.ts";

const refs: CandidateRefs = {
	e2bTemplateCandidate: "tc-v1-candidate",
	daytonaSnapshotCandidate: "snap-v1-candidate",
	novitaTemplateCandidate: "tc-v1-candidate",
	toolchainImageCandidate: "ghcr.io/o/tc:v1-candidate",
	daytonaTarget: "zen5",
};

describe("candidateCreateOptions", () => {
	it("points e2b at the candidate template via snapshotId", () => {
		expect(candidateCreateOptions("e2b", refs)).toEqual({ snapshotId: "tc-v1-candidate" });
	});

	it("points daytona at the candidate snapshot + region target", () => {
		expect(candidateCreateOptions("daytona", refs)).toEqual({
			snapshotId: "snap-v1-candidate",
			target: "zen5",
		});
	});

	it("omits the daytona target when the region has none (account default)", () => {
		expect(candidateCreateOptions("daytona", { ...refs, daytonaTarget: undefined })).toEqual({
			snapshotId: "snap-v1-candidate",
		});
	});

	it("points novita at its candidate template via snapshotId (e2b mapping, Novita's control plane)", () => {
		expect(candidateCreateOptions("novita", refs)).toEqual({ snapshotId: "tc-v1-candidate" });
	});

	it("points modal at the candidate image via templateId", () => {
		expect(candidateCreateOptions("modal", refs)).toEqual({
			templateId: "ghcr.io/o/tc:v1-candidate",
		});
	});
});
