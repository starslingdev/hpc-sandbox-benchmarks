#!/usr/bin/env bun
// `build-candidate` — the BUILD phase of the toolchain release: build the base image (+ variants) and
// push the mutable candidate base to GHCR ONCE, then resolve and record its immutable digest. Split
// from the provider bake so the image is built a single time here and every provider cell fans out
// from the already-pushed candidate ref (build once, fan out). The local iteration loop still uses
// `bake --build-push` (which build-pushes AND bakes in one process); CI splits the two.
//
// Emits, in one invocation:
//   • stdout: `key=value` lines for `>> "$GITHUB_OUTPUT"` (the candidate digest + digest-pinned ref), and
//   • argv[2] (optional): a build-metadata.json diagnostic artifact with the same facts.
import { config } from "@sandbox-benchmarks/providers";
import { buildAndPushCandidate, resolveImageDigest } from "../lib/bake/image.ts";
import type { Log } from "../lib/bake/types.ts";

if (import.meta.main) {
	const log: Log = (m) => console.error(m);

	await buildAndPushCandidate(log);

	// The digest is recorded provenance, not a release gate (promote re-validates the mutable tag), so a
	// registry-inspect quirk must not block a candidate that pushed fine: fall back to the tag on failure.
	const repo = config.toolchainImageCandidate.split(":")[0] ?? config.toolchainImageCandidate;
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
	// stdout is the $GITHUB_OUTPUT contract — `key=value` lines only.
	console.log(`digest=${digest}`);
	console.log(`candidate-digest-ref=${digestRef}`);
}
