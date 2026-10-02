import { expect, test } from "bun:test";
import { evidenceDigest } from "@sandbox-benchmarks/results";
import { verifyCleanupWorkflowSource } from "./cleanup-workflow.ts";
import { planExperiment } from "./experiment-plan.ts";

const sha = "a".repeat(40);
const plan = planExperiment({
	id: "123",
	sha,
	createdOn: "2026-10-02",
	cells: [
		{
			id: "e2b-memory-r0",
			provider: "e2b",
			quotaDomain: "e2b",
			suite: "memory",
			replicate: 0,
			workloadRevision: "memory-fixed-v1",
			artifactIdentity: evidenceDigest({ kind: "none" }),
			environmentRevision: "env-1",
			target: { vcpus: 4, memoryGb: 8 },
			metrics: ["stream_type_copy"],
			exclusions: [],
			passes: 2,
			startupMinutes: 20,
			workloadMinutes: 40,
			finishMinutes: 10,
		},
	],
});
const workflow = {
	status: "completed",
	head_sha: "b".repeat(40),
	head_branch: "main",
	path: ".github/workflows/recover-benchmark.yml",
	event: "workflow_dispatch",
	actor: { login: "operator" },
};
const body = {
	schemaVersion: "1",
	sourceRun: "122",
	sourceSha: sha,
	sourcePlanDigest: plan.digest,
	sourceAttemptsDigest: evidenceDigest([]),
	recoveryRun: plan.id,
	recoveryPlanDigest: plan.digest,
	operator: "operator",
	reason: "repair",
	cells: [{ id: "missing-cell" }],
};
const evidence = {
	plan,
	repair: { ...body, digest: evidenceDigest(body) },
	sourceWorkflow: {
		head_branch: "main",
		path: ".github/workflows/bench-matrix.yml",
		head_sha: sha,
	},
};
test("cleanup accepts original benchmark source or a frozen approved repair's execution source", () => {
	expect(() =>
		verifyCleanupWorkflowSource(plan, { status: "completed", head_sha: sha }),
	).not.toThrow();
	expect(() => verifyCleanupWorkflowSource(plan, workflow, evidence)).not.toThrow();
});
test("cleanup refuses running workflows, unbound repairs and non-main recovery workflows", () => {
	expect(() =>
		verifyCleanupWorkflowSource(plan, { ...workflow, status: "in_progress" }, evidence),
	).toThrow();
	expect(() => verifyCleanupWorkflowSource(plan, workflow)).toThrow();
	expect(() =>
		verifyCleanupWorkflowSource(plan, { ...workflow, head_branch: "feature" }, evidence),
	).toThrow();
	expect(() =>
		verifyCleanupWorkflowSource(plan, workflow, {
			...evidence,
			repair: { ...evidence.repair, operator: "forged" },
		}),
	).toThrow();
	expect(() =>
		verifyCleanupWorkflowSource(plan, workflow, {
			...evidence,
			sourceWorkflow: { ...evidence.sourceWorkflow, head_sha: "c".repeat(40) },
		}),
	).toThrow();
});
