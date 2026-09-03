// The runtime configuration gatekeeper. The validated `config` object below is the single surface the
// rest of the app imports: process.env is validated here once, at module load, so no unvalidated
// environment data reaches business logic. Static identity/spec come from the schema (the shared
// source of truth); the env overrides layer on top.
// The two LEAF modules, not the `@sandbox-benchmarks/schema` barrel. Every consumer of this gatekeeper
// pays its module init, and the barrel arktype-compiles every Run/suite/catalog schema at load — 474 ms
// against 17 ms for these two, which carry no arktype at all. The constants are identical either way.
import { bakedArtifactName, TARGET_SPEC } from "@sandbox-benchmarks/schema/providers";
import {
	TOOLCHAIN_VERSION,
	toolchainImageRef,
	VERCEL_PROJECT_NAME_DEFAULT,
	VERCEL_TEAM_SLUG_DEFAULT,
	validateVercelVcrImageRef,
	vercelVcrImageRefs,
} from "@sandbox-benchmarks/schema/toolchain";
import { type } from "arktype";

// 1. Env schema — only the variables this app reads, validated at the boundary. All optional; an
//    explicitly-set but empty value is a misconfiguration and is rejected. Both Daytona variants
//    live in us-west-2 (DAYTONA_TARGET / DAYTONA_CONTAINER_TARGET override the region per variant;
//    the account's default region has no runners or snapshots, so the defaults below always pin it).
const envSchema = type({
	"BENCH_TOOLCHAIN_IMAGE?": "string >= 1",
	"E2B_TEMPLATE?": "string >= 1",
	"DAYTONA_API_KEY?": "string >= 1",
	"DAYTONA_TARGET?": "string >= 1",
	"DAYTONA_SNAPSHOT?": "string >= 1",
	// The container variant boots a container-class snapshot in the same us-west-2 region as the VM
	// variant, sharing DAYTONA_API_KEY. Both overrides are optional — the defaults are computed below.
	"DAYTONA_CONTAINER_TARGET?": "string >= 1",
	"DAYTONA_CONTAINER_SNAPSHOT?": "string >= 1",
	"NOVITA_API_KEY?": "string >= 1",
	"NOVITA_TEMPLATE?": "string >= 1",
	"RUNLOOP_BLUEPRINT?": "string >= 1",
	"TAMA_CLI?": "string >= 1",
	"MSB_API_URL?": "string >= 1",
	"MSB_API_KEY?": "string >= 1",
	"VERCEL_CANDIDATE_IMAGE?": "string >= 1",
	// The two human-readable halves of the VCR namespace. Overrides, not credentials — a fork or a
	// renamed team sets them as plain CI variables. NOT the `team_*`/`prj_*` API IDs (VERCEL_ORG_ID /
	// VERCEL_PROJECT_ID) that `vercel pull` consumes; vercelVcrImageRefs rejects those forms.
	"VERCEL_TEAM_SLUG?": "string >= 1",
	"VERCEL_PROJECT_NAME?": "string >= 1",
});

const ENV_KEYS = [
	"BENCH_TOOLCHAIN_IMAGE",
	"E2B_TEMPLATE",
	"DAYTONA_API_KEY",
	"DAYTONA_TARGET",
	"DAYTONA_SNAPSHOT",
	"DAYTONA_CONTAINER_TARGET",
	"DAYTONA_CONTAINER_SNAPSHOT",
	"NOVITA_API_KEY",
	"NOVITA_TEMPLATE",
	"RUNLOOP_BLUEPRINT",
	"TAMA_CLI",
	"MSB_API_URL",
	"MSB_API_KEY",
	"VERCEL_CANDIDATE_IMAGE",
	"VERCEL_TEAM_SLUG",
	"VERCEL_PROJECT_NAME",
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

/**
 * One Daytona isolation variant's account/target — the same shape for both the VM and container
 * variants, which share DAYTONA_API_KEY and the us-west-2 region but differ in the sandbox class
 * baked into their snapshot (`daytona-vm` LINUX_VM, `daytona-container` CONTAINER). The sandbox
 * class itself is fixed at bake time, not carried here.
 */
export interface DaytonaConfig {
	apiKey?: string;
	/** Daytona runner target/region (us-west-2 for both variants). */
	target?: string;
	/** Snapshot to boot from (the pre-baked toolchain snapshot for this variant). */
	snapshot: string;
}

/** Connection settings for the remote Microsandbox backend. The API URL is an optional override;
 * the SDK uses its production endpoint when it is absent. */
export interface MicrosandboxCloudCredentials {
	apiUrl?: string;
	apiKey?: string;
}

// Candidate↔version naming. The public version (`:v1`, `…-v1`) is immutable and written only by
// `promote`; iteration happens against a mutable candidate (`:v1-candidate`, `…-v1-candidate`),
// reused every build so the public registry never accumulates versions. Bumping TOOLCHAIN_VERSION
// then yields exactly one new public version per deliberate promote.
// The refs themselves are a toolchain-leaf projection, so the driver composition root and this
// gatekeeper cannot disagree about where the image lives.
const toolchainImageVersion = toolchainImageRef("version");
const toolchainImageCandidate = toolchainImageRef("candidate");
// Provider-side names are the artifact metadata projection from ADR-0006. Providers live in distinct
// control-plane namespaces, so the shared canonical name is sufficient; only isolation variants that
// share a namespace declare a suffix (daytona-container). A new baked provider gets naming for free.
const e2bTemplateVersion = bakedArtifactName("e2b", "version");
const e2bTemplateCandidate = bakedArtifactName("e2b", "candidate");
const daytonaSnapshotDefault = bakedArtifactName("daytona-vm", "version");
const daytonaSnapshotCandidate = bakedArtifactName("daytona-vm", "candidate");
const daytonaContainerSnapshotDefault = bakedArtifactName("daytona-container", "version");
const daytonaContainerSnapshotCandidate = bakedArtifactName("daytona-container", "candidate");
const novitaTemplateVersion = bakedArtifactName("novita", "version");
const novitaTemplateCandidate = bakedArtifactName("novita", "candidate");
const runloopBlueprintVersion = bakedArtifactName("runloop", "version");
const runloopBlueprintCandidate = bakedArtifactName("runloop", "candidate");
// VCR refs are rooted at a human-readable Vercel namespace resolved from the environment, defaulting
// to this repository's own team/project (schema-owned, so the build pins and the runtime agree). The
// workflow overrides the candidate tag with the immutable fully-qualified digest after mirroring the
// variant. An explicitly-set but malformed slug/name throws here rather than silently publishing into
// a namespace nobody owns — the same fail-fast contract the rest of this gatekeeper applies.
const vercelTeamSlug = env.VERCEL_TEAM_SLUG ?? VERCEL_TEAM_SLUG_DEFAULT;
const vercelProjectName = env.VERCEL_PROJECT_NAME ?? VERCEL_PROJECT_NAME_DEFAULT;
const vercelImages = vercelVcrImageRefs(vercelTeamSlug, vercelProjectName);
const vercelImageCandidate = env.VERCEL_CANDIDATE_IMAGE
	? validateVercelVcrImageRef(env.VERCEL_CANDIDATE_IMAGE, vercelTeamSlug, vercelProjectName)
	: vercelImages.candidate;

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
	/** The e2b template the sandbox boots from (name = e2b.toml `template_name`); `E2B_TEMPLATE`
	 *  override, else the version-scoped public template. */
	e2bTemplate: env.E2B_TEMPLATE ?? e2bTemplateVersion,
	/** Public (version-scoped) e2b template name; the promote target. */
	e2bTemplateVersion,
	/** Candidate e2b template name the bake builds while iterating. */
	e2bTemplateCandidate,
	/** Canonical (version-scoped) daytona-vm snapshot name; the promote target. */
	daytonaSnapshotDefault,
	/** Candidate daytona-vm snapshot name the bake creates while iterating. */
	daytonaSnapshotCandidate,
	/** Canonical (version-scoped) daytona-container snapshot name; the promote target. */
	daytonaContainerSnapshotDefault,
	/** Candidate daytona-container snapshot name the bake creates while iterating. */
	daytonaContainerSnapshotCandidate,
	/** The daytona-vm account/target the adapter boots from: API key, runner target
	 *  (`DAYTONA_TARGET` override, else `us-west-2` — where the LINUX_VM snapshot lives; symmetric with
	 *  daytona-container's default so a boot with the env unset doesn't fall back to the account
	 *  default region, which has no LINUX_VM runners), and the LINUX_VM snapshot to boot
	 *  (`DAYTONA_SNAPSHOT` override, else the version-scoped default). */
	daytonaVm: {
		apiKey: env.DAYTONA_API_KEY,
		target: env.DAYTONA_TARGET ?? "us-west-2",
		snapshot: env.DAYTONA_SNAPSHOT ?? daytonaSnapshotDefault,
	} satisfies DaytonaConfig,
	/** The daytona-container account/target: the SAME API key and us-west-2 region as daytona-vm
	 *  (`DAYTONA_CONTAINER_TARGET` override, else `us-west-2`), and the container-class snapshot to
	 *  boot (`DAYTONA_CONTAINER_SNAPSHOT` override, else the version-scoped `-container` default). */
	daytonaContainer: {
		apiKey: env.DAYTONA_API_KEY,
		target: env.DAYTONA_CONTAINER_TARGET ?? "us-west-2",
		snapshot: env.DAYTONA_CONTAINER_SNAPSHOT ?? daytonaContainerSnapshotDefault,
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
	/** The Runloop Blueprint runtime boots by name. `RUNLOOP_BLUEPRINT` is a local/CI validation
	 * override; ordinary benchmark runs use the immutable version-scoped public Blueprint. */
	runloopBlueprint: env.RUNLOOP_BLUEPRINT ?? runloopBlueprintVersion,
	/** Public (version-scoped) Runloop Blueprint name; the promote target. */
	runloopBlueprintVersion,
	/** Mutable candidate Runloop Blueprint name the bake creates while iterating. */
	runloopBlueprintCandidate,
	/** The `tama` binary the CLI-driven adapter spawns for every control-plane call; `TAMA_CLI`
	 *  override, else the name resolved from PATH (what `.github/actions/setup-tama` installs).
	 *  Resolved HERE rather than at the spawn site so the empty-is-unset rule above covers it — CI
	 *  materializes the unconfigured override as `TAMA_CLI=""`, and spawning that is a TypeError, not
	 *  a fallback to the default. */
	tamaCli: env.TAMA_CLI ?? "tama",
	/** Microsandbox Cloud connection. The provider gate requires the key before construction, while
	 * the URL stays optional so the SDK can use its production default. */
	microsandboxCloud: {
		apiUrl: env.MSB_API_URL,
		apiKey: env.MSB_API_KEY,
	} satisfies MicrosandboxCloudCredentials,
	/** Vercel team slug (org) the VCR namespace is rooted at; `VERCEL_TEAM_SLUG` override. */
	vercelTeamSlug,
	/** Vercel project name the VCR namespace is scoped to; `VERCEL_PROJECT_NAME` override. Must name
	 *  the SAME project as the `VERCEL_PROJECT_ID` the CLI links with, because `vercel vcr push`
	 *  publishes into the linked project — a mismatch pushes to one repository and pulls from another. */
	vercelProjectName,
	vercelImage: vercelImages.version,
	vercelImageVersion: vercelImages.version,
	vercelImageCandidate,
} as const;
