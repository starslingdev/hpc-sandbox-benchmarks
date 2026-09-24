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
		await writeFile(join(context, "blaxel.toml"), `type = "sandbox"\nname = "${name}"\n`);
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
