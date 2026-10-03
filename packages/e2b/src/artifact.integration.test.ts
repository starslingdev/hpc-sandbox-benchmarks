import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBuildCommand } from "@sandbox-benchmarks/driver/artifact";
import { ociBuildRequest } from "@sandbox-benchmarks/driver/vendor/testing";
import { e2bArtifactBuilder } from "./artifact.ts";

test("concurrent E2B publications isolate their manifests and cancellation reaps the builder", async () => {
	const dir = await mkdtemp(join(tmpdir(), "e2b-build-e2e-"));
	const cli = join(dir, "build.ts");
	await writeFile(
		cli,
		[
			'const argv = process.argv.slice(2), context = argv[argv.indexOf("--path") + 1];',
			'await Bun.write(process.env.TEST_BUILD_TRACE, JSON.stringify({ context, argv, dockerfile: await Bun.file(context + "/" + argv[argv.indexOf("--dockerfile") + 1]).text(), manifest: await Bun.file(context + "/e2b/e2b.toml").text() }));',
			'if (process.env.TEST_BUILD_STALL === "true") await Bun.sleep(60_000);',
		].join("\n"),
	);
	const contexts: string[] = [];
	try {
		await Promise.all(
			["candidate", "version", "canceled"].map(async (phase) => {
				const cancel = new AbortController(),
					trace = join(dir, `${phase}.json`);
				const request = ociBuildRequest("e2b", {
					name: `e2b-toolchain-${phase}`,
					imagesDir: join(import.meta.dir, "../../templates/images"),
					dockerConfig: dir,
					signal: cancel.signal,
				});
				const pending = e2bArtifactBuilder((argv, options) =>
					runBuildCommand([process.execPath, cli, ...argv.slice(1)], {
						...options,
						env: {
							...options?.env,
							TEST_BUILD_TRACE: trace,
							TEST_BUILD_STALL: String(phase === "canceled"),
						},
					}),
				).build(request);
				pending.catch(() => {});
				try {
					const deadline = Date.now() + 2_000;
					while (!(await Bun.file(trace).exists())) {
						if (Date.now() > deadline) throw new Error("template command did not start");
						await Bun.sleep(5);
					}
					const emitted = JSON.parse(await readFile(trace, "utf8"));
					contexts.push(emitted.context);
					expect(emitted.context).not.toBe(request.imagesDir);
					expect(emitted.argv).toContain(request.name);
					expect(emitted.dockerfile).toContain(`FROM ${request.base.digestRef}`);
					expect(emitted.manifest).toContain(`template_name = "${request.name}"`);
					if (phase === "canceled") {
						cancel.abort(new Error("release interrupted"));
						await expect(pending).rejects.toThrow("release interrupted");
					} else expect(await pending).toEqual({ ref: request.name, replaced: "atomic" });
					expect(await Bun.file(join(emitted.context, "e2b/e2b.toml")).exists()).toBe(false);
				} finally {
					cancel.abort();
					await pending.catch(() => {});
				}
			}),
		);
		expect(new Set(contexts).size).toBe(3);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
