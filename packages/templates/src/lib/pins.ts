// Private implementation detail of @sandbox-benchmarks/templates: the toolchain build pins and their
// arktype schema. The public gatekeeper (validate, build-args, mise.toml, e2b.toml) lives in ../pins.ts.
import { type } from "arktype";

// > The PTS .deb sha256 is 64 lowercase hex chars; versions are just non-empty strings. arktype
// > enforces this content at build time so an unfilled/garbled pin fails loudly instead of producing
// > a broken image (the schema rejects the `__TODO__` placeholders below until they're filled).
const sha256 = "/^[0-9a-f]{64}$/";
const nonEmpty = "string >= 1";

/** Runtime schema for the toolchain build pins. */
export const pinsSchema = type({
	// mise itself (release version + per-arch binary sha256) + the mise-managed tool versions
	// (→ generated mise.toml). The mise binary is arch-specific, so its sha is pinned per arch.
	miseVersion: nonEmpty,
	miseSha256X64: sha256,
	miseSha256Arm64: sha256,
	nodeVersion: nonEmpty,
	pythonVersion: nonEmpty,
	pnpmVersion: nonEmpty,
	hyperfineVersion: nonEmpty,
	warpVersion: nonEmpty,
	jcVersion: nonEmpty,
	quartoVersion: nonEmpty,
	// Phoronix Test Suite (.deb fetched + checksum-verified) + the profiles to pre-install.
	ptsVersion: nonEmpty,
	ptsDebSha256: sha256,
	ptsInstallTests: nonEmpty,
});

/** The validated shape of the toolchain pins. */
export type Pins = typeof pinsSchema.infer;

/**
 * The toolchain pins — the single source of truth (there is no versions.env or other config file).
 * Values ship as `__TODO__` placeholders until sourced from the reference image (or current upstream
 * releases); arktype's {@link pinsSchema} rejects them at build time (see `validatedPins`), so a
 * forgotten pin fails the build loudly rather than silently. `satisfies` keeps every key present and
 * typed without asserting the (not-yet-filled) runtime constraints at import time.
 */
export const rawPins = {
	// > TODO(pins): mise release version, e.g. 2026.5.16 (pinned GitHub release, fetched in 00-apt.sh).
	miseVersion: "__TODO__",
	// > TODO(pins): per-arch sha256 of the mise release binary, from the release's SHASUMS256.txt
	// > (lines `mise-v<ver>-linux-x64` / `-arm64`). 00-apt.sh verifies the matching arch.
	miseSha256X64: "__TODO__",
	miseSha256Arm64: "__TODO__",
	// > TODO(pins): node major or exact version, e.g. 22.
	nodeVersion: "__TODO__",
	// > TODO(pins): python major or exact version, e.g. 3.13 (mise-managed; no longer distro python).
	pythonVersion: "__TODO__",
	// > TODO(pins): pnpm major or exact version, e.g. 10.
	pnpmVersion: "__TODO__",
	// > TODO(pins): hyperfine version, e.g. 1.20.0.
	hyperfineVersion: "__TODO__",
	// > TODO(pins): minio/warp version (mise ubi backend), e.g. 1.1.4.
	warpVersion: "__TODO__",
	// > TODO(pins): jc version, e.g. 1.25.4.
	jcVersion: "__TODO__",
	// > TODO(pins): quarto-cli version (mise aqua backend), e.g. 1.9.38.
	quartoVersion: "__TODO__",
	// > TODO(pins): PTS release version, e.g. 10.8.4.
	ptsVersion: "__TODO__",
	// > TODO(pins): self-computed sha256 of phoronix-test-suite_${ptsVersion}_all.deb (PTS ships none).
	ptsDebSha256: "__TODO__",
	// > TODO(pins): space-separated PTS profiles to pre-install, e.g. "node-web-tooling pyperformance".
	ptsInstallTests: "__TODO__",
} satisfies Record<keyof Pins, string>;
