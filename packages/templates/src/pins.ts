// `@sandbox-benchmarks/templates/pins` — the build-time configuration gatekeeper for the toolchain
// images. The arktype-validated TypeScript here is the single source of truth: nothing parses a
// versions.env or other config file. build.sh (and the publish workflow) import this to validate the
// pins and feed `docker build` / the e2b CLI; an unfilled or invalid pin is rejected before any image
// is built.
//
// Run directly to emit the build inputs:
//   bun packages/templates/src/pins.ts              # KEY=VALUE --build-arg lines
//   bun packages/templates/src/pins.ts --mise-toml  # the mise tool config (node, python, ...)
//   bun packages/templates/src/pins.ts --e2b-toml   # the e2b template manifest

import { config } from "@sandbox-benchmarks/providers";
import { TARGET_SPEC, TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { Pins } from "./lib/pins.ts";
import { pinsSchema, rawPins } from "./lib/pins.ts";

export type { Pins };
/** The raw toolchain pins (single source of truth). Validate with {@link validatedPins} before use. */
export { rawPins as pins };

/**
 * Validate the pins (content included — hex sha256s, non-empty versions) and return the typed object.
 * Throws with a clear summary on any unfilled/invalid pin, so the build fails loudly. This is the
 * gatekeeper every build input below passes through.
 */
export function validatedPins(): Pins {
	const out = pinsSchema(rawPins);
	if (out instanceof type.errors) {
		throw new Error(`Invalid toolchain pins (packages/templates/src/lib/pins.ts): ${out.summary}`);
	}
	return out;
}

/**
 * The `--build-arg` set for the toolchain base image: the shared image identity, the mise release
 * version + per-arch binary sha256, and the PTS pins, keyed in SCREAMING_SNAKE to match the
 * Dockerfile's `ARG`s. The mise *tool* versions are NOT here — they flow through the generated
 * mise.toml ({@link miseToml}).
 */
export function toolchainBuildArgs(pins: Pins = validatedPins()): Record<string, string> {
	return {
		IMAGE_NAME: TOOLCHAIN_IMAGE_NAME,
		IMAGE_VERSION: TOOLCHAIN_VERSION,
		MISE_VERSION: pins.miseVersion,
		MISE_SHA256_X64: pins.miseSha256X64,
		MISE_SHA256_ARM64: pins.miseSha256Arm64,
		PTS_VERSION: pins.ptsVersion,
		PTS_DEB_SHA256: pins.ptsDebSha256,
		PTS_INSTALL_TESTS: pins.ptsInstallTests,
	};
}

/**
 * The mise config (`mise.toml`) pinning the language/CLI toolchain. build.sh writes this into the
 * base build context; the Dockerfile COPYs it and `mise install` consumes it. Generated from the same
 * validated pins, so the tool versions live only here — never hand-maintained.
 */
export function miseToml(pins: Pins = validatedPins()): string {
	return `${[
		"# Generated from packages/templates/src/pins.ts — do not edit by hand.",
		"[tools]",
		`node = "${pins.nodeVersion}"`,
		`python = "${pins.pythonVersion}"`,
		`pnpm = "${pins.pnpmVersion}"`,
		`hyperfine = "${pins.hyperfineVersion}"`,
		`"ubi:minio/warp" = "${pins.warpVersion}"`,
		`jc = "${pins.jcVersion}"`,
		`"aqua:quarto-dev/quarto-cli" = "${pins.quartoVersion}"`,
	].join("\n")}\n`;
}

/**
 * The e2b template manifest. The e2b CLI requires an `e2b.toml` on disk; this TypeScript config is
 * its source of truth, so the file is generated, never hand-edited. cpu/memory come from the
 * benchmark {@link TARGET_SPEC}.
 */
// Default to the provider layer's template name (ultimately provider-core's shared
// toolchainArtifactName) — a hand-spelled copy here could silently drift from what the adapter
// actually boots when the naming convention changes.
export function e2bToml(templateName: string = config.e2bTemplateVersion): string {
	return `${[
		"# Generated from packages/templates/src/pins.ts — do not edit by hand.",
		'dockerfile = "Dockerfile"',
		`template_name = "${templateName}"`,
		`cpu_count = ${TARGET_SPEC.vcpus}`,
		`memory_mb = ${TARGET_SPEC.memoryGb * 1024}`,
	].join("\n")}\n`;
}

if (import.meta.main) {
	const mode = process.argv[2];
	if (mode === "--mise-toml") {
		process.stdout.write(miseToml());
	} else if (mode === "--e2b-toml") {
		process.stdout.write(e2bToml());
	} else {
		for (const [key, value] of Object.entries(toolchainBuildArgs())) {
			console.log(`${key}=${value}`);
		}
	}
}
