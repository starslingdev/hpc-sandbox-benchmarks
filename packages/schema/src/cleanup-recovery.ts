import { type } from "arktype";
import { providerIdSchema } from "./provider-parsers.ts";

/** Later ownership evidence never changes the original execution or measurement receipts. */
export const cleanupRecoverySchema = type({
	kind: "'post-run-cleanup'",
	attemptId: "string >= 1",
	cellId: "string >= 1",
	planDigest: /^sha256:[a-f0-9]{64}$/,
	attemptDigest: /^sha256:[a-f0-9]{64}$/,
	workflowRun: "string >= 1",
	sourceSha: /^[a-f0-9]{40}$/,
	confirmedAt: "string.date.iso",
	operator: /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
	observation: type.or(
		type({
			kind: "'sandbox'",
			provider: providerIdSchema,
			sandboxId: "string >= 1",
			state: "'terminal' | 'absent'",
		}).onUndeclaredKey("reject"),
		type({
			kind: "'modal-app'",
			appName: "'sandbox-benchmarks'",
			appId: /^ap-[a-zA-Z0-9]+$/,
			anchorSandboxId: "string >= 1",
			// Both generations are independently enumerated twice in the original environment.
			environment: "string >= 1",
			v1Running: "0",
			v2Running: "0",
			inventoryPasses: "2",
		}).onUndeclaredKey("reject"),
	),
}).onUndeclaredKey("reject");

export type CleanupRecovery = typeof cleanupRecoverySchema.infer;

// Reviewed nativeModalCompute revision: preparation failed AFTER create returned in this App.
export const MODAL_CREATED_REQUEST_REVISION = "845a0f19b3aa3bda32f0ec988c1d1c188c9e260f";
