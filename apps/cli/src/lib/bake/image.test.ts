import { describe, expect, it } from "bun:test";
import {
	digestPinnedRef,
	imagetoolsNormalizeCmd,
	imagetoolsRetagCmd,
	registryManifestAbsent,
	resolveImageDigestRef,
} from "./image.ts";

describe("imagetoolsRetagCmd", () => {
	it("builds a registry-side retag (candidate → version) with no pull", () => {
		expect(imagetoolsRetagCmd("ghcr.io/o/tc:v1-candidate", "ghcr.io/o/tc:v1")).toEqual([
			"docker",
			"buildx",
			"imagetools",
			"create",
			"-t",
			"ghcr.io/o/tc:v1",
			"ghcr.io/o/tc:v1-candidate",
		]);
	});
});

describe("imagetoolsNormalizeCmd", () => {
	it("wraps the mutable candidate tag without changing its image bytes", () => {
		const ref = "ghcr.io/o/tc:v1-candidate";
		expect(imagetoolsNormalizeCmd(ref)).toEqual([
			"docker",
			"buildx",
			"imagetools",
			"create",
			"-t",
			ref,
			ref,
		]);
	});
});

describe("digestPinnedRef", () => {
	const digest = `sha256:${"a".repeat(64)}`;
	const inspect = JSON.stringify({ manifest: { digest } });

	it("replaces a mutable tag with the immutable outer image-index digest", () => {
		expect(digestPinnedRef("ghcr.io/o/tc:v1-candidate", inspect)).toBe(`ghcr.io/o/tc@${digest}`);
	});

	it("does not mistake a registry port for a tag", () => {
		expect(digestPinnedRef("registry.example:5000/o/tc", inspect)).toBe(
			`registry.example:5000/o/tc@${digest}`,
		);
	});

	it("rejects malformed or missing digests instead of falling back to the stale tag", () => {
		expect(() => digestPinnedRef("ghcr.io/o/tc:v1", "{}")).toThrow("no valid manifest digest");
		expect(() => digestPinnedRef("ghcr.io/o/tc:v1", "not json")).toThrow(
			"invalid imagetools inspect JSON",
		);
	});
});

describe("resolveImageDigestRef", () => {
	it("preserves an already-pinned digest instead of resolving it a second time", async () => {
		const ref = `ghcr.io/o/tc@sha256:${"b".repeat(64)}`;
		expect(await resolveImageDigestRef(ref)).toBe(ref);
	});
});

describe("registryManifestAbsent", () => {
	it("recognizes registry manifest/name absence responses", () => {
		expect(registryManifestAbsent("no such manifest: ghcr.io/o/t:v1")).toBe(true);
		expect(registryManifestAbsent("manifest unknown")).toBe(true);
		expect(registryManifestAbsent("NAME_UNKNOWN: repository name not known to registry")).toBe(
			true,
		);
	});

	it("does not mistake local credential/tool failures for an absent remote image", () => {
		expect(registryManifestAbsent("error getting credentials: executable not found")).toBe(false);
		expect(registryManifestAbsent("docker-credential-osxkeychain: not found")).toBe(false);
		expect(registryManifestAbsent("unauthorized: authentication required")).toBe(false);
	});
});
