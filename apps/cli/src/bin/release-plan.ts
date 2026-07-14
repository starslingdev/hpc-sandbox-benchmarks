#!/usr/bin/env bun
// `release-plan` — the FIRST job of the toolchain release. Resolve the toolchain identity from the
// arktype-validated config, decide the release mode, and emit ONE machine-checkable release plan that
// every downstream job (build, the provider bake matrix, promote) consumes instead of re-deriving the
// refs and gates from the raw workflow inputs (the "make the plan an artifact" contract).
//
// Two outputs, one invocation:
//   • the full plan as pretty JSON, written to the path in argv[2] (uploaded as the release-plan.json
//     diagnostic artifact), and
//   • flat `key=value` lines on stdout for `>> "$GITHUB_OUTPUT"` (skip, mode, matrix, refs, …).
//
// Credential posture: importing `config`/`validatedPins` validates env + pins with NO cloud creds
// (the fail-fast gate). The one privileged call is the immutability probe (`imageExistsInRegistry`,
// a `docker manifest inspect` that needs the GHCR login the plan job does first). That probe is only
// a best-effort EARLY skip — the authoritative immutable-version guard lives in `promote` (which
// REFUSES on an uncertain check), so an inconclusive probe here proceeds rather than blocks.
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { validatedPins } from "@sandbox-benchmarks/templates/pins";
import { imageExistsInRegistry } from "../lib/bake/image.ts";

/**
 * Providers the release is REQUIRED to bake + validate before the public version is published — the
 * same set CI passes to `bake --promote --require …`, single-sourced here so the matrix's per-cell
 * `required` flags and promote's gate can't drift. e2b/daytona bake a real artifact; modal is required
 * because its `Image.fromRegistry` boot validates the published image the same way. blaxel (a no-op
 * bake booting the stock base) and novita (optional control plane) are best-effort: a missing secret
 * skips them without failing the release.
 */
export const RELEASE_REQUIRED_PROVIDERS: readonly ProviderId[] = ["e2b", "daytona", "modal"];

/** Registry order (matches the provider registry) — the order the matrix cells are listed in. */
const RELEASE_PROVIDERS: readonly ProviderId[] = ["e2b", "daytona", "blaxel", "modal", "novita"];

/** Per-provider baked artifact name (what a cell produces), or a note for the providers that bake none. */
function providerArtifact(id: ProviderId): string {
	switch (id) {
		case "e2b":
			return config.e2bTemplateCandidate;
		case "daytona":
			return config.daytonaSnapshotCandidate;
		case "novita":
			return config.novitaTemplateCandidate;
		case "modal":
			return "boots the candidate image directly (no baked artifact)";
		case "blaxel":
			return "boots the stock base image (no baked artifact)";
	}
}

export interface ReleasePlanInputs {
	/** `github.sha` — the source ref the release is cut from (recorded, not resolved). */
	sourceRef: string;
	/** `force_republish` dispatch input: regenerate the version in place even if already published. */
	forceRepublish: boolean;
	/** Whether the immutable public version already exists in the registry (the early-skip probe). */
	alreadyPublished: boolean;
}

export interface ReleaseProviderPlan {
	provider: ProviderId;
	required: boolean;
	artifact: string;
}

export interface ReleasePlan {
	/** `build` for a fresh release; `republish` when force_republish regenerates an existing version. */
	mode: "build" | "republish";
	/** Skip the whole release: the version is already published and this is not a forced republish. */
	skip: boolean;
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
	providers: ReleaseProviderPlan[];
	/** The providers that must pass before publish (single-sourced for the matrix + promote gate). */
	required: ProviderId[];
	gates: {
		alreadyPublished: boolean;
		forceRepublish: boolean;
		/** The immutable pointer promote advances — the only mutation the release makes public. */
		publishTarget: string;
	};
	/** The `strategy.matrix` contract the bake fan-out reads: one cell per provider. */
	matrix: { include: Array<{ provider: ProviderId; required: boolean }> };
}

/**
 * Build the release plan from resolved inputs + the config refs. Pure (no env, no I/O) so the mode /
 * skip / matrix logic is unit-testable without a registry or a real config — the bin injects the live
 * `config`-derived values below.
 */
export function buildReleasePlan(inputs: ReleasePlanInputs): ReleasePlan {
	const mode = inputs.forceRepublish ? "republish" : "build";
	// force_republish deliberately regenerates the version in place, so "already published" never skips
	// it; a plain build skips once the immutable version exists (bump TOOLCHAIN_VERSION to publish anew).
	const skip = inputs.alreadyPublished && !inputs.forceRepublish;

	const providers: ReleaseProviderPlan[] = RELEASE_PROVIDERS.map((provider) => ({
		provider,
		required: RELEASE_REQUIRED_PROVIDERS.includes(provider),
		artifact: providerArtifact(provider),
	}));

	const { vcpus, memoryGb, diskGb } = config.targetSpec;
	const repo = config.toolchainImageVersion.split(":")[0] ?? config.toolchainImageVersion;

	return {
		mode,
		skip,
		sourceRef: inputs.sourceRef,
		sizeTier: `${vcpus} vCPU / ${memoryGb} GiB / ${diskGb} GB`,
		image: {
			repo,
			name: repo.split("/").pop() ?? repo,
			version: config.toolchainImageVersion,
			candidate: config.toolchainImageCandidate,
			toolchainVersion: config.toolchainVersion,
		},
		providers,
		required: [...RELEASE_REQUIRED_PROVIDERS],
		gates: {
			alreadyPublished: inputs.alreadyPublished,
			forceRepublish: inputs.forceRepublish,
			publishTarget: config.toolchainImageVersion,
		},
		matrix: {
			include: providers.map(({ provider, required }) => ({ provider, required })),
		},
	};
}

/** The flat `key=value` lines a downstream job reads via `steps.<id>.outputs.*` (one per line). */
export function planOutputs(plan: ReleasePlan): string {
	return [
		`mode=${plan.mode}`,
		`skip=${plan.skip}`,
		`already-published=${plan.gates.alreadyPublished}`,
		`image-repo=${plan.image.repo}`,
		`image-name=${plan.image.name}`,
		`image-version=${plan.image.version}`,
		`image-candidate=${plan.image.candidate}`,
		`toolchain-version=${plan.image.toolchainVersion}`,
		`size-tier=${plan.sizeTier}`,
		`required=${plan.required.join(",")}`,
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

	// Best-effort immutability probe: an inconclusive result (auth/network) proceeds — promote does the
	// authoritative, refuse-on-uncertain check before it writes the immutable base.
	let alreadyPublished = false;
	try {
		alreadyPublished = await imageExistsInRegistry(config.toolchainImageVersion);
	} catch (err) {
		console.error(
			`::warning::could not probe whether ${config.toolchainImageVersion} is already published ` +
				`(${err instanceof Error ? err.message : String(err)}); proceeding — promote does the authoritative guard.`,
		);
	}

	const plan = buildReleasePlan({ sourceRef, forceRepublish, alreadyPublished });

	// Optional first positional (flags filtered out): write the full plan JSON here for the
	// release-plan.json diagnostic artifact.
	const planPath = process.argv.slice(2).find((a) => !a.startsWith("-"));
	if (planPath) await Bun.write(planPath, `${JSON.stringify(plan, null, 2)}\n`);

	// stdout is the $GITHUB_OUTPUT contract — keep it to `key=value` lines only.
	console.log(planOutputs(plan));
}
