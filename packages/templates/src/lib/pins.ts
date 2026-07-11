// Private implementation detail of @sandbox-benchmarks/templates: the toolchain build pins and their
// arktype schema. The public gatekeeper (validate, build-args, mise.toml, e2b.toml) lives in ../pins.ts.
import { type } from "arktype";

// > The PTS .deb sha256 is 64 lowercase hex chars; every other pin is a non-empty string that is not
// > the `__TODO__` sentinel. arktype enforces this at build time so a forgotten/garbled pin fails
// > loudly here (and in `bun test`) rather than producing a broken image.
const sha256 = "/^[0-9a-f]{64}$/";
// > Non-empty AND not the unfilled-pin sentinel: plain `string >= 1` accepts the 8-char "__TODO__",
// > which would defer the failure to docker build — this rejects it at validation time. The pattern
// > also rejects whitespace-only values and a `__TODO__` padded with surrounding whitespace, so only
// > a genuinely-filled pin (>=1 non-whitespace char) passes. (`\\s`/`\\S` are escaped so the string
// > literal carries real backslashes into the arktype regex.)
const filled = "/^(?!\\s*__TODO__\\s*$).*\\S.*$/";

/** Runtime schema for the toolchain build pins. */
export const pinsSchema = type({
	// mise itself (release version + per-arch binary sha256) + the mise-managed tool versions
	// (→ generated mise.toml). The mise binary is arch-specific, so its sha is pinned per arch.
	miseVersion: filled,
	miseSha256X64: sha256,
	miseSha256Arm64: sha256,
	nodeVersion: filled,
	pythonVersion: filled,
	pnpmVersion: filled,
	hyperfineVersion: filled,
	warpVersion: filled,
	jcVersion: filled,
	quartoVersion: filled,
	// Phoronix Test Suite (.deb fetched + checksum-verified) + the profiles to pre-install.
	ptsVersion: filled,
	ptsDebSha256: sha256,
	ptsInstallTests: filled,
});

/** The validated shape of the toolchain pins. */
export type Pins = typeof pinsSchema.infer;

/**
 * The toolchain pins — the single source of truth (there is no versions.env or other config file).
 * arktype's {@link pinsSchema} validates them at build time (see `validatedPins`), so a garbled or
 * forgotten pin fails the build loudly rather than silently. `satisfies` keeps every key present and
 * typed.
 *
 * Sourced 2026-06-17 from current upstream releases (`mise latest <tool>` for the mise-managed tools;
 * the PTS .deb sha256 self-computed — PTS ships none). To refresh: bump the version, and for PTS
 * re-run `curl -fsSL .../phoronix-test-suite_<ver>_all.deb | sha256sum`; for mise pull the per-arch
 * lines from `.../releases/download/v<ver>/SHASUMS256.txt`. Tool versions are exact (not floating
 * majors) so two builds of the same image tag resolve byte-identically.
 */
export const rawPins = {
	// > mise release version (installed from its immutable GitHub release in 00-apt.sh — mise's apt
	// > repo is rolling and only serves the latest, so we pin the release). Matches the CI mise-action
	// > pin for a single mise across build + checks.
	miseVersion: "2026.5.16",
	// > sha256 of the mise release binary per arch (from the release's SHASUMS256.txt): the asset is
	// > arch-specific, so 00-apt.sh verifies the download against the line matching the build arch.
	miseSha256X64: "fb2d7bf1a3751398a5c336a3565cd3c60af9b41952abe6fd62e2f2f0d5f06b60",
	miseSha256Arm64: "a068f29d8821ab0707f1a006721b5ab0baa80acaafc5a7b71e04371287108b92",
	// > node 22 LTS (exact).
	nodeVersion: "22.22.3",
	// > python 3.13 (exact; mise-managed standalone build, not distro python).
	pythonVersion: "3.13.14",
	// > pnpm 10 (exact).
	pnpmVersion: "10.34.3",
	hyperfineVersion: "1.20.0",
	// > minio/warp (mise ubi backend → github releases). Pinned to 1.3.1: minio stopped attaching
	// > binaries to warp's GitHub releases at 1.4.0+, so newer tags have no asset ubi can install.
	warpVersion: "1.3.1",
	jcVersion: "1.25.6",
	// > quarto-cli (mise aqua backend).
	quartoVersion: "1.9.38",
	// > Phoronix Test Suite release + self-computed sha256 of phoronix-test-suite_10.8.4_all.deb.
	ptsVersion: "10.8.4",
	ptsDebSha256: "be81f71fc0382a7725dc88f4a18f013d1c3f6939d440629231d392a11816feca",
	// > Small profiles pre-installed so sandbox wall time goes to benchmarks, not setup: the cpu-node
	// > + system profiles, plus the cpu-generic (c-ray, compress-zstd), disk (fio) and network
	// > (network-loopback) suites' profiles — fio and zstd are source builds worth paying at bake time.
	ptsInstallTests: "node-web-tooling pyperformance c-ray compress-zstd fio network-loopback",
} satisfies Record<keyof Pins, string>;
