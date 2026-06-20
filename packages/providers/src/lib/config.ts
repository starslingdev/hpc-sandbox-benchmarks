// The runtime configuration gatekeeper. The validated `config` object below is the single surface the
// rest of the app imports: process.env is validated here once, at module load, so no unvalidated
// environment data reaches business logic. Static identity/spec come from the schema (the shared
// source of truth); the env overrides layer on top.
import { TARGET_SPEC, TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

/**
 * Daytona regions the harness knows about. `default` uses the base env vars (DAYTONA_API_KEY, …); a
 * named region uses an UPPERCASE-suffixed set (e.g. `zen5` → DAYTONA_API_KEY_ZEN5, DAYTONA_TARGET_ZEN5,
 * DAYTONA_SNAPSHOT_ZEN5). Daytona's ZEN5 is a beta region with faster machines and its own API key.
 */
export const DAYTONA_REGIONS = ["default", "zen5"] as const;
export type DaytonaRegion = (typeof DAYTONA_REGIONS)[number];

// 1. Env schema — only the variables this app reads, validated at the boundary. All optional; an
//    explicitly-set but empty value is a misconfiguration and is rejected. DAYTONA_REGION must be a
//    known region. The per-region key/target/snapshot vars are declared for both regions so they pass
//    through the same validation as everything else.
const envSchema = type({
	"BENCH_TOOLCHAIN_IMAGE?": "string >= 1",
	"E2B_TEMPLATE?": "string >= 1",
	"DAYTONA_REGION?": "'default' | 'zen5'",
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
	const suffix = region === "default" ? "" : `_${region.toUpperCase()}`;
	const apiKeyVar = `DAYTONA_API_KEY${suffix}`;
	return {
		region,
		apiKeyVar,
		apiKey: env[apiKeyVar],
		target: env[`DAYTONA_TARGET${suffix}`],
		snapshot: env[`DAYTONA_SNAPSHOT${suffix}`] ?? snapshotDefault,
	};
}

const daytonaSnapshotDefault = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;

// 3. The single, fully-typed config object. Everything that needs config imports THIS.
export const config = {
	/** Pinned cross-provider target spec (2 vCPU / 8 GiB / 20 GB). */
	targetSpec: TARGET_SPEC,
	/** Immutable toolchain image version tag. */
	toolchainVersion: TOOLCHAIN_VERSION,
	/** Full registry ref of the toolchain image: the `BENCH_TOOLCHAIN_IMAGE` override, else the
	 *  canonical public image. modal boots from this; the daytona snapshot is built from it. */
	toolchainImage:
		env.BENCH_TOOLCHAIN_IMAGE ??
		`ghcr.io/starslingdev/${TOOLCHAIN_IMAGE_NAME}:${TOOLCHAIN_VERSION}`,
	/** The e2b template the sandbox boots from (built by `e2b template build` from the toolchain
	 *  image, name = e2b.toml `template_name`). Override with `E2B_TEMPLATE`. */
	e2bTemplate: env.E2B_TEMPLATE ?? TOOLCHAIN_IMAGE_NAME,
	/** Canonical daytona snapshot name baked from the toolchain image. */
	daytonaSnapshotDefault,
	/** The active daytona region profile (key var, key, target, snapshot), selected by
	 *  `DAYTONA_REGION` (`default` | `zen5`). */
	daytonaRegion: resolveDaytonaRegion(rawEnv, daytonaSnapshotDefault),
} as const;
