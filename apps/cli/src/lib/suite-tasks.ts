// Discover the precise mise tasks a suite runs — pure domain planning for metadata-rich summaries.
// Sources (automated, no hard-coded per-suite leaf lists):
//   1. SUITES[suite].commands — what the harness actually steps
//   2. `mise task info <name> --json` — description + task file path
//   3. Conventional `.mise/tasks/<colon-path>` fallback when mise is unavailable
//   4. Orchestrator file `run_task` lines — leaf expansion (mise `depends` is unused here)
//   5. Leaf file PTS helper calls + lib/bench.sh pins — profile / results-prefix metadata
//   6. Schema Metric Catalog — declared metrics with PTS test ids / labels
//
// Actions HTML table rendering lives in suite-summary.ts so this module stays free of Toolkit/
// presentation concerns. Callers pass an explicit `root` (tests) or default to process.cwd()
// (CI / local bins already run from the monorepo root).
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import type { SuiteName } from "@sandbox-benchmarks/schema";
import { getMetric, SUITES } from "@sandbox-benchmarks/schema";

/** One PTS/local pin mined from a leaf task script. */
export interface PtsPin {
	ptsProfile: string;
	resultsPrefix: string;
}

/** One mise task the suite plans to run (root command or expanded leaf). */
export interface SuiteTask {
	/** Mise task name, e.g. `benchmark:disk:pts:fio-seq-read`. */
	task: string;
	/** `#MISE description` / `mise task info` description when available. */
	description: string;
	/** Repo-relative task file path when resolvable. */
	file: string;
	/** Role in the suite: top-level harness command vs expanded `run_task` child. */
	role: "command" | "leaf";
	/** Version-pinned PTS/local profiles (joined with `, ` when a leaf runs several). */
	ptsProfile: string;
	/** Results-tree prefixes (joined with `, ` when a leaf runs several). */
	resultsPrefix: string;
}

/** Catalogued metrics the suite declares — companion to the task list. */
export interface SuiteMetricInfo {
	id: string;
	label: string;
	dimension: string;
	ptsTest: string;
	ptsDescription: string;
}

/** Full plan for a suite: harness commands, expanded leaves, and declared metrics. */
export interface SuiteTaskPlan {
	suite: string;
	commands: string[];
	tasks: SuiteTask[];
	metrics: SuiteMetricInfo[];
}

const MISE_RUN_RE = /^\s*mise\s+run\s+(\S+)/;
const RUN_TASK_RE = /^\s*run_task\s+(\S+)/gm;
const PTS_BENCHMARK_RE = /^\s*run_(?:pts_benchmark|pinned_pts)\s+"([^"]+)"\s+"([^"]+)"/gm;
const FIO_PTS_RE = /^\s*run_fio_pts\s+"[^"]+"\s+"[^"]+"\s+"([^"]+)"/gm;
const REALWORLD_PTS_RE = /^\s*run_realworld_pts\s+(\S+)/gm;

/** Extract the mise task name from a suite command like `mise run benchmark:disk:all`. */
export function miseTaskFromCommand(command: string): string | undefined {
	const match = command.match(MISE_RUN_RE);
	return match?.[1];
}

/**
 * Conventional file-backed task path for a colon task name (`.mise/tasks/benchmark/disk/all`).
 * Used when `mise task info` is unavailable so leaf expansion still works.
 */
export function conventionalTaskFile(task: string): string {
	return `.mise/tasks/${task.replaceAll(":", "/")}`;
}

/** Every `run_task <name>` child in an orchestrator script (order preserved, de-duped). */
export function runTaskChildren(script: string): string[] {
	const seen = new Set<string>();
	const children: string[] = [];
	for (const match of script.matchAll(RUN_TASK_RE)) {
		const task = match[1];
		if (!task || seen.has(task)) continue;
		seen.add(task);
		children.push(task);
	}
	return children;
}

/** All PTS profile + results-prefix pins mined from a leaf task script. */
export function ptsPinsFromScript(
	script: string,
	opts: { fioProfile?: string; realworldVersion?: string } = {},
): PtsPin[] {
	// Ignore `#` comment lines so commented-out helper calls never become summary pins.
	const active = stripBashComments(script);
	const pins: PtsPin[] = [];
	for (const match of active.matchAll(PTS_BENCHMARK_RE)) {
		pins.push({ ptsProfile: match[1] ?? "", resultsPrefix: match[2] ?? "" });
	}
	for (const match of active.matchAll(FIO_PTS_RE)) {
		pins.push({
			// Empty when bench.sh wasn't readable — don't invent an unpinned `pts/fio` label.
			ptsProfile: opts.fioProfile ?? "",
			resultsPrefix: match[1] ?? "",
		});
	}
	const realworldVersion = opts.realworldVersion ?? "1.0.0";
	for (const match of active.matchAll(REALWORLD_PTS_RE)) {
		const repo = match[1] ?? "";
		pins.push({
			ptsProfile: `local/realworld-${repo}-${realworldVersion}`,
			resultsPrefix: `pts_realworld-${repo}`,
		});
	}
	return pins;
}

/** Strip `#` comment lines so pin mining can't latch onto commented-out calls. */
function stripBashComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !/^\s*#/.test(line))
		.join("\n");
}

/**
 * Body of a `name()` bash function (best-effort). Used to scope pin mining so a comment outside
 * the function can't satisfy a loose regex. Comments are stripped first so a commented-out stub
 * can't win over the real function.
 */
function bashFunctionBody(source: string, name: string): string | undefined {
	const active = stripBashComments(source);
	const match = active.match(new RegExp(`${name}\\(\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
	return match?.[1];
}

/**
 * The fio profile pin inside `run_fio_pts` in lib/bench.sh (e.g. `pts/fio-2.1.0`). Automated so a
 * bump in bench.sh shows up in summaries without a parallel edit here.
 */
export function fioProfileFromBenchSh(benchSh: string): string | undefined {
	const body = bashFunctionBody(benchSh, "run_fio_pts");
	if (!body) return undefined;
	const match = stripBashComments(body).match(/run_pinned_pts\s+"([^"]+)"/);
	return match?.[1];
}

/**
 * The realworld profile version suffix inside `run_realworld_pts` (e.g. `1.0.0` from
 * `profile="realworld-${repo}-1.0.0"`).
 */
export function realworldVersionFromBenchSh(benchSh: string): string | undefined {
	const body = bashFunctionBody(benchSh, "run_realworld_pts");
	if (!body) return undefined;
	const match = stripBashComments(body).match(/profile="realworld-\$\{repo\}-([^"]+)"/);
	return match?.[1];
}

interface MiseTaskInfo {
	name: string;
	description: string;
	file: string;
}

/** Parse `mise task info --json` stdout into the fields we surface. Pure for testing. */
export function parseMiseTaskInfoJson(json: string): MiseTaskInfo | undefined {
	let raw: unknown;
	try {
		raw = JSON.parse(json);
	} catch {
		return undefined;
	}
	if (!raw || typeof raw !== "object") return undefined;
	const obj = raw as Record<string, unknown>;
	const name = typeof obj.name === "string" ? obj.name : "";
	if (!name) return undefined;
	const description = typeof obj.description === "string" ? obj.description : "";
	const file =
		(typeof obj.file === "string" && obj.file) ||
		(typeof obj.source === "string" && obj.source) ||
		"";
	return { name, description, file };
}

async function miseTaskInfo(task: string, cwd: string): Promise<MiseTaskInfo | undefined> {
	try {
		const proc = Bun.spawn(["mise", "task", "info", task, "--json"], {
			cwd,
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
		if (exitCode !== 0) return undefined;
		return parseMiseTaskInfoJson(stdout);
	} catch {
		return undefined;
	}
}

function relFile(absOrRel: string, root: string): string {
	if (!absOrRel) return "";
	const abs = resolve(absOrRel);
	const rel = relative(root, abs);
	return rel.startsWith("..") ? "" : rel;
}

/** Resolve a task file under the repo root — mise path first, then the conventional file layout. */
function resolveTaskFile(task: string, miseFile: string | undefined, root: string): string {
	const fromMise = miseFile ? relFile(miseFile, root) : "";
	if (fromMise && existsSync(resolve(root, fromMise))) return fromMise;
	const conventional = conventionalTaskFile(task);
	if (existsSync(resolve(root, conventional))) return conventional;
	return fromMise;
}

/** Refuse to read task files outside the repo root (symlink / absolute-path hardening). */
function readRepoFile(root: string, relPath: string): string | undefined {
	if (!relPath) return undefined;
	const abs = resolve(root, relPath);
	const rel = relative(root, abs);
	if (rel.startsWith("..") || rel.split(sep).includes("..")) return undefined;
	try {
		return readFileSync(abs, "utf8");
	} catch {
		return undefined;
	}
}

function suiteMetricInfo(suiteName: SuiteName): SuiteMetricInfo[] {
	const suite = SUITES[suiteName];
	return suite.metrics.map((id) => {
		const def = getMetric(id);
		return {
			id,
			label: def?.label ?? id,
			dimension: def?.dimension ?? "",
			ptsTest: def?.pts?.test ?? "",
			ptsDescription: def?.pts?.description ?? "",
		};
	});
}

function joinPins(pins: PtsPin[], key: keyof PtsPin): string {
	return [...new Set(pins.map((p) => p[key]).filter(Boolean))].join(", ");
}

/**
 * Build the suite's task plan from the schema registry + mise task metadata + task-file PTS pins.
 * Throws when `suiteName` is not registered. Mise lookup failures degrade to the conventional
 * task-file path so leaf expansion still works without a mise binary.
 */
export async function describeSuiteTasks(
	suiteName: string,
	root: string = process.cwd(),
): Promise<SuiteTaskPlan> {
	if (!(suiteName in SUITES)) {
		throw new Error(`unknown suite "${suiteName}" — not in SUITE_NAMES`);
	}
	const suite = SUITES[suiteName as SuiteName];
	const commands = [...suite.commands];

	let fioProfile: string | undefined;
	let realworldVersion: string | undefined;
	try {
		const benchSh = readFileSync(resolve(root, "lib/bench.sh"), "utf8");
		fioProfile = fioProfileFromBenchSh(benchSh);
		realworldVersion = realworldVersionFromBenchSh(benchSh);
	} catch {
		// Optional enrichment — keep expanding tasks without bench.sh pins.
	}

	const tasks: SuiteTask[] = [];
	const seen = new Set<string>();

	const pushTask = async (taskName: string, role: "command" | "leaf"): Promise<string> => {
		if (seen.has(taskName)) return "";
		seen.add(taskName);
		const info = await miseTaskInfo(taskName, root);
		const file = resolveTaskFile(taskName, info?.file, root);
		const script = file ? readRepoFile(root, file) : undefined;
		const pins = script ? ptsPinsFromScript(script, { fioProfile, realworldVersion }) : [];
		tasks.push({
			task: taskName,
			description: info?.description ?? "",
			file,
			role,
			ptsProfile: joinPins(pins, "ptsProfile"),
			resultsPrefix: joinPins(pins, "resultsPrefix"),
		});
		return file;
	};

	for (const command of commands) {
		const rootTask = miseTaskFromCommand(command);
		if (!rootTask) continue;
		const file = await pushTask(rootTask, "command");
		if (!file) continue;
		const script = readRepoFile(root, file);
		if (!script) continue;
		for (const child of runTaskChildren(script)) {
			await pushTask(child, "leaf");
		}
	}

	return {
		suite: suiteName,
		commands,
		tasks,
		metrics: suiteMetricInfo(suiteName as SuiteName),
	};
}
