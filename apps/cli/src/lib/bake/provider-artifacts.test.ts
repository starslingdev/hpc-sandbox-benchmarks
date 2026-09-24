import { describe, expect, test } from "bun:test";
import { PROVIDER_IDS, REGISTRY } from "@sandbox-benchmarks/schema/providers";
import { BAKED_ARTIFACT_BUILDERS, nonBakedArtifactAction } from "./provider-artifacts.ts";

describe("provider artifact composition", () => {
	test("has one builder for every and only baked provider", () => {
		expect(Object.keys(BAKED_ARTIFACT_BUILDERS)).toEqual(
			PROVIDER_IDS.filter((id) => REGISTRY[id].artifact.kind === "baked"),
		);
	});

	test("does not make no-op bakers constructable", () => {
		expect(BAKED_ARTIFACT_BUILDERS.blaxel).toBeFunction();
		// @ts-expect-error image providers are excluded by BakedProviderId
		expect(BAKED_ARTIFACT_BUILDERS["modal-gvisor"]).toBeUndefined();
	});

	test("describes non-baked work from lifecycle metadata", () => {
		expect(nonBakedArtifactAction("modal-gvisor", "candidate")).toContain("candidate image");
		expect(nonBakedArtifactAction("boat", "version")).toContain("vendor stock image");
		expect(nonBakedArtifactAction("vercel", "candidate")).toContain(
			REGISTRY.vercel.artifact.repository,
		);
	});
});
