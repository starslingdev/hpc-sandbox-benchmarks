import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBuildCommand } from "@sandbox-benchmarks/driver/artifact";
import { ociBuildRequest } from "@sandbox-benchmarks/driver/vendor/testing";
import { blaxelArtifactBuilder } from "./artifact.ts";

test("Blaxel publication pins its uploaded context and cancellation reaps the builder", async () => {
	const dir = await mkdtemp(join(tmpdir(), "blaxel-build-e2e-"));
	const cli = join(dir, "build.ts");
	await writeFile(
		cli,
		[
			"const trace = process.env.TEST_BUILD_TRACE;",
			'await Bun.write(trace, JSON.stringify({ cwd: process.cwd(), argv: process.argv.slice(2), dockerfile: await Bun.file("Dockerfile").text(), manifest: await Bun.file("blaxel.toml").text() }));',
			'if (process.env.TEST_BUILD_STALL === "true") await Bun.sleep(60_000);',
		].join("\n"),
	);
	try {
		for (const stall of [false, true]) {
			const cancel = new AbortController();
			const trace = join(dir, `${stall}.json`);
			const request = ociBuildRequest("blaxel", {
				imagesDir: join(import.meta.dir, "../../templates/images"),
				dockerConfig: dir,
				signal: cancel.signal,
			});
			const builder = blaxelArtifactBuilder((argv, options) =>
				runBuildCommand([process.execPath, cli, ...argv.slice(1)], {
					...options,
					env: { ...options?.env, TEST_BUILD_TRACE: trace, TEST_BUILD_STALL: String(stall) },
				}),
			);
			const pending = builder.build(request);
			pending.catch(() => {});
			try {
				const deadline = Date.now() + 2_000;
				while (!(await Bun.file(trace).exists())) {
					if (Date.now() > deadline) throw new Error("build command did not start");
					await Bun.sleep(5);
				}
				const emitted = JSON.parse(await readFile(trace, "utf8"));
				expect(emitted.argv).toContain(request.name);
				expect(emitted.dockerfile).toContain(`FROM ${request.base.digestRef}`);
				expect(emitted.manifest).toContain("slim = false");
				if (stall) {
					cancel.abort(new Error("release interrupted"));
					await expect(pending).rejects.toThrow("release interrupted");
				} else expect(await pending).toEqual({ ref: request.name, replaced: "atomic" });
				expect(await Bun.file(join(emitted.cwd, "Dockerfile")).exists()).toBe(false);
			} finally {
				cancel.abort();
				await pending.catch(() => {});
			}
		}
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
