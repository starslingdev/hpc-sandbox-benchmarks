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
 * Sourced 2026-07-21 from current upstream releases (`mise latest <tool>` for the mise-managed tools;
 * the PTS .deb sha256 self-computed — PTS ships none). To refresh: bump the version, and for PTS
 * re-run `curl -fsSL .../phoronix-test-suite_<ver>_all.deb | sha256sum`; for mise pull the per-arch
 * lines from `.../releases/download/v<ver>/SHASUMS256.txt`. Tool versions are exact (not floating
 * majors) so two builds of the same image tag resolve byte-identically.
 */
export const rawPins = {
	// > mise release version (installed from its immutable GitHub release in 00-apt.sh — mise's apt
	// > repo is rolling and only serves the latest, so we pin the release). Matches the CI mise-action
	// > pin for a single mise across build + checks.
	miseVersion: "2026.7.11",
	// > sha256 of the mise release binary per arch (from the release's SHASUMS256.txt): the asset is
	// > arch-specific, so 00-apt.sh verifies the download against the line matching the build arch.
	miseSha256X64: "d31578a16ae2708385249b439c95533068e04b9507a118e905aa6768905671fc",
	miseSha256Arm64: "e3cb3bf4795f494a0e9be3f69ee1464de9d12a991589f126035eebd973c17796",
	// > node 22 LTS (exact).
	nodeVersion: "22.23.1",
	// > python 3.13 (exact; mise-managed standalone build, not distro python).
	pythonVersion: "3.13.14",
	// > pnpm 10 (exact; staying on the 10.x line — pnpm 11 is a major bump out of scope for a routine
	// > pin refresh).
	pnpmVersion: "10.34.5",
	hyperfineVersion: "1.20.0",
	// > minio/warp (mise ubi backend → github releases). Pinned to 1.3.1: minio stopped attaching
	// > binaries to warp's GitHub releases at 1.4.0+ (still true through 1.5.0), so newer tags have no
	// > asset ubi can install.
	warpVersion: "1.3.1",
	jcVersion: "1.25.7",
	// > quarto-cli (mise aqua backend).
	quartoVersion: "1.9.38",
	// > Phoronix Test Suite release + self-computed sha256 of phoronix-test-suite_10.8.4_all.deb.
	ptsVersion: "10.8.4",
	ptsDebSha256: "be81f71fc0382a7725dc88f4a18f013d1c3f6939d440629231d392a11816feca",
	// > Profiles pre-installed (and download-cached — 20-pts.sh derives its cache list from this) so
	// > sandbox wall time goes to benchmarks, not setup: every PTS profile a registered suite runs —
	// > fio and especially postgres (pgbench) are source builds worth paying at bake time (stream covers
	// > the memory suite, so no registered suite pays a runtime install). All profiles are VERSION-PINNED
	// > to exactly what their leaves batch-run (and the catalog vendors): an unversioned name resolves to
	// > whatever upstream's latest is at bake time, so a profile bump would silently void the pre-install
	// > and push the source build (postgres!) into every sandbox. ALL entries are pinned —
	// > node-web-tooling/pybench/sqlite-speedtest included, with their leaves pinned to match: a
	// > versionless name resolves past the vendored option matrix at both bake AND run time (uncatalogued
	// > results), and the drift gate skips versionless names by construction, so they were the one hole in
	// > it. The catalog joins on a versionless key, so pinning the leaf changes nothing downstream.
	// > (c-ray/compress-zstd were dropped with the cpu-generic suite; pyperformance likewise runs nowhere.)
	// > iperf-1.2.0 joined for the network suite's iperf composition: the bake pre-installs the
	// > upstream profile (and caches its tarball); the leaf stages the repo's vendored localhost
	// > subset over it and rebuilds from the cached source at run time (the network-loopback
	// > override pattern). fast-cli/network-loopback stay baked for the manual composition.
	ptsInstallTests:
		"node-web-tooling-1.0.1 pybench-1.1.3 sqlite-speedtest-1.0.1 fio-2.1.0 network-loopback-1.0.3 fast-cli-1.0.0 iperf-1.2.0 pgbench-1.15.0 git-1.1.0 stream-1.3.4",
} satisfies Record<keyof Pins, string>;
