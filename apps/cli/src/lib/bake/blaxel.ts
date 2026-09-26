// Build a Blaxel sandbox image from the same digest-pinned base used by the other providers.
// `bl push` uploads an isolated Docker context to Blaxel's remote builder without deploying a
// sandbox. Candidate and public version use separate canonical image names.
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { resolveImageDigestRef } from "./image.ts";
import type { Log } from "./types.ts";

const IMAGES = join(import.meta.dir, "../../../../../packages/templates/images");
const CLI_VERSION = "0.1.100";

/**
 * The `blaxel.toml` the remote builder reads out of the uploaded context.
 *
 * `[build] slim = false` is load-bearing. Blaxel's builder runs an "automatic image slimming" pass
 * on every sandbox image by default (docs.blaxel.ai/deployment-reference: `slim` defaults to true),
 * and that pass strips whatever it decides the image does not need at runtime. On the v8 toolchain it
 * removed the C compiler and the dpkg database while keeping php, PTS, the mise tools and the runtime
 * libraries — so the bake's own smoke passed, every baked profile still ran, and only the two leaves
 * that COMPILE inside the sandbox died: STREAM's in-place recompile (`cc: command not found`, CPU run
 * 36104006010) and the iperf installs (`configure: no acceptable C compiler found in $PATH`), with
 * PTS's dependency evaluator additionally trying to `apt-get install build-essential` against the
 * emptied dpkg state on every cell. The shared base is bit-identical to what the other providers run;
 * the slimming is the only Blaxel-specific delta, and this is the documented opt-out. The
 * `cc-toolchain` smoke probe in packages/templates/src/smoke.ts is the gate that fails the bake if a
 * future builder change strips the toolchain again.
 */
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

export async function bakeBlaxelImage(name: string, baseImage: string, log: Log): Promise<void> {
	const workspace = process.env.BL_WORKSPACE;
	if (!workspace) throw new Error("BL_WORKSPACE is required to bake a Blaxel image");
	const pinnedBase = await resolveImageDigestRef(baseImage);
	const context = await mkdtemp(join(tmpdir(), "benchmark-blaxel-"));
	try {
		await Promise.all([mkdir(join(context, "_shared")), mkdir(join(context, "blaxel"))]);
		const template = await readFile(join(IMAGES, "blaxel/Dockerfile"), "utf8");
		await writeFile(join(context, "Dockerfile"), pinBlaxelBaseImage(template, pinnedBase));
		await writeFile(join(context, "blaxel.toml"), blaxelBuildManifest(name));
		await copyFile(join(IMAGES, "blaxel/entrypoint.sh"), join(context, "blaxel/entrypoint.sh"));
		await copyFile(
			join(IMAGES, "_shared/validate-base.sh"),
			join(context, "_shared/validate-base.sh"),
		);
		// The remote builder must be able to pull private GHCR bases. ghcr-login supplies this
		// config in CI; a public package also works without it.
		const dockerConfig = join(
			process.env.DOCKER_CONFIG ?? join(homedir(), ".docker"),
			"config.json",
		);
		const args = [
			"bl",
			"push",
			"--type",
			"sandbox",
			"--name",
			name,
			"--workspace",
			workspace,
			"--timeout",
			"45m",
			"--yes",
			"--skip-version-warning",
		];
		if (await Bun.file(dockerConfig).exists()) args.push("--docker-config", dockerConfig);
		log(`Blaxel image ${name} from ${pinnedBase} (CLI ${CLI_VERSION})`);
		const proc = Bun.spawn(args, {
			cwd: context,
			env: process.env,
			stdout: "inherit",
			stderr: "inherit",
		});
		const exit = await proc.exited;
		if (exit !== 0) throw new Error(`Blaxel image build ${name} failed (exit ${exit})`);
	} finally {
		await rm(context, { recursive: true, force: true });
	}
}
