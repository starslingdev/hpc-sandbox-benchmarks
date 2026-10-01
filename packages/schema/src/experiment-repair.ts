import { type } from "arktype";
import { evidenceIdentifierSchema, sha256DigestSchema } from "./identifiers.ts";

/** An operator freezes all replacement cells before any new measurements are made. */
export const experimentRepairSchema = type({
	schemaVersion: "'1'",
	sourceRun: evidenceIdentifierSchema,
	sourceSha: /^[a-f0-9]{40}$/,
	sourcePlanDigest: sha256DigestSchema,
	sourceAttemptsDigest: sha256DigestSchema,
	recoveryRun: evidenceIdentifierSchema,
	recoveryPlanDigest: sha256DigestSchema,
	operator: "string >= 1",
	reason: "string >= 1",
	cells: type({ id: evidenceIdentifierSchema, "previousAttempt?": evidenceIdentifierSchema })
		.array()
		.atLeastLength(1),
	digest: sha256DigestSchema,
}).onUndeclaredKey("reject");
export type ExperimentRepair = typeof experimentRepairSchema.infer;
