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

import {
	TARGET_SPEC,
	TOOLCHAIN_IMAGE_NAME,
	TOOLCHAIN_VERSION,
	VERCEL_VCR_REPOSITORY,
} from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { Pins } from "./lib/pins.ts";
import { pinsSchema, ptsInstallGroups, rawPins } from "./lib/pins.ts";

export type { Pins };
/** The raw toolchain pins (single source of truth). Validate with {@link validatedPins} before use. */
export { ptsInstallGroups, rawPins as pins, VERCEL_VCR_REPOSITORY };

/** Split a whitespace-separated profile list into its entries. */
function splitProfiles(list: string): string[] {
	return list.split(/\s+/).filter(Boolean);
}

/** `PTS_INSTALL_GROUP_<KEY>` — the build arg (and Dockerfile ARG) carrying one group's profiles. */
export function ptsInstallGroupArg(group: string): string {
	return `PTS_INSTALL_GROUP_${group.toUpperCase()}`;
}

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
 * Validate that {@link ptsInstallGroups} is a true PARTITION of `ptsInstallTests` — every baked
 * profile in exactly one layer group, nothing invented, nothing dropped, no duplicate. The grouping
 * only decides layer packaging, so it must never become a second place that answers "which profiles
 * does the image bake?"; this is what keeps `ptsInstallTests` the single source of truth. Throws
 * before docker is invoked, so a mis-edited group fails the build loudly rather than quietly baking
 * fewer benchmarks.
 */
export function validatedPtsInstallGroups(pins: Pins = validatedPins()): Record<string, string> {
	const baked = splitProfiles(pins.ptsInstallTests);
	const grouped = Object.values(ptsInstallGroups).flatMap(splitProfiles);

	const seen = new Set<string>();
	const duplicated = grouped.filter((profile) => !seen.add(profile));
	const missing = baked.filter((profile) => !seen.has(profile));
	const unknown = [...seen].filter((profile) => !baked.includes(profile));

	const faults = [
		duplicated.length > 0 && `in more than one group: ${duplicated.join(", ")}`,
		missing.length > 0 && `baked but in no group: ${missing.join(", ")}`,
		unknown.length > 0 && `grouped but not baked: ${unknown.join(", ")}`,
	].filter((fault): fault is string => fault !== false);

	if (faults.length > 0) {
		throw new Error(
			`ptsInstallGroups must partition ptsInstallTests (packages/templates/src/lib/pins.ts) — ${faults.join("; ")}`,
		);
	}
	return { ...ptsInstallGroups };
}

/**
 * The `--build-arg` set for the toolchain base image: the shared image identity, the mise release
 * version + per-arch binary sha256, and the PTS pins, keyed in SCREAMING_SNAKE to match the
 * Dockerfile's `ARG`s. The mise *tool* versions are NOT here — they flow through the generated
 * mise.toml ({@link miseToml}).
 *
 * PTS_INSTALL_TESTS stays the whole baked set (99-manifest.sh verifies against it); the
 * PTS_INSTALL_GROUP_* args carry the same profiles split across the Dockerfile's per-group RUNs.
 */
export function toolchainBuildArgs(pins: Pins = validatedPins()): Record<string, string> {
	const groups = validatedPtsInstallGroups(pins);
	return {
		IMAGE_NAME: TOOLCHAIN_IMAGE_NAME,
		IMAGE_VERSION: TOOLCHAIN_VERSION,
		MISE_VERSION: pins.miseVersion,
		MISE_SHA256_X64: pins.miseSha256X64,
		MISE_SHA256_ARM64: pins.miseSha256Arm64,
		PTS_VERSION: pins.ptsVersion,
		PTS_DEB_SHA256: pins.ptsDebSha256,
		PTS_INSTALL_TESTS: pins.ptsInstallTests,
		...Object.fromEntries(
			Object.entries(groups).map(([group, profiles]) => [ptsInstallGroupArg(group), profiles]),
		),
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
export function e2bToml(
	templateName: string = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`,
): string {
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
