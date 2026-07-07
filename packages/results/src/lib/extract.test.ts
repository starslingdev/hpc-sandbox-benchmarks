import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractProviderDir } from "./extract.ts";
import { parsePtsComposite, ptsResultToMetric } from "./pts.ts";

const daytonaDir = join(import.meta.dir, "__fixtures__/daytona");

describe("extractProviderDir", () => {
	const extraction = extractProviderDir(daytonaDir, "daytona");

	it("contributes the catalogued node-web-tooling samples with provenance", () => {
		expect(extraction.contributions).toEqual([
			{
				metricId: "node_web_tooling_runs_per_s",
				samples: [16.19, 16.3, 16.08],
				sourceFile: "pts_node-web-tooling.xml",
			},
		]);
	});

	it("reads the bench.sh skip marker", () => {
		expect(extraction.skips).toEqual([
			{ suite: "pts_git", reason: "phoronix-test-suite not installed" },
		]);
	});

	it("finds no uncatalogued stragglers in this directory", () => {
		expect(extraction.uncatalogued).toEqual([]);
	});

	it("carries appVersion and arguments provenance when the <Result> populates them", () => {
		const dir = join(import.meta.dir, "__fixtures__/provenance");
		expect(extractProviderDir(dir, "daytona").contributions).toEqual([
			{
				metricId: "node_web_tooling_runs_per_s",
				samples: [16.19, 16.3, 16.08],
				sourceFile: "pts_node-web-tooling.xml",
				appVersion: "1.0.1",
				arguments: "Run: default",
			},
		]);
	});

	it("skips a Result whose every pass failed instead of throwing, keeping the successful one", () => {
		const dir = join(import.meta.dir, "__fixtures__/partial-failure");
		expect(extractProviderDir(dir, "daytona").contributions).toEqual([
			{
				metricId: "node_web_tooling_runs_per_s",
				samples: [20.5],
				sourceFile: "pts_node-web-tooling.xml",
				arguments: "ok",
			},
		]);
	});

	it("extracts every realworld task from a real end-to-end smoke composite.xml, none uncatalogued", () => {
		// Captured from a real Docker run of the actual install.sh + realworld-runner.sh + mise task
		// (packages/results/src/lib/__fixtures__/realworld-smoke/ -- see its header comment for
		// provenance); 7 of the 11 better-auth tasks were deliberately pointed at `false` to also
		// exercise the partial-failure path end to end against real PTS output.
		const dir = join(import.meta.dir, "__fixtures__/realworld-smoke");
		const extraction = extractProviderDir(dir, "daytona");
		expect(extraction.uncatalogued).toEqual([]);
		expect(extraction.contributions.map((c) => c.metricId).sort()).toEqual(
			[
				"realworld_better_auth_task_git_clone",
				"realworld_better_auth_task_cold_install",
				"realworld_better_auth_task_build",
				"realworld_better_auth_task_test",
			].sort(),
		);
		for (const contribution of extraction.contributions) {
			expect(contribution.appVersion).toBe("6f3ba45639579da152b69e8e5342e02f28288670");
			expect(contribution.samples.length).toBeGreaterThan(0);
			for (const sample of contribution.samples) expect(sample).toBeGreaterThan(0);
		}
	});

	it("maps every realworld <Result> onto the catalog, including the 7 all-passes-failed ones", () => {
		// extractProviderDir drops a valueless (all-passes-failed) <Result> before the catalog router,
		// so the extraction-level `uncatalogued: []` above can't vouch for the 7 deliberately-failed
		// tasks. Route every raw <Result> through ptsResultToMetric directly: a drifted <Description>
		// on ANY of the 11 must surface here, measured or not.
		const xml = readFileSync(
			join(import.meta.dir, "__fixtures__/realworld-smoke/pts_realworld-better-auth.xml"),
			"utf8",
		);
		const results = parsePtsComposite(xml).PhoronixTestSuite.Result;
		expect(results).toHaveLength(11);
		for (const result of results) {
			expect(ptsResultToMetric(result).kind).toBe("matched");
		}
	});
});
