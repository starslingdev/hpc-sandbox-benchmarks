#!/usr/bin/env bun
// `build-candidate` — the BUILD phase of the toolchain release: build the base image (+ variants) and
// push the mutable candidate base to GHCR ONCE, then resolve and record its immutable digest. Split
// from the provider bake so the image is built a single time here and every provider cell fans out
// from the already-pushed candidate ref (build once, fan out). The local iteration loop still uses
// `bake --build-push` (which build-pushes AND bakes in one process); CI splits the two.
//
// Emits, in one invocation:
//   • the `key=value` step outputs (candidate digest + digest-pinned ref) straight to $GITHUB_OUTPUT
//     via emitStepOutputs — NOT to stdout: build.sh runs with inherited stdout, so a
//     `bun … >> "$GITHUB_OUTPUT"` redirect would splice build.sh's progress into the outputs file and
//     GitHub would reject it. stdout is left to carry the (inherited) build log, and
//   • argv[1] (optional): a build-metadata.json diagnostic artifact with the same facts.
import { config } from "@sandbox-benchmarks/providers";
import { buildAndPushCandidate, imageRepo, resolveImageDigest } from "../lib/bake/image.ts";
import type { Log } from "../lib/bake/types.ts";
import { emitStepOutputs } from "../lib/gha-output.ts";

if (import.meta.main) {
	const log: Log = (m) => console.error(m);

	// A failed build/push is the phase failing: report it as one line on stderr (where the job summary
	// and the run log read it) and exit non-zero, rather than letting an unhandled rejection print a
	// stack trace. Mirrors the `--build-push` path in bake.ts.
	try {
		await buildAndPushCandidate(log);
	} catch (err) {
		log(`<<< build/push failed — ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}

	// The digest is recorded provenance, not a release gate (promote re-validates the mutable tag), so a
	// registry-inspect quirk must not block a candidate that pushed fine: fall back to the tag on failure.
	const repo = imageRepo(config.toolchainImageCandidate);
	let digest = "unknown";
	let digestRef: string = config.toolchainImageCandidate;
	try {
		digest = await resolveImageDigest(config.toolchainImageCandidate);
		digestRef = `${repo}@${digest}`;
	} catch (err) {
		log(
			`::warning::could not resolve candidate digest (${err instanceof Error ? err.message : String(err)}); recording the tag instead.`,
		);
	}

	const metadata = {
		candidate: config.toolchainImageCandidate,
		digest,
		digestRef,
		version: config.toolchainVersion,
		buildRef: process.env.GITHUB_SHA ?? null,
	};
	// Optional first positional (flags filtered out).
	const metaPath = process.argv.slice(2).find((a) => !a.startsWith("-"));
	if (metaPath) await Bun.write(metaPath, `${JSON.stringify(metadata, null, 2)}\n`);

	log(`<<< candidate pushed: ${digestRef}`);
	// Straight to $GITHUB_OUTPUT (not stdout) — build.sh's inherited stdout must not reach the outputs.
	emitStepOutputs([`digest=${digest}`, `candidate-digest-ref=${digestRef}`].join("\n"));
}
