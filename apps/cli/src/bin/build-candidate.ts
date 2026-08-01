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
import {
	buildAndPushCandidate,
	buildAndPushVariantCandidates,
	imageDigest,
	imageRepo,
	PUBLISHED_VARIANTS,
	resolveImageDigest,
} from "../lib/bake/image.ts";
import type { Log } from "../lib/bake/types.ts";
import { emitStepOutputs } from "../lib/gha-output.ts";
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

	// In `variants` mode the base the variants compose on is the PUBLISHED version, not the candidate:
	// the whole point is to derive the new artifact from the bytes already in production.
	// A failed build/push is the phase failing: report it as one line on stderr (where the job summary
	// and the run log read it) and exit non-zero, rather than letting an unhandled rejection print a
	// stack trace. Mirrors the `--build-push` path in bake.ts.
	let pinnedBase: string | undefined;
	try {
		if (mode === "variants") {
			pinnedBase = await buildAndPushVariantCandidates(log);
		} else {
			await buildAndPushCandidate(log);
		}
	} catch (err) {
		log(`<<< build/push failed — ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}

	// The ref this phase pinned: the candidate base it just pushed (`full`), or the published version
	// base the variants were rebuilt on (`variants`). Downstream phases record it as provenance.
	const baseTag =
		mode === "variants" ? config.toolchainImageVersion : config.toolchainImageCandidate;
	// The digest is recorded provenance, not a release gate (promote re-validates the mutable tag), so a
	// registry-inspect quirk must not block a candidate that pushed fine: fall back to the tag on failure.
	let digest = "unknown";
	let digestRef: string = baseTag;
	// `variants` already resolved the digest to pin the build — reuse it rather than inspecting twice.
	if (pinnedBase) {
		digestRef = pinnedBase;
		digest = imageDigest(pinnedBase);
	} else {
		try {
			digest = await resolveImageDigest(baseTag);
			digestRef = `${imageRepo(baseTag)}@${digest}`;
		} catch (err) {
			log(
				`::warning::could not resolve candidate digest (${err instanceof Error ? err.message : String(err)}); recording the tag instead.`,
			);
		}
	}

	const metadata = {
		mode,
		base: baseTag,
		digest,
		digestRef,
		// The registry-served variant candidates this run staged (both modes push them).
		variantCandidates: PUBLISHED_VARIANTS.map((entry) => entry.candidate),
		version: config.toolchainVersion,
		buildRef: process.env.GITHUB_SHA ?? null,
	};
	// Optional first positional (flags filtered out).
	const metaPath = process.argv.slice(2).find((a) => !a.startsWith("-"));
	if (metaPath) await Bun.write(metaPath, `${JSON.stringify(metadata, null, 2)}\n`);

	log(`<<< ${mode} build complete: ${digestRef}`);
	// Straight to $GITHUB_OUTPUT (not stdout) — build.sh's inherited stdout must not reach the outputs.
	emitStepOutputs([`digest=${digest}`, `candidate-digest-ref=${digestRef}`].join("\n"));
}
