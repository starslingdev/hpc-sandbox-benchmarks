import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { blaxelBuildManifest, pinBlaxelBaseImage } from "./blaxel.ts";

describe("Blaxel remote image build", () => {
	// Blaxel slims sandbox images by default and stripped the compiler + dpkg state out of the v8
	// toolchain (STREAM/iperf regressions on run 36104006010). The opt-out has to travel with every
	// upload, candidate and version alike, or the next bake ships the same defect.
	test("opts the uploaded context out of Blaxel's automatic image slimming", () => {
		const manifest = blaxelBuildManifest("sandbox-benchmarks-toolchain-v8-candidate");
		expect(manifest).toContain('type = "sandbox"\n');
		expect(manifest).toContain('name = "sandbox-benchmarks-toolchain-v8-candidate"\n');
		expect(manifest).toMatch(/^\[build\]\nslim = false\n$/m);
	});

	test("pins the committed variant to the exact base digest", () => {
		const template = readFileSync(
			join(import.meta.dir, "../../../../../packages/templates/images/blaxel/Dockerfile"),
			"utf8",
		);
		const ref = "ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:abc123";
		const pinned = pinBlaxelBaseImage(template, ref);
		expect(pinned).toContain(`ARG BASE_IMAGE=${ref}\nFROM ${ref}`);
		expect(pinned).toContain("COPY blaxel/entrypoint.sh");
		expect(() => pinBlaxelBaseImage("FROM debian:13", ref)).toThrow(/ARG\/FROM/);
	});
});
