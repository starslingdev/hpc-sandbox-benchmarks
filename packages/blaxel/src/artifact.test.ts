// The Blaxel image builder at its interface: a build request becomes one isolated upload context
// and one `bl push`, over a recording transport.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BuildCommandOptions } from "@sandbox-benchmarks/driver/artifact";
import { blaxelArtifactBuilder, blaxelBuildManifest, pinBlaxelBaseImage } from "./artifact.ts";

const DIGEST = `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"b".repeat(64)}`;
const COMMITTED = join(import.meta.dir, "../../templates/images/blaxel/Dockerfile");

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
		const pinned = pinBlaxelBaseImage(readFileSync(COMMITTED, "utf8"), DIGEST);
		expect(pinned).toContain(`ARG BASE_IMAGE=${DIGEST}\nFROM ${DIGEST}`);
		expect(pinned).toContain("COPY blaxel/entrypoint.sh");
		expect(() => pinBlaxelBaseImage("FROM debian:13", DIGEST)).toThrow(/ARG\/FROM/);
	});

	function fixture(options: { dockerLogin?: boolean; exit?: number } = {}) {
		const root = mkdtempSync(join(tmpdir(), "blaxel-artifact-"));
		const imagesDir = join(root, "images");
		const dockerConfig = join(root, "docker");
		mkdirSync(join(imagesDir, "blaxel"), { recursive: true });
		mkdirSync(join(imagesDir, "_shared"));
		mkdirSync(dockerConfig);
		writeFileSync(join(imagesDir, "blaxel/Dockerfile"), readFileSync(COMMITTED, "utf8"));
		writeFileSync(join(imagesDir, "blaxel/entrypoint.sh"), "#!/bin/sh\n");
		writeFileSync(join(imagesDir, "_shared/validate-base.sh"), "#!/bin/sh\n");
		if (options.dockerLogin) writeFileSync(join(dockerConfig, "config.json"), "{}");
		const runs: { argv: readonly string[]; options?: BuildCommandOptions; context: string[] }[] =
			[];
		const builder = blaxelArtifactBuilder(async (argv, runOptions) => {
			const cwd = runOptions?.cwd ?? "";
			runs.push({
				argv,
				...(runOptions && { options: runOptions }),
				context: [
					readFileSync(join(cwd, "blaxel.toml"), "utf8"),
					readFileSync(join(cwd, "Dockerfile"), "utf8").match(/^FROM .*$/m)?.[0] ?? "",
					String(existsSync(join(cwd, "blaxel/entrypoint.sh"))),
					String(existsSync(join(cwd, "_shared/validate-base.sh"))),
				],
			});
			return options.exit ?? 0;
		});
		const run = () =>
			builder.build({
				bakes: "oci",
				name: "toolchain-v9-candidate",
				base: { digestRef: DIGEST },
				spec: { vcpus: 4, memoryGb: 8 },
				env: { BL_API_KEY: "bl_test", BL_WORKSPACE: "bench" },
				replace: "allowed",
				imagesDir,
				dockerConfig,
				log: () => {},
				signal: new AbortController().signal,
			});
		return { root, dockerConfig, runs, run };
	}

	test("pushes an isolated, digest-pinned context with the workspace and registry login", async () => {
		const { root, dockerConfig, runs, run } = fixture({ dockerLogin: true });
		try {
			expect(await run()).toEqual({ ref: "toolchain-v9-candidate", replaced: "atomic" });
			expect(runs).toHaveLength(1);
			const [push] = runs;
			expect(push?.argv).toEqual([
				"bl",
				"push",
				"--type",
				"sandbox",
				"--name",
				"toolchain-v9-candidate",
				"--workspace",
				"bench",
				"--timeout",
				"45m",
				"--yes",
				"--skip-version-warning",
				"--docker-config",
				join(dockerConfig, "config.json"),
			]);
			expect(push?.options?.env).toEqual({ BL_API_KEY: "bl_test", BL_WORKSPACE: "bench" });
			expect(push?.context).toEqual([
				blaxelBuildManifest("toolchain-v9-candidate"),
				`FROM ${DIGEST}`,
				"true",
				"true",
			]);
			// The temporary context never outlives the build.
			expect(existsSync(push?.options?.cwd ?? "")).toBe(false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("omits the registry login it does not have and fails on a non-zero push", async () => {
		const { root, runs, run } = fixture({ exit: 2 });
		try {
			await expect(run()).rejects.toThrow(
				"Blaxel image build toolchain-v9-candidate failed (exit 2)",
			);
			expect(runs[0]?.argv).not.toContain("--docker-config");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
