#!/usr/bin/env bun
// `build-candidate` — the BUILD phase of the toolchain release: build the base image (+ variants) and
// push the mutable candidate base to GHCR ONCE, then resolve and record its immutable digest. Split
// from the provider bake so the image is built a single time here and every provider cell fans out
// from the already-pushed candidate ref (build once, fan out). The local iteration loop still uses
// `bake --build-push` (which build-pushes AND bakes in one process); CI splits the two.
//
// This script has ONE mode: it always rebuilds the base. The `build` dispatch input's other value,
// `skip`, is resolved a phase earlier by the plan skipping this job outright, so it never reaches
// here — a scoped backfill derives its artifacts from the already-published base and needs no build.
//
// Emits, in one invocation:
//   • the `key=value` step outputs (base digest + digest-pinned ref) straight to $GITHUB_OUTPUT
//     via emitStepOutputs — NOT to stdout: build.sh runs with inherited stdout, so a
//     `bun … >> "$GITHUB_OUTPUT"` redirect would splice build.sh's progress into the outputs file and
//     GitHub would reject it. stdout is left to carry the (inherited) build log, and
//   • argv[1] (optional): a build-metadata.json diagnostic artifact with the same facts.
import { config } from "@sandbox-benchmarks/providers";
import type { StagedCandidates } from "../lib/bake/image.ts";
import { buildAndPushCandidate, imageDigest } from "../lib/bake/image.ts";
import type { Log } from "../lib/bake/types.ts";
import { emitStepOutputs } from "../lib/gha-output.ts";

if (import.meta.main) {
	const log: Log = (m) => console.error(m);

	// A failed build/push is the phase failing: report it as one line on stderr (where the job summary
	// and the run log read it) and exit non-zero, rather than letting an unhandled rejection print a
	// stack trace. Mirrors the `--build-push` path in bake.ts.
	let staged: StagedCandidates;
	try {
		staged = await buildAndPushCandidate(log);
	} catch (err) {
		log(`<<< build/push failed — ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}

	const metadata = {
		/** The digest-pinned candidate base this phase pushed, which every downstream phase pins. */
		base: staged.base,
		version: config.toolchainVersion,
		buildRef: process.env.GITHUB_SHA ?? null,
	};
	// Optional first positional (flags filtered out).
	const metaPath = process.argv.slice(2).find((a) => !a.startsWith("-"));
	if (metaPath) await Bun.write(metaPath, `${JSON.stringify(metadata, null, 2)}\n`);

	log(`<<< build complete: ${staged.base}`);
	// Straight to $GITHUB_OUTPUT (not stdout) — build.sh's inherited stdout must not reach the outputs.
	// One ref, because this phase stages exactly one thing: the candidate base, which is also the base
	// every downstream phase pins. (These were two outputs while a `variants` build could stage
	// per-provider images on top of an untouched base; nothing stages per-provider images any more.)
	emitStepOutputs(
		[`digest=${imageDigest(staged.base)}`, `base-digest-ref=${staged.base}`].join("\n"),
	);
}
