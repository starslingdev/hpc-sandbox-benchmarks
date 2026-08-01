#!/usr/bin/env bun
// `build-candidate` — the BUILD phase of the toolchain release: build the base image (+ variants) and
// push the mutable candidate base to GHCR ONCE, then resolve and record its immutable digest. Split
// from the provider bake so the image is built a single time here and every provider cell fans out
// from the already-pushed candidate ref (build once, fan out). The local iteration loop still uses
// `bake --build-push` (which build-pushes AND bakes in one process); CI splits the two.
//
// Two modes, chosen by `BUILD_MODE` (the workflow's `build` dispatch input, via the release plan):
//   • `full` (default) — the above: rebuild the base and push a new mutable candidate base.
//   • `variants` — do NOT rebuild the base. Restage only the registry-served provider variants (the
//     Vercel VCR source image today) on top of the ALREADY-PUBLISHED version base. This is the build
//     phase of a scoped backfill: it adds a provider to a version the rest of the fleet already runs,
//     on the same bytes they run, in minutes instead of an hour. See buildAndPushVariantCandidates.
// (`skip` is the third dispatch value, and never reaches this script — the plan skips the job.)
//
// Emits, in one invocation:
//   • the `key=value` step outputs (base digest + digest-pinned ref) straight to $GITHUB_OUTPUT
//     via emitStepOutputs — NOT to stdout: build.sh runs with inherited stdout, so a
//     `bun … >> "$GITHUB_OUTPUT"` redirect would splice build.sh's progress into the outputs file and
//     GitHub would reject it. stdout is left to carry the (inherited) build log, and
//   • argv[1] (optional): a build-metadata.json diagnostic artifact with the same facts.
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import type { StagedCandidates } from "../lib/bake/image.ts";
import {
	buildAndPushCandidate,
	buildAndPushVariantCandidates,
	imageDigest,
} from "../lib/bake/image.ts";
import type { Log } from "../lib/bake/types.ts";
import { emitStepOutputs } from "../lib/gha-output.ts";
import { selectProviders } from "../lib/matrix.ts";
import type { BuilderBuildMode } from "../lib/release-inputs.ts";
import { BUILDER_BUILD_MODES, isBuilderBuildMode } from "../lib/release-inputs.ts";

/** Parse `BUILD_MODE`; blank → `full`. An unrecognized value THROWS rather than defaulting: silently
 *  falling back to `full` would spend an hour rebuilding a base the operator asked us not to touch —
 *  which includes `skip`, a real dispatch value that the plan resolves by skipping this job entirely. */
export function buildMode(raw: string | undefined): BuilderBuildMode {
	const value = (raw ?? "").trim() || "full";
	if (!isBuilderBuildMode(value)) {
		throw new Error(`BUILD_MODE must be one of ${BUILDER_BUILD_MODES.join(", ")} (got '${value}')`);
	}
	return value;
}

if (import.meta.main) {
	const log: Log = (m) => console.error(m);

	let mode: BuilderBuildMode;
	try {
		mode = buildMode(process.env.BUILD_MODE);
	} catch (err) {
		log(`error: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(2);
	}

	// The release's provider scope, so a scoped build stages only the variants it is releasing rather
	// than rewriting an out-of-scope provider's candidate tag. Blank/absent → every provider.
	let scope: ProviderId[] | undefined;
	try {
		const raw = (process.env.RELEASE_PROVIDERS ?? "").trim();
		scope = raw === "" ? undefined : selectProviders(raw);
	} catch (err) {
		log(`error: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(2);
	}

	// In `variants` mode the base the variants compose on is the PUBLISHED version, not the candidate:
	// the whole point is to derive the new artifact from the bytes already in production.
	// A failed build/push is the phase failing: report it as one line on stderr (where the job summary
	// and the run log read it) and exit non-zero, rather than letting an unhandled rejection print a
	// stack trace. Mirrors the `--build-push` path in bake.ts.
	let staged: StagedCandidates;
	try {
		staged =
			mode === "variants"
				? await buildAndPushVariantCandidates(log, scope)
				: await buildAndPushCandidate(log, scope);
	} catch (err) {
		log(`<<< build/push failed — ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}

	// What this phase PRODUCED, which is what the downstream summaries label as the release's image:
	// a `full` build pushed a new candidate base, while a `variants` build left the base alone and
	// pushed only the variant candidates — naming the untouched public base there would read as though
	// the base had been rebuilt. Both are recorded separately in the metadata artifact either way.
	const digestRef = mode === "variants" ? staged.variants.join(", ") : staged.base;

	const metadata = {
		mode,
		/** The digest-pinned base this phase's artifacts derive from. */
		base: staged.base,
		/** Digest-pinned refs of the registry-served variant candidates this run actually staged. */
		variantCandidates: staged.variants,
		scope: scope ?? "all",
		version: config.toolchainVersion,
		buildRef: process.env.GITHUB_SHA ?? null,
	};
	// Optional first positional (flags filtered out).
	const metaPath = process.argv.slice(2).find((a) => !a.startsWith("-"));
	if (metaPath) await Bun.write(metaPath, `${JSON.stringify(metadata, null, 2)}\n`);

	log(`<<< ${mode} build complete: ${digestRef || staged.base}`);
	// Straight to $GITHUB_OUTPUT (not stdout) — build.sh's inherited stdout must not reach the outputs.
	// `base-digest-ref` is what downstream phases PIN; `candidate-digest-ref` is what this phase staged.
	emitStepOutputs(
		[
			`digest=${imageDigest(staged.base)}`,
			`base-digest-ref=${staged.base}`,
			`candidate-digest-ref=${digestRef || staged.base}`,
		].join("\n"),
	);
}
