// The Blaxel image builder: `bl push` uploads an isolated Docker context, assembled from the
// toolchain images directory, to Blaxel's remote builder without deploying a sandbox. Candidate and
// public version use separate canonical image names.

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EnvOf } from "@sandbox-benchmarks/driver";
import type { BuildCommandRunner } from "@sandbox-benchmarks/driver/artifact";
import { defineArtifactBuilder, runBuildCommand } from "@sandbox-benchmarks/driver/artifact";

/** The `bl` CLI version the release lane's setup action installs. */
const BLAXEL_CLI_VERSION = "0.1.100";

/** Disable image slimming so the builder preserves the compiler and package database. */
export function blaxelBuildManifest(name: string): string {
	return `type = "sandbox"\nname = "${name}"\n\n[build]\nslim = false\n`;
}

/** Pin the remote builder's FROM to the validated bytes, keeping the label ARG in sync. */
export function pinBlaxelBaseImage(template: string, digestRef: string): string {
	if (!/^ARG BASE_IMAGE=.*$/m.test(template) || !/^FROM \$\{BASE_IMAGE\}$/m.test(template)) {
		throw new Error("Blaxel Dockerfile has no BASE_IMAGE ARG/FROM anchors");
	}
	return template
		.replace(/^ARG BASE_IMAGE=.*$/m, () => `ARG BASE_IMAGE=${digestRef}`)
		.replace(/^FROM \$\{BASE_IMAGE\}$/m, () => `FROM ${digestRef}`);
}

/** The Blaxel builder over a build-command transport; the default export binds the real one. */
export function blaxelArtifactBuilder(run: BuildCommandRunner = runBuildCommand) {
	return defineArtifactBuilder<"blaxel", EnvOf<"blaxel">>("blaxel", async (request) => {
		const { name, base, imagesDir, env, log } = request;
		const context = await mkdtemp(join(tmpdir(), "benchmark-blaxel-"));
		try {
			await Promise.all([mkdir(join(context, "_shared")), mkdir(join(context, "blaxel"))]);
			const template = await readFile(join(imagesDir, "blaxel/Dockerfile"), "utf8");
			await writeFile(join(context, "Dockerfile"), pinBlaxelBaseImage(template, base.digestRef));
			await writeFile(join(context, "blaxel.toml"), blaxelBuildManifest(name));
			await copyFile(
				join(imagesDir, "blaxel/entrypoint.sh"),
				join(context, "blaxel/entrypoint.sh"),
			);
			await copyFile(
				join(imagesDir, "_shared/validate-base.sh"),
				join(context, "_shared/validate-base.sh"),
			);
			const args: [string, ...string[]] = [
				"bl",
				"push",
				"--type",
				"sandbox",
				"--name",
				name,
				"--workspace",
				env.BL_WORKSPACE,
				"--timeout",
				"45m",
				"--yes",
				"--skip-version-warning",
			];
			// The remote builder must be able to pull a private GHCR base. The release lane's
			// registry login supplies this config in CI; a public package also works without it.
			const dockerConfig = join(request.dockerConfig, "config.json");
			if (await Bun.file(dockerConfig).exists()) args.push("--docker-config", dockerConfig);
			request.signal.throwIfAborted();
			log(`Blaxel image ${name} from ${base.digestRef} (CLI ${BLAXEL_CLI_VERSION})`);
			const exit = await run(args, {
				signal: request.signal,
				cwd: context,
				env: { BL_API_KEY: env.BL_API_KEY, BL_WORKSPACE: env.BL_WORKSPACE },
			});
			if (exit !== 0) throw new Error(`Blaxel image build ${name} failed (exit ${exit})`);
		} finally {
			await rm(context, { recursive: true, force: true });
		}
		// A push publishes a new image under the name; the previous one serves until it lands.
		return { ref: name, replaced: "atomic" };
	});
}

export default blaxelArtifactBuilder();
