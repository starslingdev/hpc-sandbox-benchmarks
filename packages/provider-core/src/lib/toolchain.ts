// The shared toolchain-image identity: the one ghcr ref every provider package and the bake
// pipeline agree on. Version naming derives from the schema's toolchain constants; the
// BENCH_TOOLCHAIN_IMAGE override lets CI point a run at the candidate while iterating. Owned here —
// not by any one provider — because Modal boots the image directly while e2b/daytona bake their
// artifacts FROM it, and one source keeps those from drifting.
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { CANDIDATE_SUFFIX, readProviderEnv } from "./env.ts";

const env = readProviderEnv(["BENCH_TOOLCHAIN_IMAGE"] as const);

const imageRepo = `ghcr.io/starslingdev/${TOOLCHAIN_IMAGE_NAME}`;

/** Immutable public image ref (`:v1`); the promote target. */
export const toolchainImageVersion = `${imageRepo}:${TOOLCHAIN_VERSION}`;

/** Mutable candidate image ref (`:v1-candidate`); what the bake builds/pushes while iterating. */
export const toolchainImageCandidate = `${toolchainImageVersion}${CANDIDATE_SUFFIX}`;

/** Active toolchain image ref adapters boot from: the `BENCH_TOOLCHAIN_IMAGE` override (CI points
 *  this at the candidate during iteration), else the canonical public version. */
export const toolchainImage = env.BENCH_TOOLCHAIN_IMAGE ?? toolchainImageVersion;
