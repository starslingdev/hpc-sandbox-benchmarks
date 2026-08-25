// cliDriver (ADR-0007 §5): the generic driver for CLI-only vendors. A provider whose control
// plane is `spawn()` on a binary becomes a declarative table of argv templates and parsers.
// The generic driver owns spawn, secret redaction and not-found matching ONCE; vendor stdout
// is a trust boundary, so the table's `parse` fields are arktype pipelines and a vendor
// changing its output shape produces a path-bearing report, not an `undefined` threading
// through readiness logic.
//
// The compiled shape is a MethodTable whose handle is the PARSED READINESS ROW — so every
// generated member is unit-testable as a pure function and `session.native` is the vendor's
// own typed record, not an opaque id string. Readiness polling, output capping and the
// use-after-destroy guard belong to the kit layer (poll.ts, table.ts); this file supplies only
// the vendor-specific argv and parsers.

import { randomUUID } from "node:crypto";
import type { ProviderId } from "@sandbox-benchmarks/schema/providers";
import type { Out, Type } from "arktype";
import { type } from "arktype";
import type {
	CreateRequest,
	DriverContext,
	DriverModule,
	DriverOperationOptions,
	ExecResult,
	SandboxDriver,
	SandboxRef,
} from "./index.ts";
import { defineDriver, driverFromTable, sandboxRef } from "./index.ts";
import { DriverError, FailedCreateCleanupError } from "./lib/errors.ts";
import { pollUntilReady } from "./lib/poll.ts";
import type { MethodTable } from "./lib/table.ts";

export interface CliRunResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly code: number;
}

export interface CliRunOptions {
	/** Hard subprocess budget. Runners MUST terminate the child before rejecting on timeout. */
	readonly timeoutMs: number;
	/** Cooperative process-owner cancellation; runners must terminate before rejecting. */
	readonly signal?: AbortSignal;
}

/** Runs the vendor binary. Injectable so cliDriver tables are testable without a real CLI. */
export type CliRunner = (
	binary: string,
	args: readonly string[],
	options: CliRunOptions,
) => Promise<CliRunResult>;

/** An actual arktype schema whose callable output is the provider's parsed readiness rows. */
export type CliRowsSchema<Row> = Type<(In: string) => Out<readonly Row[]>>;

export type CliFailedCreateCleanup<Row> =
	| {
			/** Direct name-addressed delete for CLIs that genuinely support it. */
			readonly kind: "command";
			readonly command: (name: string) => readonly string[];
			readonly absenceConfirmationMs: number;
	  }
	| {
			/** Resolve the generated name through the parsed list, then delete its validated id. */
			readonly kind: "lookup";
			readonly select: (rows: readonly Row[], name: string) => Row | null;
			readonly absenceConfirmationMs: number;
	  };

/** Provider classification of one selected readiness row; the kit owns the resulting control flow. */
export type CliReadinessStatus = "ready" | "pending" | { readonly terminal: string };

export interface CliSpec<Row> {
	/** Resolved binary path or name (the caller applies any env override). */
	readonly binary: string;
	/** Flags whose FOLLOWING argv value is a secret: redacted from every diagnostic. */
	readonly secretFlags: readonly string[];
	/** Kill budget for short control-plane calls: prepare, poll, exec, and destroy. */
	readonly commandTimeoutMs: number;
	/** Optional longer kill budget for the create subprocess; defaults to commandTimeoutMs. */
	readonly createCommandTimeoutMs?: number;
	/** argv to create a sandbox named `name` for `request`. */
	readonly create: (request: CreateRequest, name: string) => readonly string[];
	/** Optional pre-create probe with a fallback action (for profile-based CLI authentication). */
	readonly prepare?: {
		/** Must exit zero and parse through the readiness-row schema to count as prepared. */
		readonly probe: readonly string[];
		/** Checked fallback command, commonly `login --token …`; secret flags still redact it. */
		readonly fallback: readonly string[];
	};
	/** Rollback/reconciliation used when no session handle can be returned. */
	readonly cleanupCreated: CliFailedCreateCleanup<Row>;
	readonly ready: {
		/** argv that lists/inspects sandboxes; polled until `select` finds the row. */
		readonly poll: readonly string[];
		/** Trust boundary: raw stdout → rows, as an arktype pipeline (path-bearing errors). */
		readonly parse: CliRowsSchema<Row>;
		/** The created row for `name`, or null while it is not visible. */
		readonly select: (rows: readonly Row[], name: string) => Row | null;
		/** Typed vendor-state policy. The kit handles terminal errors, deadline, and cleanup. */
		readonly classify: (row: Row) => CliReadinessStatus;
		readonly pollIntervalMs?: number;
	};
	/** Trust boundary: the selected provider module extracts and validates its sandbox-id format. */
	readonly sandboxId: {
		readonly fromRow: (row: Row) => unknown;
		readonly parse: Type<string>;
	};
	readonly exec: (id: string, command: string) => readonly string[];
	readonly destroy: (id: string) => readonly string[];
	/** Vendor prose meaning "already gone" — destroy-of-missing MUST succeed (ADR-0008). */
	readonly notFound: RegExp;
}

export type CliSpecFields<Row> = Omit<CliSpec<Row>, "ready"> & {
	readonly ready: Omit<CliSpec<Row>["ready"], "parse">;
};

/**
 * Bind a CLI's arktype rows parser before contextual-typing the rest of its table.
 *
 * Keeping the parser in the first argument lets TypeScript infer `Row` once and then type every
 * `select`/`fromRow` callback without a handwritten row alias or annotation.
 */
export function defineCliSpec<Row>(
	parse: CliRowsSchema<Row>,
	spec: CliSpecFields<NoInfer<Row>>,
): CliSpec<Row> {
	return { ...spec, ready: { ...spec.ready, parse } };
}

export interface CliDriverOptions {
	/** Override the spawn runner (tests). Defaults to Bun.spawn on the spec's binary. */
	readonly run?: CliRunner;
	/** Joined-module ceiling. Internal/test seam; provider authors use defineCliDriver. */
	readonly createAttemptCeilingMs?: number;
}

interface CliPreparationInFlight {
	readonly cancellation: AbortController;
	readonly waiters: Set<symbol>;
	readonly promise: Promise<void>;
}

/** Per-driver state: successful profile preparation is shared; failed attempts clear for retry. */
export interface CliDriverContext {
	prepare?: true | CliPreparationInFlight;
}

/** One joined CLI-provider module; the helper derives the required driver-owned create budget. */
export interface CliDriverModuleSpec<P extends ProviderId, Row> {
	/** Hard ceiling until success or a retryable failed-create cleanup record is returned. */
	readonly createAttemptCeilingMs: number;
	/** Builds the small declarative CLI table from this provider's exact environment slice. */
	readonly spec: (context: DriverContext<P>) => CliSpec<Row>;
}

class CliRunTimeoutError extends Error {
	constructor(readonly timeoutMs: number) {
		super(`CLI process exceeded its ${timeoutMs}ms timeout`);
		this.name = "CliRunTimeoutError";
	}
}

class CliRunAbortedError extends Error {
	constructor(readonly reason: unknown) {
		super("CLI process was aborted", { cause: reason });
		this.name = "CliRunAbortedError";
	}
}

function subscribeToAbort(signal: AbortSignal | undefined, listener: () => void): () => void {
	if (signal === undefined) return () => {};
	signal.addEventListener("abort", listener, { once: true });
	// Abort can win between a caller's pre-check and listener registration. Re-check only after the
	// listener is installed so that edge cannot strand a subprocess or a reconciliation sleep.
	if (signal.aborted) {
		signal.removeEventListener("abort", listener);
		listener();
		return () => {};
	}
	return () => signal.removeEventListener("abort", listener);
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) return Promise.reject(new CliRunAbortedError(signal.reason));
	return new Promise((resolve, reject) => {
		let unsubscribe = () => {};
		const timer = setTimeout(done, ms);
		function done(): void {
			unsubscribe();
			resolve();
		}
		function aborted(): void {
			clearTimeout(timer);
			unsubscribe();
			reject(new CliRunAbortedError(signal?.reason));
		}
		unsubscribe = subscribeToAbort(signal, aborted);
	});
}

function readTextStream(stream: ReadableStream<Uint8Array>): {
	readonly text: Promise<string>;
	cancel(): void;
} {
	const reader = stream.getReader();
	const text = (async () => {
		const decoder = new TextDecoder();
		let output = "";
		while (true) {
			const next = await reader.read();
			if (next.done) break;
			output += decoder.decode(next.value, { stream: true });
		}
		return output + decoder.decode();
	})();
	return {
		text,
		cancel() {
			// Cancellation releases this process's side of inherited pipes even if a descendant
			// escaped the process group. The read promise is already observed by `completed`.
			void reader.cancel().catch(() => undefined);
		},
	};
}

const defaultRunner: CliRunner = async (binary, args, options) => {
	if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) {
		throw new DriverError(
			"vendor-contract-violation",
			`CLI timeout must be a positive safe integer, received ${String(options.timeoutMs)}`,
		);
	}
	if (options.signal?.aborted) throw new CliRunAbortedError(options.signal.reason);
	const child = Bun.spawn([binary, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		// A separate process group lets timeout cleanup kill helpers that inherited our pipes.
		detached: process.platform !== "win32",
	});
	const stdout = readTextStream(child.stdout);
	const stderr = readTextStream(child.stderr);
	const completed = Promise.all([child.exited, stdout.text, stderr.text]).then(
		([code, stdout, stderr]) => ({ kind: "completed" as const, code, stdout, stderr }),
	);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<{ readonly kind: "timeout" }>((resolve) => {
		timer = setTimeout(() => resolve({ kind: "timeout" }), options.timeoutMs);
	});
	let abortListener = () => {};
	const aborted = new Promise<{ readonly kind: "aborted" }>((resolve) => {
		abortListener = subscribeToAbort(options.signal, () => resolve({ kind: "aborted" }));
	});
	let outcome:
		| {
				readonly kind: "completed";
				readonly code: number;
				readonly stdout: string;
				readonly stderr: string;
		  }
		| { readonly kind: "timeout" }
		| { readonly kind: "aborted" };
	try {
		outcome = await Promise.race([completed, timeout, aborted]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
		abortListener();
	}
	if (outcome.kind !== "completed") {
		stdout.cancel();
		stderr.cancel();
		if (process.platform === "win32") {
			child.kill("SIGKILL");
		} else {
			try {
				// `detached` makes the child the group leader. The negative pid reaches descendants
				// even if the CLI parent already exited while a helper kept stdout/stderr open.
				process.kill(-child.pid, "SIGKILL");
			} catch {
				child.kill("SIGKILL");
			}
		}
		await child.exited;
		if (outcome.kind === "timeout") throw new CliRunTimeoutError(options.timeoutMs);
		throw new CliRunAbortedError(options.signal?.reason);
	}
	return { stdout: outcome.stdout, stderr: outcome.stderr, code: outcome.code };
};

/** Redact secret values from an argv for diagnostics: the value AFTER a secret flag becomes ***. */
export function redactArgs(args: readonly string[], secretFlags: readonly string[]): string[] {
	const redacted: string[] = [];
	let hide = false;
	for (const arg of args) {
		if (hide) {
			redacted.push("***");
			hide = false;
		} else {
			redacted.push(arg);
			hide = secretFlags.includes(arg);
		}
	}
	return redacted;
}

/** Redact secret argv values if a vendor echoes its invocation into stdout/stderr. */
export function redactDiagnostic(
	text: string,
	args: readonly string[],
	secretFlags: readonly string[],
): string {
	return redactDiagnostics(text, [args], secretFlags);
}

function redactDiagnostics(
	text: string,
	commands: readonly (readonly string[])[],
	secretFlags: readonly string[],
): string {
	const secrets: string[] = [];
	for (const args of commands) {
		let takeSecret = false;
		for (const arg of args) {
			if (takeSecret) {
				if (arg !== "") secrets.push(arg);
				takeSecret = false;
			} else {
				takeSecret = secretFlags.includes(arg);
			}
		}
	}
	// Replace longer overlapping credentials first, or a short prefix can leave a secret suffix.
	secrets.sort((left, right) => right.length - left.length);
	return secrets.reduce((redacted, secret) => redacted.replaceAll(secret, "***"), text);
}

/** Compile a CLI spec down to a method table (handle = the parsed readiness row). */
export function cliMethodTable<Row>(
	provider: ProviderId,
	spec: CliSpec<Row>,
	options: CliDriverOptions = {},
): MethodTable<Row, CliDriverContext> {
	const run = options.run ?? defaultRunner;
	if (!Number.isSafeInteger(spec.commandTimeoutMs) || spec.commandTimeoutMs <= 0) {
		throw new DriverError(
			"vendor-contract-violation",
			`commandTimeoutMs must be a positive safe integer, received ${String(spec.commandTimeoutMs)}`,
			{ provider },
		);
	}
	if (
		spec.createCommandTimeoutMs !== undefined &&
		(!Number.isSafeInteger(spec.createCommandTimeoutMs) || spec.createCommandTimeoutMs <= 0)
	) {
		throw new DriverError(
			"vendor-contract-violation",
			`createCommandTimeoutMs must be a positive safe integer, received ${String(spec.createCommandTimeoutMs)}`,
			{ provider },
		);
	}
	if (
		options.createAttemptCeilingMs !== undefined &&
		(!Number.isSafeInteger(options.createAttemptCeilingMs) || options.createAttemptCeilingMs <= 0)
	) {
		throw new DriverError(
			"vendor-contract-violation",
			`createAttemptCeilingMs must be a positive safe integer, received ${String(options.createAttemptCeilingMs)}`,
			{ provider },
		);
	}
	if (
		spec.ready.pollIntervalMs !== undefined &&
		(!Number.isSafeInteger(spec.ready.pollIntervalMs) || spec.ready.pollIntervalMs <= 0)
	) {
		throw new DriverError(
			"vendor-contract-violation",
			`ready.pollIntervalMs must be a positive safe integer, received ${String(spec.ready.pollIntervalMs)}`,
			{ provider },
		);
	}
	if (
		!Number.isSafeInteger(spec.cleanupCreated.absenceConfirmationMs) ||
		spec.cleanupCreated.absenceConfirmationMs <= 0
	) {
		throw new DriverError(
			"vendor-contract-violation",
			`cleanupCreated.absenceConfirmationMs must be a positive safe integer, received ${String(spec.cleanupCreated.absenceConfirmationMs)}`,
			{ provider },
		);
	}
	const call = (
		args: readonly string[],
		timeoutMs = spec.commandTimeoutMs,
		signal?: AbortSignal,
	) => {
		const boundedTimeoutMs = Math.floor(timeoutMs);
		if (boundedTimeoutMs <= 0) throw new CliRunTimeoutError(timeoutMs);
		return run(spec.binary, args, {
			timeoutMs: boundedTimeoutMs,
			...(signal === undefined ? {} : { signal }),
		});
	};
	const redactKnownDiagnostic = (text: string, args: readonly (readonly string[])[]): string => {
		const allArgs =
			spec.prepare === undefined ? args : [...args, spec.prepare.probe, spec.prepare.fallback];
		return redactDiagnostics(text, allArgs, spec.secretFlags);
	};
	// Vendor failures carry structured fields (exit code + vendor diagnostic) so the harness classifies
	// by them, not by regexing a formatted message; the message redacts secret argv for humans.
	const vendorFailed = (
		code: "create-failed" | "destroy-failed",
		args: readonly string[],
		result: CliRunResult,
		ref?: SandboxRef,
		diagnosticArgs: readonly (readonly string[])[] = [args],
	): DriverError => {
		const vendorDiagnostic = result.stderr.trim() || result.stdout.trim();
		return new DriverError(
			code,
			`${spec.binary} ${redactArgs(args, spec.secretFlags).join(" ")}: exit ${result.code}`,
			{
				provider,
				vendorExitCode: result.code,
				vendorMessage: redactKnownDiagnostic(vendorDiagnostic, diagnosticArgs),
				...(ref ? { ref } : {}),
			},
		);
	};

	const runnerFailed = (
		code: "create-failed" | "exec-failed" | "destroy-failed",
		args: readonly string[],
		caught: unknown,
		ref?: SandboxRef,
		diagnosticArgs: readonly (readonly string[])[] = [args],
	): DriverError => {
		const detail = redactKnownDiagnostic(String(caught), diagnosticArgs);
		return new DriverError(
			code,
			`${spec.binary} ${redactArgs(args, spec.secretFlags).join(" ")}: ${detail}`,
			{
				provider,
				vendorMessage: detail,
				...(ref ? { ref } : {}),
			},
		);
	};

	const parseRows = (
		result: CliRunResult,
		diagnosticArgs: readonly (readonly string[])[],
	): readonly Row[] => {
		const rows = spec.ready.parse(result.stdout);
		// CliRowsSchema's output side is readonly Row[]. ArkType's internal distillation cannot
		// prove that equality for an arbitrary generic Row, even though the public schema type does.
		if (!(rows instanceof type.errors)) return rows as readonly Row[];
		const summary = redactKnownDiagnostic(rows.summary, diagnosticArgs);
		throw new DriverError("vendor-output-unparseable", `${spec.binary} output: ${summary}`, {
			provider,
			vendorMessage: summary,
		});
	};

	const createDeadlineError = (deadlineMs: number): DriverError =>
		new DriverError("readiness-timeout", `${provider} sandbox not ready within ${deadlineMs}ms`, {
			provider,
		});

	const ensurePrepared = async (
		remaining: () => number,
		deadlineMs: number,
		signal?: AbortSignal,
	): Promise<void> => {
		const prepare = spec.prepare;
		if (prepare === undefined) return;
		const probeBudget = remaining();
		if (probeBudget < 1) throw createDeadlineError(deadlineMs);
		let probed: CliRunResult | undefined;
		try {
			probed = await call(prepare.probe, Math.min(probeBudget, spec.commandTimeoutMs), signal);
		} catch (caught) {
			if (signal?.aborted) throw caught;
			// A failed profile probe selects the checked fallback below.
		}
		if (probed?.code === 0) {
			// Exit zero already proves authentication. Schema drift is not repaired by overwriting a
			// developer's working profile, so surface it through the normal trust-boundary error.
			parseRows(probed, [prepare.probe]);
			return;
		}

		const fallbackBudget = remaining();
		if (fallbackBudget < 1) throw createDeadlineError(deadlineMs);
		let fallback: CliRunResult;
		try {
			fallback = await call(
				prepare.fallback,
				Math.min(fallbackBudget, spec.commandTimeoutMs),
				signal,
			);
		} catch (caught) {
			if (caught instanceof CliRunTimeoutError && fallbackBudget <= spec.commandTimeoutMs) {
				throw createDeadlineError(deadlineMs);
			}
			throw runnerFailed("create-failed", prepare.fallback, caught);
		}
		if (fallback.code !== 0) {
			throw vendorFailed("create-failed", prepare.fallback, fallback);
		}

		// A successful login proves only that the profile write worked. Re-run the typed probe before
		// allocation so schema drift cannot make both readiness and failed-create recovery unusable.
		const verificationBudget = remaining();
		if (verificationBudget < 1) throw createDeadlineError(deadlineMs);
		let verified: CliRunResult;
		try {
			verified = await call(
				prepare.probe,
				Math.min(verificationBudget, spec.commandTimeoutMs),
				signal,
			);
		} catch (caught) {
			if (caught instanceof CliRunTimeoutError && verificationBudget <= spec.commandTimeoutMs) {
				throw createDeadlineError(deadlineMs);
			}
			throw runnerFailed("create-failed", prepare.probe, caught);
		}
		if (verified.code !== 0) {
			throw vendorFailed("create-failed", prepare.probe, verified);
		}
		parseRows(verified, [prepare.probe]);
	};
	const ensurePreparedOnce = (
		context: CliDriverContext,
		remaining: () => number,
		deadlineMs: number,
		signal?: AbortSignal,
	): Promise<void> => {
		if (spec.prepare === undefined) return Promise.resolve();
		if (context.prepare === true) {
			if (signal?.aborted) return Promise.reject(new CliRunAbortedError(signal.reason));
			return remaining() < 1 ? Promise.reject(createDeadlineError(deadlineMs)) : Promise.resolve();
		}
		const budgetMs = remaining();
		if (budgetMs < 1) return Promise.reject(createDeadlineError(deadlineMs));
		let preparation = context.prepare;
		if (preparation === undefined) {
			// Preparation is driver-owned, not owned by whichever create happened to arrive first. Each
			// control command retains its own hard bound; callers race the shared task below against their
			// individual request budgets and cancellation signals.
			const sharedBudgetMs = Math.min(Number.MAX_SAFE_INTEGER, spec.commandTimeoutMs * 3);
			const sharedDeadline = performance.now() + sharedBudgetMs;
			const cancellation = new AbortController();
			const waiters = new Set<symbol>();
			let state!: CliPreparationInFlight;
			state = {
				cancellation,
				waiters,
				promise: ensurePrepared(
					() => Math.max(0, sharedDeadline - performance.now()),
					sharedBudgetMs,
					cancellation.signal,
				).then(
					() => {
						if (context.prepare === state) context.prepare = true;
					},
					(caught: unknown) => {
						if (context.prepare === state) context.prepare = undefined;
						throw caught;
					},
				),
			};
			context.prepare = state;
			preparation = state;
		}
		if (preparation.cancellation.signal.aborted) {
			// The previous last owner has canceled this task and is waiting for its runner to kill/reap.
			// A new owner waits for that bounded drain under ITS budget, then transparently starts or
			// joins the successor instead of inheriting the retired task's cancellation error.
			let retirementTimer: ReturnType<typeof setTimeout> | undefined;
			let unsubscribeRetirementAbort = () => {};
			const retirementDeadline = new Promise<never>((_resolve, reject) => {
				retirementTimer = setTimeout(() => reject(createDeadlineError(deadlineMs)), budgetMs);
			});
			const retirementAbort = new Promise<never>((_resolve, reject) => {
				unsubscribeRetirementAbort = subscribeToAbort(signal, () =>
					reject(new CliRunAbortedError(signal?.reason)),
				);
			});
			const retired = preparation.promise.then(
				() => undefined,
				() => undefined,
			);
			return Promise.race([retired, retirementDeadline, retirementAbort])
				.finally(() => {
					if (retirementTimer !== undefined) clearTimeout(retirementTimer);
					unsubscribeRetirementAbort();
				})
				.then(() => ensurePreparedOnce(context, remaining, deadlineMs, signal));
		}

		const waiter = Symbol("cli-prepare-waiter");
		preparation.waiters.add(waiter);
		let timer: ReturnType<typeof setTimeout> | undefined;
		let unsubscribeAbort = () => {};
		const ownDeadline = new Promise<never>((_resolve, reject) => {
			timer = setTimeout(() => reject(createDeadlineError(deadlineMs)), budgetMs);
		});
		const ownAbort = new Promise<never>((_resolve, reject) => {
			unsubscribeAbort = subscribeToAbort(signal, () =>
				reject(new CliRunAbortedError(signal?.reason)),
			);
		});
		return Promise.race([preparation.promise, ownDeadline, ownAbort])
			.then(() => {
				// Like readiness polling, do not accept a completion that landed after its budget but
				// before the timer callback got a turn.
				if (signal?.aborted) throw new CliRunAbortedError(signal.reason);
				if (remaining() < 1) throw createDeadlineError(deadlineMs);
			})
			.finally(() => {
				if (timer !== undefined) clearTimeout(timer);
				unsubscribeAbort();
				preparation.waiters.delete(waiter);
				if (preparation.waiters.size === 0 && context.prepare === preparation) {
					preparation.cancellation.abort(
						new Error(`${provider} CLI preparation has no remaining create owner`),
					);
					// The last owner does not return until the runner honors cancellation and has reaped
					// its subprocess. `finally` preserves the caller's own timeout/abort error afterward.
					return preparation.promise.then(
						() => undefined,
						() => undefined,
					);
				}
			});
	};

	const matchesNotFound = (text: string): boolean =>
		new RegExp(spec.notFound.source, spec.notFound.flags).test(text);

	const parseSandboxId = (
		raw: unknown,
		ref?: SandboxRef,
		diagnosticArgs: readonly (readonly string[])[] = [],
	): string => {
		const id = spec.sandboxId.parse(raw);
		if (id instanceof type.errors) {
			const summary = redactKnownDiagnostic(id.summary, diagnosticArgs);
			throw new DriverError(
				"invalid-sandbox-ref",
				`${provider} CLI returned an invalid sandbox id: ${summary}`,
				{ provider, ...(ref ? { ref } : {}) },
			);
		}
		return id;
	};
	const sandboxIdOf = (row: Row, diagnosticArgs: readonly (readonly string[])[] = []): string =>
		parseSandboxId(spec.sandboxId.fromRow(row), undefined, diagnosticArgs);
	const sandboxIdFromRef = (ref: SandboxRef): string => {
		if (ref.provider !== provider) {
			throw new DriverError(
				"invalid-sandbox-ref",
				`${provider} driver cannot destroy a ${ref.provider} sandbox ref`,
				{ provider, ref },
			);
		}
		return parseSandboxId(ref.id, ref);
	};

	const destroyByArgs = async (
		args: readonly string[],
		options: {
			readonly ref?: SandboxRef;
			readonly timeoutMs?: number;
			readonly diagnosticArgs?: readonly (readonly string[])[];
			readonly signal?: AbortSignal;
		} = {},
	): Promise<
		| { readonly status: "destroyed" }
		| { readonly status: "not-found"; readonly result: CliRunResult }
	> => {
		const timeoutMs = options.timeoutMs ?? spec.commandTimeoutMs;
		let result: CliRunResult;
		try {
			result = await call(args, timeoutMs, options.signal);
		} catch (caught) {
			throw runnerFailed("destroy-failed", args, caught, options.ref, options.diagnosticArgs);
		}
		const notFound = matchesNotFound(result.stderr) || matchesNotFound(result.stdout);
		if (notFound) return { status: "not-found", result };
		if (result.code !== 0) {
			throw vendorFailed("destroy-failed", args, result, options.ref, options.diagnosticArgs);
		}
		return { status: "destroyed" };
	};

	return {
		async create(context, request, operationOptions) {
			const signal = operationOptions?.signal;
			const name = `bench-${randomUUID()}`;
			const deadlineMs = Math.min(
				request.deadlineMs,
				options.createAttemptCeilingMs ?? request.deadlineMs,
			);
			const boundedRequest =
				deadlineMs === request.deadlineMs ? request : { ...request, deadlineMs };
			const deadline = performance.now() + deadlineMs;
			const remaining = (): number => Math.max(0, deadline - performance.now());
			// Compile every argv that rollback may need before the first external side effect. A
			// declarative callback bug is then allocation-safe and cannot discard the only locator.
			let createArgs: readonly string[];
			let cleanupArgs: readonly string[] | undefined;
			try {
				if (spec.cleanupCreated.kind === "command") {
					cleanupArgs = spec.cleanupCreated.command(name);
				}
				createArgs = spec.create(boundedRequest, name);
			} catch (caught) {
				throw new DriverError(
					"vendor-contract-violation",
					`${provider} CLI argv builder threw before create`,
					{ provider, cause: caught },
				);
			}
			const attemptArgs: readonly (readonly string[])[] =
				cleanupArgs === undefined
					? [createArgs, spec.ready.poll]
					: [createArgs, spec.ready.poll, cleanupArgs];
			await ensurePreparedOnce(context, remaining, deadlineMs, signal);
			try {
				const createBudget = remaining();
				if (createBudget < 1) throw createDeadlineError(deadlineMs);
				const createCommandTimeoutMs = spec.createCommandTimeoutMs ?? spec.commandTimeoutMs;
				let created: CliRunResult;
				try {
					created = await call(createArgs, Math.min(createBudget, createCommandTimeoutMs), signal);
				} catch (caught) {
					if (caught instanceof CliRunTimeoutError && createBudget <= createCommandTimeoutMs) {
						throw createDeadlineError(deadlineMs);
					}
					throw runnerFailed("create-failed", createArgs, caught, undefined, attemptArgs);
				}
				if (created.code !== 0) {
					throw vendorFailed("create-failed", createArgs, created, undefined, attemptArgs);
				}

				const pollBudget = remaining();
				if (pollBudget < 1) throw createDeadlineError(deadlineMs);
				// Reserve the tail of the attempt ceiling for failed-create reconciliation. Readiness polling
				// would otherwise spend the entire budget, so a create that was remotely accepted but never
				// became ready would skip its only in-line cleanup attempt and hand a possibly-billable
				// allocation to the process-level owner. Never reserve more than half, so readiness keeps a
				// usable window on short deadlines.
				const reconciliationReserveMs = Math.min(spec.commandTimeoutMs, Math.floor(pollBudget / 2));
				const readinessBudget = pollBudget - reconciliationReserveMs;
				const readinessDeadline = performance.now() + readinessBudget;
				const remainingReadiness = (): number => Math.max(0, readinessDeadline - performance.now());
				let row: Row;
				let activePoll: Promise<CliRunResult> | undefined;
				try {
					row = await pollUntilReady({
						provider,
						deadlineMs: readinessBudget,
						intervalMs: spec.ready.pollIntervalMs ?? 1_000,
						signal,
						poll: async () => {
							const probeBudget = remainingReadiness();
							if (probeBudget < 1) throw createDeadlineError(deadlineMs);
							let polled: CliRunResult;
							try {
								const running = call(
									spec.ready.poll,
									Math.min(probeBudget, spec.commandTimeoutMs),
									signal,
								);
								activePoll = running;
								try {
									polled = await running;
								} finally {
									if (activePoll === running) activePoll = undefined;
								}
							} catch (caught) {
								if (caught instanceof CliRunTimeoutError && probeBudget <= spec.commandTimeoutMs) {
									throw createDeadlineError(deadlineMs);
								}
								throw runnerFailed(
									"create-failed",
									spec.ready.poll,
									caught,
									undefined,
									attemptArgs,
								);
							}
							if (polled.code !== 0) {
								throw vendorFailed(
									"create-failed",
									spec.ready.poll,
									polled,
									undefined,
									attemptArgs,
								);
							}
							const rows = parseRows(polled, attemptArgs);
							const row = spec.ready.select(rows, name);
							if (row === null) return null;
							const status = spec.ready.classify(row);
							if (status === "ready") return row;
							if (status === "pending") return null;
							const detail = redactKnownDiagnostic(status.terminal.trim(), attemptArgs);
							if (detail === "") {
								throw new DriverError(
									"vendor-contract-violation",
									`${provider} CLI readiness terminal detail must not be empty`,
									{ provider },
								);
							}
							throw new DriverError(
								"create-failed",
								`${provider} sandbox entered a terminal state: ${detail}`,
								{ provider, vendorMessage: detail },
							);
						},
					});
				} catch (caught) {
					// pollUntilReady owns the request deadline, but the CLI runner owns subprocess
					// termination. Never begin failed-create reconciliation until an active poll has
					// honored cancellation/timeout and reaped its child.
					const drainingPoll = activePoll;
					if (drainingPoll !== undefined) {
						await drainingPoll.then(
							() => undefined,
							() => undefined,
						);
					}
					if (caught instanceof DriverError && caught.code === "readiness-timeout") {
						throw createDeadlineError(deadlineMs);
					}
					throw caught;
				}
				return {
					handle: row,
					sandboxRef: sandboxRef(provider, sandboxIdOf(row, attemptArgs)),
				};
			} catch (primary) {
				// A CLI can submit the allocation and still exit nonzero during a client-side
				// post-check. Reconcile by the generated name after every failed create outcome;
				// not-found tolerance makes this safe when nothing was allocated.
				// An immediate not-found is ambiguous here: the create may have been remotely accepted but
				// not reached the name index yet. Keep the generated name owned and retryable instead of
				// treating transient absence as proof that no billable allocation exists.
				let firstMissingAt: number | undefined;
				type CleanupObservation =
					| { readonly status: "destroyed" }
					| {
							readonly status: "absent";
							readonly result: CliRunResult;
							readonly args: readonly string[];
							readonly diagnosticArgs: readonly (readonly string[])[];
					  };
				const observeCleanup = async (
					timeoutMs: number,
					signal?: AbortSignal,
				): Promise<CleanupObservation> => {
					const observationDeadline = performance.now() + timeoutMs;
					const remainingObservation = (): number =>
						Math.max(0, observationDeadline - performance.now());
					if (spec.cleanupCreated.kind === "command") {
						if (cleanupArgs === undefined) {
							throw new DriverError(
								"vendor-contract-violation",
								`${provider} CLI cleanup command was not preflighted`,
								{ provider },
							);
						}
						const outcome = await destroyByArgs(cleanupArgs, {
							timeoutMs: remainingObservation(),
							diagnosticArgs: attemptArgs,
							signal,
						});
						return outcome.status === "destroyed"
							? outcome
							: {
									status: "absent",
									result: outcome.result,
									args: cleanupArgs,
									diagnosticArgs: attemptArgs,
								};
					}

					let listed: CliRunResult;
					try {
						listed = await call(spec.ready.poll, remainingObservation(), signal);
					} catch (caught) {
						throw runnerFailed("destroy-failed", spec.ready.poll, caught, undefined, attemptArgs);
					}
					if (listed.code !== 0) {
						throw vendorFailed("destroy-failed", spec.ready.poll, listed, undefined, attemptArgs);
					}
					const rows = parseRows(listed, attemptArgs);
					let row: Row | null;
					try {
						row = spec.cleanupCreated.select(rows, name);
					} catch (caught) {
						throw new DriverError(
							"vendor-contract-violation",
							`${provider} failed-create lookup selector threw`,
							{ provider, cause: caught },
						);
					}
					if (row === null) {
						return {
							status: "absent",
							result: listed,
							args: spec.ready.poll,
							diagnosticArgs: attemptArgs,
						};
					}
					// A positive name lookup contradicts every older absence observation. If the
					// following id-addressed delete reports not-found, it starts a fresh horizon.
					firstMissingAt = undefined;

					const id = sandboxIdOf(row, attemptArgs);
					let destroyArgs: readonly string[];
					try {
						destroyArgs = spec.destroy(id);
					} catch (caught) {
						throw new DriverError(
							"vendor-contract-violation",
							`${provider} destroy argv builder threw during failed-create recovery`,
							{ provider, cause: caught },
						);
					}
					const destroyBudget = remainingObservation();
					if (destroyBudget < 1) {
						throw new DriverError(
							"destroy-failed",
							`${provider} failed-create lookup spent its cleanup attempt budget`,
							{ provider },
						);
					}
					const destroyDiagnosticArgs = [...attemptArgs, destroyArgs];
					const destroyed = await destroyByArgs(destroyArgs, {
						timeoutMs: destroyBudget,
						diagnosticArgs: destroyDiagnosticArgs,
						signal,
					});
					return destroyed.status === "destroyed"
						? destroyed
						: {
								status: "absent",
								result: destroyed.result,
								args: destroyArgs,
								diagnosticArgs: destroyDiagnosticArgs,
							};
				};
				const retryCleanup = async (
					timeoutMs = spec.commandTimeoutMs,
					signal?: AbortSignal,
				): Promise<void> => {
					if (signal?.aborted) throw new CliRunAbortedError(signal.reason);
					const attemptDeadline = performance.now() + timeoutMs;
					const remainingAttempt = (): number => Math.max(0, attemptDeadline - performance.now());
					const initialBudget = remainingAttempt();
					if (initialBudget < 1) {
						throw new DriverError(
							"destroy-failed",
							`${provider} failed-create cleanup attempt budget was exhausted`,
							{ provider },
						);
					}
					let outcome = await observeCleanup(initialBudget, signal);
					if (outcome.status === "destroyed") return;

					const observedAt = performance.now();
					if (
						firstMissingAt !== undefined &&
						observedAt - firstMissingAt >= spec.cleanupCreated.absenceConfirmationMs
					) {
						return;
					}
					firstMissingAt ??= observedAt;

					// The first absence can be an indexing race after remote acceptance. Re-observe
					// only after the provider-declared convergence horizon; if this attempt cannot
					// afford that wait, retain ownership for the process-level cleanup owner.
					const confirmationAt = firstMissingAt + spec.cleanupCreated.absenceConfirmationMs;
					const waitMs = Math.max(0, confirmationAt - performance.now());
					const waitDurationMs = Math.ceil(waitMs);
					if (remainingAttempt() <= waitDurationMs) {
						throw vendorFailed(
							"destroy-failed",
							outcome.args,
							outcome.result,
							undefined,
							outcome.diagnosticArgs,
						);
					}
					if (waitDurationMs > 0) await abortableDelay(waitDurationMs, signal);

					const confirmationBudget = remainingAttempt();
					if (confirmationBudget < 1) {
						throw vendorFailed(
							"destroy-failed",
							outcome.args,
							outcome.result,
							undefined,
							outcome.diagnosticArgs,
						);
					}
					outcome = await observeCleanup(confirmationBudget, signal);
					if (outcome.status === "destroyed") return;
					if (performance.now() - firstMissingAt >= spec.cleanupCreated.absenceConfirmationMs)
						return;
					throw vendorFailed(
						"destroy-failed",
						outcome.args,
						outcome.result,
						undefined,
						outcome.diagnosticArgs,
					);
				};
				let cleanupError: unknown;
				const cleanupBudget = remaining();
				if (signal?.aborted) {
					cleanupError = new DriverError(
						"destroy-failed",
						`${provider} failed-create cleanup was handed to the process owner after cancellation`,
						{ provider },
					);
				} else if (cleanupBudget < 1) {
					cleanupError = new DriverError(
						"destroy-failed",
						`${provider} failed-create cleanup was deferred because the request deadline was exhausted`,
						{ provider },
					);
				} else {
					try {
						await retryCleanup(Math.min(cleanupBudget, spec.commandTimeoutMs), signal);
					} catch (caught) {
						cleanupError = caught;
					}
				}
				if (cleanupError !== undefined) {
					throw new FailedCreateCleanupError(cleanupError, primary, {
						provider,
						locator: { kind: "name", value: name },
						cleanup: (cleanupOptions: DriverOperationOptions = {}) =>
							retryCleanup(spec.commandTimeoutMs, cleanupOptions.signal),
					});
				}
				throw primary;
			}
		},
		async exec(_ctx, row, command): Promise<ExecResult> {
			const started = Date.now();
			const args = spec.exec(sandboxIdOf(row), command);
			let result: CliRunResult;
			try {
				result = await call(args);
			} catch (caught) {
				throw runnerFailed("exec-failed", args, caught);
			}
			return {
				exit: { kind: "exited", code: result.code },
				stdout: result.stdout,
				stderr: result.stderr,
				durationMs: Date.now() - started,
				truncated: false, // the kit applies caps centrally (table.ts / output.ts)
			};
		},
		destroy: async (_ctx, row, operationOptions) => {
			await destroyByArgs(spec.destroy(sandboxIdOf(row)), {
				signal: operationOptions?.signal,
			});
		},
		// CLI vendors get bare-ref reaping for free: the destroy argv only needs the id, and
		// notFound tolerance already makes it idempotent.
		destroyById: async (_ctx, ref, operationOptions) => {
			await destroyByArgs(spec.destroy(sandboxIdFromRef(ref)), {
				ref,
				signal: operationOptions?.signal,
			});
		},
		// No files, no launch: absent, not stubbed — the harness fallbacks (shell.ts) cover both.
	};
}

function cliDriver<Row>(
	provider: ProviderId,
	spec: CliSpec<Row>,
	options: CliDriverOptions = {},
): SandboxDriver<Row> {
	return driverFromTable(cliMethodTable(provider, spec, options), async () => ({}));
}

/**
 * Define one CLI-only provider from its registry id and declarative table.
 *
 * Unlike assembling `defineDriver` and a generic driver by hand, this makes both load-bearing
 * invariants structural: the provider id has one literal source, and CLI creates always retain
 * ownership through their driver-controlled attempt ceiling.
 */
export function defineCliDriver<P extends ProviderId, Row>(
	id: P,
	module: CliDriverModuleSpec<NoInfer<P>, Row>,
): DriverModule<P, Row> {
	if (!Number.isSafeInteger(module.createAttemptCeilingMs) || module.createAttemptCeilingMs <= 0) {
		throw new DriverError(
			"vendor-contract-violation",
			`createAttemptCeilingMs must be a positive safe integer, received ${String(module.createAttemptCeilingMs)}`,
			{ provider: id },
		);
	}
	return defineDriver(id, {
		createBudget: { owner: "driver", attemptCeilingMs: module.createAttemptCeilingMs },
		driver: (context) =>
			cliDriver(id, module.spec(context), {
				createAttemptCeilingMs: module.createAttemptCeilingMs,
			}),
	});
}
