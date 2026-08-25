// One typed error family for the kit (ADR-0008 §1: "create failures MUST be classifiable … error
// semantics defined by what the caller is entitled to do next"; ADR-0007 §9: "string-matching
// error prose is how the UnsupportedFileSystem workaround started"). Every kit throw carries a
// literal `code` the harness switches on, plus structured context — so the retry-vs-terminal and
// invalid-input-vs-vendor decisions read a field, never a regex over a formatted message.

import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import type { DriverOperationOptions, SandboxRef } from "./port.ts";

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
 *   - `filesystem-failed` / `probe-failed` / `snapshot-failed` — an explicitly declared optional
 *     capability failed while talking to the selected provider.
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
	| "filesystem-failed"
	| "probe-failed"
	| "snapshot-failed"
	| "invalid-exec-options"
	| "destroy-failed";

export interface DriverErrorFields {
	readonly provider?: ProviderId;
	readonly ref?: SandboxRef;
	/** Raw vendor diagnostic/detail — the field retry heuristics match, never the formatted message. */
	readonly vendorMessage?: string;
	readonly vendorExitCode?: number;
	readonly cause?: unknown;
}

/** A retained recovery locator for an allocation whose create failed before a session returned. */
export interface FailedCreateRecovery {
	readonly provider: ProviderId;
	readonly locator:
		| {
				readonly kind: "name" | "id";
				readonly value: string;
		  }
		| {
				/** The wrapper returned no stable id, so cleanup retains its native object in-process. */
				readonly kind: "native-handle";
		  };
}

export interface FailedCreateCleanupErrorOptions extends FailedCreateRecovery {
	/** Idempotent, convergent retry for the allocation named by {@link locator}. */
	readonly cleanup: (options?: DriverOperationOptions) => Promise<void>;
}

/**
 * A create/rollback double fault that still owns a retryable cleanup record.
 *
 * `SuppressedError` preserves both failures in the same order as `await using`: `error` is the
 * cleanup failure and `suppressed` is the original create failure. Implementing the standard
 * async-disposal protocol lets a process-level owner retain this rejected create without taking a
 * dependency on a particular driver implementation. Cleanup is shared, retryable after failure,
 * and becomes an idempotent no-op after the first confirmed success.
 */
export class FailedCreateCleanupError extends SuppressedError implements AsyncDisposable {
	readonly code = "failed-create-cleanup" as const;
	readonly provider: ProviderId;
	readonly locator: FailedCreateRecovery["locator"];
	readonly #cleanup: (options?: DriverOperationOptions) => Promise<void>;
	#cleanupInFlight: Promise<void> | undefined;
	#cleanupAbort: AbortController | undefined;
	#abortUnlinks: Array<() => void> = [];
	#cleaned = false;

	constructor(
		cleanupError: unknown,
		createError: unknown,
		options: FailedCreateCleanupErrorOptions,
	) {
		const locatorLabel =
			options.locator.kind === "native-handle"
				? "through its retained native handle"
				: `by ${options.locator.kind} ${options.locator.value}`;
		super(
			cleanupError,
			createError,
			`failed to clean up ${options.provider} sandbox ${locatorLabel} after create failure`,
		);
		this.name = "FailedCreateCleanupError";
		this.provider = options.provider;
		this.locator = Object.freeze({ ...options.locator });
		this.#cleanup = options.cleanup;
	}

	cleanup(options: DriverOperationOptions = {}): Promise<void> {
		if (this.#cleaned) return Promise.resolve();
		if (this.#cleanupInFlight !== undefined) {
			this.#forwardAbort(options.signal);
			return this.#cleanupInFlight;
		}

		this.#cleanupAbort = new AbortController();
		this.#forwardAbort(options.signal);
		const attempt = Promise.resolve()
			.then(() => this.#cleanup({ signal: this.#cleanupAbort?.signal }))
			.then(() => {
				this.#cleaned = true;
			})
			.finally(() => {
				for (const unlink of this.#abortUnlinks) unlink();
				this.#abortUnlinks = [];
				this.#cleanupAbort = undefined;
				this.#cleanupInFlight = undefined;
			});
		this.#cleanupInFlight = attempt;
		return attempt;
	}

	#forwardAbort(signal: AbortSignal | undefined): void {
		const controller = this.#cleanupAbort;
		if (signal === undefined || controller === undefined) return;
		const abort = () => controller.abort(signal.reason);
		signal.addEventListener("abort", abort, { once: true });
		this.#abortUnlinks.push(() => signal.removeEventListener("abort", abort));
		if (signal.aborted) abort();
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.cleanup();
	}
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

export const isFailedCreateCleanupError = (value: unknown): value is FailedCreateCleanupError =>
	value instanceof FailedCreateCleanupError;
