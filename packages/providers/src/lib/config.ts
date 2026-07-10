// The runtime configuration gatekeeper. The validated `config` object below is the single surface the
// rest of the app imports: process.env is validated here once, at module load, so no unvalidated
// environment data reaches business logic. Static identity/spec come from the schema (the shared
// source of truth); the env overrides layer on top.
import { CANDIDATE_SUFFIX, readProviderEnv } from "@sandbox-benchmarks/provider-core";
import {
	daytonaConfig,
	daytonaSnapshotCandidate,
	daytonaSnapshotDefault,
} from "@sandbox-benchmarks/provider-daytona";
import {
	e2bTemplate,
	e2bTemplateCandidate,
	e2bTemplateVersion,
} from "@sandbox-benchmarks/provider-e2b";
import { TARGET_SPEC, TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";

// 1. Startup gatekeeper — only the variables this app reads, validated once at module load through
//    provider-core's env contract: declared keys forwarded, all optional, an explicitly-set but
//    empty value rejected. Extracted provider packages read their own slices (E2B_TEMPLATE,
//    DAYTONA_*, NOVITA_API_KEY, …) the same way.
const env = readProviderEnv([
	"BENCH_TOOLCHAIN_IMAGE",
	"CLOUD_RUN_SANDBOX_URL",
	"CLOUD_RUN_SANDBOX_SECRET",
] as const);

/** The pre-deployed Cloud Run gateway the cloudrun adapter talks to (remote mode). The
 *  `@computesdk/cloud-run` factory does NOT read these env vars itself — they must be passed as
 *  config, so they route through this gatekeeper like every other credential. */
export interface CloudRunConfig {
	/** URL of the gateway Cloud Run service (deployed via `npx @computesdk/cloud-run`). */
	sandboxUrl?: string;
	/** Bearer token protecting the gateway's sandbox endpoints. */
	sandboxSecret?: string;
}

// Candidate↔version naming (the convention itself — CANDIDATE_SUFFIX — is provider-core's, shared
// with the per-provider packages). The public version (`:v1`, `…-v1`) is immutable and written only
// by `promote`; iteration happens against a mutable candidate, reused every build so the public
// registry never accumulates versions. Bumping TOOLCHAIN_VERSION then yields exactly one new public
// version per deliberate promote.
const imageRepo = `ghcr.io/starslingdev/${TOOLCHAIN_IMAGE_NAME}`;

const toolchainImageVersion = `${imageRepo}:${TOOLCHAIN_VERSION}`;
const toolchainImageCandidate = `${toolchainImageVersion}${CANDIDATE_SUFFIX}`;

// 2. The single, fully-typed config object. Everything that needs config imports THIS.
export const config = {
	/** Pinned cross-provider target spec (2 vCPU / 8 GiB / 20 GB). */
	targetSpec: TARGET_SPEC,
	/** Immutable toolchain image version tag. */
	toolchainVersion: TOOLCHAIN_VERSION,
	/** Active toolchain image ref the adapters boot from: the `BENCH_TOOLCHAIN_IMAGE` override (CI
	 *  points this at the candidate during iteration), else the canonical public version. */
	toolchainImage: env.BENCH_TOOLCHAIN_IMAGE ?? toolchainImageVersion,
	/** Immutable public image ref (`:v1`); the promote target. */
	toolchainImageVersion,
	/** Mutable candidate image ref (`:v1-candidate`); what the bake builds/pushes while iterating. */
	toolchainImageCandidate,
	/** The e2b template the sandbox boots from (name = e2b.toml `template_name`); `E2B_TEMPLATE`
	 *  override, else the version-scoped public template. Owned by provider-e2b; composed here so
	 *  the bake pipeline keeps its single config import. */
	e2bTemplate,
	/** Public (version-scoped) e2b template name; the promote target. */
	e2bTemplateVersion,
	/** Candidate e2b template name the bake builds while iterating. */
	e2bTemplateCandidate,
	/** Canonical (version-scoped) daytona snapshot name; the promote target. */
	daytonaSnapshotDefault,
	/** Candidate daytona snapshot name the bake creates while iterating. */
	daytonaSnapshotCandidate,
	/** The daytona account/target the adapter and bake pipeline boot from. Owned by
	 *  provider-daytona; composed here so the bake pipeline keeps its single config import. */
	daytona: daytonaConfig,
	/** The pre-deployed Cloud Run gateway the cloudrun adapter boots sandboxes through. */
	cloudRun: {
		sandboxUrl: env.CLOUD_RUN_SANDBOX_URL,
		sandboxSecret: env.CLOUD_RUN_SANDBOX_SECRET,
	} satisfies CloudRunConfig,
} as const;
