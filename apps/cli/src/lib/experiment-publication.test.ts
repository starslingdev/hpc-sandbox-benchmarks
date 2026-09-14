import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildPipelineChartModel } from "@sandbox-benchmarks/figures";
import {
	benchmarkDataOf,
	evidenceDigest,
	leaderboardFigures,
	normalizeResultsTree,
	renderLeaderboardFigureHtml,
	suiteFigureNote,
} from "@sandbox-benchmarks/results";
import type {
	CleanupReceipt,
	ExecutionReceipt,
	ExperimentCell,
	MetricResult,
} from "@sandbox-benchmarks/schema";
import {
	aggregate,
	experimentAttemptSchema,
	parseRun,
	parseRunIndex,
	SUITES,
	TARGET_SPEC,
} from "@sandbox-benchmarks/schema";
import {
	rawTreeDigest,
	readExperimentAttempts,
	writeImmutableJson,
} from "./experiment-artifacts.ts";
import { planExperiment } from "./experiment-plan.ts";

const root = mkdtempSync(join(tmpdir(), "experiment-publication-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const sha = "a".repeat(40);
const metricId = "node_web_tooling_runs_per_s";
const profileXml = readFileSync(
	new URL(
		"../../../../packages/results/src/lib/__fixtures__/daytona-vm/pts_node-web-tooling.xml",
		import.meta.url,
	),
	"utf8",
);
// Unchanged original PTS XML from run 34781421576, Runcloud artifact 10326825129. It records
// ten successful tasks with Value, empty RawString, and one execution duration per Entry.
const betterAuthXml = readFileSync(
	new URL(
		"../../../../packages/results/src/lib/__fixtures__/realworld-single-trial/pts_realworld-better-auth.xml",
		import.meta.url,
	),
	"utf8",
);

// Original PTS option labels are fixtures, independent of the generated catalog. The renamed
// all-extension task must route through its new identity at normalization and at figure ingestion.
const openClawTasks = [
	["git_clone", "Git Clone"],
	["cold_install", "Cold Install"],
	["lint_oxlint", "Lint Oxlint"],
	["lint_extensions_all", "Lint Extensions All"],
	["typecheck", "Typecheck"],
	["test_types", "Test Types"],
] as const;

function openClawXml(cell: ExperimentCell, singleTrialMetadata?: string): string {
	return `<PhoronixTestSuite>${openClawTasks
		.map(([key, label], index) => {
			const seconds = 10 * (index + 1) + cell.replicate + (cell.provider === "novita" ? 10 : 0);
			return `<Result><Identifier>local/realworld-openclaw-1.0.0</Identifier><Title>OpenClaw CI Tasks</Title>
<AppVersion>623534400684eca7c451cf587189fae714f2abe2</AppVersion><Arguments>${key}</Arguments><Description>Task: ${label}</Description>
<Scale>Seconds</Scale><Proportion>LIB</Proportion><Data><Entry><Value>${seconds}</Value><RawString></RawString><JSON>${singleTrialMetadata ?? JSON.stringify({ "test-run-times": String(seconds + 1) })}</JSON></Entry></Data></Result>`;
		})
		.join("")}</PhoronixTestSuite>`;
}

function fixture(
	name: string,
	options: {
		suite?: "cpu-node" | "realworld-openclaw" | "realworld-better-auth";
		passes?: number;
		samples?: readonly number[];
		aggregateOnly?: boolean;
		singleTrialMetadata?: string;
		legacy?: boolean;
		changeMetric?: (metric: MetricResult) => void;
	} = {},
) {
	const directory = join(root, name);
	const runId = `publication-${name}`;
	const suite = options.suite ?? "cpu-node";
	const cells = (["e2b", "novita"] as const).flatMap((provider) =>
		[0, 1].map(
			(replicate): ExperimentCell => ({
				id: `${provider}-${suite}-r${replicate}`,
				provider,
				suite,
				replicate,
				quotaDomain: provider,
				workloadRevision: `${suite}-${sha}`,
				environmentRevision: "environment-1",
				artifactIdentity: evidenceDigest({ kind: "baked", ref: "template-1" }),
				target: { ...TARGET_SPEC },
				metrics: [...SUITES[suite].metrics],
				exclusions: [],
				passes: options.passes ?? (suite.startsWith("realworld-") ? 1 : 2),
				startupMinutes: 1,
				workloadMinutes: 1,
				finishMinutes: 1,
			}),
		),
	);
	const plan = planExperiment({ id: runId, sha, createdOn: "2026-09-13", cells });
	mkdirSync(directory, { recursive: true });
	const planFile = join(directory, "plan.json");
	writeImmutableJson(planFile, plan);
	const attemptsRoot = join(directory, "attempts");
	for (const cell of cells) {
		const attemptRoot = join(attemptsRoot, cell.id);
		const rawRoot = join(attemptRoot, "raw");
		const suiteRoot = join(rawRoot, cell.provider, cell.suite);
		mkdirSync(suiteRoot, { recursive: true });
		const samples = options.samples ?? [10 + cell.replicate, 20 + cell.replicate];
		const value = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
		writeFileSync(
			join(suiteRoot, suite === "cpu-node" ? "pts_node-web-tooling.xml" : `pts_${suite}.xml`),
			suite === "realworld-openclaw"
				? openClawXml(cell, options.singleTrialMetadata)
				: suite === "realworld-better-auth"
					? options.singleTrialMetadata === undefined
						? betterAuthXml
						: betterAuthXml.replace(
								/<JSON>\{"test-run-times"[^<]*<\/JSON>/g,
								`<JSON>${options.singleTrialMetadata}</JSON>`,
							)
					: profileXml
							.replace(/<Value>[^<]*<\/Value>/, `<Value>${value}</Value>`)
							.replace(
								/<RawString>[^<]*<\/RawString>/,
								options.aggregateOnly ? "" : `<RawString>${samples.join(":")}</RawString>`,
							),
		);
		const sandboxId = `sandbox-${cell.id}`;
		writeImmutableJson(join(suiteRoot, "provider-artifact-evidence.json"), {
			cell: { runId, providerId: cell.provider, suite: cell.suite, replicateIndex: cell.replicate },
			sandboxId,
			provenance: {
				source: "driver-reported",
				requested: { kind: "baked", ref: "template-1" },
				reported: { kind: "baked", ref: "template-1" },
			},
		});
		const execution: ExecutionReceipt = {
			schemaVersion: "1",
			executionId: cell.id,
			runId,
			provider: cell.provider,
			suite: cell.suite,
			replicateIndex: cell.replicate,
			sandboxId,
			primaryFailure: null,
			detached: [],
			steps: [
				{ phase: "benchmark", label: cell.suite, ms: 1, exitCode: 0 },
				{ phase: "collect", label: "collect", ms: 1, exitCode: 0 },
			],
		};
		const cleanup: CleanupReceipt = {
			schemaVersion: "1",
			executionId: cell.id,
			completed: true,
			confirmedAbsent: true,
			attemptedAt: "2026-09-13T00:00:00Z",
		};
		writeImmutableJson(join(suiteRoot, `execution-${cell.id}.json`), execution);
		writeImmutableJson(join(suiteRoot, `cleanup-${cell.id}.json`), cleanup);
		const run = normalizeResultsTree({
			rawRoot,
			runId,
			sha,
			generatedAt: "2026-09-13T00:00:00Z",
			replicateIndex: cell.replicate,
		});
		const metric = run.providers
			.find((provider) => provider.providerId === cell.provider)
			?.metrics.find((entry) => entry.metricId === cell.metrics[0]);
		if (!metric) throw new Error("fixture did not normalize its PTS metric");
		if (options.legacy)
			for (const provider of run.providers) {
				for (const result of provider.metrics) Reflect.deleteProperty(result, "ptsSampleSource");
			}
		options.changeMetric?.(metric);
		const evidence = experimentAttemptSchema.assert({
			schemaVersion: "1",
			id: cell.id,
			cellId: cell.id,
			planDigest: plan.digest,
			sha,
			workloadRevision: cell.workloadRevision,
			environmentRevision: cell.environmentRevision,
			artifactIdentity: cell.artifactIdentity,
			passes: cell.passes,
			workflowRun: runId,
			workflowAttempt: 1,
			job: "fixture",
			sequence: 0,
			outcome: "completed",
			measurementStarted: true,
			retryable: false,
			cleanup: "confirmed",
			completion: "known-success",
			runDigest: evidenceDigest(run),
			rawDigest: rawTreeDigest(rawRoot),
		});
		writeImmutableJson(join(attemptRoot, "attempt.json"), evidence);
		writeImmutableJson(join(attemptRoot, "run.json"), run);
	}
	return {
		directory,
		runId,
		planFile,
		attemptsRoot,
		candidate: join(directory, "candidate"),
		dataset: join(directory, "dataset"),
	};
}

const invoke = (bin: string, args: string[]) =>
	Bun.spawnSync([process.execPath, resolve(import.meta.dir, "../bin", `${bin}.ts`), ...args], {
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, GITHUB_ACTIONS: "false" },
	});

test("normalized PTS trials publish through candidate, dataset index and leaderboard with replicate evidence", () => {
	const f = fixture("complete");
	const collection = invoke("aggregate-experiment", [f.planFile, f.attemptsRoot, f.candidate]);
	expect(collection.stderr.toString()).toBe("");
	expect(collection.exitCode).toBe(0);
	const candidateFile = join(f.candidate, "runs", `${f.runId}.json`);
	const promotion = invoke("promote", [candidateFile, f.dataset, f.planFile, f.attemptsRoot]);
	expect(promotion.exitCode).toBe(0);
	const publishedFile = join(f.dataset, "runs", `${f.runId}.json`);
	const run = parseRun(JSON.parse(readFileSync(publishedFile, "utf8")));
	expect(run.experiment?.attemptIds).toHaveLength(4);
	expect(
		parseRunIndex(JSON.parse(readFileSync(join(f.dataset, "index.json"), "utf8"))).runs[0]?.runId,
	).toBe(f.runId);
	for (const provider of run.providers.filter((entry) => entry.validationStatus === "validated")) {
		const metric = provider.metrics.find((entry) => entry.metricId === metricId);
		expect(metric?.samples).toHaveLength(4);
		expect(
			metric?.replicates?.map((entry) => [entry.samples.length, entry.ptsSampleSource]),
		).toEqual([
			[2, "raw-string"],
			[2, "raw-string"],
		]);
	}
	const output = join(f.directory, "LEADERBOARD.md");
	const rendered = invoke("leaderboard", [publishedFile, output]);
	expect(rendered.exitCode).toBe(0);
	const markdown = readFileSync(output, "utf8");
	expect(markdown).toContain(f.runId);
	expect(markdown).toContain("E2B");
	expect(markdown).toContain("Novita");
	expect(markdown).toContain("Node");
	expect(markdown).not.toMatch(/\bNaN\b|\bInfinity\b/);
	// Promotion recomputes the candidate independently; a valid schema alone cannot publish a
	// substituted document, even when every original attempt is still complete.
	const substituted = join(f.directory, "substituted.json");
	writeImmutableJson(substituted, { ...run, generatedAt: "2026-09-13T01:00:00Z" });
	const blockedDataset = join(f.directory, "blocked-dataset");
	const rejected = invoke("promote", [substituted, blockedDataset, f.planFile, f.attemptsRoot]);
	expect(rejected.exitCode).toBe(1);
	expect(rejected.stderr.toString()).toContain("candidate does not match");
	expect(existsSync(blockedDataset)).toBe(false);
}, 20_000);

test("original raw XML proves legacy shard trials without rewriting frozen attempt or Run documents", () => {
	const f = fixture("legacy", { legacy: true });
	const before = rawTreeDigest(f.attemptsRoot);
	const attempts = readExperimentAttempts(f.attemptsRoot);
	expect(attempts[0]?.ptsTrials?.[0]?.source).toBe("raw-string");
	const result = invoke("aggregate-experiment", [f.planFile, f.attemptsRoot, f.candidate]);
	expect(result.exitCode).toBe(0);
	expect(
		invoke("promote", [
			join(f.candidate, "runs", `${f.runId}.json`),
			f.dataset,
			f.planFile,
			f.attemptsRoot,
		]).exitCode,
	).toBe(0);
	expect(rawTreeDigest(f.attemptsRoot)).toBe(before);
	const run = parseRun(
		JSON.parse(readFileSync(join(f.dataset, "runs", `${f.runId}.json`), "utf8")),
	);
	expect(
		run.providers
			.find((entry) => entry.providerId === "e2b")
			?.metrics.find((entry) => entry.metricId === metricId)
			?.replicates?.every((entry) => entry.ptsSampleSource === undefined),
	).toBe(true);
}, 20_000);

test("all six revised OpenClaw tasks publish and produce a complete two-provider pipeline figure", () => {
	const f = fixture("openclaw", { suite: "realworld-openclaw" });
	const before = rawTreeDigest(f.attemptsRoot);
	const collection = invoke("aggregate-experiment", [f.planFile, f.attemptsRoot, f.candidate]);
	expect(collection.stderr.toString()).toBe("");
	expect(collection.exitCode).toBe(0);
	const candidateFile = join(f.candidate, "runs", `${f.runId}.json`);
	const promotion = invoke("promote", [candidateFile, f.dataset, f.planFile, f.attemptsRoot]);
	expect(promotion.exitCode).toBe(0);
	const publishedFile = join(f.dataset, "runs", `${f.runId}.json`);
	const run = parseRun(JSON.parse(readFileSync(publishedFile, "utf8")));
	expect(
		parseRunIndex(JSON.parse(readFileSync(join(f.dataset, "index.json"), "utf8"))).runs[0]?.runId,
	).toBe(f.runId);
	expect(run.experiment?.attemptIds).toHaveLength(4);
	const measured = run.providers.filter((provider) => provider.validationStatus === "validated");
	expect(measured.map((provider) => provider.providerId)).toEqual(["e2b", "novita"]);
	for (const provider of measured) {
		expect(provider.gaps).toEqual([]);
		expect(provider.uncatalogued).toEqual([]);
		expect(
			provider.metrics
				.filter((entry) => !entry.derived)
				.map((entry) => entry.metricId)
				.sort(),
		).toEqual([...SUITES["realworld-openclaw"].metrics].sort());
		for (const metric of provider.metrics.filter((entry) => !entry.derived)) {
			expect(metric.samples).toHaveLength(2);
			expect(
				metric.replicates?.map((entry) => [entry.samples.length, entry.ptsSampleSource]),
			).toEqual([
				[1, "aggregate-value"],
				[1, "aggregate-value"],
			]);
		}
		expect(
			provider.metrics.find(
				(entry) => entry.metricId === "realworld_openclaw_task_lint_extensions_all",
			)?.arguments,
		).toBe("lint_extensions_all");
		expect(
			provider.metrics.some(
				(entry) => entry.metricId === "realworld_openclaw_task_lint_extensions",
			),
		).toBe(false);
	}
	const data = benchmarkDataOf(run);
	const suite = data.suites[0];
	if (!suite) throw new Error("complete OpenClaw cohort was not chartable");
	expect(data.suites).toHaveLength(1);
	expect(suite.id).toBe("realworld-openclaw");
	expect(suite.droppedTasks).toEqual([]);
	expect(suite.incomplete).toEqual([]);
	expect(suite.tasks).toEqual([
		{ id: "realworld_openclaw_task_git_clone", phase: "clone" },
		{ id: "realworld_openclaw_task_cold_install", phase: "install" },
		{ id: "realworld_openclaw_task_lint_oxlint", phase: "lint" },
		{ id: "realworld_openclaw_task_lint_extensions_all", phase: "lint" },
		{ id: "realworld_openclaw_task_typecheck", phase: "typecheck" },
		{ id: "realworld_openclaw_task_test_types", phase: "test" },
	]);
	expect(
		suite.bars.map((bar) => ({
			provider: bar.provider,
			totalS: bar.totalS,
			n: bar.segments.map((segment) => segment.n),
		})),
	).toEqual([
		{ provider: "e2b", totalS: 213, n: [2, 2, 2, 2, 2, 2] },
		{ provider: "novita", totalS: 273, n: [2, 2, 2, 2, 2, 2] },
	]);
	const chart = buildPipelineChartModel(suite, data, suiteFigureNote(suite, 1));
	expect(chart.summary).toBe("6 tasks · git clone → cold install → lint → typecheck → test");
	expect(chart.legend.map((entry) => entry.label)).toEqual([
		"git clone",
		"cold install",
		"lint",
		"typecheck",
		"test",
	]);
	expect(leaderboardFigures(data)[0]).toEqual(
		expect.objectContaining({ suiteId: suite.id, tasks: 6, charted: 2, incomplete: 0 }),
	);
	const html = renderLeaderboardFigureHtml(run)[0]?.html;
	expect(html).toContain("<title>OpenClaw</title>");
	expect(html).toContain("6 tasks");
	expect(html).toContain("data:font/woff2;base64,");
	expect(renderLeaderboardFigureHtml(run)[0]?.html).toBe(html);
	// stdout exercises the real leaderboard CLI and its figure listing without invoking Chrome.
	const leaderboard = invoke("leaderboard", [publishedFile]);
	expect(leaderboard.exitCode).toBe(0);
	const markdown = leaderboard.stdout.toString();
	expect(markdown).toContain("docs/figures/realworld-openclaw.webp");
	expect(markdown).toContain("lint (all extensions)");
	expect(markdown).toContain("OpenClaw");
	expect(markdown).not.toMatch(/\bNaN\b|\bInfinity\b/);
	expect(rawTreeDigest(f.attemptsRoot)).toBe(before);
}, 20_000);

test("original BetterAuth single-trial XML publishes all ten frozen tasks without inventing raw samples", () => {
	const f = fixture("better-auth-single", { suite: "realworld-better-auth", legacy: true });
	const before = rawTreeDigest(f.attemptsRoot);
	const attempts = readExperimentAttempts(f.attemptsRoot);
	expect(attempts.flatMap((attempt) => attempt.ptsTrials ?? [])).toHaveLength(40);
	expect(
		attempts.every((attempt) =>
			attempt.ptsTrials?.every(
				(trial) => trial.source === "single-trial-value" && trial.observed === 1,
			),
		),
	).toBe(true);
	const collection = invoke("aggregate-experiment", [f.planFile, f.attemptsRoot, f.candidate]);
	expect(collection.stderr.toString()).toBe("");
	expect(collection.exitCode).toBe(0);
	expect(
		invoke("promote", [
			join(f.candidate, "runs", `${f.runId}.json`),
			f.dataset,
			f.planFile,
			f.attemptsRoot,
		]).exitCode,
	).toBe(0);
	const publishedFile = join(f.dataset, "runs", `${f.runId}.json`);
	const published = parseRun(JSON.parse(readFileSync(publishedFile, "utf8")));
	expect(published.experiment?.attemptIds).toHaveLength(4);
	expect(
		parseRunIndex(JSON.parse(readFileSync(join(f.dataset, "index.json"), "utf8"))).runs[0]?.runId,
	).toBe(f.runId);
	for (const provider of published.providers.filter(
		(entry) => entry.validationStatus === "validated",
	)) {
		expect(
			provider.metrics
				.filter((entry) => !entry.derived)
				.map((entry) => entry.metricId)
				.sort(),
		).toEqual([...SUITES["realworld-better-auth"].metrics].sort());
		expect(provider.gaps).toEqual([]);
		expect(
			provider.metrics
				.filter((entry) => !entry.derived)
				.every(
					(entry) =>
						entry.replicates?.length === 2 &&
						entry.replicates.every(
							(replicate) =>
								replicate.samples.length === 1 && replicate.ptsSampleSource === undefined,
						),
				),
		).toBe(true);
	}
	const data = benchmarkDataOf(published);
	const suite = data.suites.find((entry) => entry.id === "realworld-better-auth");
	if (!suite) throw new Error("BetterAuth figure missing");
	expect(suite.tasks).toHaveLength(10);
	expect(suite.bars).toHaveLength(2);
	expect(suite.droppedTasks).toEqual([]);
	expect(renderLeaderboardFigureHtml(published)[0]?.html).toContain("10 tasks");
	const leaderboard = invoke("leaderboard", [publishedFile]);
	expect(leaderboard.exitCode).toBe(0);
	expect(leaderboard.stdout.toString()).toContain("docs/figures/realworld-better-auth.webp");
	expect(rawTreeDigest(f.attemptsRoot)).toBe(before);
}, 20_000);

test("short trials and Value-only aggregates retain diagnostic coverage and cannot create a dataset", () => {
	for (const [name, options] of [
		["short", { samples: [10] }],
		["value", { aggregateOnly: true }],
		["value-one-pass", { aggregateOnly: true, passes: 1 }],
		[
			"openclaw-multiple-trials",
			{ suite: "realworld-openclaw", singleTrialMetadata: '{"test-run-times":"1:2"}' },
		],
		[
			"openclaw-failed-trial",
			{
				suite: "realworld-openclaw",
				singleTrialMetadata: '{"test-run-times":"1","error":"failed"}',
			},
		],
		[
			"better-auth-multiple-trials",
			{ suite: "realworld-better-auth", singleTrialMetadata: '{"test-run-times":"1:2"}' },
		],
		["better-auth-two-passes", { suite: "realworld-better-auth", passes: 2 }],
	] as const) {
		const f = fixture(name, options);
		const result = invoke("aggregate-experiment", [f.planFile, f.attemptsRoot, f.candidate]);
		expect(result.exitCode).toBe(1);
		expect(result.stderr.toString()).toContain("passes=");
		const report = JSON.parse(readFileSync(join(f.candidate, "coverage.json"), "utf8"));
		expect(report.complete).toBe(false);
		expect(report.cells).toHaveLength(4);
		expect(report.cells.every((cell: { status: string }) => cell.status === "failed")).toBe(true);
		expect(existsSync(join(f.candidate, "index.json"))).toBe(false);
		expect(existsSync(f.dataset)).toBe(false);
	}
}, 20_000);

test("a valid Run digest cannot substitute changed samples or another provider's XML for the measured source", () => {
	for (const [name, changeMetric] of [
		[
			"mismatched-samples",
			(metric: MetricResult) => {
				metric.samples = [99, 100];
				metric.aggregates = aggregate(metric.samples);
			},
		],
		[
			"escaped-source",
			(metric: MetricResult) => {
				metric.sourceFile = "../novita/cpu-node/pts_node-web-tooling.xml";
			},
		],
		[
			"missing-source",
			(metric: MetricResult) => {
				Reflect.deleteProperty(metric, "sourceFile");
			},
		],
	] as const) {
		const f = fixture(name, { changeMetric });
		const result = invoke("aggregate-experiment", [f.planFile, f.attemptsRoot, f.candidate]);
		expect(result.exitCode).toBe(1);
		expect(result.stderr.toString()).toContain("unverified");
		expect(existsSync(join(f.candidate, "index.json"))).toBe(false);
	}
}, 20_000);
