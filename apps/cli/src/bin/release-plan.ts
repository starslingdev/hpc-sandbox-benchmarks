#!/usr/bin/env bun
// `release-plan` — the FIRST job of the toolchain release. Resolve the toolchain identity from the
// arktype-validated config, decide the release mode, and emit ONE machine-checkable release plan that
// every downstream job (build, the provider bake matrix, promote) consumes instead of re-deriving the
// refs and gates from the raw workflow inputs (the "make the plan an artifact" contract).
//
// Two outputs, one invocation:
//   • the full plan as pretty JSON, written to the path in argv[1] (uploaded as the release-plan.json
//     diagnostic artifact), and
//   • the consumed `key=value` lines written straight to $GITHUB_OUTPUT (skip, mode, matrix, refs, …)
//     via emitStepOutputs — never a stdout redirect, so no subprocess chatter can corrupt them.
//
// Credential posture: importing `config`/`validatedPins` validates env + pins with NO cloud creds
// (the fail-fast gate). The one privileged call is the immutability probe (`imageExistsInRegistry`,
// a `docker manifest inspect` that needs the GHCR login the plan job does first). That probe is only
// a best-effort EARLY skip — the authoritative immutable-version guard lives in `promote` (which
// REFUSES on an uncertain check), so an inconclusive probe here proceeds rather than blocks.
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { validatedPins } from "@sandbox-benchmarks/templates/pins";
import {
	imageExistsInRegistry,
	imageName,
	imageRepo,
	PUBLISHED_VARIANTS,
} from "../lib/bake/image.ts";
import { emitStepOutputs } from "../lib/gha-output.ts";
import { isPartialScope, selectProviders } from "../lib/matrix.ts";
import type { ReleaseBuildMode } from "../lib/release-inputs.ts";
import { isBuildMode } from "../lib/release-inputs.ts";

/**
 * Providers the release is REQUIRED to bake + validate before the public version is published — the
 * same set CI passes to `bake --promote --require …`, single-sourced here so the matrix's per-cell
 * `required` flags and promote's gate can't drift. e2b/daytona-vm bake a real artifact; modal-gvisor is
 * required because its `Image.fromRegistry` boot validates the published image the same way. The new
 * isolation variants (daytona-container, modal-vm) are best-effort until a committed run validates
 * them — like blaxel (a no-op bake booting the stock base) and novita (optional control plane), a
 * missing secret or an unproven variant skips without failing the release.
 */
export const RELEASE_REQUIRED_PROVIDERS: readonly ProviderId[] = [
	"e2b",
	"daytona-vm",
	"modal-gvisor",
];

/**
 * Providers a SCOPED release cannot name, with the reason. An unscoped release simply skips these (a
 * missing credential is a skip, and they are not in {@link RELEASE_REQUIRED_PROVIDERS}); naming one in
 * `providers` says "make this ship", which the lane then cannot do — and every provider a scoped
 * dispatch names is required, so the cell fails on missing credentials AFTER a `privileged` approval
 * and, on a `build: full` dispatch, an hour of rebuild. Refusing in the plan turns that into a
 * fail-fast with an explanation.
 *
 * Keyed by provider so the reason travels with the refusal. Blaxel is the only entry: its bake is a
 * no-op (it boots the vendor's stock image, not our toolchain) and its promote publishes nothing, so
 * the release lane deliberately injects no BL_API_KEY/BL_WORKSPACE — those live in the bench lane
 * only (docs/ci-secrets.md). Adding credentials to the bake matrix is what would remove an entry here.
 */
export const RELEASE_UNSCOPABLE_PROVIDERS: Readonly<Partial<Record<ProviderId, string>>> = {
	blaxel:
		"it boots the vendor's stock image rather than the toolchain, so the release lane carries no " +
		"BL_API_KEY/BL_WORKSPACE and has no artifact to publish for it",
};

/** Per-provider baked artifact name (what a cell produces), or a note for the providers that bake none. */
function providerArtifact(id: ProviderId): string {
	switch (id) {
		case "e2b":
			return config.e2bTemplateCandidate;
		case "daytona-vm":
			return config.daytonaSnapshotCandidate;
		case "daytona-container":
			return config.daytonaContainerSnapshotCandidate;
		case "novita":
			return config.novitaTemplateCandidate;
		case "modal-gvisor":
		case "modal-vm":
		case "microsandbox-local":
		case "microsandbox-cloud":
			return "boots the candidate image directly (no baked artifact)";
		case "blaxel":
			return "boots the stock base image (no baked artifact)";
		case "namespace":
			// No template/snapshot system — pulls the candidate image straight into an instance at
			// create time (same as modal), so there is no baked artifact to name.
			return "boots the candidate image directly (no baked artifact)";
		case "vercel":
			return config.vercelImageCandidate;
	}
}

export interface ReleasePlanInputs {
	/** `github.sha` — the source ref the release is cut from (recorded, not resolved). */
	sourceRef: string;
	/** `force_republish` dispatch input: regenerate the version in place even if already published. */
	forceRepublish: boolean;
	/** Whether the immutable public version already exists in the registry (the early-skip probe). */
	alreadyPublished: boolean;
	/** `providers` dispatch input: a comma-separated id list the release is restricted to. Blank/absent
	 *  → every registered provider (the default full release). An unknown id throws. */
	providers?: string;
	/** `build` dispatch input; blank/absent → `full`. */
	build?: ReleaseBuildMode;
	/** `promote` dispatch input; absent → true (the publish phase runs). */
	promote?: boolean;
}

export interface ReleaseProviderPlan {
	provider: ProviderId;
	required: boolean;
	artifact: string;
}

export interface ReleasePlan {
	/** `build` for a fresh release; `republish` when force_republish regenerates an existing version;
	 *  `backfill` when a scoped dispatch adds a subset of providers to an already-published version. */
	mode: "build" | "republish" | "backfill";
	/** Skip the whole release: the version is already published and this is not a forced republish
	 *  or a scoped backfill (both of which deliberately target an existing version). */
	skip: boolean;
	/** How the BUILD phase runs. `full` rebuilds the base and pushes a new mutable candidate base;
	 *  `variants` leaves the base alone and restages only the registry-served provider variants on top
	 *  of the already-published version base (the backfill path — same bytes as the running fleet);
	 *  `skip` runs no build job at all and reuses whatever candidates the registry already holds. */
	build: ReleaseBuildMode;
	/** Whether the publish (promote) phase runs at all — false bakes and verifies, then stops. */
	promote: boolean;
	/** True when this release covers a strict SUBSET of the registry. A partial release never rewrites
	 *  the public base: it publishes only its own providers' version artifacts onto the existing one. */
	partial: boolean;
	sourceRef: string;
	/** The single cross-provider size tier (this benchmark pins exactly one — no size-tier fan-out). */
	sizeTier: string;
	image: {
		repo: string;
		/** The bare package name (the GHCR package the public-package guard checks). */
		name: string;
		version: string;
		candidate: string;
		toolchainVersion: string;
	};
	/** Every GHCR package an IN-SCOPE provider pulls anonymously, so the visibility guard covers all of
	 *  them — the base plus each registry-served variant whose provider this release covers (see
	 *  PUBLISHED_VARIANTS in lib/bake/image.ts). */
	packages: string[];
	providers: ReleaseProviderPlan[];
	/** The providers that must pass before publish (single-sourced for the matrix + promote gate). */
	required: ProviderId[];
	gates: {
		alreadyPublished: boolean;
		forceRepublish: boolean;
		/** The immutable pointer promote advances — the only mutation the release makes public. */
		publishTarget: string;
	};
	/** The `strategy.matrix` contract the bake fan-out reads: one cell per provider IN SCOPE. */
	matrix: { include: Array<{ provider: ProviderId; required: boolean }> };
}

/**
 * Build the release plan from resolved inputs + the config refs. Pure (no env, no I/O) so the mode /
 * skip / matrix logic is unit-testable without a registry or a real config — the bin injects the live
 * `config`-derived values below.
 */
export function buildReleasePlan(inputs: ReleasePlanInputs): ReleasePlan {
	// A blank `providers` input means "every provider" (the default full release); a non-blank one is
	// resolved against the registry by selectProviders, which throws on an unknown id rather than
	// silently shrinking the release. Everything below keys off `partial` — a STRICT subset — so
	// spelling out the whole registry stays an ordinary full release, matching what promote will do.
	const scope = selectProviders(inputs.providers);
	const partial = isPartialScope(scope);

	// Refuse a scope naming a provider the lane cannot ship, before the release spends an approval and
	// a build on a cell that is guaranteed to fail (see RELEASE_UNSCOPABLE_PROVIDERS).
	if (partial) {
		const unscopable = scope.filter((id) => RELEASE_UNSCOPABLE_PROVIDERS[id]);
		if (unscopable.length > 0) {
			throw new Error(
				`the release lane cannot ship ${unscopable.join(", ")}: ${unscopable
					.map((id) => `${id} — ${RELEASE_UNSCOPABLE_PROVIDERS[id]}`)
					.join("; ")}. Drop it from \`providers\` (an unscoped release skips it).`,
			);
		}
	}

	// A partial dispatch names exactly the providers it wants, so every one of them is REQUIRED: the
	// point of `providers: vercel` is to make that provider ship, and a "best-effort" cell would let it
	// skip on a missing secret and still report a green release that published nothing. A full release
	// keeps the standing required set, where best-effort variants are expected.
	const required: ProviderId[] = partial ? [...scope] : [...RELEASE_REQUIRED_PROVIDERS];

	// force_republish deliberately regenerates the version in place and a partial release deliberately
	// backfills onto it, so "already published" never skips either; a plain build skips once the
	// immutable version exists (bump TOOLCHAIN_VERSION to publish anew).
	//
	// `promote: false` is the third exception, and for a different reason than the other two: the early
	// skip exists to spare a release that would only re-publish a version already sitting in the
	// registry. A dispatch that is not publishing has nothing to be spared — it asked to bake and verify
	// against the current version, which is exactly what you do BEFORE deciding to cut a new one — so
	// letting "already published" skip it would silently turn the whole run into a no-op.
	const promote = inputs.promote ?? true;
	const mode = partial ? "backfill" : inputs.forceRepublish ? "republish" : "build";
	const skip = inputs.alreadyPublished && !inputs.forceRepublish && !partial && promote;

	const providers: ReleaseProviderPlan[] = scope.map((provider) => ({
		provider,
		required: required.includes(provider),
		artifact: providerArtifact(provider),
	}));

	const { vcpus, memoryGb, diskGb } = config.targetSpec;

	return {
		mode,
		skip,
		build: inputs.build ?? "full",
		promote,
		partial,
		sourceRef: inputs.sourceRef,
		sizeTier: `${vcpus} vCPU / ${memoryGb} GiB / ${diskGb} GB`,
		image: {
			repo: imageRepo(config.toolchainImageVersion),
			name: imageName(config.toolchainImageVersion),
			version: config.toolchainImageVersion,
			candidate: config.toolchainImageCandidate,
			toolchainVersion: config.toolchainVersion,
		},
		// Scoped to what this release actually pulls: the guard FAILS a release whose package is still
		// private, so listing a variant no in-scope provider touches would block a release over a
		// package it never reads.
		packages: [
			imageName(config.toolchainImageVersion),
			...PUBLISHED_VARIANTS.filter((entry) => scope.includes(entry.provider)).map((entry) =>
				imageName(entry.version),
			),
		],
		providers,
		required,
		gates: {
			alreadyPublished: inputs.alreadyPublished,
			forceRepublish: inputs.forceRepublish,
			publishTarget: config.toolchainImageVersion,
		},
		matrix: {
			include: providers.map((p) => ({ provider: p.provider, required: p.required })),
		},
	};
}

/** The flat `key=value` lines a downstream job reads via `steps.<id>.outputs.*` (one per line). Only
 *  the outputs the workflow actually consumes are emitted; the full plan (repo, version, gates, …)
 *  lives in the release-plan.json artifact for diagnostics. */
export function planOutputs(plan: ReleasePlan): string {
	return [
		`mode=${plan.mode}`,
		`skip=${plan.skip}`,
		`packages=${plan.packages.join(",")}`,
		`image-candidate=${plan.image.candidate}`,
		`toolchain-version=${plan.image.toolchainVersion}`,
		`size-tier=${plan.sizeTier}`,
		// The RESOLVED scope, never the raw dispatch input: a blank input becomes the full registry list
		// here, so every consumer (the promote `--provider`, the per-provider setup steps' `contains()`
		// guards) reads one shape and none of them has to re-encode "blank means everything".
		`providers=${plan.providers.map((p) => p.provider).join(",")}`,
		`required=${plan.required.join(",")}`,
		// The two dynamic job-skipping gates: `build` is skipped outright in `skip` mode, `publish` when
		// the dispatch asked to bake + verify only.
		`build-mode=${plan.build}`,
		`run-build=${plan.build !== "skip"}`,
		`run-publish=${plan.promote}`,
		`publish-target=${plan.gates.publishTarget}`,
		// The matrix must be a single line of compact JSON — it becomes `fromJSON(needs.plan.outputs.matrix)`.
		`matrix=${JSON.stringify(plan.matrix)}`,
	].join("\n");
}

if (import.meta.main) {
	// Validate the pins up front (throws on any unfilled/invalid pin) — the credential-free fail-fast
	// gate, before the registry probe below touches the (already-logged-in) registry.
	validatedPins();

	const forceRepublish = process.env.FORCE_REPUBLISH === "true";
	const sourceRef = process.env.GITHUB_SHA ?? "unknown";
	const providers = process.env.RELEASE_PROVIDERS ?? "";
	// The dispatch inputs are already validated (shape and combination) by release-validate.ts, which
	// runs before this in the same job. Re-derive rather than re-check: an out-of-range value can only
	// get here if that gate was bypassed, and an unrecognized `build` is passed through as `undefined`
	// so buildReleasePlan applies the one full-release default (rather than a second copy of it here);
	// `providers` still throws through selectProviders on an unknown id.
	const rawBuild = (process.env.BUILD_MODE ?? "").trim();
	const build: ReleaseBuildMode | undefined = isBuildMode(rawBuild) ? rawBuild : undefined;
	const promote = process.env.PROMOTE !== "false";

	// Best-effort immutability probe: an inconclusive result (auth/network) proceeds — promote does the
	// authoritative, refuse-on-uncertain check before it writes the immutable base. `probeConclusive`
	// records whether the answer is evidence or just the default, so the gate below can tell a real
	// "not published" from a registry blip.
	let alreadyPublished = false;
	let probeConclusive = true;
	try {
		alreadyPublished = await imageExistsInRegistry(config.toolchainImageVersion);
	} catch (err) {
		probeConclusive = false;
		console.error(
			`::warning::could not probe whether ${config.toolchainImageVersion} is already published ` +
				`(${err instanceof Error ? err.message : String(err)}); proceeding — promote does the authoritative guard.`,
		);
	}

	const plan = buildReleasePlan({
		sourceRef,
		forceRepublish,
		alreadyPublished,
		providers,
		build,
		promote,
	});

	// A partial release BACKFILLS providers onto an already-published version, so a version that isn't
	// published yet means the operator scoped a release that has no base to attach to. Warn rather than
	// fail: the probe above is best-effort (an auth/network blip reads as "not published"), and promote
	// does the authoritative refuse-on-uncertain check before anything is written.
	if (plan.partial && !alreadyPublished && plan.promote) {
		console.error(
			`::warning::${config.toolchainImageVersion} does not look published yet, but this is a scoped ` +
				`release (${plan.providers.map((p) => p.provider).join(", ")}) — a scoped promote backfills ` +
				"providers onto an existing version and never writes the base, so it will refuse. Run a full " +
				"release first, or dispatch with promote disabled to bake + verify only.",
		);
	}

	// `build: variants` composes the provider variants ON the published version base, so it cannot run
	// before that version exists — the build job would die resolving it, after a `privileged` approval
	// this (unprivileged) job can refuse ahead of. Unlike the warning above this is a hard failure: there
	// is no path where the phase works without that base. It is gated on a CONCLUSIVE probe, though, so a
	// registry blip degrades to the opaque-but-honest failure in the build job rather than a false refusal.
	if (plan.build === "variants" && probeConclusive && !alreadyPublished) {
		console.error(
			`::error title=No published base to compose variants on::${config.toolchainImageVersion} is not ` +
				"published, and `build: variants` rebuilds only the provider variants ON TOP of it — there is " +
				"nothing to compose against. Use `build: full` to cut this version first; `variants` is for " +
				"adding a provider to a version that already shipped.",
		);
		process.exit(1);
	}

	// Optional first positional (flags filtered out): write the full plan JSON here for the
	// release-plan.json diagnostic artifact.
	const planPath = process.argv.slice(2).find((a) => !a.startsWith("-"));
	if (planPath) await Bun.write(planPath, `${JSON.stringify(plan, null, 2)}\n`);

	// Write the `key=value` outputs straight to $GITHUB_OUTPUT (never via a stdout redirect), so nothing
	// a child process prints can corrupt them.
	emitStepOutputs(planOutputs(plan));
}
