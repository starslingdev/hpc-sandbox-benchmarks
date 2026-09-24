import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pinBlaxelBaseImage } from "./blaxel.ts";

describe("Blaxel remote image build", () => {
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
