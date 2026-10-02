import { evidenceDigest, verifyExperimentPlan } from "@sandbox-benchmarks/results";
import type { ExperimentPlan } from "@sandbox-benchmarks/schema";
import { experimentRepairSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

/** A repair executes the original source revision from a newer, approved workflow revision. */
export function verifyCleanupWorkflowSource(
	plan: ExperimentPlan,
	workflow: unknown,
	repairEvidence?: { plan: ExperimentPlan; repair: unknown; sourceWorkflow: unknown },
): void {
	const run = type({ status: "'completed'", head_sha: "string" }).assert(workflow);
	if (run.head_sha === plan.sha) return;
	const approved = type({
		head_branch: "'main'",
		path: "'.github/workflows/recover-benchmark.yml'",
		event: "'workflow_dispatch'",
		actor: { login: "string >= 1" },
	}).assert(workflow);
	if (!repairEvidence) throw new Error("cleanup requires the frozen repair artifact");
	const frozen = verifyExperimentPlan(repairEvidence.plan);
	const repair = experimentRepairSchema.assert(repairEvidence.repair);
	const { digest, ...body } = repair;
	const source = type({
		head_branch: "'main'",
		path: "'.github/workflows/bench-matrix.yml'",
		head_sha: "string",
	}).assert(repairEvidence.sourceWorkflow);
	if (
		frozen.digest !== plan.digest ||
		repair.recoveryRun !== plan.id ||
		repair.recoveryPlanDigest !== plan.digest ||
		repair.sourceSha !== plan.sha ||
		source.head_sha !== plan.sha ||
		repair.operator !== approved.actor.login ||
		evidenceDigest(body) !== digest
	)
		throw new Error("cleanup workflow differs from frozen repair provenance");
}
