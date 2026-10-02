// Equivalence proofs: each derivation reproduces today's hand-maintained table for the whole fleet,
// so moving the facts into metadata is a refactor, not a behavior change.

import { describe, expect, test } from "bun:test";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import { RELEASE_UNSCOPABLE_PROVIDERS } from "../../../../apps/cli/src/bin/release-plan.ts";
import type { CandidateRefs } from "../../../../apps/cli/src/lib/bake/validate.ts";
import {
	candidateCreateOptions,
	candidateResolvedArtifact,
} from "../../../../apps/cli/src/lib/bake/validate.ts";
import {
	driverModuleLocation,
	renderDriversProvenance,
} from "../../../../packages/schema/scripts/generate-provider-wiring.ts";
import { deriveCandidateLaunch, deriveReleaseUnscopable, provenanceEntries } from "./derive.ts";

describe("metadata-derived wiring matches the hand-written tables", () => {
	test("provenance constants and packages", () => {
		const current = [...renderDriversProvenance().entries()].flatMap(([file, source]) =>
			[
				...source.matchAll(
					/export const (\w+)_PROVENANCE = Object\.freeze\(\{\n\tpackageName: "([^"]+)"/g,
				),
			].map((match) => `${file} ${match[1]} ${match[2]}`),
		);
		const derived = provenanceEntries((id) => driverModuleLocation(id).directory).map(
			(entry) =>
				`packages/${entry.directory}/src/provenance.ts ${entry.constant} ${entry.packageName}`,
		);
		expect(derived.sort()).toEqual(current.sort());
	});

	test("candidate launch options and artifacts", () => {
		const refs: CandidateRefs = {
			freestyleSnapshotCandidate: "sc-freestyle",
			e2bTemplateCandidate: "e2b-cand",
			daytonaSnapshotCandidate: "dvm-cand",
			daytonaContainerSnapshotCandidate: "dct-cand",
			novitaTemplateCandidate: "novita-cand",
			runloopBlueprintCandidate: "runloop-cand",
			blaxelImageCandidate: "blaxel-cand",
			toolchainImageCandidate: "ghcr.io/x/toolchain:candidate",
			vercelImageCandidate: "vcr/x:candidate",
			daytonaVmTarget: "us-west-2",
		};
		// In the target design this is one generic lookup keyed by provider, not ten named fields.
		const refOf = {
			e2b: refs.e2bTemplateCandidate,
			"daytona-vm": refs.daytonaSnapshotCandidate,
			"daytona-container": refs.daytonaContainerSnapshotCandidate,
			novita: refs.novitaTemplateCandidate,
			runloop: refs.runloopBlueprintCandidate,
			blaxel: refs.blaxelImageCandidate,
			freestyle: refs.freestyleSnapshotCandidate,
			vercel: refs.vercelImageCandidate,
		} as Record<string, string | undefined>;
		for (const id of PROVIDER_IDS) {
			const derived = deriveCandidateLaunch(id, refOf[id] ?? refs.toolchainImageCandidate, {
				daytonaVmTarget: refs.daytonaVmTarget,
			});
			expect({ id, ...derived } as object).toEqual({
				id,
				artifact: candidateResolvedArtifact(id, refs),
				createOptions: candidateCreateOptions(id, refs),
			});
		}
	});

	test("release scope refusals", () => {
		expect(Object.keys(deriveReleaseUnscopable()).sort()).toEqual(
			Object.keys(RELEASE_UNSCOPABLE_PROVIDERS).sort(),
		);
	});
});
