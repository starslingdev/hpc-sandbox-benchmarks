// The runtime configuration gatekeeper. The validated `config` object below is the single surface the
// rest of the app imports: process.env is validated here once, at module load, so no unvalidated
// environment data reaches business logic. Static identity/spec come from the schema (the shared
// source of truth); the env overrides layer on top.
import { TARGET_SPEC, TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

// 1. Env schema — only the variables this app reads, validated at the boundary. All optional; an
//    explicitly-set but empty value is a misconfiguration and is rejected. Daytona is single-region
//    (the base DAYTONA_* vars): the beta `ZEN5-VM` region and its `_ZEN5`-suffixed vars were retired
//    in favor of `us-west-2` (set via DAYTONA_TARGET), so there's no region selector any more.
const envSchema = type({
	"BENCH_TOOLCHAIN_IMAGE?": "string >= 1",
	"BENCH_TOOLCHAIN_IMAGE_BLAXEL?": "string >= 1",
	"E2B_TEMPLATE?": "string >= 1",
	"DAYTONA_API_KEY?": "string >= 1",
	"DAYTONA_TARGET?": "string >= 1",
	"DAYTONA_SNAPSHOT?": "string >= 1",
	"NOVITA_API_KEY?": "string >= 1",
	"NOVITA_TEMPLATE?": "string >= 1",
});

const ENV_KEYS = [
	"BENCH_TOOLCHAIN_IMAGE",
	"BENCH_TOOLCHAIN_IMAGE_BLAXEL",
	"E2B_TEMPLATE",
	"DAYTONA_API_KEY",
	"DAYTONA_TARGET",
	"DAYTONA_SNAPSHOT",
	"NOVITA_API_KEY",
	"NOVITA_TEMPLATE",
] as const;

// 2. Startup gatekeeper — validate the environment once, fail fast with a clear message. Only the
//    keys we declare are forwarded (process.env carries hundreds of unrelated ones). A set-but-EMPTY
//    value is treated as unset, not a misconfiguration: GitHub Actions materializes an unconfigured
//    secret as an empty-string env var (`FOO: ${{ secrets.MISSING }}` sets FOO=""), so throwing here
//    would crash EVERY provider's bench job at module load the moment one optional secret is
//    unsynced — the exact hazard the workflows' `DAYTONA_TARGET || 'us-west-2'` default papered
//    over. Empty ⇒ unset keeps a missing credential what it is everywhere else in the harness
//    (missingCreds treats "" as missing): a downstream skip decision, never an import-time crash.
const rawEnv: Record<string, string> = {};
for (const key of ENV_KEYS) {
	const value = process.env[key];
	if (value !== undefined && value !== "") rawEnv[key] = value;
}
const env = envSchema(rawEnv);
if (env instanceof type.errors) {
	throw new Error(`Invalid configuration: ${env.summary}`);
}

/** The Novita account the novita adapter boots from (via the E2B-compatible API). */
export interface NovitaConfig {
	/** Novita API key (`nvta_…`), sent to Novita's E2B-compatible API at sandbox.novita.ai. */
	apiKey?: string;
}

/** The daytona account/target the adapter boots from. Single-region: the base DAYTONA_* env vars. */
export interface DaytonaConfig {
	apiKey?: string;
	/** Daytona runner target/region (e.g. `us-west-2`); undefined uses the account default. */
	target?: string;
	/** Snapshot to boot from (the pre-baked toolchain snapshot). */
	snapshot: string;
}

// Candidate↔version naming. The public version (`:v1`, `…-v1`) is immutable and written only by
// `promote`; iteration happens against a mutable candidate (`:v1-candidate`, `…-v1-candidate`),
// reused every build so the public registry never accumulates versions. Bumping TOOLCHAIN_VERSION
// then yields exactly one new public version per deliberate promote.
const imageRepo = `ghcr.io/starslingdev/${TOOLCHAIN_IMAGE_NAME}`;
const CANDIDATE_SUFFIX = "-candidate";

const toolchainImageVersion = `${imageRepo}:${TOOLCHAIN_VERSION}`;
const toolchainImageCandidate = `${toolchainImageVersion}${CANDIDATE_SUFFIX}`;
// The blaxel variant (base + Blaxel's sandbox-api injected, see images/blaxel/Dockerfile) is its own
// GHCR repository, not a tag on the base — Blaxel pulls it directly via `image:`, so it needs its own
// package (and its own public-visibility bootstrap; see docs/ci-secrets.md).
const toolchainImageBlaxelVersion = `${imageRepo}-blaxel:${TOOLCHAIN_VERSION}`;
const toolchainImageBlaxelCandidate = `${toolchainImageBlaxelVersion}${CANDIDATE_SUFFIX}`;
// Version-scope the e2b template + daytona snapshot (parity with each other): a v2 makes a new
// named artifact instead of overwriting v1.
const e2bTemplateVersion = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;
const e2bTemplateCandidate = `${e2bTemplateVersion}${CANDIDATE_SUFFIX}`;
const daytonaSnapshotDefault = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;
const daytonaSnapshotCandidate = `${daytonaSnapshotDefault}${CANDIDATE_SUFFIX}`;
// The novita template lives on Novita's E2B-compatible control plane (a separate namespace from
// e2b.dev), so it reuses the same version-scoped artifact name as the e2b template — aliased, not
// recomputed, so a change to the e2b naming formula can't silently break the shared-name invariant.
const novitaTemplateVersion = e2bTemplateVersion;
const novitaTemplateCandidate = e2bTemplateCandidate;

// 3. The single, fully-typed config object. Everything that needs config imports THIS.
export const config = {
	/** Pinned cross-provider target spec — see {@link TARGET_SPEC} for the dimensions and sizing rationale. */
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
	/** The blaxel-variant image ref the adapter boots from (sandbox-api injected on top of the
	 *  toolchain base — see images/blaxel/Dockerfile); `BENCH_TOOLCHAIN_IMAGE_BLAXEL` override, else
	 *  the version-scoped public image. */
	toolchainImageBlaxel: env.BENCH_TOOLCHAIN_IMAGE_BLAXEL ?? toolchainImageBlaxelVersion,
	/** Public (version-scoped) blaxel-variant image ref; the promote target. */
	toolchainImageBlaxelVersion,
	/** Candidate blaxel-variant image ref the bake builds/pushes while iterating. */
	toolchainImageBlaxelCandidate,
	/** The e2b template the sandbox boots from (name = e2b.toml `template_name`); `E2B_TEMPLATE`
	 *  override, else the version-scoped public template. */
	e2bTemplate: env.E2B_TEMPLATE ?? e2bTemplateVersion,
	/** Public (version-scoped) e2b template name; the promote target. */
	e2bTemplateVersion,
	/** Candidate e2b template name the bake builds while iterating. */
	e2bTemplateCandidate,
	/** Canonical (version-scoped) daytona snapshot name; the promote target. */
	daytonaSnapshotDefault,
	/** Candidate daytona snapshot name the bake creates while iterating. */
	daytonaSnapshotCandidate,
	/** The daytona account/target the adapter boots from: API key, runner target (`DAYTONA_TARGET`,
	 *  e.g. `us-west-2`), and the snapshot to boot (`DAYTONA_SNAPSHOT` override, else the version-scoped
	 *  default). */
	daytona: {
		apiKey: env.DAYTONA_API_KEY,
		target: env.DAYTONA_TARGET,
		snapshot: env.DAYTONA_SNAPSHOT ?? daytonaSnapshotDefault,
	} satisfies DaytonaConfig,
	/** The novita template the sandbox boots from (on Novita's control plane); `NOVITA_TEMPLATE`
	 *  override, else the version-scoped public template. */
	novitaTemplate: env.NOVITA_TEMPLATE ?? novitaTemplateVersion,
	/** Public (version-scoped) novita template name; the promote target. */
	novitaTemplateVersion,
	/** Candidate novita template name the bake builds while iterating. */
	novitaTemplateCandidate,
	/** The Novita account the adapter and bake boot from (E2B-protocol-compatible control plane). */
	novita: {
		apiKey: env.NOVITA_API_KEY,
	} satisfies NovitaConfig,
} as const;
