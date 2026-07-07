import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { extractProviderDir } from "./extract.ts";

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
});
