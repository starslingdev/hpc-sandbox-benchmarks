// Drift gate: every VERSION-PINNED PTS profile the repo names must have its definitions vendored
// under packages/schema/src/pts-profiles/ — "the vendored file IS the version pin"
// (packages/schema/scripts/fetch-profiles.ts). The pin is spelled in several places that only
// comments keep aligned: the producer leaves' `run_pts_benchmark "pts/<name>-<ver>"` calls (plus
// run_fio_pts in lib/bench.sh), and the toolchain bake's ptsInstallTests (packages/templates
// pins.ts, which 20-pts.sh also derives its download-cache list from). A version bump that misses a
// copy is silent in CI and expensive live: the sandbox batch-installs a profile the image didn't
// bake (pgbench = a full postgres source build per cell), or runs a profile version whose option
// matrix the catalog never vendored — every result quietly lands as `uncatalogued`.
//
// Like the workflow-sync gate, this reads the files as text: the bash tasks aren't importable, and
// parsing pins.ts as a module would drag a workspace dependency into repo-checks for one string.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();

/** The vendored `<name>-<ver>` profile dirs (upstream `pts/` ones live flat; `local/` are nested). */
function vendoredProfiles(): Set<string> {
	const base = join(root, "packages/schema/src/pts-profiles");
	return new Set(
		readdirSync(base, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && entry.name !== "local")
			.map((entry) => entry.name),
	);
}

/** Every version-pinned `pts/<name>-<ver>` identifier a producer file references. */
function pinnedReferences(text: string): string[] {
	return [...text.matchAll(/pts\/([a-z0-9-]+-\d+(?:\.\d+)*)/g)].map((match) => match[1] as string);
}

/**
 * Every version-pinned profile lib/bench.sh or a producer task references. Every task file is
 * scanned, not just those calling a specific runner: pinned leaves go through
 * run_pinned_pts/run_fio_pts (never naming run_pts_benchmark outside prose), and a content filter
 * keyed on one helper's name would gate their pins only for as long as a comment happened to mention
 * it. pinnedReferences() already ignores pin-free files.
 */
function referencedProfiles(): Set<string> {
	const paths = [
		"lib/bench.sh",
		...readdirSync(join(root, ".mise/tasks/benchmark"), { recursive: true })
			.map((entry) => join(".mise/tasks/benchmark", entry.toString()))
			.filter((path) => {
				try {
					readFileSync(join(root, path), "utf8");
					return true;
				} catch {
					return false; // directories
				}
			}),
	];
	return new Set(paths.flatMap((path) => pinnedReferences(readFileSync(join(root, path), "utf8"))));
}

/** The whitespace-separated profiles the toolchain bake pre-installs (ptsInstallTests). */
function bakedTests(): Set<string> {
	const pins = readFileSync(join(root, "packages/templates/src/lib/pins.ts"), "utf8");
	const match = pins.match(/ptsInstallTests:\s*\n?\s*"([^"]+)"/);
	expect(match).not.toBeNull();
	return new Set((match?.[1] ?? "").split(/\s+/).filter(Boolean));
}

describe("PTS profile version pins", () => {
	const vendored = vendoredProfiles();

	it("vendors every version-pinned profile the producer tasks run", () => {
		const referenced = referencedProfiles();
		expect(referenced.size).toBeGreaterThan(0);
		for (const profile of referenced) {
			expect(vendored).toContain(profile);
		}
	});

	it("vendors every version-pinned profile the toolchain bake pre-installs", () => {
		const pinned = [...bakedTests()].filter((name) => /-\d+(\.\d+)*$/.test(name));
		expect(pinned.length).toBeGreaterThan(0);
		for (const profile of pinned) {
			expect(vendored).toContain(profile);
		}
	});

	it("bakes every version-pinned profile the producer tasks run", () => {
		// Bake<->leaf AGREEMENT, the direction neither check above covers. A leaf bumped to a version
		// the bake doesn't pre-install stays green under both vendoring checks, but the exact-dir
		// install probe then misses at runtime and the sandbox re-downloads and rebuilds the profile
		// (pgbench = a full postgres build) inside every cell's budget.
		const baked = bakedTests();
		for (const profile of referencedProfiles()) {
			expect(baked).toContain(profile);
		}
	});

	it("keeps the vendored profile dirs in sync with fetch-profiles' PROFILES", () => {
		// The reverse/orphan direction: a stale dir left behind after a bump keeps feeding the catalog
		// generator (which discovers every dir under pts-profiles/), and a dir dropped from PROFILES
		// silently stops being refreshed while still feeding it.
		const fetcher = readFileSync(join(root, "packages/schema/scripts/fetch-profiles.ts"), "utf8");
		const block = fetcher.match(/const PROFILES = \[([\s\S]*?)\n\] as const;/)?.[1] ?? "";
		const listed = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1] as string);
		expect(listed.length).toBeGreaterThan(0);
		expect(listed.slice().sort()).toEqual([...vendored].sort());
	});
});
