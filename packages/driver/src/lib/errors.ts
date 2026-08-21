// One typed error family for the kit (ADR-0008 §1: "create failures MUST be classifiable … error
// semantics defined by what the caller is entitled to do next"; ADR-0007 §9: "string-matching
// error prose is how the UnsupportedFileSystem workaround started"). Every kit throw carries a
// literal `code` the harness switches on, plus structured context — so the retry-vs-terminal and
// invalid-input-vs-vendor decisions read a field, never a regex over a formatted message.

import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import type { SandboxRef } from "./port.ts";

/**
 * What went wrong, in terms of what the caller may do next:
 *
 *   - `invalid-sandbox-ref` / `invalid-create-request` / `missing-credentials` — the input or
 *     config is wrong. Terminal; fix the input, do not retry.
 *   - `artifact-mismatch` / `use-after-destroy` / `vendor-contract-violation` — a kit or driver
 *     invariant was broken. Terminal; a bug, not a transient condition.
 *   - `create-failed` — the vendor refused create. The harness decides retry-vs-terminal by
 *     matching the registry's `retryableCreatePatterns` against {@link DriverError.vendorMessage}
 *     (a designated field — NOT a formatted message that embeds argv).
 *   - `readiness-timeout` — create was accepted but the sandbox never became ready in budget.
 *   - `vendor-output-unparseable` — the vendor's control-plane output drifted from its schema.
 *   - `exec-failed` — a kit-owned shell fallback failed before it could satisfy its contract.
 *   - `invalid-exec-options` — a caller supplied an impossible output-cap value.
 *   - `destroy-failed` — teardown could not converge.
 */
export type DriverErrorCode =
	| "invalid-sandbox-ref"
	| "invalid-create-request"
	| "missing-credentials"
	| "artifact-mismatch"
	| "use-after-destroy"
	| "vendor-contract-violation"
	| "create-failed"
	| "readiness-timeout"
	| "vendor-output-unparseable"
	| "exec-failed"
	| "invalid-exec-options"
	| "destroy-failed";

export interface DriverErrorFields {
	readonly provider?: ProviderId;
	readonly ref?: SandboxRef;
	/** Raw vendor stderr/detail — the field retry heuristics match, never the formatted message. */
	readonly vendorMessage?: string;
	readonly vendorExitCode?: number;
	readonly cause?: unknown;
}

export class DriverError extends Error {
	readonly code: DriverErrorCode;
	readonly provider: ProviderId | undefined;
	readonly ref: SandboxRef | undefined;
	readonly vendorMessage: string | undefined;
	readonly vendorExitCode: number | undefined;

	constructor(code: DriverErrorCode, message: string, fields: DriverErrorFields = {}) {
		super(message, fields.cause !== undefined ? { cause: fields.cause } : undefined);
		this.name = "DriverError";
		this.code = code;
		this.provider = fields.provider;
		this.ref = fields.ref;
		this.vendorMessage = fields.vendorMessage;
		this.vendorExitCode = fields.vendorExitCode;
	}
}

export const isDriverError = (value: unknown): value is DriverError => value instanceof DriverError;
