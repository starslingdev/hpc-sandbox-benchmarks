import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractProviderDir } from "./extract.ts";
import { parsePtsComposite, ptsResultToMetric } from "./pts.ts";

const daytonaDir = join(import.meta.dir, "__fixtures__/daytona-vm");

describe("extractProviderDir", () => {
	const extraction = extractProviderDir(daytonaDir, "daytona-vm");

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
		expect(extraction.gaps).toEqual([
			{
				scope: "suite",
				id: "pts_git",
				outcome: "skipped",
				reason: "phoronix-test-suite not installed",
			},
		]);
	});

	it("finds no uncatalogued stragglers in this directory", () => {
		expect(extraction.uncatalogued).toEqual([]);
	});

	it("records no attempted-empty evidence when every Result carried a value", () => {
		expect(extraction.attemptedEmpty).toEqual([]);
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

	it("survives the real fio all-failed bytes: no throw, no results, one recorded failed gap", () => {
		// The exact shape that crashed disk/modal-gvisor in run 29799034615: a composite whose ONE
		// Result carries empty <Scale>/<Proportion>/<Value> plus the bench.sh fail_result marker the
		// producer now writes beside it. The composite must parse (schema tolerance), the empty Result
		// must be dropped (never a 0-valued straggler), and the marker must surface as a failed gap.
		// NOTE: the gap id is the LEAF name at this layer — normalize-tree folds it into the suite.
		// attemptedEmpty stays empty: the all-failed fio Result has an empty <Scale>, so it cannot match
		// the scale-pinned fio catalog entries (uncatalogued empty Results record no evidence).
		const dir = join(import.meta.dir, "__fixtures__/fio-all-failed");
		const extraction = extractProviderDir(dir, "modal-gvisor");
		expect(extraction.contributions).toEqual([]);
		expect(extraction.uncatalogued).toEqual([]);
		expect(extraction.attemptedEmpty).toEqual([]);
		expect(extraction.gaps).toEqual([
			{
				scope: "suite",
				id: "pts_fio-rand-read",
				outcome: "failed",
				reason:
					"PTS batch-run of pts/fio-2.1.0 completed but every trial errored (composite carries no values)",
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
		// The fixture predates the deliberate drop of better-auth's `test` task (needs docker-compose
		// DB services no sandbox provides); its measured <Result> now routes to `uncatalogued` -- the
		// designed straggler path, pinned here so an ACCIDENTAL catalog miss can't hide behind it.
		expect(extraction.uncatalogued.map((u) => u.id)).toEqual([
			"local/realworld-better-auth::Task: Test::Seconds",
		]);
		expect(extraction.contributions.map((c) => c.metricId).sort()).toEqual(
			[
				"realworld_better_auth_task_git_clone",
				"realworld_better_auth_task_cold_install",
				"realworld_better_auth_task_build",
			].sort(),
		);
		for (const contribution of extraction.contributions) {
			expect(contribution.appVersion).toBe("6f3ba45639579da152b69e8e5342e02f28288670");
			expect(contribution.samples.length).toBeGreaterThan(0);
			for (const sample of contribution.samples) expect(sample).toBeGreaterThan(0);
		}
	});

	describe("attempted-empty evidence (the suite-shortfall input)", () => {
		let dir: string;
		beforeEach(() => {
			dir = mkdtempSync(join(tmpdir(), "extract-empty-"));
		});
		afterEach(() => {
			rmSync(dir, { recursive: true, force: true });
		});

		const result = (identifier: string, scale: string, value: string): string => `  <Result>
    <Identifier>${identifier}</Identifier><Title>T</Title>
    <Scale>${scale}</Scale><Proportion>LIB</Proportion>
    <Data><Entry><Value>${value}</Value></Entry></Data>
  </Result>`;
		const composite = (...results: string[]): string =>
			`<?xml version="1.0"?>\n<PhoronixTestSuite>\n${results.join("\n")}\n</PhoronixTestSuite>`;

		it("records a CATALOGUED empty Result as attempted-empty, with no contribution or straggler", () => {
			writeFileSync(
				join(dir, "pts_pybench.xml"),
				composite(result("pts/pybench-1.1.3", "Milliseconds", "")),
			);
			const extraction = extractProviderDir(dir, "e2b");
			expect(extraction.contributions).toEqual([]);
			expect(extraction.uncatalogued).toEqual([]);
			expect(extraction.attemptedEmpty).toEqual([
				{ metricId: "pybench_milliseconds", sourceFile: "pts_pybench.xml" },
			]);
		});

		it("records NOTHING for an uncatalogued empty Result (only declared ids join the diff)", () => {
			writeFileSync(
				join(dir, "pts_mystery.xml"),
				composite(result("pts/not-in-catalog-1.0.0", "Seconds", "")),
			);
			const extraction = extractProviderDir(dir, "e2b");
			expect(extraction.attemptedEmpty).toEqual([]);
			expect(extraction.uncatalogued).toEqual([]);
		});

		it("splits a mixed composite: the valued Result contributes, the empty one is evidence", () => {
			// The realworld shape: individual failed CI tasks post empty <Value> beside successful ones.
			writeFileSync(
				join(dir, "pts_mixed.xml"),
				composite(
					result("pts/pybench-1.1.3", "Milliseconds", ""),
					result("pts/sqlite-speedtest-1.0.1", "Seconds", "45.1"),
				),
			);
			const extraction = extractProviderDir(dir, "e2b");
			expect(extraction.contributions.map((c) => c.metricId)).toEqual(["sqlite_speedtest_seconds"]);
			expect(extraction.attemptedEmpty).toEqual([
				{ metricId: "pybench_milliseconds", sourceFile: "pts_mixed.xml" },
			]);
		});

		it("does not treat an empty leading Entry as attempted-empty when a later Entry has a value", () => {
			writeFileSync(
				join(dir, "pts_pybench.xml"),
				`<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>pts/pybench-1.1.3</Identifier><Title>T</Title>
    <Scale>Milliseconds</Scale><Proportion>LIB</Proportion>
    <Data>
      <Entry><Value></Value></Entry>
      <Entry><Value>475</Value><RawString>474:476</RawString></Entry>
    </Data>
  </Result>
</PhoronixTestSuite>`,
			);
			const extraction = extractProviderDir(dir, "e2b");
			expect(extraction.contributions).toEqual([
				{
					metricId: "pybench_milliseconds",
					samples: [474, 476],
					sourceFile: "pts_pybench.xml",
				},
			]);
			expect(extraction.attemptedEmpty).toEqual([]);
		});

		it("keeps duplicate cross-file observations isolated by their containing-file provenance", () => {
			// PTS TEST_RESULTS_NAME reuse can copy a stale Result into another composite. The extractor
			// records what each file contains; the normalizer reconciles the duplicate by metricId.
			writeFileSync(
				join(dir, "pts_a-empty.xml"),
				composite(result("pts/pybench-1.1.3", "Milliseconds", "")),
			);
			writeFileSync(
				join(dir, "pts_z-contaminated.xml"),
				composite(result("pts/pybench-1.1.3", "Milliseconds", "475")),
			);

			const extraction = extractProviderDir(dir, "e2b");
			expect(extraction.contributions).toEqual([
				{
					metricId: "pybench_milliseconds",
					samples: [475],
					sourceFile: "pts_z-contaminated.xml",
				},
			]);
			expect(extraction.attemptedEmpty).toEqual([
				{ metricId: "pybench_milliseconds", sourceFile: "pts_a-empty.xml" },
			]);
		});
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
		const kinds = results.map((r) => [r.Description, ptsResultToMetric(r).kind]);
		// 10 of 11 map; the dropped `test` task is the one expected uncatalogued straggler.
		expect(kinds.filter(([, kind]) => kind !== "matched")).toEqual([
			["Task: Test", "uncatalogued"],
		]);
	});
});
