// The Baseten image builder: the SDK's image push uploads a Docker context, assembled from the
// toolchain images directory, to Baseten's remote builder without creating a sandbox. Candidate and
// public version use separate canonical image names.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImagePushFilesRequest } from "@basetenlabs/sandbox";
import { SandboxClient } from "@basetenlabs/sandbox";
import type { EnvOf } from "@sandbox-benchmarks/driver";
import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";

/** The image-push surface the builder uses; the default export binds a real `SandboxClient`. */
export type BasetenImages = { push(request: ImagePushFilesRequest): Promise<{ status: string }> };

/** The remote build's own memory (MB, at most 32768): the toolchain base is several GB. */
const BUILD_MEMORY_MB = 16_384;
/** Scratch disk (MB) for the build's intermediate layers; unset builds in memory. */
const BUILD_VOLUME_MB = 65_536;
const BUILD_TIMEOUT_MS = 45 * 60_000;

/** Pin the remote builder's FROM to the validated bytes, keeping the label ARG in sync. */
export function pinBasetenBaseImage(template: string, digestRef: string): string {
	if (!/^ARG BASE_IMAGE=.*$/m.test(template) || !/^FROM \$\{BASE_IMAGE\}$/m.test(template)) {
		throw new Error("Baseten Dockerfile has no BASE_IMAGE ARG/FROM anchors");
	}
	return template
		.replace(/^ARG BASE_IMAGE=.*$/m, () => `ARG BASE_IMAGE=${digestRef}`)
		.replace(/^FROM \$\{BASE_IMAGE\}$/m, () => `FROM ${digestRef}`);
}

/** The Baseten builder over an image client; the default export binds the real one. */
export function basetenArtifactBuilder(
	images: (env: EnvOf<"baseten">) => BasetenImages = (env) =>
		new SandboxClient({ apiKey: env.BASETEN_API_KEY }).images,
) {
	return defineArtifactBuilder<"baseten", EnvOf<"baseten">>("baseten", async (request) => {
		const { name, base, imagesDir, env, log, signal } = request;
		const read = (path: string) => readFile(join(imagesDir, path), "utf8");
		const [template, entrypoint, validate, manifest] = await Promise.all([
			read("baseten/Dockerfile"),
			read("baseten/entrypoint.sh"),
			read("_shared/validate-base.sh"),
			read("baseten/blaxel.toml"),
		]);
		log(`Baseten image ${name} from ${base.digestRef}`);
		// The remote builder pulls the base anonymously: the toolchain package must be public.
		const image = await images(env).push({
			name,
			files: {
				Dockerfile: pinBasetenBaseImage(template, base.digestRef),
				"baseten/entrypoint.sh": entrypoint,
				"_shared/validate-base.sh": validate,
				// The builder reads its options from the context root; this one turns off slimming.
				"blaxel.toml": manifest,
			},
			memory: BUILD_MEMORY_MB,
			volume: BUILD_VOLUME_MB,
			timeoutMs: BUILD_TIMEOUT_MS,
			callOptions: { signal },
		});
		if (image.status !== "BUILT")
			throw new Error(`Baseten image build ${name} ended ${image.status}, not BUILT`);
		// A push adds a new version under the name; `<name>:latest` moves only once it is built.
		return { ref: name, replaced: "atomic" };
	});
}

export default basetenArtifactBuilder();
