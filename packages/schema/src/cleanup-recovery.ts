import { type } from "arktype";
import {
	sha256DigestSchema as digest,
	evidenceIdentifierSchema as identifier,
} from "./identifiers.ts";
import { providerIdSchema } from "./provider-parsers.ts";

/** Later ownership evidence never changes the original execution or measurement receipts. */
export const cleanupRecoverySchema = type({
	kind: "'post-run-cleanup'",
	attemptId: "string >= 1",
	cellId: "string >= 1",
	planDigest: digest,
	attemptDigest: digest,
	workflowRun: "string >= 1",
	sourceSha: /^[a-f0-9]{40}$/,
	confirmedAt: "string.date.iso",
	operator: identifier,
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

/** Provenance every account-journal record carries: the owning account and the frozen attempt. */
export const accountRecordBase = {
	version: "'1'",
	account: identifier,
	attempt: identifier,
	cellId: identifier,
	planDigest: digest,
} as const;

export const sandboxRefSchema = type({ provider: providerIdSchema, id: "string >= 1" });

/**
 * The journal's `allocated` record. The executor also retains it in the digest-verified raw tree
 * before the harness receives a session, so the identity survives a lost journal append.
 */
export const retainedAllocationSchema = type({
	...accountRecordBase,
	kind: "'allocated'",
	ref: sandboxRefSchema,
}).onUndeclaredKey("reject");
export type RetainedAllocation = typeof retainedAllocationSchema.infer;
