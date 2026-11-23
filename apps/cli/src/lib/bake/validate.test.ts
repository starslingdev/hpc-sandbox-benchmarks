import { describe, expect, it } from "bun:test";
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import type { CandidateRefs } from "./validate.ts";
import { baseImageUse, candidateCreateOptions, candidateResolvedArtifact } from "./validate.ts";

const refs: CandidateRefs = {
	freestyleSnapshotCandidate: "sh-freestyle-candidate",
	e2bTemplateCandidate: "tc-v1-candidate",
	daytonaVmSnapshotCandidate: {
		"daytona-vm-zen5": "snap-v1-zen5-candidate",
		"daytona-vm-zen5-burst": "snap-v1-zen5-burst-candidate",
		"daytona-vm-arm": "snap-v1-arm-candidate",
		"daytona-vm-arm-burst": "snap-v1-arm-burst-candidate",
	},
	daytonaContainerSnapshotCandidate: "snap-v1-container-candidate",
	// Distinct from the e2b value so the novita case fails if it ever reads the e2b field.
	novitaTemplateCandidate: "tc-v1-novita-candidate",
	blaxelImageCandidate: "tc-v1-candidate",
	basetenImageCandidate: "tc-v1-baseten-candidate",
	toolchainImageCandidate: "ghcr.io/o/tc:v1-candidate",
	vercelImageCandidate: "sandbox-benchmarks-toolchain-vercel:v1-candidate",
	daytonaVmTarget: {
		"daytona-vm-zen5": "us-east-ash-1",
		"daytona-vm-zen5-burst": "us-east-ash-1",
		"daytona-vm-arm": "us-east-iad-1",
		"daytona-vm-arm-burst": "us-east-iad-1",
	},
	daytonaContainerTarget: "us-west-2",
};

describe("candidateCreateOptions", () => {
	it("keeps every candidate's recorded artifact adjacent to its actual boot override", () => {
		for (const provider of PROVIDERS) {
			const artifact = candidateResolvedArtifact(provider.id, refs);
			expect(artifact.kind).toBe(provider.artifact.kind);
			if (artifact.kind !== "none") {
				expect(JSON.stringify(candidateCreateOptions(provider.id, refs))).toContain(artifact.ref);
			}
		}
	});

	it("points e2b at the candidate template via snapshotId", () => {
		expect(candidateCreateOptions("e2b", refs)).toEqual({ snapshotId: "tc-v1-candidate" });
	});

	it("points daytona-container at its own candidate snapshot + region target", () => {
		expect(candidateCreateOptions("daytona-container", refs)).toEqual({
			snapshotId: "snap-v1-container-candidate",
			target: "us-west-2",
		});
	});

	it("boots each daytona-vm variant from its own image in its own region", () => {
		expect(candidateCreateOptions("daytona-vm-zen5", refs)).toEqual({
			snapshotId: "snap-v1-zen5-candidate",
			target: "us-east-ash-1",
		});
		expect(candidateCreateOptions("daytona-vm-arm-burst", refs)).toEqual({
			snapshotId: "snap-v1-arm-burst-candidate",
			target: "us-east-iad-1",
		});
	});

	it("points novita at its candidate template via snapshotId (e2b mapping, Novita's control plane)", () => {
		expect(candidateCreateOptions("novita", refs)).toEqual({
			snapshotId: "tc-v1-novita-candidate",
		});
	});

	it("points Blaxel at its versioned candidate workspace image", () => {
		expect(candidateResolvedArtifact("blaxel", refs)).toEqual({
			kind: "baked",
			ref: refs.blaxelImageCandidate,
		});
		expect(candidateCreateOptions("blaxel", refs)).toEqual({
			image: `${refs.blaxelImageCandidate}:latest`,
		});
	});

	it("points Baseten at its versioned candidate team image", () => {
		expect(candidateResolvedArtifact("baseten", refs)).toEqual({
			kind: "baked",
			ref: refs.basetenImageCandidate,
		});
		expect(candidateCreateOptions("baseten", refs)).toEqual({
			image: `${refs.basetenImageCandidate}:latest`,
		});
	});

	it("points modal-gvisor at the candidate image via templateId", () => {
		expect(candidateCreateOptions("modal-gvisor", refs)).toEqual({
			templateId: "ghcr.io/o/tc:v1-candidate",
		});
	});

	it("points modal-vm at the same candidate image (VM runtime stays on the adapter base)", () => {
		// candidateCreateOptions returns only the candidate override; the vm_runtime flag lives in the
		// adapter's base createOptions and is preserved by validate-run.ts's spread, so it isn't repeated
		// here (matching modal-gvisor).
		expect(candidateCreateOptions("modal-vm", refs)).toEqual({
			templateId: "ghcr.io/o/tc:v1-candidate",
		});
	});

	it("points namespace directly at the candidate image", () => {
		expect(candidateCreateOptions("namespace", refs)).toEqual({
			image: "ghcr.io/o/tc:v1-candidate",
		});
	});

	it("points run.cloud directly at the candidate image", () => {
		expect(candidateCreateOptions("runcloud", refs)).toEqual({
			image: "ghcr.io/o/tc:v1-candidate",
		});
	});

	it("points Vercel at the digest-pinned VCR candidate image", () => {
		expect(candidateCreateOptions("vercel", refs)).toEqual({
			templateId: refs.vercelImageCandidate,
		});
	});

	it("points Microsandbox Cloud at the candidate OCI image", () => {
		expect(candidateCreateOptions("microsandbox-cloud", refs)).toEqual({
			templateId: "ghcr.io/o/tc:v1-candidate",
		});
	});
});

// Two release decisions read this classification, and both fail QUIETLY if it is wrong: a bake cell
// resolves the candidate base only when some in-scope provider reads it, and a partial promote demands
// candidate/published identity only when some in-scope provider BAKES its artifact from the base.
describe("baseImageUse", () => {
	// Anything that reads the base ref in candidateCreateOptions must not be classified "none", or the
	// bake cell would skip resolving a digest that provider then boots.
	it("agrees with candidateCreateOptions about who reads the base image ref", () => {
		for (const { id } of PROVIDERS) {
			const readsBase = JSON.stringify(candidateCreateOptions(id, refs)).includes(
				refs.toolchainImageCandidate,
			);
			expect(`${id}:${readsBase}`).toBe(`${id}:${baseImageUse(id) === "boots"}`);
		}
	});
});
