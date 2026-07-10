// The e2b slice of runtime configuration: the env key this package owns (E2B_TEMPLATE) and the
// version-scoped template naming, derived from the shared toolchain identity so a TOOLCHAIN_VERSION
// bump yields exactly one new public template per deliberate promote (parity with the daytona
// snapshot naming).
import { CANDIDATE_SUFFIX, readProviderEnv } from "@sandbox-benchmarks/provider-core";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";

const env = readProviderEnv(["E2B_TEMPLATE"] as const);

/** Public (version-scoped) e2b template name (= e2b.toml `template_name`); the promote target. */
export const e2bTemplateVersion = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`;

/** Candidate template name the bake builds while iterating. */
export const e2bTemplateCandidate = `${e2bTemplateVersion}${CANDIDATE_SUFFIX}`;

/** The template the sandbox boots from: the `E2B_TEMPLATE` override (CI points this at the
 *  candidate during iteration), else the version-scoped public template. */
export const e2bTemplate = env.E2B_TEMPLATE ?? e2bTemplateVersion;
