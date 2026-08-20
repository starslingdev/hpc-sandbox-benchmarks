// Runtime schemas for data crossing into or out of the sandbox driver port. The driver package
// imports these only from explicit parsing subpaths; its core imports their types only, which erases
// at runtime and keeps arktype out of the hot graph.

import { type } from "arktype";
import { providerIdSchema } from "./provider-parsers.ts";
import { targetSpecSchema } from "./target-spec-schema.ts";

export const sandboxRefEnvelopeSchema = type({
	provider: providerIdSchema,
	id: "string >= 1",
}).onUndeclaredKey("reject");
export type DriverSandboxRefEnvelope = typeof sandboxRefEnvelopeSchema.infer;

export const exitSchema = type.or(
	{ kind: "'exited'", code: "number.integer" },
	{ kind: "'signalled'", signal: "string >= 1" },
	{ kind: "'unknown'", detail: "string" },
);
export type DriverExit = typeof exitSchema.infer;

export const execResultSchema = type({
	exit: exitSchema,
	stdout: "string",
	stderr: "string",
	durationMs: "number >= 0",
	truncated: "boolean",
});
export type DriverExecResult = typeof execResultSchema.infer;

export const gpuSpecSchema = type({
	model: "string >= 1",
	count: "number.integer > 0",
});
export type DriverGpuSpec = typeof gpuSpecSchema.infer;

export const resolvedArtifactSchema = type.or(
	{ kind: "'none'" },
	{ kind: "'image'", ref: "string >= 1" },
	{ kind: "'baked'", ref: "string >= 1" },
	{ kind: "'mirror'", ref: "string >= 1" },
	{ kind: "'built'", ref: "string >= 1" },
);
export type DriverResolvedArtifact = typeof resolvedArtifactSchema.infer;

export const createRequestSchema = type({
	spec: targetSpecSchema,
	artifact: resolvedArtifactSchema,
	deadlineMs: "number.integer > 0",
	"gpu?": gpuSpecSchema,
	"env?": "Record<string, string>",
}).onDeepUndeclaredKey("reject");
export type DriverCreateRequest = typeof createRequestSchema.infer;

export const sandboxObservationSchema = type.or(
	{ state: "'running'" },
	{ state: "'terminal'" },
	{ state: "'absent'" },
);
export type DriverSandboxObservation = typeof sandboxObservationSchema.infer;
