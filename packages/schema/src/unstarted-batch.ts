import { type } from "arktype";
import { sha256DigestSchema } from "./identifiers.ts";

// Reviewed recovery workflow: only Run suite and normalize allocates benchmark sandboxes.
export const UNSTARTED_BATCH_SOURCE_REVISION = "8d12320592d858202f46648b903bf4e5a75d086f";
export const UNSTARTED_BATCH_WORKFLOW_REVISION = "de63d929211cd0b416372e11f1dd71e63b99fa0d";

/** Platform failure before the sole allocation/execution step, not an execution attempt. */
export const unstartedBatchSchema = type({
	kind: "'github-actions-unstarted-batch'",
	planDigest: sha256DigestSchema,
	sourceSha: /^[a-f0-9]{40}$/,
	batchId: "string >= 1",
	cellIds: "string[] >= 1",
	operator: "string >= 1",
	checkedAt: "string.date.iso",
	workflow: {
		id: "number.integer > 0",
		run_attempt: "number.integer > 0",
		head_sha: /^[a-f0-9]{40}$/,
		head_branch: "'main'",
		path: "'.github/workflows/recover-benchmark.yml'",
		event: "'workflow_dispatch'",
		status: "'completed'",
		actor: { login: "string >= 1" },
	},
	job: {
		id: "number.integer > 0",
		run_id: "number.integer > 0",
		run_attempt: "number.integer > 0",
		head_sha: /^[a-f0-9]{40}$/,
		name: "string >= 1",
		status: "'completed'",
		conclusion: "'failure'",
		steps: type({
			number: "number.integer > 0",
			name: "string >= 1",
			status: "'completed'",
			conclusion: "string >= 1",
		})
			.array()
			.atLeastLength(1),
	},
	journal: { account: "'vercel'", recordsDigest: sha256DigestSchema },
	digest: sha256DigestSchema,
}).onUndeclaredKey("reject");
export type UnstartedBatch = typeof unstartedBatchSchema.infer;
