import { describe, expect, test } from "bun:test";
import {
	bakedArtifactName,
	baseImageUse,
	isBakedProviderId,
	isMirroredProviderId,
} from "./provider-artifacts.ts";
import { PROVIDER_IDS } from "./provider-ids.ts";
import { REGISTRY } from "./provider-meta/index.ts";
import type { ProviderArtifact } from "./provider-meta.ts";
import type { BakedProviderId } from "./providers.ts";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "./toolchain.ts";

describe("artifact partitions", () => {
	test("narrows every and only baked descriptor", () => {
		const baked = PROVIDER_IDS.filter(isBakedProviderId);
		expect(baked.every((id) => REGISTRY[id].artifact.kind === "baked")).toBe(true);
		expect(
			PROVIDER_IDS.every(
				(id) => isBakedProviderId(id) === (REGISTRY[id].artifact.kind === "baked"),
			),
		).toBe(true);
	});

	test("narrows every and only mirrored descriptor", () => {
		expect(
			PROVIDER_IDS.every(
				(id) => isMirroredProviderId(id) === (REGISTRY[id].artifact.kind === "mirror"),
			),
		).toBe(true);
	});

	test("keeps the compiler-derived partition exact", () => {
		const accepted: BakedProviderId = "e2b";
		expect(accepted).toBe("e2b");
		// @ts-expect-error stock providers cannot acquire a baker
		const stock: BakedProviderId = "blaxel";
		expect(String(stock)).toBe("blaxel");
	});

	test("requires baked name suffixes to begin with a separator", () => {
		const valid: ProviderArtifact = { kind: "baked", nameSuffix: "-container" };
		expect(valid.nameSuffix).toBe("-container");
		// @ts-expect-error suffixes concatenate onto the canonical name and must begin with '-'
		const invalid: ProviderArtifact = { kind: "baked", nameSuffix: "container" };
		expect(invalid.kind).toBe("baked");
	});
});

describe("artifact projections", () => {
	test("derives base-image use from artifact kind", () => {
		const expected = (artifact: ProviderArtifact): ReturnType<typeof baseImageUse> => {
			switch (artifact.kind) {
				case "baked":
					return "bakes";
				case "image":
				case "built":
					return "boots";
				case "none":
				case "mirror":
					return "none";
			}
		};
		for (const id of PROVIDER_IDS) expect(baseImageUse(id)).toBe(expected(REGISTRY[id].artifact));
	});

	test("derives candidate/version names and variant suffixes", () => {
		const canonical = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;
		expect(bakedArtifactName("e2b", "version")).toBe(canonical);
		expect(bakedArtifactName("novita", "candidate")).toBe(`${canonical}-candidate`);
		expect(bakedArtifactName("daytona-container", "version")).toBe(`${canonical}-container`);
	});
});
