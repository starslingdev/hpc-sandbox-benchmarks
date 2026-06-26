// The runtime configuration gatekeeper. The validated `config` object below is the single surface the
// rest of the app imports: process.env is validated here once, at module load, so no unvalidated
// environment data reaches business logic. Static identity/spec come from the schema (the shared
// source of truth); the env overrides layer on top.
import { TARGET_SPEC, TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

/**
 * Daytona regions the harness knows about. `default` uses the base env vars (DAYTONA_API_KEY, …); a
 * named region uses an UPPERCASE-suffixed set (e.g. DAYTONA_API_KEY_ZEN5, DAYTONA_TARGET_ZEN5,
 * DAYTONA_SNAPSHOT_ZEN5). Daytona's `ZEN5-VM` is a beta region with faster machines and its own API key.
 *
 * `region` is Daytona's own region identifier, set verbatim in `DAYTONA_REGION` — it can contain
 * characters that aren't legal in an env-var name (the beta fast-machine region is `ZEN5-VM`). `suffix`
 * is the short key the per-region env vars are keyed by, kept *decoupled* from the identifier so a
 * hyphenated region name still resolves to a valid `DAYTONA_API_KEY_ZEN5` rather than the impossible
 * `DAYTONA_API_KEY_ZEN5-VM`.
 */
export const DAYTONA_REGIONS = [
	{ region: "default", suffix: "" },
	{ region: "ZEN5-VM", suffix: "ZEN5" },
] as const;
export type DaytonaRegion = (typeof DAYTONA_REGIONS)[number]["region"];

/** Region identifier → its env-var suffix, for resolving the per-region key/target/snapshot vars. */
const SUFFIX_BY_REGION = new Map<string, string>(DAYTONA_REGIONS.map((r) => [r.region, r.suffix]));

// 1. Env schema — only the variables this app reads, validated at the boundary. All optional; an
//    explicitly-set but empty value is a misconfiguration and is rejected. DAYTONA_REGION must be a
//    known region. The per-region key/target/snapshot vars are declared for both regions so they pass
//    through the same validation as everything else.
const envSchema = type({
	"BENCH_TOOLCHAIN_IMAGE?": "string >= 1",
	"E2B_TEMPLATE?": "string >= 1",
	// Derived from DAYTONA_REGIONS so the accepted values can't drift from the resolver's known set.
	"DAYTONA_REGION?": type.enumerated(...DAYTONA_REGIONS.map((r) => r.region)),
	"DAYTONA_API_KEY?": "string >= 1",
	"DAYTONA_TARGET?": "string >= 1",
	"DAYTONA_SNAPSHOT?": "string >= 1",
	"DAYTONA_API_KEY_ZEN5?": "string >= 1",
	"DAYTONA_TARGET_ZEN5?": "string >= 1",
	"DAYTONA_SNAPSHOT_ZEN5?": "string >= 1",
});

const ENV_KEYS = [
	"BENCH_TOOLCHAIN_IMAGE",
	"E2B_TEMPLATE",
	"DAYTONA_REGION",
	"DAYTONA_API_KEY",
	"DAYTONA_TARGET",
	"DAYTONA_SNAPSHOT",
	"DAYTONA_API_KEY_ZEN5",
	"DAYTONA_TARGET_ZEN5",
	"DAYTONA_SNAPSHOT_ZEN5",
] as const;

// 2. Startup gatekeeper — validate the environment once, fail fast with a clear message. Only the
//    keys we declare are forwarded (process.env carries hundreds of unrelated ones).
const rawEnv: Record<string, string> = {};
for (const key of ENV_KEYS) {
	const value = process.env[key];
	if (value !== undefined) rawEnv[key] = value;
}
const env = envSchema(rawEnv);
if (env instanceof type.errors) {
	throw new Error(`Invalid configuration: ${env.summary}`);
}

/** The resolved Daytona region profile the adapter boots: which key var to require, that key's value,
 *  and the per-region target + snapshot. */
export interface DaytonaRegionConfig {
	region: DaytonaRegion;
	/** Name of the env var that holds this region's API key (so a runner can report what's missing). */
	apiKeyVar: string;
	apiKey?: string;
	/** Daytona runner target/region; undefined uses the account default. */
	target?: string;
	/** Snapshot to boot from (the pre-baked toolchain snapshot). */
	snapshot: string;
}

/**
 * Resolve the active Daytona region from `env`: the key/target/snapshot come from the region's
 * (suffixed) env vars, with the snapshot falling back to `snapshotDefault`. Pure + injectable so the
 * region wiring is unit-testable without touching process.env.
 */
export function resolveDaytonaRegion(
	env: Record<string, string | undefined>,
	snapshotDefault: string,
): DaytonaRegionConfig {
	const region = (env.DAYTONA_REGION ?? "default") as DaytonaRegion;
	// The env-var suffix is looked up from the registry, not derived from the identifier, so a region
	// name with characters illegal in an env-var (e.g. `ZEN5-VM`) still maps to `_ZEN5`. An unknown
	// region falls back to the base vars rather than synthesizing a bogus suffix.
	const key = SUFFIX_BY_REGION.get(region) ?? "";
	const suffix = key ? `_${key}` : "";
	const apiKeyVar = `DAYTONA_API_KEY${suffix}`;
	return {
		region,
		apiKeyVar,
		apiKey: env[apiKeyVar],
		target: env[`DAYTONA_TARGET${suffix}`],
		snapshot: env[`DAYTONA_SNAPSHOT${suffix}`] ?? snapshotDefault,
	};
}

// Candidate↔version naming. The public version (`:v1`, `…-v1`) is immutable and written only by
// `promote`; iteration happens against a mutable candidate (`:v1-candidate`, `…-v1-candidate`),
// reused every build so the public registry never accumulates versions. Bumping TOOLCHAIN_VERSION
// then yields exactly one new public version per deliberate promote.
const imageRepo = `ghcr.io/starslingdev/${TOOLCHAIN_IMAGE_NAME}`;
const CANDIDATE_SUFFIX = "-candidate";

const toolchainImageVersion = `${imageRepo}:${TOOLCHAIN_VERSION}`;
const toolchainImageCandidate = `${toolchainImageVersion}${CANDIDATE_SUFFIX}`;
// Version-scope the e2b template + daytona snapshot (parity with each other): a v2 makes a new
// named artifact instead of overwriting v1.
const e2bTemplateVersion = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;
const e2bTemplateCandidate = `${e2bTemplateVersion}${CANDIDATE_SUFFIX}`;
const daytonaSnapshotDefault = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;
const daytonaSnapshotCandidate = `${daytonaSnapshotDefault}${CANDIDATE_SUFFIX}`;

// 3. The single, fully-typed config object. Everything that needs config imports THIS.
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
	/** The active daytona region profile (key var, key, target, snapshot), selected by
	 *  `DAYTONA_REGION` (`default` | `ZEN5-VM`). */
	daytonaRegion: resolveDaytonaRegion(rawEnv, daytonaSnapshotDefault),
} as const;
