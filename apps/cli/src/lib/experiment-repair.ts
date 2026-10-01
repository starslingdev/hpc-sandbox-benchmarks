import type { AttemptWithRun } from "@sandbox-benchmarks/results";
import {
	evidenceDigest,
	repairAttemptsDigest,
	repairableCoverage,
} from "@sandbox-benchmarks/results";
import type { ExperimentPlan } from "@sandbox-benchmarks/schema";
import { experimentRepairSchema } from "@sandbox-benchmarks/schema";
import { planExperiment } from "./experiment-plan.ts";

export function planExperimentRepair(
	source: ExperimentPlan,
	attempts: readonly AttemptWithRun[],
	identity: { run: string; operator: string; reason: string; createdOn: string },
) {
	const coverage = repairableCoverage(source, attempts);
	const cells = coverage.cells.filter((c) => !["complete", "excluded"].includes(c.status));
	if (!cells.length) throw new Error("experiment has no failed or missing cells to repair");
	if (source.id === identity.run) throw new Error("repair requires a new workflow run");
	const targets = new Set(cells.map((c) => c.id));
	const plan = planExperiment(
		{
			id: identity.run,
			sha: source.sha,
			createdOn: identity.createdOn,
			cells: source.cells.filter((c) => targets.has(c.id)),
		},
		Object.fromEntries(source.accounts.map((a) => [a.quotaDomain, a])),
	);
	const body = {
		schemaVersion: "1",
		sourceRun: source.id,
		sourceSha: source.sha,
		sourcePlanDigest: source.digest,
		sourceAttemptsDigest: repairAttemptsDigest(attempts),
		recoveryRun: plan.id,
		recoveryPlanDigest: plan.digest,
		operator: identity.operator,
		reason: identity.reason,
		cells: cells.map((c) => ({
			id: c.id,
			...(c.attemptId ? { previousAttempt: c.attemptId } : {}),
		})),
	};
	return { plan, repair: experimentRepairSchema.assert({ ...body, digest: evidenceDigest(body) }) };
}
