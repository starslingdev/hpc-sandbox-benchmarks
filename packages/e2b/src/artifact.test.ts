// The e2b template builder at its interface: a build request becomes a pinned per-build
// Dockerfile, a template manifest, and one pinned CLI invocation, over a recording transport.

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OciArtifactBuildRequest } from "@sandbox-benchmarks/driver/artifact";
import { E2B_CLI_VERSION, e2bArtifactBuilder, pinE2bBaseImage } from "./artifact.ts";

const BASE = `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"a".repeat(64)}`;
// biome-ignore lint/suspicious/noTemplateCurlyInString: literal Dockerfile ARG reference, not a JS placeholder.
const VAR = "${BASE_IMAGE}";
// A minimal stand-in for the committed variant Dockerfile: the two anchors plus a `${BASE_IMAGE}`
// label reference that must survive (E2B does expand ARGs after FROM; only the pre-FROM one breaks).
const TEMPLATE = [
	"# syntax=docker/dockerfile:1",
	"ARG BASE_IMAGE=sandbox-benchmarks-toolchain:dev",
	"",
	`FROM ${VAR}`,
	"",
	"ARG BASE_IMAGE",
	`LABEL org.opencontainers.image.base.name="${VAR}"`,
].join("\n");
const COMMITTED = join(import.meta.dir, "../../templates/images/e2b/Dockerfile");

describe("pinE2bBaseImage", () => {
	test("concretes FROM and the ARG default, leaving the post-FROM ARG and label intact", () => {
		const out = pinE2bBaseImage(TEMPLATE, BASE);
		expect(out).toContain(`FROM ${BASE}`);
		expect(out).not.toContain(`FROM ${VAR}`);
		expect(out).toContain(`ARG BASE_IMAGE=${BASE}`);
		expect(out).toContain("\nARG BASE_IMAGE\n");
		expect(out).toContain(`LABEL org.opencontainers.image.base.name="${VAR}"`);
	});

	test("preserves CRLF line endings", () => {
		const out = pinE2bBaseImage(TEMPLATE.replace(/\n/g, "\r\n"), BASE);
		expect(out).toContain(`FROM ${BASE}\r\n`);
		expect(out).toContain(`ARG BASE_IMAGE=${BASE}\r\n`);
		expect(out).not.toContain(`FROM ${BASE}\n`);
	});

	test("does not read a `$` in the base ref as a replacement pattern", () => {
		const weird = "registry.example.com/img:$&-$1";
		expect(pinE2bBaseImage(TEMPLATE, weird)).toContain(`FROM ${weird}`);
	});

	test("fails loudly when either anchor is missing", () => {
		expect(() => pinE2bBaseImage("ARG BASE_IMAGE=x\nFROM debian:13-slim\n", BASE)).toThrow(
			/FROM \$\{BASE_IMAGE\}/,
		);
		expect(() => pinE2bBaseImage(`FROM ${VAR}\n`, BASE)).toThrow(/ARG BASE_IMAGE=/);
	});

	test("pins the real committed e2b Dockerfile, catching a FROM/ARG refactor", () => {
		const out = pinE2bBaseImage(readFileSync(COMMITTED, "utf8"), BASE);
		expect(out).toContain(`FROM ${BASE}`);
		expect(out).toContain(`ARG BASE_IMAGE=${BASE}`);
	});
});

describe("the e2b template builder", () => {
	function build(exit = 0) {
		const imagesDir = mkdtempSync(join(tmpdir(), "e2b-artifact-"));
		mkdirSync(join(imagesDir, "e2b"));
		writeFileSync(join(imagesDir, "e2b/Dockerfile"), TEMPLATE);
		const runs: { argv: readonly string[]; env?: Readonly<Record<string, string>> }[] = [];
		const builder = e2bArtifactBuilder(async (argv, options) => {
			runs.push({ argv, ...(options?.env && { env: options.env }) });
			return exit;
		});
		const request: OciArtifactBuildRequest<{ E2B_API_KEY: string }> = {
			bakes: "oci",
			name: "sandbox-benchmarks-toolchain-v9-candidate",
			base: { digestRef: BASE },
			spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
			env: { E2B_API_KEY: "e2b_test" },
			replace: "allowed",
			imagesDir,
			dockerConfig: "/unused",
			log: () => {},
			signal: new AbortController().signal,
		};
		return { imagesDir, runs, run: () => builder.build(request) };
	}

	test("creates the named template from the pinned base with the target's CPU and memory", async () => {
		const { imagesDir, runs, run } = build();
		try {
			expect(await run()).toEqual({
				ref: "sandbox-benchmarks-toolchain-v9-candidate",
				replaced: "atomic",
			});
			expect(runs).toEqual([
				{
					argv: [
						"bunx",
						`@e2b/cli@${E2B_CLI_VERSION}`,
						"template",
						"create",
						"sandbox-benchmarks-toolchain-v9-candidate",
						"--path",
						imagesDir,
						"--dockerfile",
						"e2b/Dockerfile.generated",
						"--cpu-count",
						"4",
						"--memory-mb",
						"8192",
					],
					env: { E2B_API_KEY: "e2b_test" },
				},
			]);
			expect(readFileSync(join(imagesDir, "e2b/Dockerfile.generated"), "utf8")).toContain(
				`FROM ${BASE}`,
			);
			expect(readFileSync(join(imagesDir, "e2b/e2b.toml"), "utf8")).toContain(
				'template_name = "sandbox-benchmarks-toolchain-v9-candidate"',
			);
		} finally {
			rmSync(imagesDir, { recursive: true, force: true });
		}
	});

	test("fails the build when the CLI exits non-zero", async () => {
		const { imagesDir, run } = build(3);
		try {
			await expect(run()).rejects.toThrow("e2b template create exited 3");
		} finally {
			rmSync(imagesDir, { recursive: true, force: true });
		}
	});
});
