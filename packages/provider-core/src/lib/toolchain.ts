// The shared toolchain artifact identity: the one ghcr image ref and the one version-scoped
// artifact base name every provider package and the bake pipeline agree on. Owned here — not by any
// one provider — because Modal boots the image directly while e2b/daytona bake their artifacts FROM
// it (and name them identically), and one source keeps all of that from drifting.
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { readProviderEnv } from "./env.ts";

/**
 * Candidate↔version artifact naming, shared by every provider that bakes a toolchain artifact. The
 * public version (`:v1`, `…-v1`) is immutable and written only by `promote`; iteration happens
 * against a mutable candidate (`:v1-candidate`, `…-v1-candidate`), reused every build so the public
 * registry never accumulates versions. One constant so the convention can't drift per provider.
 */
export const CANDIDATE_SUFFIX = "-candidate";

/**
 * Version-scoped base name for per-provider baked artifacts (the e2b template and the daytona
 * snapshot are both named exactly this). One constant makes the cross-provider parity structural
 * instead of comment-enforced, and a TOOLCHAIN_VERSION bump yields exactly one new public artifact
 * name per deliberate promote.
 */
export const toolchainArtifactName = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;

const env = readProviderEnv(["BENCH_TOOLCHAIN_IMAGE"]);

const imageRepo = `ghcr.io/starslingdev/${TOOLCHAIN_IMAGE_NAME}`;

/** Immutable public image ref (`:v1`); the promote target. */
export const toolchainImageVersion = `${imageRepo}:${TOOLCHAIN_VERSION}`;

/** Mutable candidate image ref (`:v1-candidate`); what the bake builds/pushes while iterating. */
export const toolchainImageCandidate = `${toolchainImageVersion}${CANDIDATE_SUFFIX}`;

/** Active toolchain image ref adapters boot from: the `BENCH_TOOLCHAIN_IMAGE` override (CI points
 *  this at the candidate during iteration), else the canonical public version. */
export const toolchainImage = env.BENCH_TOOLCHAIN_IMAGE ?? toolchainImageVersion;
