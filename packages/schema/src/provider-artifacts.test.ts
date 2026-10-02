import { describe, expect, test } from "bun:test";
import type { CandidateArtifactRefs } from "./provider-artifacts.ts";
import {
	bakedArtifactName,
	baseImageUse,
	candidateArtifact,
	isBakedProviderId,
	isMirroredProviderId,
	isNativeSnapshotProviderId,
	releaseUnscopable,
} from "./provider-artifacts.ts";
import { PROVIDER_IDS } from "./provider-ids.ts";
import { REGISTRY } from "./provider-meta/index.ts";
import type { ProviderArtifact } from "./provider-meta.ts";
import type { BakedProviderId, NativeSnapshotProviderId } from "./providers.ts";
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

	test("narrows every and only native-snapshot descriptor: the baked ids that do not bake the base", () => {
		expect(
			PROVIDER_IDS.every(
				(id) =>
					isNativeSnapshotProviderId(id) === (isBakedProviderId(id) && baseImageUse(id) === "none"),
			),
		).toBe(true);
		const native: NativeSnapshotProviderId = "freestyle";
		expect(isNativeSnapshotProviderId(native)).toBe(true);
		// @ts-expect-error an OCI baker is not a native-snapshot baker
		const oci: NativeSnapshotProviderId = "e2b";
		expect(isNativeSnapshotProviderId(oci)).toBe(false);
	});

	test("keeps the compiler-derived partition exact", () => {
		const accepted: BakedProviderId = "e2b";
		expect(accepted).toBe("e2b");
		// @ts-expect-error stock providers cannot acquire a baker
		const stock: BakedProviderId = "boat";
		expect(String(stock)).toBe("boat");
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
					return artifact.source === "native-snapshot" ? "none" : "bakes";
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
		expect(bakedArtifactName("blaxel", "candidate")).toBe(`${canonical}-candidate`);
	});
});

describe("candidate artifacts", () => {
	const refs: CandidateArtifactRefs = {
		toolchainImage: "ghcr.io/o/tc@sha256:candidate",
		mirrored: Object.fromEntries(
			PROVIDER_IDS.filter(isMirroredProviderId).map((id) => [id, `mirror/${id}:candidate`]),
		),
		buildResults: Object.fromEntries(
			PROVIDER_IDS.filter(isBakedProviderId).map((id) => [id, `built-${id}`]),
		),
	};

	test("boots the declared artifact kind, and the base image exactly when it boots the base", () => {
		for (const id of PROVIDER_IDS) {
			const candidate = candidateArtifact(id, refs);
			expect(candidate.kind).toBe(REGISTRY[id].artifact.kind);
			const bootsBase = candidate.kind !== "none" && candidate.ref === refs.toolchainImage;
			expect(`${id}:${bootsBase}`).toBe(`${id}:${baseImageUse(id) === "boots"}`);
		}
	});

	test("boots a baker's derived candidate name, unless its builder returns the boot ref", () => {
		for (const id of PROVIDER_IDS.filter(isBakedProviderId)) {
			const artifact = REGISTRY[id].artifact;
			const nativeSnapshot = "source" in artifact && artifact.source === "native-snapshot";
			expect(candidateArtifact(id, refs)).toEqual({
				kind: "baked",
				ref: nativeSnapshot ? `built-${id}` : bakedArtifactName(id, "candidate"),
			});
		}
	});

	test("refuses an unresolved mirror or native-snapshot ref instead of booting the published one", () => {
		const unresolved = { ...refs, mirrored: {}, buildResults: {} };
		for (const id of PROVIDER_IDS.filter(isMirroredProviderId)) {
			expect(() => candidateArtifact(id, unresolved)).toThrow(/mirrored candidate ref/);
		}
		for (const id of PROVIDER_IDS.filter(isBakedProviderId)) {
			if (baseImageUse(id) === "none") {
				expect(() => candidateArtifact(id, unresolved)).toThrow(/candidate snapshot ID/);
			}
		}
	});

	test("a scoped release refuses exactly the providers with nothing to publish", () => {
		const unscopable = releaseUnscopable();
		for (const id of PROVIDER_IDS) {
			expect(`${id}:${unscopable[id] !== undefined}`).toBe(
				`${id}:${REGISTRY[id].artifact.kind === "none"}`,
			);
		}
	});
});
