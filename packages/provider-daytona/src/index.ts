// Public surface of @sandbox-benchmarks/provider-daytona — the daytona ProviderAdapter plus the
// config slice and snapshot names the bake pipeline (build/validate/promote in apps/cli) composes
// into its candidate refs and snapshot builds.
//
// The account API key at construction; the toolchain snapshot and runner target pinned per-create.
// `target` rides the wrapper's create-options passthrough into Daytona's createParams. No env-gate
// override needed — the schema meta's static ["DAYTONA_API_KEY"] stands, so a missing credential
// skips (not errors).
import { daytona } from "@computesdk/daytona";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import {
	CANDIDATE_SUFFIX,
	readProviderEnv,
	toolchainArtifactName,
} from "@sandbox-benchmarks/provider-core";

// Daytona is single-region (the base DAYTONA_* vars): the beta `ZEN5-VM` region and its
// `_ZEN5`-suffixed vars were retired in favor of `us-west-2` (set via DAYTONA_TARGET), so there's
// no region selector any more.
const env = readProviderEnv(["DAYTONA_API_KEY", "DAYTONA_TARGET", "DAYTONA_SNAPSHOT"]);

/** Canonical (version-scoped) daytona snapshot name; the promote target. Identical to the e2b
 *  template name by construction — both are provider-core's shared {@link toolchainArtifactName}. */
export const daytonaSnapshotDefault = toolchainArtifactName;

/** Candidate snapshot name the bake creates while iterating. */
export const daytonaSnapshotCandidate = `${daytonaSnapshotDefault}${CANDIDATE_SUFFIX}`;

/** The account/target the adapter (and the bake pipeline) boots from: API key, runner target
 *  (`DAYTONA_TARGET`, e.g. `us-west-2`; undefined → account default), and the snapshot to boot
 *  (`DAYTONA_SNAPSHOT` override, else the version-scoped default). */
export const daytonaConfig = {
	apiKey: env.DAYTONA_API_KEY,
	target: env.DAYTONA_TARGET,
	snapshot: env.DAYTONA_SNAPSHOT ?? daytonaSnapshotDefault,
} as const;

export const daytonaAdapter: ProviderAdapter = {
	createCompute: () => daytona({ apiKey: daytonaConfig.apiKey }),
	createOptions: {
		snapshotId: daytonaConfig.snapshot,
		...(daytonaConfig.target ? { target: daytonaConfig.target } : {}),
	},
};
