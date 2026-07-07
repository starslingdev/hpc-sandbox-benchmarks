import { describe, expect, test } from "bun:test";
import { type } from "arktype";
import { metricDefSchema } from "../../src/metrics.ts";
import {
	dimensionForTestType,
	generateCatalog,
	generateProfile,
	slug,
	versionless,
} from "./generate.ts";
import type { PtsProfile } from "./parse.ts";
import { parseProfile } from "./parse.ts";

const PROFILES = `${import.meta.dir}/../../src/pts-profiles`;

async function load(dir: string, repo = "pts"): Promise<PtsProfile> {
	// Repo-local profiles (repo !== "pts") are vendored one level deeper, under pts-profiles/<repo>/.
	const base = repo === "pts" ? `${PROFILES}/${dir}` : `${PROFILES}/${repo}/${dir}`;
	return parseProfile(
		repo,
		dir,
		await Bun.file(`${base}/test-definition.xml`).text(),
		await Bun.file(`${base}/results-definition.xml`).text(),
	);
}

describe("slug / versionless", () => {
	test("versionless strips the trailing version", () => {
		expect(versionless("node-web-tooling-1.0.1")).toBe("node-web-tooling");
		expect(versionless("c-ray-2.0.0")).toBe("c-ray");
	});

	test("slug maps `/` to `_per_` and collapses other runs", () => {
		expect(slug("runs/s")).toBe("runs_per_s");
		expect(slug("Resolution: 1080p - Rays Per Pixel: 16")).toBe(
			"resolution_1080p_rays_per_pixel_16",
		);
	});
});

describe("dimensionForTestType", () => {
	test("maps known PTS test types", () => {
		expect(dimensionForTestType("Processor")).toBe("cpu");
		expect(dimensionForTestType("Disk")).toBe("disk");
	});

	test("throws on an unmapped or absent type", () => {
		expect(() => dimensionForTestType("Graphics")).toThrow(/no dimension mapping/);
		expect(() => dimensionForTestType(undefined)).toThrow(/no dimension mapping/);
	});
});

describe("generateProfile", () => {
	test("single-metric profile -> one schema-valid wildcard MetricDef", async () => {
		const defs = generateProfile(await load("node-web-tooling-1.0.1"));
		expect(defs).toHaveLength(1);
		const def = defs[0];
		if (!def) throw new Error("expected one generated metric");
		expect(metricDefSchema(def) instanceof type.errors).toBe(false); // shape-valid
		expect(def).toMatchObject({
			id: "node_web_tooling_runs_per_s",
			dimension: "cpu",
			unit: "runs/s",
			direction: "HIB",
			headline: false,
			label: "Node.js V8 Web Tooling Benchmark",
			pts: { test: "pts/node-web-tooling" },
			sourceUrl: "https://v8.github.io/web-tooling-benchmark/",
		});
		expect(def.pts?.description).toBeUndefined(); // the legal description-less wildcard
	});

	test("every emitted pts.test carries the source repo segment as its prefix", async () => {
		for (const dir of ["node-web-tooling-1.0.1", "c-ray-2.0.0"]) {
			for (const def of generateProfile(await load(dir))) {
				expect(def.pts?.test.startsWith("pts/")).toBe(true);
			}
		}
	});

	test("a repo-local profile keeps its `local/` prefix (not hardcoded `pts/`)", async () => {
		// hardlink reports `local/hardlink-1.0.0` at runtime; a `pts/`-only prefix would route it to
		// uncatalogued. The generator must mirror the source segment.
		const defs = generateProfile(await load("hardlink-1.0.0", "local"));
		expect(defs).toHaveLength(1);
		expect(defs[0]?.pts).toEqual({ test: "local/hardlink" });
		expect(defs[0]?.dimension).toBe("disk");
	});

	test("direction mirrors <Proportion>; unit mirrors <ResultScale>", async () => {
		const cray = generateProfile(await load("c-ray-2.0.0"))[0];
		if (!cray) throw new Error("expected a generated metric");
		expect(cray.direction).toBe("LIB");
		expect(cray.unit).toBe("Seconds");
	});

	test("throws when <Proportion> is missing", () => {
		const noProportion: PtsProfile = {
			repo: "pts",
			dir: "x-1.0.0",
			info: { Title: "X", Description: "d", ResultScale: "ms" },
			profile: { TestType: "Processor" },
			settings: [],
			parsers: [],
		};
		expect(() => generateProfile(noProportion)).toThrow(/<Proportion>/);
	});
});

describe("generateCatalog", () => {
	test("is deterministic regardless of profile order (stable id sort)", async () => {
		const nwt = await load("node-web-tooling-1.0.1");
		const cray = await load("c-ray-2.0.0");
		const forward = generateCatalog([nwt, cray]).map((d) => d.id);
		const reversed = generateCatalog([cray, nwt]).map((d) => d.id);
		expect(reversed).toEqual(forward); // order-independent
		expect(forward).toEqual([...forward].sort()); // and sorted by id
	});

	test("throws on duplicate metric ids across profiles", async () => {
		const nwt = await load("node-web-tooling-1.0.1");
		// The same profile twice collides on every id — a stand-in for two profiles normalizing equal.
		expect(() => generateCatalog([nwt, nwt])).toThrow(/duplicate metric ids across profiles/);
	});
});
