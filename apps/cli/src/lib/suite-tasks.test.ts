import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
	suiteBakedPtsProfiles,
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

describe("frozen suite image preparation", () => {
	const copies: string[] = [];
	afterAll(() => {
		for (const dir of copies) rmSync(dir, { recursive: true, force: true });
	});
	// A committed copy of HEAD's workload inputs, so uncommitted edits in this checkout can't
	// change the answer. Returns the copy's root and its commit.
	const frozenCopy = () => {
		const dir = mkdtempSync(join(tmpdir(), "suite-tasks-"));
		copies.push(dir);
		const inputs = [".mise/tasks/benchmark", "lib/bench.sh", "packages/schema/src"];
		const archive = join(dir, "inputs.tar");
		execFileSync("git", ["archive", "-o", archive, "HEAD", "--", ...inputs], { cwd: root });
		execFileSync("tar", ["-xf", archive, "-C", dir]);
		rmSync(archive);
		const git = (...args: string[]) =>
			execFileSync(
				"git",
				["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args],
				{ cwd: dir, encoding: "utf8", env: { ...process.env, GIT_DIR: undefined } },
			).trim();
		git("init", "-q");
		git("add", "-A");
		git("-c", "user.name=test", "-c", "user.email=test@example.invalid", "commit", "-qm", "frozen");
		return { dir, revision: git("rev-parse", "HEAD") };
	};

	it("selects installed fixtures from the actual suite tasks and keeps generic setup for other source revisions", async () => {
		const { dir, revision } = frozenCopy();
		expect(await suiteBakedPtsProfiles("network", revision, dir)).toEqual(["iperf-1.2.0"]);
		expect(await suiteBakedPtsProfiles("pgbench", revision, dir)).toEqual(["pgbench-1.15.0"]);
		for (const suite of ["realworld-better-auth", "realworld-openclaw"] as const)
			expect(await suiteBakedPtsProfiles(suite, revision, dir)).toEqual([]);
		expect(await suiteBakedPtsProfiles("pgbench", "main", dir)).toBeUndefined();
		expect(await suiteBakedPtsProfiles("pgbench", "0".repeat(40), dir)).toBeUndefined();
	});

	it("keeps generic setup when the checkout's workload differs from the frozen revision", async () => {
		const edited = frozenCopy();
		appendFileSync(join(edited.dir, "lib/bench.sh"), "\n# local edit\n");
		expect(await suiteBakedPtsProfiles("pgbench", edited.revision, edited.dir)).toBeUndefined();
		const added = frozenCopy();
		writeFileSync(join(added.dir, ".mise/tasks/benchmark/untracked"), "#!/bin/bash\n");
		expect(await suiteBakedPtsProfiles("pgbench", added.revision, added.dir)).toBeUndefined();
	});
});
