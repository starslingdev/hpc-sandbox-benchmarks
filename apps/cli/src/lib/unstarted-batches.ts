import type { AttemptWithRun } from "@sandbox-benchmarks/results";
import { evidenceDigest, verifyUnstartedBatches } from "@sandbox-benchmarks/results";
import type { ExperimentPlan, UnstartedBatch } from "@sandbox-benchmarks/schema";
import {
	UNSTARTED_BATCH_SOURCE_REVISION,
	UNSTARTED_BATCH_WORKFLOW_REVISION,
	unstartedBatchSchema,
} from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { AccountJournal } from "./account-journal.ts";
import type { GitRequest } from "./github-account-journal.ts";

const workflowSchema = type({
	id: "number.integer > 0",
	run_attempt: "number.integer > 0",
	head_sha: /^[a-f0-9]{40}$/,
	head_branch: "'main'",
	path: "'.github/workflows/recover-benchmark.yml'",
	event: "'workflow_dispatch'",
	status: "string",
	actor: { login: "string >= 1" },
});
const jobSchema = unstartedBatchSchema.get("job");
const jobsPage = type({ total_count: "number.integer >= 0", jobs: "unknown[]" });

/** Fetch platform evidence and the complete protected journal; never accept an operator-supplied waiver. */
export async function collectUnstartedBatches(
	request: GitRequest,
	journal: AccountJournal,
	plan: ExperimentPlan,
	attempts: readonly AttemptWithRun[],
	workflow: unknown,
	operator: string,
): Promise<UnstartedBatch[]> {
	const info = workflowSchema.assert(workflow);
	// This exception is limited to a reviewed workflow revision and terminal workflows.
	if (
		info.status !== "completed" ||
		info.head_sha !== UNSTARTED_BATCH_WORKFLOW_REVISION ||
		plan.sha !== UNSTARTED_BATCH_SOURCE_REVISION
	)
		return [];
	if (String(info.id) !== plan.id || info.actor.login !== operator)
		throw new Error("unstarted workflow provenance mismatch");
	const jobs: unknown[] = [];
	let total: number | undefined;
	for (let page = 1; page <= 100; page++) {
		const response = jobsPage.assert(
			await request("GET", `/actions/runs/${plan.id}/jobs?filter=latest&per_page=100&page=${page}`),
		);
		if (total !== undefined && total !== response.total_count)
			throw new Error("job inventory changed during collection");
		total = response.total_count;
		jobs.push(...response.jobs);
		if (jobs.length === total) break;
		if (!response.jobs.length || jobs.length > total) throw new Error("incomplete job inventory");
	}
	if (jobs.length !== total) throw new Error("incomplete job inventory");
	const records = await journal.read("vercel");
	const receipts: UnstartedBatch[] = [];
	for (const batch of plan.batches) {
		const cells = plan.cells.filter((c) => batch.cells.includes(c.id));
		if (
			!cells.length ||
			cells.some((c) => c.provider !== "vercel" || c.quotaDomain !== "vercel") ||
			attempts.some((a) => batch.cells.includes(a.evidence.cellId))
		)
			continue;
		const suites = [...new Set(cells.map((c) => c.suite))];
		const suite = suites.length === 1 ? suites[0] : batch.wave;
		const wave =
			batch.wave === "synthetic-memory"
				? "memory"
				: batch.wave === "synthetic-system"
					? "system"
					: "realworld";
		const name = `retry-${wave} (vercel, ["vercel"], ${suite}, ${batch.id}) / vercel`;
		const candidates = jobs.filter(
			(j) => typeof j === "object" && j !== null && "name" in j && j.name === name,
		);
		if (candidates.length > 1) throw new Error("ambiguous batch job inventory");
		if (!candidates.length) continue;
		const parsed = jobSchema(candidates[0]);
		if (parsed instanceof type.errors) continue;
		if (parsed.run_attempt !== info.run_attempt) throw new Error("stale batch job attempt");
		const owned = records.filter(
			(r) => r.planDigest === plan.digest && batch.cells.includes(r.cellId),
		);
		if (owned.length) throw new Error("unstarted batch has account journal ownership records");
		const job = {
			id: parsed.id,
			run_id: parsed.run_id,
			run_attempt: parsed.run_attempt,
			head_sha: parsed.head_sha,
			name: parsed.name,
			status: parsed.status,
			conclusion: parsed.conclusion,
			steps: parsed.steps.map(({ number, name, status, conclusion }) => ({
				number,
				name,
				status,
				conclusion,
			})),
		};
		// Non-auth failures and executed steps remain ordinary missing-evidence blockers.
		if (
			!job.steps.some((s) => s.name === "Authenticate with Vercel" && s.conclusion === "failure") ||
			!job.steps.some((s) => s.name === "Run suite and normalize" && s.conclusion === "skipped")
		)
			continue;
		const body = {
			kind: "github-actions-unstarted-batch" as const,
			planDigest: plan.digest,
			sourceSha: plan.sha,
			batchId: batch.id,
			cellIds: batch.cells,
			operator,
			checkedAt: new Date().toISOString(),
			workflow: {
				id: info.id,
				run_attempt: info.run_attempt,
				head_sha: info.head_sha,
				head_branch: info.head_branch,
				path: info.path,
				event: info.event,
				status: "completed" as const,
				actor: { login: info.actor.login },
			},
			job,
			journal: { account: "vercel" as const, recordsDigest: evidenceDigest(owned) },
		};
		const receipt = unstartedBatchSchema.assert({ ...body, digest: evidenceDigest(body) });
		verifyUnstartedBatches(plan, attempts, [receipt], operator);
		receipts.push(receipt);
	}
	verifyUnstartedBatches(plan, attempts, receipts, operator);
	return receipts;
}
