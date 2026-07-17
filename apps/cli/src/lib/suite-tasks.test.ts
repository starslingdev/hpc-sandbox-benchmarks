import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";
import { suiteMetricSummaryRows, suiteTaskSummaryRows } from "./suite-summary.ts";
import {
	conventionalTaskFile,
	describeSuiteTasks,
	fioProfileFromBenchSh,
	miseTaskFromCommand,
	parseMiseTaskInfoJson,
	ptsPinsFromScript,
	realworldVersionFromBenchSh,
	runTaskChildren,
} from "./suite-tasks.ts";

// apps/cli/src/lib → repo root
const root = join(import.meta.dir, "../../../..");

describe("miseTaskFromCommand", () => {
	it("extracts the task name from a mise run command", () => {
		expect(miseTaskFromCommand("mise run benchmark:disk:all")).toBe("benchmark:disk:all");
		expect(miseTaskFromCommand("  mise run benchmark:cpu:node")).toBe("benchmark:cpu:node");
	});

	it("returns undefined for non-mise commands", () => {
		expect(miseTaskFromCommand("echo hi")).toBeUndefined();
	});
});

describe("conventionalTaskFile", () => {
	it("maps colon task names onto the .mise/tasks file layout", () => {
		expect(conventionalTaskFile("benchmark:disk:all")).toBe(".mise/tasks/benchmark/disk/all");
		expect(conventionalTaskFile("benchmark:pgbench:pts:pgbench")).toBe(
			".mise/tasks/benchmark/pgbench/pts/pgbench",
		);
	});
});

describe("runTaskChildren", () => {
	it("extracts ordered unique run_task children from an orchestrator", () => {
		const script = readFileSync(join(root, ".mise/tasks/benchmark/disk/all"), "utf8");
		expect(runTaskChildren(script)).toEqual([
			"benchmark:disk:pts:fio-seq-read",
			"benchmark:disk:pts:fio-seq-write",
			"benchmark:disk:pts:fio-rand-read",
			"benchmark:disk:pts:fio-rand-write",
			"benchmark:disk:pts:hardlink",
		]);
	});
});

describe("ptsPinsFromScript", () => {
	it("reads run_pts_benchmark pins", () => {
		const script = readFileSync(
			join(root, ".mise/tasks/benchmark/cpu/pts/node-web-tooling"),
			"utf8",
		);
		expect(ptsPinsFromScript(script)).toEqual([
			{
				ptsProfile: "pts/node-web-tooling-1.0.1",
				resultsPrefix: "pts_node-web-tooling",
			},
		]);
	});

	it("reads run_fio_pts prefixes and applies the fio profile pin", () => {
		const script = readFileSync(join(root, ".mise/tasks/benchmark/disk/pts/fio-seq-read"), "utf8");
		expect(ptsPinsFromScript(script, { fioProfile: "pts/fio-2.1.0" })).toEqual([
			{
				ptsProfile: "pts/fio-2.1.0",
				resultsPrefix: "pts_fio-seq-read",
			},
		]);
	});

	it("derives realworld local profile pins", () => {
		const script = readFileSync(join(root, ".mise/tasks/benchmark/realworld/pts/mastra"), "utf8");
		expect(ptsPinsFromScript(script)).toEqual([
			{
				ptsProfile: "local/realworld-mastra-1.0.0",
				resultsPrefix: "pts_realworld-mastra",
			},
		]);
	});

	it("collects every pin when a leaf runs multiple PTS scenarios", () => {
		const script = readFileSync(join(root, ".mise/tasks/benchmark/pgbench/pts/pgbench"), "utf8");
		expect(ptsPinsFromScript(script)).toEqual([
			{
				ptsProfile: "pts/pgbench-1.15.0",
				resultsPrefix: "pts_pgbench-read-only",
			},
			{
				ptsProfile: "pts/pgbench-1.15.0",
				resultsPrefix: "pts_pgbench-read-write",
			},
		]);
	});

	it("ignores commented-out helper calls", () => {
		const script = `
# run_pts_benchmark "pts/old-1.0.0" "pts_old"
run_pts_benchmark "pts/new-1.0.0" "pts_new"
# run_fio_pts "Sequential Read" "1MB" "pts_fio-commented"
`;
		expect(ptsPinsFromScript(script, { fioProfile: "pts/fio-2.1.0" })).toEqual([
			{ ptsProfile: "pts/new-1.0.0", resultsPrefix: "pts_new" },
		]);
	});
});

describe("fioProfileFromBenchSh", () => {
	it("mines the fio version pin from run_fio_pts in lib/bench.sh", () => {
		const benchSh = readFileSync(join(root, "lib/bench.sh"), "utf8");
		expect(fioProfileFromBenchSh(benchSh)).toBe("pts/fio-2.1.0");
	});

	it("ignores commented pins outside the function body", () => {
		const fake = `
# run_pinned_pts "pts/fio-9.9.9" "pts_fake"
run_fio_pts() {
	run_pinned_pts "pts/fio-2.1.0" "$prefix"
}
`;
		expect(fioProfileFromBenchSh(fake)).toBe("pts/fio-2.1.0");
	});

	it("ignores a commented-out function stub before the real definition", () => {
		const fake = `
# run_fio_pts() {
# 	run_pinned_pts "pts/fio-9.9.9" "$prefix"
# }
run_fio_pts() {
	run_pinned_pts "pts/fio-2.1.0" "$prefix"
}
`;
		expect(fioProfileFromBenchSh(fake)).toBe("pts/fio-2.1.0");
	});
});

describe("realworldVersionFromBenchSh", () => {
	it("mines the realworld profile version from run_realworld_pts", () => {
		const benchSh = readFileSync(join(root, "lib/bench.sh"), "utf8");
		expect(realworldVersionFromBenchSh(benchSh)).toBe("1.0.0");
	});
});

describe("parseMiseTaskInfoJson", () => {
	it("keeps name, description, and file from mise task info --json", () => {
		expect(
			parseMiseTaskInfoJson(
				JSON.stringify({
					name: "benchmark:disk:all",
					description: "Run disk benchmarks",
					file: "/repo/.mise/tasks/benchmark/disk/all",
				}),
			),
		).toEqual({
			name: "benchmark:disk:all",
			description: "Run disk benchmarks",
			file: "/repo/.mise/tasks/benchmark/disk/all",
		});
	});
});

describe("describeSuiteTasks", () => {
	it("expands every registered suite's commands into mise leaves with PTS metadata", async () => {
		for (const suite of SUITE_NAMES) {
			const plan = await describeSuiteTasks(suite, root);
			expect(plan.suite).toBe(suite);
			expect(plan.commands).toEqual([...SUITES[suite].commands]);
			expect(plan.tasks.length).toBeGreaterThan(0);
			expect(plan.tasks.some((t) => t.role === "command")).toBe(true);
			// Orchestrators expand to leaves; leaf suites (realworld-*) are themselves leaves.
			expect(plan.metrics.map((m) => m.id)).toEqual([...SUITES[suite].metrics]);
		}
	});

	it("surfaces disk fio leaves with mise descriptions and the fio profile pin", async () => {
		const plan = await describeSuiteTasks("disk", root);
		const fio = plan.tasks.find((t) => t.task === "benchmark:disk:pts:fio-seq-read");
		expect(fio?.role).toBe("leaf");
		expect(fio?.description).toContain("fio sequential read");
		expect(fio?.ptsProfile).toBe("pts/fio-2.1.0");
		expect(fio?.resultsPrefix).toBe("pts_fio-seq-read");
		expect(fio?.file).toBe(".mise/tasks/benchmark/disk/pts/fio-seq-read");
	});

	it("joins multi-pin leaves (pgbench) into comma-separated summary fields", async () => {
		const plan = await describeSuiteTasks("pgbench", root);
		const pgbench = plan.tasks.find((t) => t.task === "benchmark:pgbench:pts:pgbench");
		expect(pgbench?.ptsProfile).toBe("pts/pgbench-1.15.0");
		expect(pgbench?.resultsPrefix).toBe("pts_pgbench-read-only, pts_pgbench-read-write");
	});
});

describe("summary rows", () => {
	it("renders task and metric tables for a suite plan", async () => {
		const plan = await describeSuiteTasks("cpu-node", root);
		const taskRows = suiteTaskSummaryRows(plan);
		expect(taskRows[0]?.[0]).toEqual({ data: "Task", header: true });
		expect(taskRows.length).toBeGreaterThan(1);
		const metricRows = suiteMetricSummaryRows(plan);
		expect(metricRows[0]?.[0]).toEqual({ data: "Metric", header: true });
		expect(metricRows.length).toBe(1 + plan.metrics.length);
	});
});
