import { createHash } from "node:crypto";
import type {
	CleanupReceipt,
	ExecutionReceipt,
	ExperimentAttempt,
	ExperimentPlan,
	Run,
} from "@sandbox-benchmarks/schema";
import {
	artifactVerified,
	BENCH_JOB_CEILING_MINUTES,
	benchmarkWave,
	canonicalJsonString,
	cleanupReceiptSchema,
	effectiveArtifact,
	executionReceiptSchema,
	experimentAttemptSchema,
	experimentPlanSchema,
	getMetric,
	getProvider,
	parseRun,
	providerReportedNothing,
} from "@sandbox-benchmarks/schema";
import { aggregateRuns } from "./aggregate.ts";
import type { PtsTrialEvidence } from "./pts-trial-evidence.ts";

export function evidenceDigest(value: unknown): string {
	// Full experiment/Run envelopes are larger than individual vendor response diagnostics.
	return `sha256:${createHash("sha256")
		.update(
			canonicalJsonString(value, {
				maxBytes: 32 * 1024 * 1024,
				maxDepth: 64,
				maxNodes: 1_000_000,
				maxArrayLength: 100_000,
				maxObjectKeys: 10_000,
				maxStringLength: 1024 * 1024,
				maxKeyLength: 1024,
			}),
		)
		.digest("hex")}`;
}

export function verifyExperimentPlan(value: unknown): ExperimentPlan {
	const plan = experimentPlanSchema.assert(value);
	const { digest, ...body } = plan;
	if (evidenceDigest(body) !== digest) throw new Error("experiment plan digest mismatch");
	const validDate = (date: string) => {
		const parsed = new Date(`${date}T00:00:00Z`);
		return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
	};
	if (!validDate(plan.createdOn)) throw new Error("invalid experiment creation date");
	const cells = new Map(plan.cells.map((cell) => [cell.id, cell]));
	const quotaDomains = new Map<string, string>();
	for (const cell of plan.cells) {
		if (evidenceDigest(cell.target) !== evidenceDigest(plan.cells[0]?.target))
			throw new Error("a published experiment requires one target resource specification");
		const vendor = getProvider(cell.provider).vendor;
		if (quotaDomains.has(vendor) && quotaDomains.get(vendor) !== cell.quotaDomain)
			throw new Error(`shared provider credentials require one quota domain: ${vendor}`);
		quotaDomains.set(vendor, cell.quotaDomain);
	}
	if (cells.size !== plan.cells.length) throw new Error("duplicate experiment cell");
	const logical = new Set(
		plan.cells.map((cell) => `${cell.provider}/${cell.suite}/${cell.replicate}`),
	);
	if (logical.size !== cells.size) throw new Error("duplicate logical replicate");
	const assigned = new Set<string>();
	const eligibleCells = plan.cells.filter((cell) =>
		cell.metrics.some((metric) => !cell.exclusions.some((entry) => entry.metricId === metric)),
	);
	if (eligibleCells.length === 0) throw new Error("experiment has no eligible work");
	const accounts = new Map(plan.accounts.map((account) => [account.quotaDomain, account]));
	if (accounts.size !== plan.accounts.length) throw new Error("duplicate quota domain");
	const batchIds = new Set<string>();
	for (const batch of plan.batches) {
		const account = accounts.get(batch.quotaDomain);
		if (
			!account ||
			batch.maxConcurrency > account.sandboxes ||
			batch.cells.length < 1 ||
			batch.budgetMinutes > BENCH_JOB_CEILING_MINUTES
		) {
			throw new Error(`invalid account batch capacity: ${batch.id}`);
		}
		if (batchIds.has(batch.id)) throw new Error("duplicate experiment batch");
		batchIds.add(batch.id);
		for (const id of batch.cells) {
			const cell = cells.get(id);
			if (
				!cell ||
				!eligibleCells.includes(cell) ||
				assigned.has(id) ||
				cell.quotaDomain !== batch.quotaDomain
			) {
				throw new Error(`invalid batch assignment: ${id}`);
			}
			assigned.add(id);
		}
		const members = batch.cells.map((id) => cells.get(id)).filter((cell) => cell !== undefined);
		if (
			batch.wave !== undefined &&
			members.some((cell) => benchmarkWave(cell.suite) !== batch.wave)
		)
			throw new Error(`batch mixes synthetic and realworld work: ${batch.id}`);
		// Rolling admission runs at most maxConcurrency cells at once; capacity is checked against
		// that window, not the full batch length.
		const sample = members[0];
		const memberBudgets = members.map(
			(cell) => cell.startupMinutes + cell.workloadMinutes + cell.finishMinutes + 15,
		);
		const maxMemberBudget = Math.max(0, ...memberBudgets);
		if (
			!sample ||
			(sample.gpu?.count ?? 0) * batch.maxConcurrency > (account.gpus ?? 0) ||
			sample.target.vcpus * batch.maxConcurrency > (account.vcpus ?? Infinity) ||
			sample.target.memoryGb * batch.maxConcurrency > (account.memoryGb ?? Infinity) ||
			Math.ceil(members.length / batch.maxConcurrency) * maxMemberBudget > batch.budgetMinutes
		) {
			throw new Error(`batch exceeds resource or time budget: ${batch.id}`);
		}
	}
	if (assigned.size !== eligibleCells.length)
		throw new Error("experiment cells missing from batches");
	const scheduled = new Set<string>();
	const roundIds = new Set<string>();
	for (const round of plan.rounds) {
		if (roundIds.has(round.id) || round.batches.length > 256)
			throw new Error(`invalid collection round: ${round.id}`);
		roundIds.add(round.id);
		for (const id of round.batches) {
			const batch = plan.batches.find((entry) => entry.id === id);
			if (
				!batch ||
				batch.quotaDomain !== round.quotaDomain ||
				(batch.wave !== undefined && round.wave !== undefined && batch.wave !== round.wave) ||
				scheduled.has(id)
			)
				throw new Error(`invalid round assignment: ${id}`);
			scheduled.add(id);
		}
	}
	if (scheduled.size !== plan.batches.length)
		throw new Error("batches missing from collection rounds");
	const cohorts = new Map<string, string>();
	for (const cell of cells.values()) {
		const cohort = cell.suite;
		const eligibility = evidenceDigest({
			workloadRevision: cell.workloadRevision,
			metrics: cell.metrics.toSorted(),
			exclusions: cell.exclusions.toSorted((a, b) => a.metricId.localeCompare(b.metricId)),
			environmentRevision: cell.environmentRevision,
			passes: cell.passes,
		});
		if (cohorts.has(cohort) && cohorts.get(cohort) !== eligibility)
			throw new Error(`inconsistent comparison cohort: ${cohort}`);
		cohorts.set(cohort, eligibility);
		if (new Set(cell.metrics).size !== cell.metrics.length)
			throw new Error("duplicate required metric");
		const excluded = new Set<string>();
		for (const exclusion of cell.exclusions) {
			if (
				!validDate(exclusion.expires) ||
				exclusion.workloadRevision !== cell.workloadRevision ||
				!cell.metrics.includes(exclusion.metricId) ||
				exclusion.expires <= plan.createdOn ||
				excluded.has(exclusion.metricId)
			) {
				throw new Error(`invalid or expired exclusion: ${cell.id}/${exclusion.metricId}`);
			}
			excluded.add(exclusion.metricId);
		}
	}
	return plan;
}

export interface AttemptWithRun {
	evidence: ExperimentAttempt;
	run?: Run;
	execution?: ExecutionReceipt;
	cleanup?: CleanupReceipt;
	/** When present, raw verification takes precedence over a shard's declared sample origin. */
	ptsTrials?: PtsTrialEvidence[];
}

export interface CoverageReport {
	planDigest: string;
	complete: boolean;
	selectedAttempts: string[];
	cells: Array<{
		id: string;
		status: "complete" | "missing" | "failed" | "cancelled" | "excluded";
		missingMetrics: string[];
		excludedMetrics: string[];
		attemptId?: string;
		retainedMetrics?: string[];
		passShortfalls?: Array<PtsTrialEvidence & { expected: number }>;
	}>;
	conflicts: string[];
}

/**
 * Name what fell short in a coverage report, so a non-zero exit never lands without saying which
 * cells were incomplete. `failed` and `cancelled` cells come first (a provider actually refused the
 * work, the actionable case) ahead of `missing` ones, which are usually a whole wave that never ran
 * and would otherwise bury the rest. Beyond `limit` cells the remainder is tallied rather than
 * listed — a skipped realworld wave is hundreds of cells and must not flood a job log.
 */
export function describeCoverageShortfall(report: CoverageReport, limit = 20): string[] {
	const rank = { failed: 0, cancelled: 1, missing: 2 } as const;
	const short = report.cells
		.filter((cell) => cell.status in rank)
		.sort(
			(a, b) =>
				rank[a.status as keyof typeof rank] - rank[b.status as keyof typeof rank] ||
				a.id.localeCompare(b.id),
		);
	const tally = new Map<string, number>();
	for (const cell of report.cells) tally.set(cell.status, (tally.get(cell.status) ?? 0) + 1);
	const lines = [
		`coverage: ${[...tally]
			.sort()
			.map(([status, count]) => `${status}=${count}`)
			.join(" ")}`,
		...report.conflicts.map((conflict) => `conflict: ${conflict}`),
		...short.slice(0, limit).map((cell) => {
			// Which metrics fell short only diagnoses a cell that RAN: a `missing` cell was never
			// attempted, so listing its whole metric set is noise that hides the failures above it.
			const missing =
				cell.status !== "missing" && cell.missingMetrics.length > 0
					? ` missing=${cell.missingMetrics.join(",")}`
					: "";
			const passes = cell.passShortfalls?.length
				? ` passes=${cell.passShortfalls.map((entry) => `${entry.metricId}:${entry.observed ?? "unknown"}/${entry.expected}(${entry.source})`).join(",")}`
				: "";
			return `${cell.status}: ${cell.id}${missing}${passes}`;
		}),
	];
	if (short.length > limit) lines.push(`… and ${short.length - limit} more incomplete cell(s)`);
	return lines;
}

/**
 * The harness logs one entry per ATTEMPT of a step (retried setup steps, re-collected results), so
 * a step is judged by its final attempt: an earlier failure that a later attempt superseded is
 * evidence of a retry, not of a failed run. Keyed by phase + label because the same label can name
 * different work in different phases.
 */
function finalAttempts<T extends { phase: string; label: string }>(entries: readonly T[]): T[] {
	return [...new Map(entries.map((entry) => [`${entry.phase}\0${entry.label}`, entry])).values()];
}

/** A step succeeded, or was declared tolerant of failure AND actually reported an exit code — the
 *  tolerance covers a non-zero exit, never a step whose completion was not observed. */
function stepAccepted(step: { exitCode: number | null; allowFailure?: boolean }): boolean {
	return step.exitCode === 0 || (step.allowFailure === true && step.exitCode !== null);
}

/** Evaluate whole attempts against the frozen denominator. Artifact order never selects a sample. */
export function evaluateExperiment(
	input: unknown,
	attempts: readonly AttemptWithRun[],
): CoverageReport {
	const plan = verifyExperimentPlan(input);
	const report: CoverageReport = {
		planDigest: plan.digest,
		complete: false,
		selectedAttempts: [],
		cells: [],
		conflicts: [],
	};
	const ids = new Set<string>();
	const knownCells = new Set(plan.cells.map((cell) => cell.id));
	for (const { evidence: raw, run } of attempts.toSorted((a, b) =>
		a.evidence.id.localeCompare(b.evidence.id),
	)) {
		const evidence = experimentAttemptSchema.assert(raw);
		if (run) parseRun(run);
		if (ids.has(evidence.id)) report.conflicts.push(`duplicate attempt: ${evidence.id}`);
		ids.add(evidence.id);
		if (
			!knownCells.has(evidence.cellId) ||
			evidence.workflowRun !== plan.id ||
			evidence.planDigest !== plan.digest ||
			evidence.sha !== plan.sha
		) {
			report.conflicts.push(`attempt provenance mismatch: ${evidence.id}`);
		}
		const cell = plan.cells.find((entry) => entry.id === evidence.cellId);
		if (
			cell &&
			(evidence.workloadRevision !== cell.workloadRevision ||
				evidence.environmentRevision !== cell.environmentRevision ||
				evidence.artifactIdentity !== cell.artifactIdentity ||
				evidence.passes !== cell.passes)
		) {
			report.conflicts.push(`attempt execution policy mismatch: ${evidence.id}`);
		}
		if (
			run &&
			(!cell ||
				run.sha !== plan.sha ||
				run.runId !== plan.id ||
				evidenceDigest(run.targetSpec) !== evidenceDigest(cell?.target) ||
				evidenceDigest(run) !== evidence.runDigest)
		) {
			report.conflicts.push(`attempt shard mismatch: ${evidence.id}`);
		}
	}
	for (const cell of plan.cells) {
		const lineage = attempts
			.filter(({ evidence }) => evidence.cellId === cell.id)
			.toSorted(
				(a, b) =>
					a.evidence.sequence - b.evidence.sequence || a.evidence.id.localeCompare(b.evidence.id),
			);
		const excludedMetrics = cell.exclusions.map((exclusion) => exclusion.metricId);
		const eligible = cell.metrics.filter((id) => !excludedMetrics.includes(id));
		if (eligible.length === 0) {
			if (lineage.length > 0)
				report.conflicts.push(`unexpected execution of excluded cell: ${cell.id}`);
			report.cells.push({ id: cell.id, status: "excluded", missingMetrics: [], excludedMetrics });
			continue;
		}
		let validLineage = lineage.length <= plan.maxPremeasurementRetries + 1;
		for (let index = 0; index < lineage.length; index++) {
			const current = lineage[index]?.evidence;
			const previous = lineage[index - 1]?.evidence;
			if (
				!current ||
				current.sequence !== index ||
				(previous
					? current.previousAttempt !== previous.id ||
						previous.outcome !== "failed" ||
						previous.measurementStarted ||
						!previous.retryable ||
						previous.cleanup === "unresolved"
					: current.previousAttempt !== undefined)
			)
				validLineage = false;
		}
		if (!validLineage) report.conflicts.push(`unauthorized retry lineage: ${cell.id}`);
		const selected = lineage.at(-1);
		const provider = selected?.run?.providers.find((entry) => entry.providerId === cell.provider);
		const artifact = provider?.artifactEvidence?.find(
			(entry) => entry.cell.suite === cell.suite && entry.cell.replicateIndex === cell.replicate,
		);
		// Declared metrics need real samples — an empty samples array (or non-positive values) is a
		// shortfall, not coverage. Frozen CPU run 34672199543 finished PTS exit 0 for mastra/openclaw
		// while Test Core / Shrinkwrap / Test Unit Fast produced no positive samples.
		const passShortfalls = (provider?.metrics ?? [])
			.filter((metric) => {
				const definition = getMetric(metric.metricId);
				// Only a known non-PTS definition establishes an independent sampling contract.
				// Retiring a catalog entry cannot turn a frozen PTS metric into a harness timing.
				return eligible.includes(metric.metricId) && (!definition || definition.pts !== undefined);
			})
			.map((metric): PtsTrialEvidence & { expected: number } => ({
				providerId: cell.provider,
				metricId: metric.metricId,
				expected: cell.passes,
				...(!getMetric(metric.metricId)
					? { source: "unverified" as const }
					: selected?.ptsTrials !== undefined
						? (selected.ptsTrials.find(
								(entry) => entry.providerId === cell.provider && entry.metricId === metric.metricId,
							) ?? { source: "unverified" as const })
						: {
								source: metric.ptsSampleSource ?? "unverified",
								...(metric.ptsSampleSource === "raw-string"
									? { observed: metric.samples.length }
									: {}),
							}),
			}))
			.filter((entry) =>
				entry.source === "single-trial-value"
					? entry.observed !== 1 || entry.expected !== 1
					: entry.source !== "raw-string" || entry.observed !== entry.expected,
			);
		const measured = new Set(
			(provider?.metrics ?? [])
				.filter(
					(metric) =>
						metric.samples.length > 0 &&
						metric.samples.every((sample) => Number.isFinite(sample) && sample > 0) &&
						// PTS Value alone has unknown trial count; verified one-execution metadata can
						// prove one trial. Harness timings have their own sampling contract.
						!passShortfalls.some((entry) => entry.metricId === metric.metricId),
				)
				.map((metric) => metric.metricId),
		);
		const missingMetrics = eligible.filter((id) => !measured.has(id));
		const evidence = selected?.evidence;
		const execution = selected?.execution && executionReceiptSchema.assert(selected.execution);
		const cleanup = selected?.cleanup && cleanupReceiptSchema.assert(selected.cleanup);
		const receiptsConfirmSuccess =
			execution !== undefined &&
			cleanup !== undefined &&
			execution.runId === plan.id &&
			execution.provider === cell.provider &&
			execution.suite === cell.suite &&
			execution.replicateIndex === cell.replicate &&
			cleanup.executionId === execution.executionId &&
			cleanup.completed &&
			cleanup.confirmedAbsent &&
			execution.primaryFailure === null &&
			execution.steps.some((step) => step.phase === "benchmark") &&
			execution.steps.some((step) => step.phase === "collect") &&
			finalAttempts(execution.steps).every(stepAccepted) &&
			finalAttempts(execution.detached).every(
				(step) => step.state === "completed" && stepAccepted(step),
			) &&
			artifact?.sandboxId === execution.sandboxId;
		const measurementVerified =
			receiptsConfirmSuccess &&
			evidence?.outcome === "completed" &&
			evidence.completion === "known-success" &&
			evidence.measurementStarted &&
			evidence.cleanup === "confirmed" &&
			evidence.rawDigest !== undefined &&
			selected?.run?.providers.every(
				(entry) => entry.providerId === cell.provider || providerReportedNothing(entry),
			) &&
			artifact !== undefined &&
			// Stock boots have no artifact to verify, matching driver conformance. Named
			// artifacts still require observed attribution, never the request alone.
			(artifact.provenance.requested.kind === "none" || artifactVerified(artifact)) &&
			evidenceDigest(effectiveArtifact(artifact.provenance)) === cell.artifactIdentity &&
			selected?.run?.replicateIndex === cell.replicate &&
			provider?.suitesCovered.includes(cell.suite) &&
			!provider.gaps.some((gap) => {
				if (gap.scope !== "suite" || gap.id !== cell.suite) return true;
				return gap.cause?.kind !== "metrics-unrecorded";
			});
		const completed =
			measurementVerified &&
			provider !== undefined &&
			missingMetrics.length === 0 &&
			!provider.gaps.some((gap) => {
				return (
					gap.cause?.kind !== "metrics-unrecorded" ||
					gap.cause.metricIds.some((id) => !excludedMetrics.includes(id))
				);
			});
		const status = !selected
			? "missing"
			: completed && validLineage
				? "complete"
				: evidence?.outcome === "cancelled"
					? "cancelled"
					: "failed";
		report.cells.push({
			id: cell.id,
			status,
			missingMetrics,
			excludedMetrics,
			...(evidence ? { attemptId: evidence.id } : {}),
			retainedMetrics:
				measurementVerified && validLineage ? eligible.filter((id) => measured.has(id)) : [],
			...(passShortfalls.length ? { passShortfalls } : {}),
		});
		if (status === "complete" && evidence) report.selectedAttempts.push(evidence.id);
	}
	report.complete =
		report.conflicts.length === 0 &&
		report.cells.every((cell) => cell.status === "complete" || cell.status === "excluded");
	return report;
}

export interface ExperimentAggregation {
	coverage: CoverageReport;
	/** Verified complete publication, or explicitly requested partial publication with frozen coverage. */
	run?: Run;
}

/** A stopped admission never enters the harness, so its terminal receipt has no shard Run. */
function isUnallocatedFailureWithoutRun(attempt: AttemptWithRun): boolean {
	return (
		attempt.run === undefined &&
		attempt.evidence.runDigest === undefined &&
		attempt.evidence.outcome === "failed" &&
		!attempt.evidence.measurementStarted &&
		attempt.evidence.completion !== "known-success" &&
		attempt.evidence.cleanup === "not-allocated" &&
		attempt.execution === undefined &&
		attempt.cleanup === undefined
	);
}

/**
 * Only this path creates a Run with verified experiment linkage. It evaluates coverage itself (a
 * caller-supplied report could not be trusted) and hands that report back, so a caller that must
 * persist coverage whether or not publication proceeds evaluates exactly once.
 */
export function aggregateExperiment(
	plan: ExperimentPlan,
	attempts: readonly AttemptWithRun[],
	options: { allowPartial?: boolean } = {},
): ExperimentAggregation {
	const coverage = evaluateExperiment(plan, attempts);
	const partial = !coverage.complete && options.allowPartial === true;
	if (!coverage.complete && !partial) return { coverage };
	// Partial publication relaxes metric completeness only. Missing evidence, conflicting provenance
	// and unresolved allocations still cannot be published.
	if (
		partial &&
		(coverage.conflicts.length > 0 ||
			coverage.cells.some((cell) => cell.status === "missing") ||
			attempts.some(
				(attempt) =>
					(!attempt.run && !isUnallocatedFailureWithoutRun(attempt)) ||
					!attempt.evidence.rawDigest ||
					attempt.evidence.cleanup === "unresolved",
			) ||
			!coverage.cells.some((cell) => (cell.retainedMetrics?.length ?? 0) > 0))
	)
		return { coverage };
	const selectedIds = partial
		? coverage.cells.flatMap((cell) => (cell.attemptId ? [cell.attemptId] : []))
		: coverage.selectedAttempts;
	const selected = new Set(selectedIds);
	const selectedAttempts = attempts
		.filter(({ evidence }) => selected.has(evidence.id))
		.toSorted((a, b) => a.evidence.cellId.localeCompare(b.evidence.cellId));
	const runs = selectedAttempts
		.filter((attempt) => !(partial && isUnallocatedFailureWithoutRun(attempt)))
		.map(({ run, evidence }) => {
			if (!run || Number(run.schemaVersion) < 6)
				throw new Error("experiment publication requires artifact-attributed shards");
			const cell = plan.cells.find((entry) => entry.id === evidence.cellId);
			const retained =
				coverage.cells.find((entry) => entry.id === evidence.cellId)?.retainedMetrics ?? [];
			const eligible = new Set(
				partial
					? retained
					: cell?.metrics.filter((id) => !cell.exclusions.some((entry) => entry.metricId === id)),
			);
			const omitted =
				cell?.metrics.filter(
					(id) => !eligible.has(id) && !cell.exclusions.some((entry) => entry.metricId === id),
				) ?? [];
			return {
				...run,
				providers: run.providers.map((provider) => ({
					...provider,
					metrics:
						provider.providerId === cell?.provider
							? provider.metrics.filter((metric) => eligible.has(metric.metricId))
							: [],
					validationStatus:
						provider.providerId === cell?.provider &&
						provider.metrics.some((metric) => eligible.has(metric.metricId))
							? ("validated" as const)
							: ("pending" as const),
					gaps:
						partial && provider.providerId === cell?.provider && omitted.length > 0
							? [
									...provider.gaps,
									{
										scope: "suite" as const,
										id: cell.suite,
										outcome: "failed" as const,
										reason: `Partial publication withheld unverified measurements: ${omitted.join(", ")}`,
									},
								]
							: provider.gaps,
				})),
			};
		});
	const merged = aggregateRuns(runs);
	// Preserve failures that never produced a Run in the published coverage and provider gaps,
	// without fabricating a historical shard or contributing any numerical observations.
	for (const attempt of selectedAttempts.filter(isUnallocatedFailureWithoutRun)) {
		const cell = plan.cells.find((entry) => entry.id === attempt.evidence.cellId);
		if (!cell) throw new Error(`attempt cell missing from plan: ${attempt.evidence.cellId}`);
		let provider = merged.providers.find((entry) => entry.providerId === cell.provider);
		if (!provider) {
			provider = {
				providerId: cell.provider,
				validationStatus: "pending",
				observedSpecs: {},
				metrics: [],
				suitesCovered: [],
				gaps: [],
				uncatalogued: [],
				costEvidence: [],
				artifactEvidence: [],
			};
			merged.providers.push(provider);
		}
		provider.gaps.push({
			scope: "suite",
			id: cell.suite,
			outcome: "failed",
			reason: `${cell.id}: ${attempt.evidence.diagnostic ?? "Admission failed before allocation; no measurements were produced."}`,
		});
	}
	merged.providers.sort((a, b) => a.providerId.localeCompare(b.providerId));
	const cohorts = [
		...new Map(
			plan.cells.map((cell) => [
				cell.suite,
				{
					suite: cell.suite,
					target: cell.target,
					workloadRevision: cell.workloadRevision,
					environmentRevision: cell.environmentRevision,
					passes: cell.passes,
					metrics: cell.metrics
						.filter((id) => !cell.exclusions.some((entry) => entry.metricId === id))
						.toSorted(),
				},
			]),
		).values(),
	].toSorted((a, b) => a.suite.localeCompare(b.suite));
	const run = parseRun({
		...merged,
		schemaVersion: partial ? "8" : "7",
		experiment: {
			planDigest: plan.digest,
			cohortDigest: evidenceDigest(cohorts),
			attemptIds: selectedIds,
			...(partial
				? {
						partial: {
							status: "partial",
							planned: plan.cells.length,
							complete: coverage.cells.filter((cell) => cell.status === "complete").length,
							incomplete: coverage.cells.filter(
								(cell) => !["complete", "excluded"].includes(cell.status),
							).length,
							excluded: coverage.cells.filter((cell) => cell.status === "excluded").length,
							cells: coverage.cells.map((cell) => {
								const planned = plan.cells.find((entry) => entry.id === cell.id);
								if (!planned) throw new Error(`coverage cell missing from plan: ${cell.id}`);
								return {
									...cell,
									provider: planned.provider,
									suite: planned.suite,
									replicate: planned.replicate,
									plannedMetrics: planned.metrics,
									passes: planned.passes,
									retainedMetrics: cell.retainedMetrics ?? [],
								};
							}),
						},
					}
				: {}),
		},
	});
	return { coverage, run };
}
