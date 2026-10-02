// The release lane's artifact composition, end to end and offline: the registry-derived request
// travels through the generated `ARTIFACT_BUILDERS` join into the provider package's real builder,
// whose vendor CLI is a recording stand-in on PATH.

import { afterEach, describe, expect, test } from "bun:test";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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

describe("a native-snapshot build under the release lane's process ownership", () => {
	/** Run the fixture build, SIGTERM it once it logs `ready`, and return its exit and log. */
	async function interrupt(mode: "prepare" | "late", ready: string) {
		const root = mkdtempSync(join(tmpdir(), "bake-signal-"));
		roots.push(root);
		const logFile = join(root, "build.log");
		const lines = () =>
			existsSync(logFile) ? readFileSync(logFile, "utf8").trim().split("\n") : [];
		const proc = Bun.spawn(
			["bun", join(import.meta.dir, "provider-artifacts.signal.fixture.ts"), logFile, mode],
			{ stdout: "pipe", stderr: "pipe" },
		);
		try {
			const deadline = Date.now() + 5_000;
			while (!lines().includes(ready)) {
				if (Date.now() >= deadline) throw new Error(`fixture never logged ${ready}`);
				await Bun.sleep(10);
			}
			proc.kill("SIGTERM");
			return { exit: await proc.exited, lines: lines() };
		} finally {
			proc.kill();
		}
	}

	test("a signal during preparation aborts the build and the drain destroys its sandbox", async () => {
		expect(await interrupt("prepare", "prepare")).toEqual({
			exit: 143,
			lines: ["create", "prepare", "aborted", "destroy"],
		});
	});

	test("a signal while the create is in flight reclaims the sandbox when it lands late", async () => {
		expect(await interrupt("late", "create")).toEqual({ exit: 143, lines: ["create", "destroy"] });
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
