import { expect, test } from "bun:test";
import type { CoverageReport } from "./experiment.ts";
import { describeCoverageShortfall } from "./experiment.ts";

function report(overrides: Partial<CoverageReport> = {}): CoverageReport {
	return {
		planDigest: "d".repeat(64),
		complete: false,
		selectedAttempts: [],
		cells: [],
		conflicts: [],
		...overrides,
	};
}

function cell(
	id: string,
	status: CoverageReport["cells"][number]["status"],
	missingMetrics: string[] = [],
): CoverageReport["cells"][number] {
	return { id, status, missingMetrics, excludedMetrics: [] };
}

test("tallies every status and names the metrics a failed cell was short", () => {
	const lines = describeCoverageShortfall(
		report({
			cells: [
				cell("runcloud-cpu-node-r0", "failed", ["node_web_tooling_runs_per_s"]),
				cell("e2b-memory-r0", "complete"),
			],
		}),
	);
	expect(lines[0]).toBe("coverage: complete=1 failed=1");
	expect(lines).toContain("failed: runcloud-cpu-node-r0 missing=node_web_tooling_runs_per_s");
});

test("reports failed cells ahead of missing ones so a skipped wave cannot bury them", () => {
	const lines = describeCoverageShortfall(
		report({
			cells: [cell("z-realworld-mastra-r0", "missing"), cell("a-cpu-node-r0", "failed", ["m"])],
		}),
	);
	expect(lines.slice(1)).toEqual([
		"failed: a-cpu-node-r0 missing=m",
		"missing: z-realworld-mastra-r0",
	]);
});

test("omits the metric list for a never-attempted cell, which is missing all of them", () => {
	const lines = describeCoverageShortfall(
		report({ cells: [cell("blaxel-realworld-mastra-r0", "missing", ["a", "b", "c"])] }),
	);
	expect(lines.slice(1)).toEqual(["missing: blaxel-realworld-mastra-r0"]);
});

test("tallies the remainder past the limit instead of flooding the log", () => {
	const lines = describeCoverageShortfall(
		report({ cells: Array.from({ length: 30 }, (_, i) => cell(`c-${i}`, "missing")) }),
		5,
	);
	expect(lines).toHaveLength(7);
	expect(lines.at(-1)).toBe("… and 25 more incomplete cell(s)");
});

test("surfaces conflicts, which fail a batch even when no cell is short", () => {
	const lines = describeCoverageShortfall(
		report({ cells: [cell("e2b-memory-r0", "complete")], conflicts: ["duplicate attempt"] }),
	);
	expect(lines).toEqual(["coverage: complete=1", "conflict: duplicate attempt"]);
});

test("excluded cells are tallied but never reported as a shortfall", () => {
	const lines = describeCoverageShortfall(report({ cells: [cell("e2b-memory-r0", "excluded")] }));
	expect(lines).toEqual(["coverage: excluded=1"]);
});
