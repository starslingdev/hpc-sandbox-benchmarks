import { expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bakedArtifactName } from "@sandbox-benchmarks/schema/providers";
import { buildProviderArtifact } from "./provider-artifacts.ts";

test("release composition reaches the generated Blaxel builder with a pinned context and surfaces its failure", async () => {
	const root = await mkdtemp(join(tmpdir(), "artifact-release-")),
		record = join(root, "record.json"),
		exit = join(root, "exit");
	const names = ["PATH", "BL_API_KEY", "BL_WORKSPACE", "DOCKER_CONFIG"] as const,
		saved = Object.fromEntries(names.map((key) => [key, process.env[key]]));
	await mkdir(join(root, "docker"));
	await Bun.write(
		join(root, "bl"),
		`#!/usr/bin/env bun
await Bun.write(${JSON.stringify(record)},JSON.stringify({argv:process.argv.slice(2),key:process.env.BL_API_KEY,dockerfile:await Bun.file('Dockerfile').text(),manifest:await Bun.file('blaxel.toml').text()}));
process.exit(await Bun.file(${JSON.stringify(exit)}).exists()?4:0);`,
	);
	await chmod(join(root, "bl"), 0o755);
	Object.assign(process.env, {
		PATH: `${root}:${process.env.PATH}`,
		BL_API_KEY: "bl_test",
		BL_WORKSPACE: "bench",
		DOCKER_CONFIG: join(root, "docker"),
	});
	const base = `ghcr.io/toolchain@sha256:${"a".repeat(64)}`;
	try {
		expect(
			await buildProviderArtifact("blaxel", {
				phase: "candidate",
				base,
				replace: "allowed",
				log: () => {},
			}),
		).toEqual({ ref: bakedArtifactName("blaxel", "candidate"), replaced: "atomic" });
		const received = await Bun.file(record).json();
		expect(received.argv).toContain(bakedArtifactName("blaxel", "candidate"));
		expect(received.key).toBe("bl_test");
		expect(received.dockerfile).toContain(`FROM ${base}`);
		expect(received.manifest).toContain("slim = false");
		await Bun.write(exit, "4");
		await expect(
			buildProviderArtifact("blaxel", {
				phase: "version",
				base,
				replace: "allowed",
				log: () => {},
			}),
		).rejects.toThrow("exit 4");
	} finally {
		for (const key of names) {
			const value = saved[key];
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
		await rm(root, { recursive: true, force: true });
	}
});
