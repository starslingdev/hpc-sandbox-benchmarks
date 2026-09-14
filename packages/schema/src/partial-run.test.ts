import { expect, test } from "bun:test";
import { parseRun } from "./run.ts";

function partialRun() {
	return {
		schemaVersion: "8",
		runId: "partial-run",
		sha: "a".repeat(40),
		generatedAt: "2026-09-13T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [],
		experiment: {
			planDigest: `sha256:${"a".repeat(64)}`,
			attemptIds: ["attempt-1"],
			partial: {
				status: "partial",
				planned: 1,
				complete: 0,
				incomplete: 1,
				excluded: 0,
				cells: [
					{
						id: "cell-1",
						provider: "e2b",
						suite: "cpu-node",
						replicate: 0,
						attemptId: "attempt-1",
						status: "failed",
						plannedMetrics: ["node_web_tooling_runs_per_s"],
						passes: 2,
						missingMetrics: ["node_web_tooling_runs_per_s"],
						excludedMetrics: [],
						retainedMetrics: [] as string[],
					},
				],
			},
		},
	};
}

test("v8 requires an explicit partial label and internally consistent coverage", () => {
	expect(parseRun(partialRun()).experiment?.partial?.status).toBe("partial");
	for (const change of [
		(run: ReturnType<typeof partialRun>) => {
			run.schemaVersion = "7";
		},
		(run: ReturnType<typeof partialRun>) => {
			Reflect.deleteProperty(run.experiment, "partial");
		},
		(run: ReturnType<typeof partialRun>) => {
			run.experiment.partial.planned = 2;
		},
		(run: ReturnType<typeof partialRun>) => {
			run.experiment.partial.complete = 1;
		},
		(run: ReturnType<typeof partialRun>) => {
			const cell = run.experiment.partial.cells[0];
			if (!cell) throw new Error("fixture missing cell");
			run.experiment.partial.cells.push({ ...cell });
		},
		(run: ReturnType<typeof partialRun>) => {
			run.experiment.attemptIds = ["other"];
		},
		(run: ReturnType<typeof partialRun>) => {
			const cell = run.experiment.partial.cells[0];
			if (!cell) throw new Error("fixture missing cell");
			cell.retainedMetrics = ["node_web_tooling_runs_per_s"];
		},
	]) {
		const run = partialRun();
		change(run);
		expect(() => parseRun(run)).toThrow();
	}
});
