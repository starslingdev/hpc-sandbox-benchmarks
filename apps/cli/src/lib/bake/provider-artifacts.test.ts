// The release lane's artifact composition, end to end and offline: the registry-derived request
// travels through the generated `ARTIFACT_BUILDERS` join into the provider package's real builder,
// whose vendor CLI is a recording stand-in on PATH.

import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bakedArtifactName, REGISTRY } from "@sandbox-benchmarks/schema/providers";
import {
	buildProviderArtifact,
	describeReplacement,
	nonBakedArtifactAction,
} from "./provider-artifacts.ts";

const DIGEST = `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"e".repeat(64)}`;
const saved = { ...process.env };
const roots: string[] = [];
afterEach(() => {
	for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
	Object.assign(process.env, saved);
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** Put a recording `bl` first on PATH and Blaxel's parsed inputs in the environment. */
function fakeBlaxelCli(exit = 0) {
	const root = mkdtempSync(join(tmpdir(), "bake-e2e-"));
	roots.push(root);
	const bin = join(root, "bin");
	const record = join(root, "record");
	mkdirSync(bin);
	mkdirSync(join(root, "docker"));
	writeFileSync(
		join(bin, "bl"),
		[
			"#!/bin/sh",
			`{ echo "argv:$*"; echo "key:$BL_API_KEY"; grep '^FROM ' Dockerfile; cat blaxel.toml; } > "${record}"`,
			`exit ${exit}`,
		].join("\n"),
	);
	chmodSync(join(bin, "bl"), 0o755);
	Object.assign(process.env, {
		PATH: `${bin}:${process.env.PATH}`,
		BL_API_KEY: "bl_e2e",
		BL_WORKSPACE: "bench",
		DOCKER_CONFIG: join(root, "docker"),
	});
	return { record };
}

describe("buildProviderArtifact", () => {
	test("builds an OCI candidate through the generated join and the package's own builder", async () => {
		const { record } = fakeBlaxelCli();
		const logs: string[] = [];
		const result = await buildProviderArtifact("blaxel", {
			phase: "candidate",
			base: DIGEST,
			log: (line) => logs.push(line),
		});
		const name = bakedArtifactName("blaxel", "candidate");
		expect(result).toEqual({ ref: name, replaced: "atomic" });
		const recorded = readFileSync(record, "utf8");
		expect(recorded).toContain(`argv:push --type sandbox --name ${name} --workspace bench`);
		expect(recorded).toContain("key:bl_e2e");
		expect(recorded).toContain(`FROM ${DIGEST}`);
		expect(recorded).toContain("slim = false");
		expect(logs.some((line) => line.includes(DIGEST))).toBe(true);
		expect(describeReplacement("blaxel", name, result)).toContain("replacing");
	});

	test("surfaces the vendor CLI's failure as the build's", async () => {
		fakeBlaxelCli(4);
		await expect(
			buildProviderArtifact("blaxel", { phase: "version", base: DIGEST, log: () => {} }),
		).rejects.toThrow(`${bakedArtifactName("blaxel", "version")} failed (exit 4)`);
	});

	test("refuses a mutable base before any builder runs", async () => {
		const { record } = fakeBlaxelCli();
		await expect(
			buildProviderArtifact("blaxel", {
				phase: "candidate",
				base: "ghcr.io/o/toolchain:v9-candidate",
				log: () => {},
			}),
		).rejects.toThrow("must be digest-pinned");
		expect(() => readFileSync(record)).toThrow();
	});

	test("refuses a native-snapshot version build without its revalidated candidate", async () => {
		await expect(
			buildProviderArtifact("freestyle", { phase: "version", log: () => {} }),
		).rejects.toThrow("needs the revalidated candidate");
	});
});

describe("non-baked release actions", () => {
	test("describes non-baked work from lifecycle metadata", () => {
		expect(nonBakedArtifactAction("modal-gvisor", "candidate")).toContain("candidate image");
		expect(nonBakedArtifactAction("boat", "version")).toContain("vendor stock image");
		expect(nonBakedArtifactAction("vercel", "candidate")).toContain(
			REGISTRY.vercel.artifact.repository,
		);
	});
});
