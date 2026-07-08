// Bake the e2b template from the e2b variant Dockerfile via the pinned e2b CLI.
//
// Two things the e2b path forces (verified against @e2b/cli@2.12.0):
//  1. `template create` builds the Dockerfile on E2B's REMOTE builder — it cannot see the local
//     `:dev` tag build.sh produces, and CLI 2.x dropped `--build-arg`, so the base CANNOT be a local
//     tag nor injected at build time. We pin `FROM` to a concrete, registry-pullable ref by generating
//     a Dockerfile per bake (the candidate ref while iterating, the published `:v1` on promote) — the
//     same single-source way e2b.toml / mise.toml are generated, so the committed Dockerfile stays the
//     one source of the variant body. The pinned base image must be pushed AND pullable by the remote
//     builder (public package, or registry auth) before this runs.
//  2. `--path` is the build context root and `--dockerfile` is resolved RELATIVE to it (the CLI joins
//     them), so the Dockerfile arg must be context-relative, not repo-relative.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "@sandbox-benchmarks/providers";
import { e2bToml } from "@sandbox-benchmarks/templates/pins";
import type { Log } from "./types.ts";

/** Pinned so the build is reproducible (every other tool in the toolchain is version-pinned). */
export const E2B_CLI_VERSION = "2.12.0";

// Context root the e2b CLI uploads (so the Dockerfile can COPY the shared _shared/validate-base.sh).
// Anchored to this file (not cwd): the `bake` package script runs from apps/cli, where a repo-relative
// path would resolve under apps/cli/ and every readFileSync/writeFileSync/--path here would be wrong.
const E2B_CONTEXT = join(import.meta.dir, "../../../../../packages/templates/images");
// Paths RELATIVE to E2B_CONTEXT (the CLI joins --dockerfile onto --path).
const E2B_DOCKERFILE = "e2b/Dockerfile"; // committed template: ARG BASE_IMAGE default + validate + labels
const E2B_DOCKERFILE_GENERATED = "e2b/Dockerfile.generated"; // base pinned to a registry ref per bake
const E2B_TOML = "e2b/e2b.toml"; // generated manifest (record + parity)

/**
 * Pin the e2b variant Dockerfile's base to a concrete, registry-pullable `baseImage`. Unlike
 * `docker build` (used for the daytona/modal variants), E2B's remote builder does NOT expand a
 * pre-`FROM` `ARG BASE_IMAGE`, so a `FROM ${BASE_IMAGE}` reaches it verbatim and fails with
 * "invalid image reference '${BASE_IMAGE}'". So rewrite the `FROM` line itself to the concrete ref;
 * the `ARG BASE_IMAGE=` default is pinned too so the `${BASE_IMAGE}` labels still record the real base.
 * Throws if either anchor is missing so a Dockerfile refactor can't silently ship the wrong (local
 * `:dev`) base. Pure (string in, string out) so the substitution is unit-testable without file I/O.
 */
export function pinE2bBaseImage(template: string, baseImage: string): string {
	const argAnchor = /^ARG BASE_IMAGE=.*$/m;
	// Only the pre-FROM `FROM ${BASE_IMAGE}` needs concreting; trailing horizontal whitespace is
	// tolerated, but not a newline (so the anchor can't swallow following lines). `[^\S\r\n]` is
	// horizontal-whitespace-only: excluding `\r` too keeps a CRLF source Dockerfile's line endings
	// intact (a `\r`-consuming match would rewrite FROM as LF while ARG stays CRLF → mixed endings).
	const fromAnchor = /^FROM \$\{BASE_IMAGE\}[^\S\r\n]*$/m;
	// Test each regex matched (not `pinned !== template`): a base that already equals the committed
	// default would otherwise be misread as a missing anchor.
	if (!argAnchor.test(template)) {
		throw new Error(`e2b Dockerfile has no 'ARG BASE_IMAGE=' default to pin (${E2B_DOCKERFILE})`);
	}
	if (!fromAnchor.test(template)) {
		throw new Error(`e2b Dockerfile has no 'FROM \${BASE_IMAGE}' line to pin (${E2B_DOCKERFILE})`);
	}
	// Function replacements so a `$` in `baseImage` (e.g. `$&`) isn't interpreted as a replacement pattern.
	return template
		.replace(argAnchor, () => `ARG BASE_IMAGE=${baseImage}`)
		.replace(fromAnchor, () => `FROM ${baseImage}`);
}

/** Generate the per-bake e2b Dockerfile: the committed variant Dockerfile with its base pinned to a
 *  concrete, registry-pullable `baseImage` (see {@link pinE2bBaseImage}). */
function writeE2bDockerfile(baseImage: string): void {
	const template = readFileSync(`${E2B_CONTEXT}/${E2B_DOCKERFILE}`, "utf8");
	writeFileSync(`${E2B_CONTEXT}/${E2B_DOCKERFILE_GENERATED}`, pinE2bBaseImage(template, baseImage));
}

/** Build the e2b template `name` from `baseImage` (the candidate base while iterating, the published
 *  version base on promote — so the template provably derives from the validated bytes). */
export async function bakeE2bTemplate(name: string, baseImage: string, log: Log): Promise<void> {
	// Keep the on-disk manifest's template_name in sync with the name we create, and pin the base.
	writeFileSync(`${E2B_CONTEXT}/${E2B_TOML}`, e2bToml(name));
	writeE2bDockerfile(baseImage);

	log(`e2b template create ${name} (base ${baseImage})`);
	const proc = Bun.spawn(
		[
			"bunx",
			`@e2b/cli@${E2B_CLI_VERSION}`,
			"template",
			"create",
			name,
			"--path",
			E2B_CONTEXT,
			"--dockerfile",
			E2B_DOCKERFILE_GENERATED,
			"--cpu-count",
			String(config.targetSpec.vcpus),
			"--memory-mb",
			String(config.targetSpec.memoryGb * 1024),
		],
		{ stdout: "inherit", stderr: "inherit", env: process.env },
	);
	const code = await proc.exited;
	if (code !== 0) throw new Error(`e2b template create exited ${code}`);
}
