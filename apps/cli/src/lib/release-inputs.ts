// The vocabulary of the toolchain release's `workflow_dispatch` inputs, shared by the two bins that
// read them: `release-validate` (the credential-free gate that rejects a bad dispatch with an
// annotation) and `release-plan` (which turns them into the plan every downstream job consumes).
//
// It lives in its own module, rather than in release-plan.ts, so the validate gate can import the
// vocabulary WITHOUT importing the env-backed provider `config` that release-plan pulls in — the whole
// point of that gate is to report a malformed input as a clean annotation, which it could not do if
// loading it could itself throw a config error first.

/**
 * How the BUILD phase runs — the `build` dispatch input.
 *
 *   • `full`     — rebuild the base image and push a new mutable candidate base (the default; what a
 *                  version bump does).
 *   • `variants` — leave the base alone and restage only the registry-served provider variants on top
 *                  of the ALREADY-PUBLISHED version base. The backfill path: it gives a newly added
 *                  provider the same bytes the rest of the fleet already runs, in minutes rather than
 *                  the hour a base rebuild costs — and, because the toolchain build is not
 *                  reproducible, without silently producing a *different* `:vN` for that provider.
 *   • `skip`     — build nothing; reuse whatever candidates the registry already holds. The build job
 *                  is skipped outright (dynamic job skipping), so a re-verify or a promote of an
 *                  already-staged candidate costs no build at all.
 */
export const BUILD_MODES = ["full", "variants", "skip"] as const;
export type ReleaseBuildMode = (typeof BUILD_MODES)[number];

/** Whether `value` names one of the three build modes (a `type: choice` input in the dispatch UI, but
 *  an API dispatch can send anything). */
export function isBuildMode(value: string): value is ReleaseBuildMode {
	return (BUILD_MODES as readonly string[]).includes(value);
}
