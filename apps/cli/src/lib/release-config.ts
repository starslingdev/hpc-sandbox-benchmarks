// The toolchain release lane's configuration: the immutable toolchain identity from the schema, plus
// the few environment overrides only the release lane reads. Validated once at module load, so a
// malformed override fails before any build, push or promote starts. Provider runtime inputs are
// not here; each DriverModule reads its own through the driver env gate.
//
// Imports the two schema LEAF modules, not the barrel: the barrel arktype-compiles every Run, suite
// and catalog schema at load, and the release bins (and the workflow's `bun -e` probes) pay this
// module's init on every call.
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/providers";
import {
	TOOLCHAIN_VERSION,
	toolchainImageRef,
	VERCEL_PROJECT_NAME_DEFAULT,
	VERCEL_TEAM_SLUG_DEFAULT,
	validateVercelVcrImageRef,
	vercelVcrImageRefs,
} from "@sandbox-benchmarks/schema/toolchain";
import { type } from "arktype";

// A set-but-EMPTY value is unset, not a misconfiguration: GitHub Actions materializes an
// unconfigured variable as an empty string (`FOO: ${{ vars.MISSING }}` sets FOO=""), so treating it
// as a value would crash every release job the moment one optional override is unsynced.
const ENV_KEYS = ["VERCEL_TEAM_SLUG", "VERCEL_PROJECT_NAME", "VERCEL_CANDIDATE_IMAGE"] as const;
const envSchema = type({
	// The two human-readable halves of the VCR namespace. Overrides, not credentials — a fork or a
	// renamed team sets them as plain CI variables. NOT the `team_*`/`prj_*` API IDs (VERCEL_ORG_ID /
	// VERCEL_PROJECT_ID) that `vercel pull` consumes; vercelVcrImageRefs rejects those forms.
	"VERCEL_TEAM_SLUG?": "string >= 1",
	"VERCEL_PROJECT_NAME?": "string >= 1",
	// The digest-pinned VCR ref the workflow mirrors before a candidate build.
	"VERCEL_CANDIDATE_IMAGE?": "string >= 1",
});
const rawEnv: Record<string, string> = {};
for (const key of ENV_KEYS) {
	const value = process.env[key];
	if (value !== undefined && value !== "") rawEnv[key] = value;
}
const env = envSchema(rawEnv);
if (env instanceof type.errors) throw new Error(`Invalid release configuration: ${env.summary}`);

// VCR refs are rooted at a human-readable Vercel namespace, defaulting to this repository's own
// team/project. An explicitly-set but malformed slug/name throws here rather than silently publishing
// into a namespace nobody owns.
const vercelTeamSlug = env.VERCEL_TEAM_SLUG ?? VERCEL_TEAM_SLUG_DEFAULT;
const vercelProjectName = env.VERCEL_PROJECT_NAME ?? VERCEL_PROJECT_NAME_DEFAULT;
const vercelImages = vercelVcrImageRefs(vercelTeamSlug, vercelProjectName);

export const releaseConfig = {
	/** Pinned cross-provider target spec — see {@link TARGET_SPEC} for the sizing rationale. */
	targetSpec: TARGET_SPEC,
	/** Immutable toolchain image version tag. */
	toolchainVersion: TOOLCHAIN_VERSION,
	/** Immutable public image ref (`:v1`); the promote target. */
	toolchainImageVersion: toolchainImageRef("version"),
	/** Mutable candidate image ref (`:v1-candidate`); what the bake builds/pushes while iterating. */
	toolchainImageCandidate: toolchainImageRef("candidate"),
	/** Vercel team slug (org) the VCR namespace is rooted at; `VERCEL_TEAM_SLUG` override. */
	vercelTeamSlug,
	/** Vercel project name the VCR namespace is scoped to; `VERCEL_PROJECT_NAME` override. Must name
	 *  the SAME project as the `VERCEL_PROJECT_ID` the CLI links with, because `vercel vcr push`
	 *  publishes into the linked project — a mismatch pushes to one repository and pulls from another. */
	vercelProjectName,
	/** Public VCR ref of the shared Vercel variant; the promote target. */
	vercelImageVersion: vercelImages.version,
	/** VCR candidate ref: the workflow's digest-pinned `VERCEL_CANDIDATE_IMAGE`, validated against the
	 *  namespace, else the namespace's mutable candidate tag. */
	vercelImageCandidate: env.VERCEL_CANDIDATE_IMAGE
		? validateVercelVcrImageRef(env.VERCEL_CANDIDATE_IMAGE, vercelTeamSlug, vercelProjectName)
		: vercelImages.candidate,
} as const;
