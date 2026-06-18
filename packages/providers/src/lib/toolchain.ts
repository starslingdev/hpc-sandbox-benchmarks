// The shared pre-baked toolchain image, referenced by the adapters that can boot from a registry
// ref (modal) or a snapshot built from it (daytona). Identity is env-overridable so forks can
// point at their own published image. The version tag is immutable: a change to the toolchain image
// means bumping TOOLCHAIN_VERSION.

export const TOOLCHAIN_VERSION = "v5";

/**
 * Canonical name of the Daytona snapshot baked from the toolchain image. Selected via the
 * `DAYTONA_SNAPSHOT` env var in CI; this is the default that name is set to.
 */
export const DAYTONA_SNAPSHOT_DEFAULT = `sandbox-benchmark-toolchain-${TOOLCHAIN_VERSION}`;

/**
 * Full registry ref of the toolchain image. The default is the canonical public image; set
 * `BENCH_TOOLCHAIN_IMAGE` to a full ref to point modal (and the daytona snapshot build) at a
 * fork-published image instead.
 */
export const TOOLCHAIN_IMAGE =
	process.env.BENCH_TOOLCHAIN_IMAGE ||
	`ghcr.io/starslingdev/sandbox-benchmark-toolchain:${TOOLCHAIN_VERSION}`;
