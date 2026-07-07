// Golden byte-match gate (design §3.7): for every committed recorded `composite.xml` fixture, assert
// each `<Result>` resolves to a Catalog Metric via `ptsResultToMetric` — i.e. the synthesized
// `pts.description` byte-matches the runtime `<Description>` (separators, spacing, `" - "` joins). This
// is the highest-risk correctness item: a one-character drift (c-ray's "Resolution: 1080p - Rays Per
// Pixel: 16" is the canonical break point) silently routes a result to `uncatalogued` instead of
// ranking it. Recorded composites are REAL PTS output, never hand-written — they prove the byte-match
// against reality, so dropping a new suite's recorded composite here automatically extends the gate.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isPtsResultFile } from "@sandbox-benchmarks/schema";
import { parsePtsComposite, ptsResultToMetric } from "./pts.ts";

const FIXTURES_DIR = join(import.meta.dir, "__fixtures__");

/**
 * Every recorded composite under `__fixtures__`, recursively. Scoped to the SAME `pts_*.xml` naming
 * contract the production extractor routes through ({@link isPtsResultFile}, raw-files.ts) — not a
 * looser `.endsWith(".xml")` — so the gate validates exactly the files the real reader parses, and an
 * unrelated `.xml` (or an inline non-composite fixture) can't drag the gate red.
 */
function recordedCompositesUnder(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) return recordedCompositesUnder(full);
		return isPtsResultFile(entry.name) ? [full] : [];
	});
}

/**
 * Discover fixtures at collection time. A missing/renamed `__fixtures__` ROOT must surface as the
 * clean "discovers at least one fixture" assertion below — NOT an opaque ENOENT thrown during module
 * import that takes down every co-located suite in this file.
 */
function discoverComposites(): [string, string][] {
	let paths: string[];
	try {
		paths = recordedCompositesUnder(FIXTURES_DIR);
	} catch (err) {
		// Tolerate ONLY a missing fixtures root. An ENOENT whose path is a sub-directory means one
		// vanished mid-walk — a real partial-read error to surface, not mask as "no fixtures". Typed
		// structurally (not NodeJS.ErrnoException) since this is a Bun-runtime package with no @types/node.
		const e = err as { code?: string; path?: string };
		if (e.code === "ENOENT" && e.path === FIXTURES_DIR) return [];
		throw err;
	}
	return paths.map((path) => [path.slice(FIXTURES_DIR.length + 1), readFileSync(path, "utf8")]);
}

const composites = discoverComposites();

/**
 * Tasks deliberately removed from a profile AFTER its composite was recorded. Recorded fixtures are
 * never hand-edited (they prove the byte-match against real PTS output), so a dropped task's
 * `<Result>` now legitimately routes to `uncatalogued`. Every entry documents a deliberate drop;
 * anything not listed here must still resolve.
 */
const DROPPED_RESULTS = new Set([
	// better-auth's `test` needs docker-compose DB services (postgres, mongodb) no provider sandbox
	// provides -- removed from the profile in the ENG-136 review; the fixture predates the drop.
	'local/realworld-better-auth | "Task: Test"',
]);

describe("golden composite byte-match (design §3.7)", () => {
	it("discovers at least one recorded composite fixture", () => {
		// A zero-fixture run would make every per-fixture assertion below vacuously pass — fail loudly
		// instead, so a moved/renamed __fixtures__ dir can't silently disable the whole gate.
		expect(composites.length).toBeGreaterThan(0);
	});

	for (const [name, xml] of composites) {
		it(`every <Result> in ${name} resolves to a catalogued Metric`, () => {
			const results = parsePtsComposite(xml).PhoronixTestSuite.Result;
			expect(results.length).toBeGreaterThan(0);
			// Surface the offending test+description (not just a count) so a byte-mismatch points straight
			// at the synthesized id that drifted from the recorded <Description>.
			const uncatalogued = results.flatMap((result) => {
				const mapping = ptsResultToMetric(result);
				return mapping.kind === "uncatalogued"
					? [`${mapping.test} | "${mapping.description}"`]
					: [];
			});
			expect(uncatalogued.filter((id) => !DROPPED_RESULTS.has(id))).toEqual([]);
		});
	}
});
