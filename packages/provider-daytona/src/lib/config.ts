// The daytona slice of runtime configuration: the env keys this package owns and the
// version-scoped snapshot naming, derived from the shared toolchain identity (parity with
// provider-e2b's template naming) so a TOOLCHAIN_VERSION bump yields exactly one new public
// snapshot per deliberate promote.
import { CANDIDATE_SUFFIX, readProviderEnv } from "@sandbox-benchmarks/provider-core";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";

// Daytona is single-region (the base DAYTONA_* vars): the beta `ZEN5-VM` region and its
// `_ZEN5`-suffixed vars were retired in favor of `us-west-2` (set via DAYTONA_TARGET), so there's
// no region selector any more.
const env = readProviderEnv(["DAYTONA_API_KEY", "DAYTONA_TARGET", "DAYTONA_SNAPSHOT"] as const);

/** Canonical (version-scoped) daytona snapshot name; the promote target. */
export const daytonaSnapshotDefault = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;

/** Candidate snapshot name the bake creates while iterating. */
export const daytonaSnapshotCandidate = `${daytonaSnapshotDefault}${CANDIDATE_SUFFIX}`;

/** The daytona account/target the adapter boots from. Single-region: the base DAYTONA_* env vars. */
export interface DaytonaConfig {
	apiKey?: string;
	/** Daytona runner target/region (e.g. `us-west-2`); undefined uses the account default. */
	target?: string;
	/** Snapshot to boot from (the pre-baked toolchain snapshot). */
	snapshot: string;
}

/** The account/target the adapter (and the bake pipeline) boots from: API key, runner target, and
 *  the snapshot to boot (`DAYTONA_SNAPSHOT` override, else the version-scoped default). */
export const daytonaConfig: DaytonaConfig = {
	apiKey: env.DAYTONA_API_KEY,
	target: env.DAYTONA_TARGET,
	snapshot: env.DAYTONA_SNAPSHOT ?? daytonaSnapshotDefault,
};
