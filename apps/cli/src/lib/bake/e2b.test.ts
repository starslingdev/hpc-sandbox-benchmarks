import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pinE2bBaseImage } from "./e2b.ts";

// The concrete registry ref a bake pins the e2b template's base to.
const BASE = "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v1-candidate";

// The literal Dockerfile placeholder `${BASE_IMAGE}` — a Dockerfile ARG reference, NOT a JS template
// placeholder. Kept in one constant so the biome ignore lives once; template strings below compose it
// (`FROM ${VAR}` → the string "FROM ${BASE_IMAGE}") without tripping the lint again.
// biome-ignore lint/suspicious/noTemplateCurlyInString: literal Dockerfile ARG reference, not a JS placeholder.
const VAR = "${BASE_IMAGE}";

// A minimal stand-in for the committed variant Dockerfile: the two anchors plus a `${BASE_IMAGE}`
// label reference that must survive (E2B *does* expand ARGs after FROM, only the pre-FROM one breaks).
const TEMPLATE = [
	"# syntax=docker/dockerfile:1",
	"ARG BASE_IMAGE=sandbox-benchmarks-toolchain:dev",
	"",
	`FROM ${VAR}`,
	"",
	"ARG BASE_IMAGE",
	`LABEL org.opencontainers.image.base.name="${VAR}"`,
].join("\n");

describe("pinE2bBaseImage", () => {
	it("concretes the FROM line — E2B's builder doesn't expand a pre-FROM ARG BASE_IMAGE", () => {
		const out = pinE2bBaseImage(TEMPLATE, BASE);
		expect(out).toContain(`FROM ${BASE}`);
		expect(out).not.toContain(`FROM ${VAR}`);
	});

	it("also pins the ARG BASE_IMAGE default, leaving the post-FROM ARG + label intact", () => {
		const out = pinE2bBaseImage(TEMPLATE, BASE);
		expect(out).toContain(`ARG BASE_IMAGE=${BASE}`);
		// The bare post-FROM `ARG BASE_IMAGE` and the label reference stay as-is (ARGs work there).
		expect(out).toContain("\nARG BASE_IMAGE\n");
		expect(out).toContain(`LABEL org.opencontainers.image.base.name="${VAR}"`);
	});

	it("preserves CRLF line endings — the FROM anchor's whitespace class excludes `\\r`", () => {
		const crlf = TEMPLATE.replace(/\n/g, "\r\n");
		const out = pinE2bBaseImage(crlf, BASE);
		// The rewritten FROM keeps its `\r` (no LF/CRLF mix vs the untouched ARG line above it).
		expect(out).toContain(`FROM ${BASE}\r\n`);
		expect(out).toContain(`ARG BASE_IMAGE=${BASE}\r\n`);
		// ...and did NOT collapse to a bare-LF FROM line (the `\r`-consuming bug).
		expect(out).not.toContain(`FROM ${BASE}\n`);
	});

	it("does not misinterpret a `$` in the base ref as a regex replacement pattern", () => {
		const weird = "registry.example.com/img:$&-$1";
		const out = pinE2bBaseImage(TEMPLATE, weird);
		expect(out).toContain(`FROM ${weird}`);
		expect(out).toContain(`ARG BASE_IMAGE=${weird}`);
	});

	it("throws if the placeholder FROM line is missing (a refactor must fail loudly)", () => {
		const noFrom = "ARG BASE_IMAGE=x\nFROM debian:13-slim\n";
		expect(() => pinE2bBaseImage(noFrom, BASE)).toThrow(/FROM \$\{BASE_IMAGE\}/);
	});

	it("throws if the ARG BASE_IMAGE default is missing", () => {
		const noArg = `FROM ${VAR}\n`;
		expect(() => pinE2bBaseImage(noArg, BASE)).toThrow(/ARG BASE_IMAGE=/);
	});

	it("pins the real committed e2b Dockerfile — catches a FROM/ARG refactor", () => {
		// Path mirrors E2B_CONTEXT in e2b.ts (anchored to this file, not cwd).
		const real = readFileSync(
			join(import.meta.dir, "../../../../../packages/templates/images/e2b/Dockerfile"),
			"utf8",
		);
		const out = pinE2bBaseImage(real, BASE);
		expect(out).toContain(`FROM ${BASE}`);
		expect(out).not.toContain(`FROM ${VAR}`);
		expect(out).toContain(`ARG BASE_IMAGE=${BASE}`);
	});
});
