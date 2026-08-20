// Driver-facing parser wrappers. Schema ownership stays in @sandbox-benchmarks/schema; this
// explicit subpath translates boundary failures into the driver's typed error family.

import {
	createRequestSchema,
	execResultSchema,
	exitSchema,
	gpuSpecSchema,
	resolvedArtifactSchema,
	sandboxObservationSchema,
	sandboxRefEnvelopeSchema,
} from "@sandbox-benchmarks/schema/driver-schemas";
import { type } from "arktype";
import { DriverError } from "./lib/errors.ts";
import type { CreateRequest, SandboxRef } from "./lib/port.ts";

export {
	createRequestSchema,
	execResultSchema,
	exitSchema,
	gpuSpecSchema,
	resolvedArtifactSchema,
	sandboxObservationSchema,
	sandboxRefEnvelopeSchema,
};

/** Parse provider qualification only. The selected DriverModule subsequently validates `id`. */
export function parseSandboxRefEnvelope(input: unknown): SandboxRef {
	const parsed = sandboxRefEnvelopeSchema(input);
	if (parsed instanceof type.errors) {
		throw new DriverError("invalid-sandbox-ref", `invalid sandbox ref: ${parsed.summary}`);
	}
	return parsed;
}

/** Parse once at the plan-to-request seam; drivers receive only trusted requests. */
export function parseCreateRequest(input: unknown): CreateRequest {
	const parsed = createRequestSchema(input);
	if (parsed instanceof type.errors) {
		throw new DriverError("invalid-create-request", `invalid CreateRequest: ${parsed.summary}`);
	}
	return parsed;
}
