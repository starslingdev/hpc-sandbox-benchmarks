// The runtime configuration gatekeeper. The validated `config` object below is the single surface the
// rest of the app imports: process.env is validated here once, at module load, so no unvalidated
// environment data reaches business logic. Static identity/spec come from the schema (the shared
// source of truth); the env overrides layer on top.
import {
	readProviderEnv,
	toolchainImage,
	toolchainImageCandidate,
	toolchainImageVersion,
} from "@sandbox-benchmarks/provider-core";
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
import { TARGET_SPEC, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";

// 1. Startup gatekeeper — only the variables this app reads, validated once at module load through
//    provider-core's env contract: declared keys forwarded, all optional, an explicitly-set but
//    empty value rejected. Extracted provider packages read their own slices (E2B_TEMPLATE,
//    DAYTONA_*, NOVITA_API_KEY, …) the same way; the toolchain-image identity (and its
//    BENCH_TOOLCHAIN_IMAGE override) lives in provider-core.
const env = readProviderEnv(["CLOUD_RUN_SANDBOX_URL", "CLOUD_RUN_SANDBOX_SECRET"] as const);

/** The pre-deployed Cloud Run gateway the cloudrun adapter talks to (remote mode). The
 *  `@computesdk/cloud-run` factory does NOT read these env vars itself — they must be passed as
 *  config, so they route through this gatekeeper like every other credential. */
export interface CloudRunConfig {
	/** URL of the gateway Cloud Run service (deployed via `npx @computesdk/cloud-run`). */
	sandboxUrl?: string;
	/** Bearer token protecting the gateway's sandbox endpoints. */
	sandboxSecret?: string;
}

// 2. The single, fully-typed config object. Everything that needs config imports THIS. The
//    toolchain-image refs and per-provider artifact names are owned by provider-core and the
//    provider packages; composed here so the bake pipeline keeps its single config import.
export const config = {
	/** Pinned cross-provider target spec (2 vCPU / 8 GiB / 20 GB). */
	targetSpec: TARGET_SPEC,
	/** Immutable toolchain image version tag. */
	toolchainVersion: TOOLCHAIN_VERSION,
	/** Active toolchain image ref the adapters boot from: the `BENCH_TOOLCHAIN_IMAGE` override (CI
	 *  points this at the candidate during iteration), else the canonical public version. */
	toolchainImage,
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
