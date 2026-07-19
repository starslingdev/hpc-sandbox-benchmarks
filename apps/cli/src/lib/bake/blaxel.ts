// Bake blaxel's variant image: the shared toolchain base with Blaxel's sandbox-api binary + entrypoint
// injected (packages/templates/images/blaxel/Dockerfile), built and pushed to its own GHCR tag so every
// benchmark run boots it directly via `image:` — the same bake-once/boot-many model e2b/daytona give
// their artifacts. Unlike modal (whose `Image.fromRegistry` boots the unmodified base directly — see
// modal.ts), blaxel's control plane can't manage a sandbox that has no sandbox-api entrypoint, so the
// base image alone is not bootable there; this variant is what makes it one. A plain `docker build` +
// `docker push` (not @blaxel/core's ImageInstance builder): that builder bakes AND deploys a single
// named live sandbox in one call, not a separate, repeatedly-bootable registry artifact — see the
// Dockerfile's header for why the injected recipe matches what that builder would generate anyway.
import { join } from "node:path";
import type { Log } from "./types.ts";

const BLAXEL_CONTEXT = join(import.meta.dir, "../../../../../packages/templates/images");
const BLAXEL_DOCKERFILE = "blaxel/Dockerfile";

async function run(cmd: string[], log: Log): Promise<void> {
	log(`$ ${cmd.join(" ")}`);
	const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit", env: process.env });
	const code = await proc.exited;
	if (code !== 0) throw new Error(`${cmd[0]} exited ${code}`);
}

/** Build the blaxel variant image `imageRef` from `baseImage` (the candidate base while iterating, the
 *  published version base on promote — so the artifact provably derives from validated bytes) and push
 *  it. Reachability + bootability are proven by the validate boot that follows, the same contract e2b/
 *  daytona/modal bakers leave to their callers. */
export async function bakeBlaxelImage(
	imageRef: string,
	baseImage: string,
	log: Log,
): Promise<void> {
	log(`blaxel image build ${imageRef} (base ${baseImage})`);
	await run(
		[
			"docker",
			"build",
			"--build-arg",
			`BASE_IMAGE=${baseImage}`,
			"-t",
			imageRef,
			"-f",
			`${BLAXEL_CONTEXT}/${BLAXEL_DOCKERFILE}`,
			BLAXEL_CONTEXT,
		],
		log,
	);
	await run(["docker", "push", imageRef], log);
}
