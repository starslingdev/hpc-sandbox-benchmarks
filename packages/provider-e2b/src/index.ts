// Public surface of @sandbox-benchmarks/provider-e2b — the e2b ProviderAdapter plus the template
// names the bake pipeline (apps/cli build/validate/promote) composes into its candidate refs.
//
// Boot the e2b template built from the toolchain image (computesdk maps snapshotId → the e2b
// template id/name). cpu/memory are pinned in the template's e2b.toml, not per-create, so the
// template ref is the entire create-time policy. Credentials come from E2B_API_KEY (the factory's
// env fallback; the schema meta's requiredEnvVars gate skips without it).
import { e2b } from "@computesdk/e2b";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import {
	CANDIDATE_SUFFIX,
	readProviderEnv,
	toolchainArtifactName,
} from "@sandbox-benchmarks/provider-core";

const env = readProviderEnv(["E2B_TEMPLATE"]);

/** Public (version-scoped) e2b template name (= e2b.toml `template_name`); the promote target.
 *  Identical to the daytona snapshot name by construction — both are provider-core's shared
 *  {@link toolchainArtifactName}. */
export const e2bTemplateVersion = toolchainArtifactName;

/** Candidate template name the bake builds while iterating. */
export const e2bTemplateCandidate = `${e2bTemplateVersion}${CANDIDATE_SUFFIX}`;

/** The template the sandbox boots from: the `E2B_TEMPLATE` override (CI points this at the
 *  candidate during iteration), else the version-scoped public template. */
export const e2bTemplate = env.E2B_TEMPLATE ?? e2bTemplateVersion;

export const e2bAdapter: ProviderAdapter = {
	createCompute: () => e2b({}),
	createOptions: { snapshotId: e2bTemplate },
};
