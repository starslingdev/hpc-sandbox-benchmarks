import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AttemptWithRun } from "@sandbox-benchmarks/results";
import {
	aggregateExperiment,
	evaluateExperiment,
	evidenceDigest,
	readPtsTrialEvidence,
	verifyExperimentPlan,
} from "@sandbox-benchmarks/results";
import type { ExperimentCell, ResultGap, Run } from "@sandbox-benchmarks/schema";
import { aggregate, getMetric, parseRun } from "@sandbox-benchmarks/schema";
import { rawTreeDigest, writeImmutableJson } from "./experiment-artifacts.ts";
import { planExperiment, ROUND_BATCH_LIMIT } from "./experiment-plan.ts";

const sha = "a".repeat(40);
const digest = `sha256:${"b".repeat(64)}`;
function cell(replicate = 0): ExperimentCell {
	return {
		id: `e2b-memory-r${replicate}`,
		provider: "e2b",
		quotaDomain: "e2b-benchmark",
		suite: "memory",
		replicate,
		workloadRevision: "memory-fixed-v1",
		artifactIdentity: evidenceDigest({ kind: "baked", ref: "template-pinned" }),
		environmentRevision: "env-1",
		target: { vcpus: 4, memoryGb: 8 },
		metrics: ["stream_type_copy", "stream_type_scale"],
		exclusions: [],
		passes: 2,
		startupMinutes: 20,
		workloadMinutes: 40,
		finishMinutes: 10,
	};
}
function plan(count = 1) {
	return planExperiment({
		id: "experiment-1",
		sha,
		createdOn: "2026-09-10",
		cells: Array.from({ length: count }, (_, i) => cell(i)),
	});
}
function successful(): AttemptWithRun {
	const run: Run = {
		schemaVersion: "6",
		runId: "experiment-1",
		sha,
		generatedAt: "2026-09-10T00:00:00Z",
		replicateIndex: 0,
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [
			{
				providerId: "e2b",
				costEvidence: [],
				artifactEvidence: [
					{
						cell: { runId: "experiment-1", providerId: "e2b", suite: "memory", replicateIndex: 0 },
						sandboxId: "sandbox-1",
						provenance: {
							source: "driver-reported",
							requested: { kind: "baked", ref: "template-pinned" },
							reported: { kind: "baked", ref: "template-pinned" },
						},
					},
				],
				validationStatus: "validated",
				observedSpecs: {},
				metrics: cell().metrics.map((metricId) => ({
					metricId,
					samples: [1, 2],
					ptsSampleSource: "raw-string" as const,
					sourceFile: "memory/pts_stream.xml",
					aggregates: aggregate([1, 2]),
				})),
				suitesCovered: ["memory"],
				gaps: [],
				uncatalogued: [],
			},
		],
	};
	return {
		run,
		execution: {
			schemaVersion: "1",
			executionId: "execution-1",
			runId: "experiment-1",
			replicateIndex: 0,
			provider: "e2b",
			suite: "memory",
			sandboxId: "sandbox-1",
			primaryFailure: null,
			detached: [],
			steps: [
				{ phase: "benchmark", label: "memory", ms: 1, exitCode: 0 },
				{ phase: "collect", label: "collect", ms: 1, exitCode: 0 },
			],
		},
		cleanup: {
			schemaVersion: "1",
			executionId: "execution-1",
			completed: true,
			confirmedAbsent: true,
			attemptedAt: "2026-09-10T00:00:00Z",
		},
		evidence: {
			schemaVersion: "1",
			id: "attempt-1",
			cellId: cell().id,
			planDigest: plan().digest,
			sha,
			workloadRevision: cell().workloadRevision,
			environmentRevision: cell().environmentRevision,
			artifactIdentity: cell().artifactIdentity,
			passes: cell().passes,
			workflowRun: "experiment-1",
			workflowAttempt: 1,
			job: "memory",
			sequence: 0,
			outcome: "completed",
			measurementStarted: true,
			retryable: false,
			cleanup: "confirmed",
			completion: "known-success",
			runDigest: evidenceDigest(run),
			rawDigest: digest,
		},
	};
}

test("fixed-pass completeness rejects fewer successful PTS trials than the frozen plan", () => {
	const attempt = successful();
	const metric = attempt.run?.providers[0]?.metrics[0];
	if (!metric) throw new Error("fixture has no metric");
	metric.samples = [1];
	metric.aggregates = aggregate(metric.samples);
	attempt.evidence.runDigest = evidenceDigest(attempt.run);
	const result = aggregateExperiment(plan(), [attempt]);
	expect(result.coverage.complete).toBe(false);
	expect(result.coverage.cells[0]?.missingMetrics).toEqual(["stream_type_copy"]);
	expect(result.run).toBeUndefined();
});

test("fixed-pass evidence distinguishes a Value aggregate, unknown origin and extra trials", () => {
	for (const origin of ["aggregate-value", undefined, "raw-string"] as const) {
		const attempt = successful();
		const metric = attempt.run?.providers[0]?.metrics[0];
		if (!metric) throw new Error("fixture has no metric");
		metric.samples = origin === "raw-string" ? [1, 2, 3] : origin === undefined ? [1, 2] : [1];
		metric.aggregates = aggregate(metric.samples);
		if (origin === undefined) Reflect.deleteProperty(metric, "ptsSampleSource");
		else metric.ptsSampleSource = origin;
		attempt.evidence.runDigest = evidenceDigest(attempt.run);
		const report = evaluateExperiment(plan(), [attempt]);
		expect(report.complete).toBe(false);
		expect(report.cells[0]?.passShortfalls).toEqual([
			{
				providerId: "e2b",
				metricId: metric.metricId,
				expected: 2,
				source: origin ?? "unverified",
				...(origin === "raw-string" ? { observed: 3 } : {}),
			},
		]);
	}
});

test("a retired OpenClaw catalog metric cannot bypass the frozen trial contract", () => {
	const retiredMetric = "realworld_openclaw_task_lint_extensions";
	expect(getMetric(retiredMetric)).toBeUndefined();
	const directory = mkdtempSync(join(tmpdir(), "retired-pts-evidence-"));
	try {
		const retired = {
			...cell(),
			id: "e2b-realworld-openclaw-r0",
			suite: "realworld-openclaw" as const,
			workloadRevision: "openclaw-original-pin",
			metrics: [retiredMetric],
		};
		const planned = planExperiment({
			id: "experiment-1",
			sha,
			createdOn: "2026-09-10",
			cells: [retired],
		});
		mkdirSync(join(directory, "e2b", retired.suite), { recursive: true });
		for (const samples of [[53.307], [53.307, 52.1]]) {
			const attempt = successful();
			const provider = attempt.run?.providers[0];
			const artifact = provider?.artifactEvidence?.[0];
			if (!attempt.run || !provider || !artifact || !attempt.execution)
				throw new Error("fixture lacks receipts");
			artifact.cell.suite = retired.suite;
			provider.suitesCovered = [retired.suite];
			provider.metrics = [
				{
					metricId: retiredMetric,
					samples,
					aggregates: aggregate(samples),
					sourceFile: `${retired.suite}/pts_realworld-openclaw.xml`,
				},
			];
			attempt.execution.suite = retired.suite;
			attempt.evidence.cellId = retired.id;
			attempt.evidence.workloadRevision = retired.workloadRevision;
			attempt.evidence.planDigest = planned.digest;
			attempt.evidence.runDigest = evidenceDigest(attempt.run);
			writeFileSync(
				join(directory, "e2b", retired.suite, "pts_realworld-openclaw.xml"),
				`<PhoronixTestSuite><Result>
<Identifier>local/realworld-openclaw-1.0.0</Identifier><Title>OpenClaw</Title><Description>Task: Lint Extensions</Description>
<Scale>Seconds</Scale><Proportion>LIB</Proportion><Data><Entry><Value>53.307</Value><RawString>${samples.join(":")}</RawString></Entry></Data>
</Result></PhoronixTestSuite>`,
			);
			attempt.ptsTrials = readPtsTrialEvidence(directory, attempt.run);
			const evaluated = evaluateExperiment(planned, [attempt]);
			expect(evaluated.complete).toBe(false);
			expect(evaluated.cells[0]?.missingMetrics).toEqual([retiredMetric]);
			expect(evaluated.cells[0]?.passShortfalls?.[0]?.source).toBe("unverified");
			// A declared origin also cannot replace a missing measurement contract in the pure evaluator.
			const measured = provider.metrics[0];
			if (!measured) throw new Error("fixture lacks a metric");
			measured.ptsSampleSource = "raw-string";
			Reflect.deleteProperty(attempt, "ptsTrials");
			attempt.evidence.runDigest = evidenceDigest(attempt.run);
			expect(evaluateExperiment(planned, [attempt]).complete).toBe(false);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test("PTS fixed passes do not constrain independently sampled harness metrics", () => {
	const attempt = successful();
	const entry = attempt.run?.providers[0];
	if (!entry) throw new Error("fixture has no provider");
	entry.metrics.push({
		metricId: "lifecycle_spawn_ms",
		samples: [123],
		aggregates: aggregate([123]),
	});
	const planned = planExperiment({
		id: "experiment-1",
		sha,
		createdOn: "2026-09-10",
		cells: [{ ...cell(), metrics: [...cell().metrics, "lifecycle_spawn_ms"] }],
	});
	attempt.evidence.planDigest = planned.digest;
	attempt.evidence.runDigest = evidenceDigest(attempt.run);
	expect(evaluateExperiment(planned, [attempt]).complete).toBe(true);
});

test("normalizer placeholder rows are allowed but foreign provider observations are not", () => {
	const attempt = successful();
	if (!attempt.run) throw new Error("fixture has no run");
	attempt.run.providers.push({
		providerId: "tama",
		validationStatus: "pending",
		observedSpecs: {},
		metrics: [],
		suitesCovered: [],
		gaps: [],
		uncatalogued: [],
		costEvidence: [],
		artifactEvidence: [],
	});
	attempt.evidence.runDigest = evidenceDigest(attempt.run);
	expect(evaluateExperiment(plan(), [attempt]).complete).toBe(true);
	const foreign = attempt.run.providers.at(-1);
	if (!foreign) throw new Error("fixture has no foreign row");
	foreign.suitesCovered.push("memory");
	attempt.evidence.runDigest = evidenceDigest(attempt.run);
	expect(evaluateExperiment(plan(), [attempt]).complete).toBe(false);
});

test("default capacity chunks twelve replicates to the job ceiling", () => {
	const result = plan(12);
	expect(result.batches).toHaveLength(4);
	expect(result.batches.flatMap((batch) => batch.cells)).toEqual(
		result.cells.map((entry) => entry.id),
	);
	expect(result.batches.map((batch) => batch.cells.length)).toEqual([3, 3, 3, 3]);
	expect(result.batches.every((batch) => batch.maxConcurrency === 1)).toBe(true);
	expect(result.batches.every((batch) => batch.budgetMinutes === 255)).toBe(true);
	expect(result.accounts[0]?.sandboxes).toBe(1);
});
test("resource budgets constrain an explicit sandbox cap", () => {
	const result = planExperiment(
		{ id: "experiment-1", sha, createdOn: "2026-09-10", cells: [cell(0), cell(1), cell(2)] },
		{ "e2b-benchmark": { sandboxes: 12, vcpus: 8, memoryGb: 16 } },
	);
	expect(result.batches).toHaveLength(1);
	expect(result.batches[0]?.cells).toHaveLength(3);
	expect(result.batches[0]?.maxConcurrency).toBe(2);
});
test("rejects infeasible work, duplicate logical replicates, and mutated plans", () => {
	expect(() =>
		planExperiment({
			id: "x",
			sha,
			createdOn: "2026-09-10",
			cells: [{ ...cell(), workloadMinutes: 300 }],
		}),
	).toThrow("cannot fit");
	expect(() =>
		planExperiment({ id: "x", sha, createdOn: "2026-09-10", cells: [cell(), cell()] }),
	).toThrow("duplicate");
	const changed = plan();
	changed.cells[0]?.metrics.pop();
	expect(() => verifyExperimentPlan(changed)).toThrow("digest mismatch");
});
test("all-skipped, missing, partial, unknown completion, and unresolved cleanup cannot publish", () => {
	expect(evaluateExperiment(plan(), []).complete).toBe(false);
	for (const change of [
		{ outcome: "failed" as const },
		{ completion: "unknown" as const },
		{ cleanup: "unresolved" as const },
	]) {
		const attempt = successful();
		Object.assign(attempt.evidence, change);
		expect(evaluateExperiment(plan(), [attempt]).complete).toBe(false);
	}
	const partial = successful();
	partial.run?.providers[0]?.metrics.pop();
	partial.evidence.runDigest = evidenceDigest(partial.run);
	expect(evaluateExperiment(plan(), [partial]).cells[0]?.missingMetrics).toEqual([
		"stream_type_scale",
	]);
	expect(evaluateExperiment(plan(), [successful()]).complete).toBe(true);
});
test("declared metrics with non-positive samples cannot satisfy coverage", () => {
	// Empty samples cannot form a schema-valid Run (parseRun rejects them). Non-positive values
	// can still appear if a producer writes a 0; coverage must treat that as a shortfall.
	const zero = successful();
	const zeroMetric = zero.run?.providers[0]?.metrics[0];
	if (!zeroMetric) throw new Error("fixture missing metric");
	zeroMetric.samples = [0];
	zeroMetric.aggregates = aggregate([0]);
	zero.evidence.runDigest = evidenceDigest(zero.run);
	expect(evaluateExperiment(plan(), [zero]).complete).toBe(false);
	expect(evaluateExperiment(plan(), [zero]).cells[0]?.missingMetrics).toEqual(["stream_type_copy"]);
});

test("a sub-millisecond cold DNS sample is retained and an absent probe is not published", () => {
	const dns = "network_dns_cold_docker_io_ms";
	const https = "network_https_crates_io_total_ms";
	const networkCell = {
		...cell(),
		id: "e2b-network-r0",
		suite: "network" as const,
		workloadRevision: "network-fixed-v1",
		metrics: [dns, https],
	};
	const planned = planExperiment({
		id: "experiment-1",
		sha,
		createdOn: "2026-09-10",
		cells: [networkCell],
	});
	const withMetrics = (samples: Record<string, number[]>, gaps?: ResultGap[]) => {
		const attempt = successful();
		const provider = attempt.run?.providers[0];
		const artifact = provider?.artifactEvidence?.[0];
		if (!attempt.run || !provider || !artifact || !attempt.execution)
			throw new Error("fixture lacks receipts");
		artifact.cell.suite = "network";
		provider.suitesCovered = ["network"];
		provider.metrics = Object.entries(samples).map(([metricId, values]) => ({
			metricId,
			samples: values,
			sourceFile: "network/network-dns--cold--docker.io.json",
			aggregates: aggregate(values),
		}));
		if (gaps) provider.gaps = gaps;
		attempt.evidence.cellId = networkCell.id;
		attempt.evidence.workloadRevision = networkCell.workloadRevision;
		attempt.evidence.planDigest = planned.digest;
		attempt.evidence.runDigest = evidenceDigest(attempt.run);
		attempt.execution.suite = "network";
		return attempt;
	};
	const recorded = withMetrics({ [dns]: [0], [https]: [42.5] });
	const recordedReport = evaluateExperiment(planned, [recorded]);
	expect(recordedReport.complete).toBe(true);
	expect(recordedReport.cells[0]?.missingMetrics).toEqual([]);
	expect(recordedReport.cells[0]?.retainedMetrics).toEqual([dns, https]);
	const published = aggregateExperiment(planned, [recorded]);
	expect(
		published.run?.providers
			.find((provider) => provider.providerId === "e2b")
			?.metrics.find((metric) => metric.metricId === dns)?.samples,
	).toEqual([0]);

	const withheld = withMetrics({ [dns]: [0] });
	const withheldReport = evaluateExperiment(planned, [withheld]);
	expect(withheldReport.complete).toBe(false);
	expect(withheldReport.cells[0]?.missingMetrics).toEqual([https]);
	expect(withheldReport.cells[0]?.retainedMetrics).toEqual([dns]);
	const partial = aggregateExperiment(planned, [withheld], { allowPartial: true });
	const partialProvider = partial.run?.providers.find((provider) => provider.providerId === "e2b");
	expect(partialProvider?.metrics.map((metric) => [metric.metricId, metric.samples])).toEqual([
		[dns, [0]],
	]);
	expect(partialProvider?.gaps.map((gap) => gap.reason)).toEqual([
		`Partial publication withheld unverified measurements: ${https}`,
	]);

	const skipped = withMetrics({ [dns]: [0], [https]: [42.5] }, [
		{ scope: "suite", id: "network", outcome: "skipped", reason: "network-dns: jc not installed" },
	]);
	expect(evaluateExperiment(planned, [skipped]).cells[0]?.retainedMetrics).toEqual([]);
});

test("provenance, duplicate attempts, and measured reruns cannot satisfy coverage", () => {
	const valid = successful();
	expect(evaluateExperiment(plan(), [valid, valid]).complete).toBe(false);
	const wrong = successful();
	wrong.evidence.sha = "c".repeat(40);
	expect(evaluateExperiment(plan(), [wrong]).complete).toBe(false);
	const retry = successful();
	retry.evidence.id = "attempt-2";
	retry.evidence.sequence = 1;
	retry.evidence.previousAttempt = valid.evidence.id;
	expect(evaluateExperiment(plan(), [valid, retry])).toEqual(
		evaluateExperiment(plan(), [retry, valid]),
	);
	expect(evaluateExperiment(plan(), [valid, retry]).complete).toBe(false);
});
test("only a reconciled premeasurement refusal authorizes the next attempt", () => {
	const reviewed = planExperiment({
		id: "experiment-1",
		sha,
		createdOn: "2026-09-10",
		cells: [cell()],
		maxPremeasurementRetries: 1,
	});
	const refusal = successful();
	refusal.run = undefined;
	const { runDigest: _runDigest, ...refusalEvidence } = refusal.evidence;
	refusal.evidence = refusalEvidence;
	Object.assign(refusal.evidence, {
		outcome: "failed",
		measurementStarted: false,
		retryable: true,
		cleanup: "not-allocated",
		completion: "unknown",
	});
	const retry = successful();
	Object.assign(retry.evidence, { id: "attempt-2", sequence: 1, previousAttempt: "attempt-1" });
	expect(evaluateExperiment(plan(), [retry, refusal]).complete).toBe(false);
	refusal.evidence.planDigest = reviewed.digest;
	retry.evidence.planDigest = reviewed.digest;
	expect(evaluateExperiment(reviewed, [retry, refusal]).complete).toBe(true);
});

test("publication requires receipts and restricts measurements to planned eligibility", () => {
	for (const mutate of [
		(a: AttemptWithRun) => {
			a.execution = undefined;
		},
		(a: AttemptWithRun) => {
			a.cleanup = undefined;
		},
		(a: AttemptWithRun) => {
			if (a.cleanup) a.cleanup.confirmedAbsent = false;
		},
		(a: AttemptWithRun) => {
			if (a.execution?.steps[0]) a.execution.steps[0].exitCode = 7;
		},
		(a: AttemptWithRun) => {
			if (a.execution) a.execution.sandboxId = "another-allocation";
		},
	]) {
		const attempt = successful();
		mutate(attempt);
		expect(evaluateExperiment(plan(), [attempt]).complete).toBe(false);
	}
	const attempt = successful();
	const provider = attempt.run?.providers[0];
	if (!provider?.metrics[0]) throw new Error("fixture missing metric");
	provider.metrics.push({ ...provider.metrics[0], metricId: "stream_type_triad" });
	attempt.evidence.runDigest = evidenceDigest(attempt.run);
	expect(
		aggregateExperiment(plan(), [attempt]).run?.providers[0]?.metrics.some(
			(m) => m.metricId === "stream_type_triad",
		),
	).toBe(false);
});

test("aggregation produces readable v7 linkage only from a complete experiment", () => {
	const attempt = successful();
	if (attempt.run) parseRun(attempt.run);
	const result = aggregateExperiment(plan(), [attempt]);
	expect(result.coverage.complete).toBe(true);
	if (!result.run) throw new Error("complete experiment produced no Run");
	expect(parseRun(result.run).experiment?.planDigest).toBe(plan().digest);
	const incomplete = aggregateExperiment(plan(2), [attempt]);
	expect(incomplete.coverage.complete).toBe(false);
	expect(incomplete.run).toBeUndefined();
});

test("a retried step, a tolerated probe, and a re-collected detached step still publish", () => {
	const attempt = successful();
	if (!attempt.execution) throw new Error("fixture has no execution receipt");
	// The harness logs one entry per attempt: setup steps declare retries, the observed-specs probe
	// runs allowFailure, and the collect loop re-runs its (detached) step through read-back blips.
	attempt.execution.steps = [
		{ phase: "setup", label: "install mise", ms: 1, exitCode: 1 },
		{ phase: "setup", label: "install mise", ms: 1, exitCode: null },
		{ phase: "setup", label: "install mise", ms: 1, exitCode: 0 },
		{ phase: "setup", label: "capture observed specs", ms: 1, exitCode: 1, allowFailure: true },
		{ phase: "benchmark", label: "memory", ms: 1, exitCode: 0 },
		{ phase: "collect", label: "collect", ms: 1, exitCode: 0 },
		{ phase: "collect", label: "collect", ms: 1, exitCode: 0 },
	];
	attempt.execution.detached = [
		{
			identity: "bench-1",
			label: "collect",
			phase: "collect",
			state: "collection-failed",
			exitCode: 0,
		},
		{ identity: "bench-2", label: "collect", phase: "collect", state: "completed", exitCode: 0 },
	];
	expect(evaluateExperiment(plan(), [attempt]).complete).toBe(true);

	// The final attempt still decides: a step whose last try failed cannot publish.
	const lastTryFailed = successful();
	if (!lastTryFailed.execution) throw new Error("fixture has no execution receipt");
	lastTryFailed.execution.steps = [
		...attempt.execution.steps,
		{ phase: "setup", label: "install mise", ms: 1, exitCode: 1 },
	];
	lastTryFailed.execution.detached = attempt.execution.detached;
	expect(evaluateExperiment(plan(), [lastTryFailed]).complete).toBe(false);

	// A detached step whose last attempt never completed cannot publish either.
	const lastCollectLost = successful();
	if (!lastCollectLost.execution) throw new Error("fixture has no execution receipt");
	lastCollectLost.execution.steps = attempt.execution.steps;
	lastCollectLost.execution.detached = [...attempt.execution.detached].reverse();
	expect(evaluateExperiment(plan(), [lastCollectLost]).complete).toBe(false);

	// Tolerance covers a reported non-zero exit, never an unobserved completion.
	const probeNeverExited = successful();
	if (!probeNeverExited.execution) throw new Error("fixture has no execution receipt");
	probeNeverExited.execution.steps = [
		...(successful().execution?.steps ?? []),
		{ phase: "setup", label: "capture observed specs", ms: 1, exitCode: null, allowFailure: true },
	];
	expect(evaluateExperiment(plan(), [probeNeverExited]).complete).toBe(false);
});

test("wrong resources, artifact identity, workload revision and pass policy block coverage", () => {
	for (const field of ["workloadRevision", "environmentRevision", "artifactIdentity"] as const) {
		const attempt = successful();
		attempt.evidence[field] = "wrong";
		expect(evaluateExperiment(plan(), [attempt]).complete).toBe(false);
	}
	const attempt = successful();
	if (attempt.run) attempt.run.targetSpec = { vcpus: 8, memoryGb: 16 };
	attempt.evidence.runDigest = evidenceDigest(attempt.run);
	expect(evaluateExperiment(plan(), [attempt]).complete).toBe(false);
});

test("real aggregate and promote commands require intact original evidence", () => {
	const root = mkdtempSync(join(tmpdir(), "experiment-promotion-"));
	try {
		const attempt = successful();
		const directory = join(root, "attempts", attempt.evidence.id);
		mkdirSync(join(directory, "raw"), { recursive: true });
		mkdirSync(join(directory, "raw", "e2b", "memory"), { recursive: true });
		writeFileSync(
			join(directory, "raw", "e2b", "memory", "pts_stream.xml"),
			`<PhoronixTestSuite>${["Copy", "Scale"]
				.map(
					(kind) => `<Result>
<Identifier>pts/stream-1.3.4</Identifier><Title>STREAM</Title><Description>Type: ${kind}</Description>
<Scale>MB/s</Scale><Proportion>HIB</Proportion><Data><Entry><Value>1.5</Value><RawString>1:2</RawString></Entry></Data>
</Result>`,
				)
				.join("")}</PhoronixTestSuite>`,
		);
		writeFileSync(join(directory, "raw", "result.xml"), "<result>fixture</result>");
		writeImmutableJson(join(directory, "raw", "execution-execution-1.json"), attempt.execution);
		writeImmutableJson(join(directory, "raw", "cleanup-execution-1.json"), attempt.cleanup);
		attempt.evidence.rawDigest = rawTreeDigest(join(directory, "raw"));
		writeImmutableJson(join(directory, "attempt.json"), attempt.evidence);
		writeImmutableJson(join(directory, "run.json"), attempt.run);
		const planPath = join(root, "plan.json");
		writeImmutableJson(planPath, plan());
		const invoke = (bin: string, args: string[]) =>
			Bun.spawnSync([process.execPath, resolve(import.meta.dir, "../bin", `${bin}.ts`), ...args], {
				stdout: "pipe",
				stderr: "pipe",
				env: { ...process.env, GITHUB_ACTIONS: "false" },
			});
		const candidate = join(root, "candidate");
		const aggregateResult = invoke("aggregate-experiment", [
			planPath,
			join(root, "attempts"),
			candidate,
		]);
		expect(aggregateResult.exitCode).toBe(0);
		const runFile = join(candidate, "runs", "experiment-1.json");
		const dataset = join(root, "published");
		expect(invoke("promote", [runFile, dataset]).exitCode).toBe(1);
		expect(invoke("promote", [runFile, dataset, planPath, join(root, "attempts")]).exitCode).toBe(
			0,
		);
		expect(
			JSON.parse(readFileSync(join(dataset, "runs", "experiment-1.json"), "utf8")).schemaVersion,
		).toBe("7");
		writeFileSync(join(directory, "raw", "result.xml"), "tampered");
		expect(
			invoke("promote", [runFile, join(root, "tampered"), planPath, join(root, "attempts")])
				.exitCode,
		).toBe(1);
		// Even recomputing valid byte digests cannot replace missing command evidence.
		writeFileSync(join(directory, "raw", "result.xml"), "<result>fixture</result>");
		rmSync(join(directory, "raw", "execution-execution-1.json"));
		attempt.evidence.rawDigest = rawTreeDigest(join(directory, "raw"));
		writeFileSync(join(directory, "attempt.json"), JSON.stringify(attempt.evidence));
		const missingReceipt = invoke("aggregate-experiment", [
			planPath,
			join(root, "attempts"),
			join(root, "missing-receipt"),
		]);
		expect(missingReceipt.exitCode).not.toBe(0);
		expect(missingReceipt.stderr.toString()).toContain("Experiment is incomplete");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
	// Five CLI processes spawned in sequence: under a full parallel workspace run this is a
	// load-sensitive test, and Bun's 5 s default killed the last spawn with no stderr to assert on.
}, 20_000);

test("large experiments retain every cell in explicit collection rounds", () => {
	const result = plan(257);
	expect(ROUND_BATCH_LIMIT).toBe(64);
	expect(result.batches).toHaveLength(86);
	expect(result.batches.flatMap((batch) => batch.cells)).toHaveLength(257);
	expect(result.rounds.map((round) => round.batches.length)).toEqual([64, 22]);
	expect(result.rounds.flatMap((round) => round.batches)).toEqual(
		result.batches.map((batch) => batch.id),
	);
});

test("exclusions cannot vary between providers in one workload cohort", () => {
	const first = cell();
	const second = {
		...cell(),
		id: "novita-memory-r0",
		provider: "novita" as const,
		quotaDomain: "novita-benchmark",
		exclusions: [
			{
				metricId: "stream_type_scale",
				workloadRevision: first.workloadRevision,
				reason: "fixture failure",
				owner: "benchmark maintainers",
				issue: "https://github.com/starslingdev/hpc-sandbox-benchmarks/issues/1",
				expires: "2026-10-01",
			},
		],
	};
	expect(() =>
		planExperiment({ id: "x", sha, createdOn: "2026-09-10", cells: [first, second] }),
	).toThrow("inconsistent comparison cohort");
});

test("a fully quarantined suite is reported separately and consumes no batch capacity", () => {
	const quarantined = {
		...cell(),
		id: "e2b-quarantine-r0",
		suite: "quarantined-suite",
		exclusions: cell().metrics.map((metricId) => ({
			metricId,
			workloadRevision: cell().workloadRevision,
			reason: "fixture",
			owner: "maintainers",
			issue: "https://github.com/starslingdev/hpc-sandbox-benchmarks/issues/1",
			expires: "2026-10-01",
		})),
	};
	const planned = planExperiment({
		id: "experiment-1",
		sha,
		createdOn: "2026-09-10",
		cells: [cell(), quarantined],
	});
	expect(planned.batches.flatMap((batch) => batch.cells)).toEqual([cell().id]);
	const attempt = successful();
	attempt.evidence.planDigest = planned.digest;
	const report = evaluateExperiment(planned, [attempt]);
	expect(report.complete).toBe(true);
	expect(report.cells[1]?.status).toBe("excluded");
});

test("unverified GPU capacity and mixed workload revisions fail admission", () => {
	expect(() =>
		planExperiment({
			id: "x",
			sha,
			createdOn: "2026-09-10",
			cells: [{ ...cell(), gpu: { model: "test-gpu", count: 1 } }],
		}),
	).toThrow("target exceeds");
	expect(() =>
		planExperiment({
			id: "x",
			sha,
			createdOn: "2026-09-10",
			cells: [cell(), { ...cell(1), workloadRevision: "changed" }],
		}),
	).toThrow("inconsistent comparison cohort");
});

test("an attempt from another workflow cannot satisfy experiment coverage", () => {
	const attempt = successful();
	attempt.evidence.workflowRun = "another-workflow";
	expect(evaluateExperiment(plan(), [attempt]).complete).toBe(false);
});

test("stock boots do not require verification of an artifact they never requested", () => {
	const stockCell = {
		...cell(),
		id: "boat-memory-r0",
		provider: "boat" as const,
		quotaDomain: "boat",
		artifactIdentity: evidenceDigest({ kind: "none" }),
	};
	const stockPlan = planExperiment({
		id: "experiment-1",
		sha,
		createdOn: "2026-09-10",
		cells: [stockCell],
	});
	const attempt = successful();
	if (!attempt.run || !attempt.execution) throw new Error("fixture incomplete");
	const provider = attempt.run.providers[0];
	if (!provider?.artifactEvidence?.[0]) throw new Error("fixture missing artifact");
	provider.providerId = "boat";
	provider.artifactEvidence[0].cell.providerId = "boat";
	provider.artifactEvidence[0].provenance = {
		source: "request-fallback",
		requested: { kind: "none" },
	};
	attempt.execution.provider = "boat";
	attempt.evidence.cellId = stockCell.id;
	attempt.evidence.planDigest = stockPlan.digest;
	attempt.evidence.artifactIdentity = stockCell.artifactIdentity;
	attempt.evidence.runDigest = evidenceDigest(attempt.run);
	expect(evaluateExperiment(stockPlan, [attempt]).complete).toBe(true);
});

test("memory is isolated from other synthetic suites in ordered batches", () => {
	const cells = [
		cell(),
		{
			...cell(),
			id: "e2b-system-r0",
			suite: "system",
			workloadRevision: "system-fixed-v1",
			workloadMinutes: 60,
			passes: 1,
		},
		cell(1),
	];
	const result = planExperiment(
		{ id: "mixed", sha, createdOn: "2026-09-10", cells },
		{ "e2b-benchmark": { sandboxes: 30, vcpus: 8, memoryGb: 16 } },
	);
	expect(result.batches.map((batch) => batch.cells)).toEqual([
		["e2b-memory-r0", "e2b-memory-r1"],
		["e2b-system-r0"],
	]);
	expect(result.batches.map((batch) => batch.wave)).toEqual([
		"synthetic-memory",
		"synthetic-system",
	]);
	expect(result.batches.map((batch) => batch.maxConcurrency)).toEqual([2, 2]);
	expect(result.batches.map((batch) => batch.budgetMinutes)).toEqual([85, 105]);
	expect(result.rounds.map((round) => round.wave)).toEqual([
		"synthetic-memory",
		"synthetic-system",
	]);
});

test("different allocation requirements stay in separate account batches", () => {
	for (const change of [{ environmentRevision: "other" }, { startupMinutes: 30 }]) {
		const cells = [
			cell(),
			{ ...cell(), id: "e2b-system-r0", suite: "system", workloadRevision: "system-v1", ...change },
		];
		const result = planExperiment(
			{ id: "mixed", sha, createdOn: "2026-09-10", cells },
			{ "e2b-benchmark": { sandboxes: 30 } },
		);
		expect(result.batches).toHaveLength(2);
	}
});

// Repair exercises the real source verifier and merger, including measured failures.
import {
	aggregateRepairedExperiment,
	buildLeaderboard,
	renderLeaderboardMarkdown,
} from "@sandbox-benchmarks/results";
import { planExperimentRepair, repairWorkflowAxes } from "./experiment-repair.ts";

function replacementFor(recovery: ReturnType<typeof plan>, replicate = 0): AttemptWithRun {
	const a = successful();
	a.evidence.id = `replacement-${replicate}`;
	a.evidence.cellId = cell(replicate).id;
	a.evidence.workflowRun = recovery.id;
	a.evidence.planDigest = recovery.digest;
	if (!a.run || !a.execution) throw new Error("incomplete fixture");
	a.run.runId = recovery.id;
	a.run.replicateIndex = replicate;
	for (const p of a.run.providers)
		for (const e of p.artifactEvidence ?? []) {
			e.cell.runId = recovery.id;
			e.cell.replicateIndex = replicate;
			e.sandboxId = `sandbox-${recovery.id}-${replicate}`;
		}
	a.execution.runId = recovery.id;
	a.execution.replicateIndex = replicate;
	a.execution.sandboxId = `sandbox-${recovery.id}-${replicate}`;
	a.evidence.runDigest = evidenceDigest(a.run);
	return a;
}
const repairIdentity = {
	run: "recovery-2",
	operator: "operator",
	reason: "Explicitly replace all failed cells",
	createdOn: "2026-10-01",
};
function measuredFailure() {
	const a = successful();
	a.evidence.outcome = "failed";
	a.evidence.completion = "known-failure";
	if (!a.execution) throw new Error("missing fixture execution");
	a.execution.steps[0] = { phase: "benchmark", label: "memory", ms: 1, exitCode: 1 };
	return a;
}

test("repair freezes all failures and missing cells, never successful cells", () => {
	const source = plan(3);
	const success = successful();
	success.evidence.planDigest = source.digest;
	const failed = replacementFor(source, 1);
	failed.evidence.id = "original-failed";
	failed.evidence.outcome = "failed";
	failed.evidence.completion = "known-failure";
	const { plan: recovery, repair } = planExperimentRepair(
		source,
		[failed, success],
		repairIdentity,
	);
	expect(repair.cells.map((c) => c.id)).toEqual([cell(1).id, cell(2).id]);
	expect(repair.cells[0]?.previousAttempt).toBe("original-failed");
	expect(repair.cells[1]?.previousAttempt).toBeUndefined();
	const result = aggregateRepairedExperiment(
		source,
		[success, failed],
		recovery,
		[replacementFor(recovery, 2), replacementFor(recovery, 1)],
		repair,
	);
	expect(result.coverage.complete).toBe(true);
	expect(result.run?.runId).toBe(source.id);
	expect(result.run?.experiment?.attemptIds).toContain(success.evidence.id);
	expect(result.run?.experiment?.attemptIds).not.toContain(failed.evidence.id);
	expect(result.run?.experiment?.repair).toEqual(repair);
	if (!result.run) throw new Error("repair fixture must publish");
	expect(renderLeaderboardMarkdown(buildLeaderboard(result.run), [])).toContain(
		"**Repaired experiment.** 2 originally failed or missing cells",
	);
	expect(success.run?.runId).toBe(source.id);
	expect(result.run?.providers[0]?.metrics[0]?.replicates?.length).toBe(3);
});

test("explicit repair replaces measured failures without modifying their evidence", () => {
	const original = measuredFailure();
	const before = evidenceDigest(original);
	const { plan: recovery, repair } = planExperimentRepair(plan(), [original], repairIdentity);
	const next = replacementFor(recovery);
	const rawNext = evidenceDigest(next);
	const result = aggregateRepairedExperiment(plan(), [original], recovery, [next], repair);
	expect(result.coverage.complete).toBe(true);
	expect(result.run?.experiment?.attemptIds).toEqual([next.evidence.id]);
	expect(evidenceDigest(original)).toBe(before);
	expect(evidenceDigest(next)).toBe(rawNext);
});

test("repair refuses unresolved ownership, complete-cell reruns and changed policy", () => {
	const original = measuredFailure();
	original.evidence.cleanup = "unresolved";
	expect(() => planExperimentRepair(plan(), [original], repairIdentity)).toThrow(
		"unresolved cleanup",
	);
	expect(() => planExperimentRepair(plan(), [successful()], repairIdentity)).toThrow(
		"no failed or missing",
	);
	original.evidence.cleanup = "confirmed";
	const { plan: recovery, repair } = planExperimentRepair(plan(), [original], repairIdentity);
	const changed = structuredClone(recovery);
	const c = changed.cells[0];
	if (!c) throw new Error("fixture");
	c.passes = 3;
	const { digest: _digest, ...body } = changed;
	changed.digest = evidenceDigest(body);
	const altered = { ...repair, recoveryPlanDigest: changed.digest };
	const { digest: _repairDigest, ...binding } = altered;
	altered.digest = evidenceDigest(binding);
	expect(() =>
		aggregateRepairedExperiment(plan(), [original], changed, [], altered, { allowPartial: true }),
	).toThrow("execution policy");
});

test("missing replacement artifacts, stale originals and forged binding block repair", () => {
	const original = measuredFailure();
	const { plan: recovery, repair } = planExperimentRepair(plan(), [original], repairIdentity);
	const missing = aggregateRepairedExperiment(plan(), [original], recovery, [], repair, {
		allowPartial: true,
	});
	expect(missing.run).toBeUndefined();
	expect(missing.publicationBlockers).toContain("missing attempts: 1 cell(s)");
	const forged = { ...repair, reason: "changed after approval" };
	expect(() =>
		aggregateRepairedExperiment(plan(), [original], recovery, [replacementFor(recovery)], forged),
	).toThrow("digest mismatch");
	const stale = structuredClone(original);
	stale.evidence.diagnostic = "new original evidence";
	expect(() => aggregateRepairedExperiment(plan(), [stale], recovery, [], repair)).toThrow(
		"frozen selection mismatch",
	);
});

test("partial repair selects the replacement wholesale, rather than best scores or old metrics", () => {
	const source = plan(2);
	const good = successful();
	good.evidence.planDigest = source.digest;
	const failed = replacementFor(source, 1);
	failed.evidence.id = "original-failed";
	failed.evidence.outcome = "failed";
	failed.evidence.completion = "known-failure";
	const { plan: recovery, repair } = planExperimentRepair(source, [good, failed], repairIdentity);
	const retry = replacementFor(recovery, 1);
	retry.evidence.outcome = "failed";
	retry.evidence.completion = "known-failure";
	if (!retry.execution) throw new Error("fixture");
	retry.execution.steps[0] = { phase: "benchmark", label: "memory", ms: 1, exitCode: 1 };
	const result = aggregateRepairedExperiment(source, [good, failed], recovery, [retry], repair, {
		allowPartial: true,
	});
	expect(result.run?.experiment?.partial?.planned).toBe(2);
	expect(result.run?.experiment?.partial?.incomplete).toBe(1);
	expect(result.run?.experiment?.attemptIds).toContain(retry.evidence.id);
	expect(result.run?.experiment?.attemptIds).not.toContain(failed.evidence.id);
	expect(
		aggregateRepairedExperiment(source, [good, failed], recovery, [retry], repair).run,
	).toBeUndefined();
});

test("repair CLI aggregate and promote independently verify replacements and the manifest", () => {
	const root = mkdtempSync(join(tmpdir(), "experiment-repair-promotion-"));
	try {
		const source = plan();
		const { plan: recovery, repair } = planExperimentRepair(source, [], repairIdentity);
		const attempt = replacementFor(recovery);
		const recoveryRoot = join(root, "recovery");
		const dir = join(recoveryRoot, "attempts", attempt.evidence.id);
		const raw = join(dir, "raw");
		mkdirSync(join(raw, "e2b", "memory"), { recursive: true });
		writeFileSync(
			join(raw, "e2b", "memory", "pts_stream.xml"),
			`<PhoronixTestSuite>${["Copy", "Scale"].map((kind) => `<Result><Identifier>pts/stream-1.3.4</Identifier><Title>STREAM</Title><Description>Type: ${kind}</Description><Scale>MB/s</Scale><Proportion>HIB</Proportion><Data><Entry><Value>1.5</Value><RawString>1:2</RawString></Entry></Data></Result>`).join("")}</PhoronixTestSuite>`,
		);
		writeImmutableJson(join(raw, "execution-execution-1.json"), attempt.execution);
		writeImmutableJson(join(raw, "cleanup-execution-1.json"), attempt.cleanup);
		attempt.evidence.rawDigest = rawTreeDigest(raw);
		writeImmutableJson(join(dir, "attempt.json"), attempt.evidence);
		writeImmutableJson(join(dir, "run.json"), attempt.run);
		writeImmutableJson(join(recoveryRoot, "plan.json"), recovery);
		writeImmutableJson(join(recoveryRoot, "repair.json"), repair);
		writeImmutableJson(join(root, "plan.json"), source);
		mkdirSync(join(root, "originals"));
		const invoke = (bin: string, args: string[]) =>
			Bun.spawnSync([process.execPath, resolve(import.meta.dir, "../bin", `${bin}.ts`), ...args], {
				stdout: "pipe",
				stderr: "pipe",
				env: { ...process.env, GITHUB_ACTIONS: "false" },
			});
		const candidate = join(root, "candidate");
		const args = [join(root, "plan.json"), join(root, "originals")];
		const aggregate = invoke("aggregate-experiment", [
			...args,
			candidate,
			"--repair",
			recoveryRoot,
		]);
		expect(aggregate.stderr.toString()).toBe("");
		expect(aggregate.exitCode).toBe(0);
		const runFile = join(candidate, "runs", "experiment-1.json");
		expect(
			invoke("promote", [runFile, join(root, "dataset"), ...args, "--repair", recoveryRoot])
				.exitCode,
		).toBe(0);
		expect(
			JSON.parse(readFileSync(join(root, "dataset", "runs", "experiment-1.json"), "utf8"))
				.experiment.repair.digest,
		).toBe(repair.digest);
		writeFileSync(
			join(recoveryRoot, "repair.json"),
			JSON.stringify({ ...repair, operator: "forged" }),
		);
		expect(
			invoke("promote", [runFile, join(root, "forged"), ...args, "--repair", recoveryRoot])
				.exitCode,
		).not.toBe(0);
		writeFileSync(join(recoveryRoot, "repair.json"), JSON.stringify(repair));
		writeFileSync(join(raw, "cleanup-execution-1.json"), "{}");
		expect(
			invoke("promote", [runFile, join(root, "tampered"), ...args, "--repair", recoveryRoot])
				.exitCode,
		).not.toBe(0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}, 20_000);

test("replacement cleanup recovery keeps its own workflow provenance in the repaired dataset", () => {
	const source = plan(2);
	const good = successful();
	good.evidence.planDigest = source.digest;
	const failed = replacementFor(source, 1);
	failed.evidence.id = "original-failed";
	failed.evidence.outcome = "failed";
	failed.evidence.completion = "known-failure";
	const { plan: recovery, repair } = planExperimentRepair(source, [good, failed], repairIdentity);
	const retry = replacementFor(recovery, 1);
	retry.evidence.outcome = "failed";
	retry.evidence.cleanup = "unresolved";
	retry.evidence.completion = "known-failure";
	if (!retry.execution) throw new Error("fixture");
	retry.execution.steps[0] = { phase: "benchmark", label: "memory", ms: 1, exitCode: 1 };
	retry.cleanupRecovery = {
		kind: "post-run-cleanup",
		attemptId: retry.evidence.id,
		cellId: retry.evidence.cellId,
		planDigest: recovery.digest,
		attemptDigest: evidenceDigest(retry.evidence),
		workflowRun: recovery.id,
		sourceSha: recovery.sha,
		confirmedAt: "2026-10-01T01:00:00Z",
		operator: "operator",
		observation: {
			kind: "sandbox",
			provider: "e2b",
			sandboxId: retry.execution.sandboxId,
			state: "absent",
		},
	};
	const result = aggregateRepairedExperiment(source, [good, failed], recovery, [retry], repair, {
		allowPartial: true,
	});
	expect(result.run?.experiment?.cleanupRecoveries?.[0]?.workflowRun).toBe(recovery.id);
	expect(result.run?.experiment?.cleanupRecoveries?.[0]?.planDigest).toBe(recovery.digest);
	expect(result.run?.runId).toBe(source.id);
});

test("recovery workflow dispatches mixed realworld suites through their shared wave", () => {
	const suites = ["realworld-mastra", "realworld-better-auth", "realworld-openclaw"];
	const source = planExperiment({
		id: "experiment-1",
		sha,
		createdOn: "2026-09-10",
		cells: suites.map((suite) => ({ ...cell(), id: `e2b-${suite}-r0`, quotaDomain: "e2b", suite })),
	});
	const { plan: recovery } = planExperimentRepair(source, [], repairIdentity);
	expect(recovery.batches).toHaveLength(1);
	expect(recovery.batches[0]?.cells).toHaveLength(3);
	expect(repairWorkflowAxes(recovery)).toEqual({
		memory_axis: { include: [] },
		system_axis: { include: [] },
		realworld_axis: {
			include: [{ account: "e2b", providers: '["e2b"]', suite: "realworld", batch_id: "batch-0" }],
		},
	});
	expect(
		repairWorkflowAxes(
			planExperiment({
				id: "single",
				sha,
				createdOn: "2026-09-10",
				cells: [{ ...cell(), quotaDomain: "e2b" }],
			}),
		).memory_axis,
	).toEqual({
		include: [{ account: "e2b", providers: '["e2b"]', suite: "memory", batch_id: "batch-0" }],
	});
});

import { verifyUnstartedBatches } from "@sandbox-benchmarks/results";
import {
	UNSTARTED_BATCH_SOURCE_REVISION,
	UNSTARTED_BATCH_WORKFLOW_REVISION,
} from "@sandbox-benchmarks/schema";
import { collectUnstartedBatches } from "./unstarted-batches.ts";

function requiredFixture<T>(value: T | undefined): T {
	if (value === undefined) throw new Error("missing fixture");
	return value;
}

function unstartedFixture(extraMissing = false) {
	const vercel: ExperimentCell = {
		...cell(1),
		id: "vercel-memory-r1",
		provider: "vercel",
		quotaDomain: "vercel",
	};
	const source = planExperiment({
		id: "experiment-1",
		sha: UNSTARTED_BATCH_SOURCE_REVISION,
		createdOn: "2026-09-10",
		cells: [cell(), vercel, ...(extraMissing ? [cell(2)] : [])],
	});
	const good = successful();
	good.evidence.planDigest = source.digest;
	good.evidence.sha = source.sha;
	if (!good.run) throw new Error("fixture Run");
	good.run.sha = source.sha;
	good.evidence.runDigest = evidenceDigest(good.run);
	const { plan: recovery, repair } = planExperimentRepair(source, [good], {
		...repairIdentity,
		run: "1234",
	});
	const batch = recovery.batches.find((b) => b.quotaDomain === "vercel");
	if (!batch) throw new Error("fixture batch");
	const workflow = {
		id: 1234,
		run_attempt: 1,
		head_sha: UNSTARTED_BATCH_WORKFLOW_REVISION,
		head_branch: "main",
		path: ".github/workflows/recover-benchmark.yml",
		event: "workflow_dispatch",
		status: "completed",
		actor: { login: "operator" },
	};
	const job = {
		id: 5678,
		run_id: 1234,
		run_attempt: 1,
		head_sha: workflow.head_sha,
		name: `retry-memory (vercel, ["vercel"], memory, ${batch.id}) / vercel`,
		status: "completed",
		conclusion: "failure",
		steps: [
			{ number: 8, name: "Authenticate with Vercel", status: "completed", conclusion: "failure" },
			{ number: 9, name: "Run suite and normalize", status: "completed", conclusion: "skipped" },
		],
	};
	const collect = (changedJob = job, changedWorkflow = workflow) =>
		collectUnstartedBatches(
			async () => ({ total_count: 1, jobs: [changedJob] }),
			{ read: async () => [], append: async () => {} },
			recovery,
			[],
			changedWorkflow,
			"operator",
		);
	return { source, good, recovery, repair, job, workflow, collect, batch };
}

test("verified authentication failure publishes partial repair with missing cells and no synthetic attempts", async () => {
	const f = unstartedFixture();
	const receipts = await f.collect();
	expect(receipts).toHaveLength(1);
	const result = aggregateRepairedExperiment(f.source, [f.good], f.recovery, [], f.repair, {
		allowPartial: true,
		unstartedBatches: receipts,
	});
	expect(result.run?.schemaVersion).toBe("8");
	expect(result.run?.experiment?.partial?.planned).toBe(2);
	expect(result.run?.experiment?.partial?.cells.find((c) => c.provider === "vercel")?.status).toBe(
		"missing",
	);
	expect(result.run?.experiment?.attemptIds).toEqual([f.good.evidence.id]);
	expect(result.run?.experiment?.unstartedBatches).toEqual(receipts);
	if (!result.run) throw new Error("fixture Run");
	expect(renderLeaderboardMarkdown(buildLeaderboard(result.run), [])).toContain(
		"1 never reached execution and remain missing",
	);
	expect(result.run?.providers.find((p) => p.providerId === "vercel")?.metrics ?? []).toEqual([]);
	expect(
		aggregateRepairedExperiment(f.source, [f.good], f.recovery, [], f.repair, {
			unstartedBatches: receipts,
		}).run,
	).toBeUndefined();
	expect(
		aggregateRepairedExperiment(f.source, [f.good], f.recovery, [], f.repair, {
			allowPartial: true,
		}).run,
	).toBeUndefined();
	const unrelated = unstartedFixture(true);
	expect(
		aggregateRepairedExperiment(
			unrelated.source,
			[unrelated.good],
			unrelated.recovery,
			[],
			unrelated.repair,
			{ allowPartial: true, unstartedBatches: await unrelated.collect() },
		).run,
	).toBeUndefined();
});

test("unstarted collection rejects execution, stale workflows, duplicate jobs and ownership", async () => {
	const f = unstartedFixture();
	const executed = structuredClone(f.job);
	requiredFixture(executed.steps[1]).conclusion = "failure";
	expect(await f.collect(executed)).toEqual([]);
	expect(await f.collect(f.job, { ...f.workflow, status: "in_progress" })).toEqual([]);
	expect(await f.collect(f.job, { ...f.workflow, head_sha: sha })).toEqual([]);
	await expect(f.collect({ ...f.job, run_attempt: 2 })).rejects.toThrow("stale");
	await expect(
		collectUnstartedBatches(
			async () => ({ total_count: 2, jobs: [f.job, f.job] }),
			{ read: async () => [], append: async () => {} },
			f.recovery,
			[],
			f.workflow,
			"operator",
		),
	).rejects.toThrow("ambiguous");
	await expect(
		collectUnstartedBatches(
			async () => ({ total_count: 1, jobs: [f.job] }),
			{
				read: async () => [
					{
						version: "1",
						kind: "intent",
						account: "vercel",
						attempt: "intent",
						cellId: requiredFixture(f.batch.cells[0]),
						planDigest: f.recovery.digest,
					},
				],
				append: async () => {},
			},
			f.recovery,
			[],
			f.workflow,
			"operator",
		),
	).rejects.toThrow("ownership");
	let reads = 0;
	await expect(
		collectUnstartedBatches(
			async () => ({ total_count: 2, jobs: reads++ ? [] : [f.job] }),
			{ read: async () => [], append: async () => {} },
			f.recovery,
			[],
			f.workflow,
			"operator",
		),
	).rejects.toThrow("incomplete");
});

test("publication independently rejects altered receipts, false bindings and conflicting artifacts", async () => {
	const f = unstartedFixture();
	const receipts = await f.collect();
	const receipt = requiredFixture(receipts[0]);
	const altered = structuredClone(receipt);
	requiredFixture(altered.job.steps[1]).conclusion = "failure";
	expect(() => verifyUnstartedBatches(f.recovery, [], [altered], "operator")).toThrow();
	for (const change of [
		(r: typeof receipt) => {
			r.job.run_id++;
		},
		(r: typeof receipt) => {
			r.cellIds = ["unplanned"];
		},
		(r: typeof receipt) => {
			r.workflow.actor.login = "other";
		},
		(r: typeof receipt) => {
			requiredFixture(r.job.steps[1]).conclusion = "success";
		},
		(r: typeof receipt) => {
			r.workflow.head_sha = sha;
			r.job.head_sha = sha;
		},
		(r: typeof receipt) => {
			r.journal.recordsDigest = digest;
		},
	]) {
		const changed = structuredClone(receipt);
		change(changed);
		const { digest: _old, ...body } = changed;
		changed.digest = evidenceDigest(body);
		expect(() => verifyUnstartedBatches(f.recovery, [], [changed], "operator")).toThrow(
			"provenance",
		);
	}
	expect(() => verifyUnstartedBatches(f.recovery, [], [receipt, receipt], "operator")).toThrow();
	const conflicting = structuredClone(f.good);
	conflicting.evidence.cellId = requiredFixture(f.batch.cells[0]);
	expect(() => verifyUnstartedBatches(f.recovery, [conflicting], receipts, "operator")).toThrow();
	const run = aggregateRepairedExperiment(f.source, [f.good], f.recovery, [], f.repair, {
		allowPartial: true,
		unstartedBatches: receipts,
	}).run;
	if (!run) throw new Error("fixture publication");
	requiredFixture(run.experiment?.unstartedBatches?.[0]).cellIds = [cell().id];
	expect(() => parseRun(run)).toThrow("missing repair cells");
});

test("CLI promotion rereads the unstarted receipt after candidate aggregation", async () => {
	const root = mkdtempSync(join(tmpdir(), "unstarted-promotion-"));
	try {
		const f = unstartedFixture();
		const originals = join(root, "originals");
		const dir = join(originals, f.good.evidence.id);
		const raw = join(dir, "raw");
		mkdirSync(join(raw, "e2b", "memory"), { recursive: true });
		writeFileSync(
			join(raw, "e2b", "memory", "pts_stream.xml"),
			`<PhoronixTestSuite>${["Copy", "Scale"].map((kind) => `<Result><Identifier>pts/stream-1.3.4</Identifier><Title>STREAM</Title><Description>Type: ${kind}</Description><Scale>MB/s</Scale><Proportion>HIB</Proportion><Data><Entry><Value>1.5</Value><RawString>1:2</RawString></Entry></Data></Result>`).join("")}</PhoronixTestSuite>`,
		);
		writeImmutableJson(join(raw, "execution-execution-1.json"), f.good.execution);
		writeImmutableJson(join(raw, "cleanup-execution-1.json"), f.good.cleanup);
		f.good.evidence.rawDigest = rawTreeDigest(raw);
		writeImmutableJson(join(dir, "attempt.json"), f.good.evidence);
		writeImmutableJson(join(dir, "run.json"), f.good.run);
		const { repair } = planExperimentRepair(f.source, [f.good], {
			...repairIdentity,
			run: f.recovery.id,
		});
		const recovery = join(root, "recovery");
		mkdirSync(join(recovery, "attempts"), { recursive: true });
		writeImmutableJson(join(recovery, "plan.json"), f.recovery);
		writeImmutableJson(join(recovery, "repair.json"), repair);
		const receipts = await f.collect();
		writeImmutableJson(join(recovery, "unstarted-batches.json"), receipts);
		writeImmutableJson(join(root, "plan.json"), f.source);
		const invoke = (bin: string, args: string[]) =>
			Bun.spawnSync([process.execPath, resolve(import.meta.dir, "../bin", `${bin}.ts`), ...args], {
				stdout: "pipe",
				stderr: "pipe",
				env: { ...process.env, GITHUB_ACTIONS: "false" },
			});
		const args = [join(root, "plan.json"), originals];
		const flags = ["--allow-partial", "--repair", recovery];
		const candidate = join(root, "candidate");
		const aggregate = invoke("aggregate-experiment", [...args, candidate, ...flags]);
		expect(aggregate.stderr.toString()).toBe("");
		expect(aggregate.exitCode).toBe(0);
		const run = join(candidate, "runs", "experiment-1.json");
		expect(invoke("promote", [run, join(root, "dataset"), ...args, ...flags]).exitCode).toBe(0);
		const receipt = requiredFixture(receipts[0]);
		requiredFixture(receipt.job.steps[1]).conclusion = "success";
		const { digest: _old, ...body } = receipt;
		receipt.digest = evidenceDigest(body);
		writeFileSync(join(recovery, "unstarted-batches.json"), JSON.stringify(receipts));
		const refused = invoke("promote", [run, join(root, "tampered"), ...args, ...flags]);
		expect(refused.exitCode).not.toBe(0);
		expect(refused.stderr.toString()).toContain("pre-execution failure provenance");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}, 20_000);
