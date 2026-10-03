// The e2b template builder: the e2b variant Dockerfile built through the pinned e2b CLI.
//
// Two things the e2b path forces (verified against @e2b/cli@2.12.0):
//  1. `template create` builds the Dockerfile on E2B's REMOTE builder. It cannot see a local tag,
//     and CLI 2.x dropped `--build-arg`, so the base cannot be injected at build time. `FROM` is
//     therefore pinned to the digest-pinned base by generating a Dockerfile per build; the
//     committed Dockerfile stays the one source of the variant body. The remote builder must be
//     able to pull that base (public package, or registry auth) before this runs.
//  2. `--path` is the build context root and `--dockerfile` is resolved RELATIVE to it (the CLI
//     joins them), so the Dockerfile argument is context-relative.

import { readFileSync, writeFileSync } from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EnvOf } from "@sandbox-benchmarks/driver";
import type { BuildCommandRunner } from "@sandbox-benchmarks/driver/artifact";
import { defineArtifactBuilder, runBuildCommand } from "@sandbox-benchmarks/driver/artifact";

/** Pinned so the build is reproducible (every other tool in the toolchain is version-pinned). */
export const E2B_CLI_VERSION = "2.12.0";

// Paths relative to the images directory, which is the uploaded context: the Dockerfile COPYs
// the shared _shared/validate-base.sh from it.
const DOCKERFILE = "e2b/Dockerfile";
const DOCKERFILE_GENERATED = "e2b/Dockerfile.generated";
const MANIFEST = "e2b/e2b.toml";

/**
 * Pin the e2b variant Dockerfile's base to a concrete, registry-pullable ref. Unlike `docker
 * build`, E2B's remote builder does NOT expand a pre-`FROM` `ARG BASE_IMAGE`, so a
 * `FROM ${BASE_IMAGE}` reaches it verbatim and fails with "invalid image reference". So the `FROM`
 * line itself is rewritten, and the `ARG BASE_IMAGE=` default is pinned too so the `${BASE_IMAGE}`
 * labels still record the real base. Throws if either anchor is missing so a Dockerfile refactor
 * cannot silently ship the wrong base.
 */
export function pinE2bBaseImage(template: string, baseImage: string): string {
	const argAnchor = /^ARG BASE_IMAGE=.*$/m;
	// Trailing horizontal whitespace is tolerated, but not a newline (so the anchor cannot swallow
	// following lines). `[^\S\r\n]` also excludes `\r`, keeping a CRLF Dockerfile's endings intact.
	const fromAnchor = /^FROM \$\{BASE_IMAGE\}[^\S\r\n]*$/m;
	// Test each regex matched (not `pinned !== template`): a base that already equals the committed
	// default would otherwise be misread as a missing anchor.
	if (!argAnchor.test(template)) {
		throw new Error(`e2b Dockerfile has no 'ARG BASE_IMAGE=' default to pin (${DOCKERFILE})`);
	}
	if (!fromAnchor.test(template)) {
		throw new Error(`e2b Dockerfile has no 'FROM \${BASE_IMAGE}' line to pin (${DOCKERFILE})`);
	}
	// Function replacements so a `$` in `baseImage` is not read as a replacement pattern.
	return template
		.replace(argAnchor, () => `ARG BASE_IMAGE=${baseImage}`)
		.replace(fromAnchor, () => `FROM ${baseImage}`);
}

/** The template manifest the e2b CLI expects on disk, naming the template being built. */
function e2bTemplateManifest(
	name: string,
	spec: { readonly vcpus: number; readonly memoryGb: number },
): string {
	return `${[
		"# Generated per build by @sandbox-benchmarks/e2b/artifact — do not edit by hand.",
		'dockerfile = "Dockerfile"',
		`template_name = "${name}"`,
		`cpu_count = ${spec.vcpus}`,
		`memory_mb = ${spec.memoryGb * 1024}`,
	].join("\n")}\n`;
}

/** The e2b builder over a build-command transport; the default export binds the real one. */
export function e2bArtifactBuilder(run: BuildCommandRunner = runBuildCommand) {
	return defineArtifactBuilder<"e2b", EnvOf<"e2b">>("e2b", async (request) => {
		const { name, base, spec, imagesDir, env, log } = request;
		const context = await mkdtemp(join(tmpdir(), "benchmark-e2b-"));
		try {
			await Promise.all(
				["e2b", "_shared"].map((dir) =>
					cp(join(imagesDir, dir), join(context, dir), { recursive: true }),
				),
			);
			writeFileSync(join(context, MANIFEST), e2bTemplateManifest(name, spec));
			const template = readFileSync(join(imagesDir, DOCKERFILE), "utf8");
			writeFileSync(join(context, DOCKERFILE_GENERATED), pinE2bBaseImage(template, base.digestRef));
			request.signal.throwIfAborted();
			log(`e2b template create ${name} (base ${base.digestRef})`);
			const exit = await run(
				[
					"bunx",
					`@e2b/cli@${E2B_CLI_VERSION}`,
					"template",
					"create",
					name,
					"--path",
					context,
					"--dockerfile",
					DOCKERFILE_GENERATED,
					// No --disk-size-mb: `template create` exposes only --cpu-count/--memory-mb (checked on
					// the pinned 2.12.0), so e2b disk is platform-fixed and cannot be raised to the target's
					// diskGb. Suites that need the disk skip on e2b, surfaced as a coverage gap.
					"--cpu-count",
					String(spec.vcpus),
					"--memory-mb",
					String(spec.memoryGb * 1024),
				],
				{ signal: request.signal, env: { E2B_API_KEY: env.E2B_API_KEY } },
			);
			if (exit !== 0) throw new Error(`e2b template create exited ${exit}`);
			// The CLI publishes over the name; the previous template serves until the new one lands.
			return { ref: name, replaced: "atomic" };
		} finally {
			await rm(context, { recursive: true, force: true });
		}
	});
}

export default e2bArtifactBuilder();
