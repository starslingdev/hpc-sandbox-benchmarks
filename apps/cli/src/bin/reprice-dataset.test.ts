import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregate, ECONOMICS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import { repriceDataset } from "./reprice-dataset.ts";

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function dataset(path = "runs/run-1.json") {
	const root = mkdtempSync(join(tmpdir(), "reprice-dataset-"));
	roots.push(root);
	mkdirSync(join(root, "runs"));
	const index = {
		schemaVersion: "1",
		runs: [{ runId: "run-1", generatedAt: "2026-08-01T00:00:00.000Z", path }],
	};
	const run = {
		schemaVersion: "4",
		runId: "run-1",
		sha: "abc",
		generatedAt: "2026-08-01T00:00:00.000Z",
		targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		providers: [
			{
				providerId: "daytona-vm",
				validationStatus: "validated",
				observedSpecs: {},
				metrics: [
					{ metricId: "node_web_tooling_runs_per_s", samples: [10], aggregates: aggregate([10]) },
					{
						metricId: ECONOMICS_METRIC_IDS.usdPerHour,
						samples: [999],
						aggregates: aggregate([999]),
						derived: true,
					},
				],
				suitesCovered: ["cpu-node"],
				gaps: [],
				uncatalogued: [],
			},
		],
	};
	writeFileSync(join(root, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
	writeFileSync(join(root, "runs", "run-1.json"), `${JSON.stringify(run, null, 2)}\n`);
	return root;
}

describe("reprice-dataset", () => {
	it("uses per-file atomic replacement, leaves index bytes unchanged, and is idempotent", () => {
		const root = dataset();
		const indexBefore = readFileSync(join(root, "index.json"));
		repriceDataset(root);
		const first = readFileSync(join(root, "runs", "run-1.json"), "utf8");
		const parsed = JSON.parse(first);
		expect(
			parsed.providers[0].metrics.find(
				(metric: { metricId: string }) => metric.metricId === ECONOMICS_METRIC_IDS.usdPerHour,
			).samples,
		).toEqual([0.3312]);
		expect(readFileSync(join(root, "index.json"))).toEqual(indexBefore);
		repriceDataset(root);
		expect(readFileSync(join(root, "runs", "run-1.json"), "utf8")).toBe(first);
	});

	it("rejects malformed indexes and Runs before writing", () => {
		const root = dataset();
		writeFileSync(join(root, "index.json"), "{}\n");
		expect(() => repriceDataset(root)).toThrow(/invalid RunIndex/);
		const other = dataset();
		const firstPath = join(other, "runs", "run-1.json");
		const firstBefore = readFileSync(firstPath);
		const indexPath = join(other, "index.json");
		const index = JSON.parse(readFileSync(indexPath, "utf8"));
		index.runs.push({
			runId: "run-2",
			generatedAt: "2026-07-01T00:00:00.000Z",
			path: "runs/run-2.json",
		});
		writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
		writeFileSync(join(other, "runs", "run-2.json"), "{}\n");
		expect(() => repriceDataset(other)).toThrow(/invalid Run/);
		expect(readFileSync(firstPath)).toEqual(firstBefore);
	});

	it("enforces canonical indexed paths", () => {
		const root = dataset("runs/../runs/run-1.json");
		expect(() => repriceDataset(root)).toThrow(/invalid RunIndex/);
	});

	it("rejects traversal in a Run id at the schema boundary", () => {
		const root = dataset();
		const indexPath = join(root, "index.json");
		const index = JSON.parse(readFileSync(indexPath, "utf8"));
		index.runs[0].runId = "../../outside";
		index.runs[0].path = "runs/../../outside.json";
		writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

		expect(() => repriceDataset(root)).toThrow(/invalid RunIndex/);
	});

	it("rejects a pre-existing symlinked runs directory without modifying external files", () => {
		const root = dataset();
		const external = mkdtempSync(join(tmpdir(), "reprice-external-runs-"));
		roots.push(external);
		const externalRun = join(external, "run-1.json");
		writeFileSync(externalRun, readFileSync(join(root, "runs", "run-1.json")));
		const before = readFileSync(externalRun);
		rmSync(join(root, "runs"), { recursive: true });
		symlinkSync(external, join(root, "runs"), "dir");

		expect(() => repriceDataset(root)).toThrow(/runs directory must not be a symlink/);
		expect(readFileSync(externalRun)).toEqual(before);
	});

	it("rejects a pre-existing symlinked Run document without modifying its external target", () => {
		const root = dataset();
		const external = mkdtempSync(join(tmpdir(), "reprice-external-file-"));
		roots.push(external);
		const externalRun = join(external, "run-1.json");
		const runPath = join(root, "runs", "run-1.json");
		writeFileSync(externalRun, readFileSync(runPath));
		const before = readFileSync(externalRun);
		rmSync(runPath);
		symlinkSync(externalRun, runPath, "file");

		expect(() => repriceDataset(root)).toThrow(/Run document must not be a symlink/);
		expect(readFileSync(externalRun)).toEqual(before);
	});
});
