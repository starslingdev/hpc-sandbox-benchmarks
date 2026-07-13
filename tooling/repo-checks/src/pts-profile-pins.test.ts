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

describe("PTS profile version pins", () => {
	const vendored = vendoredProfiles();

	it("vendors every version-pinned profile the producer tasks run", () => {
		const producerFiles = [
			"lib/bench.sh",
			...readdirSync(join(root, ".mise/tasks/benchmark"), { recursive: true })
				.map((entry) => join(".mise/tasks/benchmark", entry.toString()))
				.filter((path) => {
					try {
						return readFileSync(join(root, path), "utf8").includes("run_pts_benchmark");
					} catch {
						return false; // directories
					}
				}),
		];
		const referenced = new Set(
			producerFiles.flatMap((path) => pinnedReferences(readFileSync(join(root, path), "utf8"))),
		);
		expect(referenced.size).toBeGreaterThan(0);
		for (const profile of referenced) {
			expect(vendored).toContain(profile);
		}
	});

	it("vendors every version-pinned profile the toolchain bake pre-installs", () => {
		// ptsInstallTests mixes versionless legacy names (their leaves are versionless too) with
		// version-pinned ones; only the pinned entries have an exact vendored dir to demand.
		const pins = readFileSync(join(root, "packages/templates/src/lib/pins.ts"), "utf8");
		const match = pins.match(/ptsInstallTests:\s*\n?\s*"([^"]+)"/);
		expect(match).not.toBeNull();
		const pinned = (match?.[1] ?? "").split(/\s+/).filter((name) => /-\d+(\.\d+)*$/.test(name));
		expect(pinned.length).toBeGreaterThan(0);
		for (const profile of pinned) {
			expect(vendored).toContain(profile);
		}
	});
});
