// ComputeSDK provider built over tama's CLI, because tama publishes no SDK in any language: the
// `tama` binary is the only programmatic surface. Every control-plane call is therefore a subprocess
// whose `--json` output is parsed, and every call is bounded locally — a CLI has no request timeout
// to configure, so an unbounded spawn is the only way this adapter could hang a matrix job.
//
// Credentials live in the CLI's own profile (written by `tama login`), not in an env var the binary
// reads. The schema declares TAMA_TOKEN because that is the CI-correct contract; see
// `ensureAuthenticated` for why an already-authenticated developer profile is preferred over it
// rather than overwritten.

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type {
	CommandResult,
	CreateSandboxOptions,
	RunCommandOptions,
	SandboxInfo,
	SandboxMethods,
} from "@computesdk/provider";
import { defineProvider } from "@computesdk/provider";
import { markRetryableCreate } from "./retryable-create.ts";

const PROVIDER = "tama";

/** Bound every short control-plane CLI call (`list`, `rm`, `login`). */
const CONTROL_PLANE_TIMEOUT_MS = 60_000;
/** `tama new` does not return until the machine is `ready`, so the OCI pull happens INSIDE it. A cold
 *  pull of the ~1.5 GiB toolchain image was observed at 2m10s; leave room for a slower first-use host. */
export const TAMA_CREATE_TIMEOUT_MS = 20 * 60 * 1000;
/** `new` reports `ready` itself, but adopt-after-ambiguous-create returns whatever `list` shows, so a
 *  readiness wait still has to exist for that path. */
const READY_POLL_MS = 3_000;
const READY_TIMEOUT_MS = 5 * 60 * 1000;
/** A `rm` can fail transiently after the machine exists. Retry inside create()'s cleanup, because the
 *  harness has no handle — and therefore no generic teardown path — until create resolves. */
const CREATE_FAILURE_CLEANUP_ATTEMPTS = 5;
const CREATE_FAILURE_CLEANUP_RETRY_MS = 2_000;
/** An ambiguous create is reconciled by NAME (chosen before the request), so a machine whose create
 *  response was lost is still findable instead of silently billable. */
const CREATE_RECONCILE_ATTEMPTS = 5;
const CREATE_RECONCILE_RETRY_MS = 2_000;
/** Prefix for the caller-owned machine name — the recovery handle, and what makes a benchmark machine
 *  identifiable in `tama list` and to any account-wide sweep. */
const RECOVERY_NAME_PREFIX = "sandbox-benchmarks";

/**
 * Worst-case wall time one `create` can spend before it settles, summed over every bound this adapter
 * enforces on its longest path: the `new` call, reconciling an ambiguous one, the readiness wait, and
 * removing a machine that failed readiness.
 *
 * Exported because this adapter turns the harness's per-attempt race OFF (`createTimeoutMs: null`, so
 * its cleanup is never abandoned mid-teardown) and the retry loop still needs to know what an attempt
 * can cost. Derived from the constants above so tightening one tightens this in the same edit.
 */
export const TAMA_CREATE_CEILING_MS =
	TAMA_CREATE_TIMEOUT_MS +
	// Reconciling an ambiguous create: one bounded `list` per attempt, plus the waits between them.
	CREATE_RECONCILE_ATTEMPTS * CONTROL_PLANE_TIMEOUT_MS +
	(CREATE_RECONCILE_ATTEMPTS - 1) * CREATE_RECONCILE_RETRY_MS +
	READY_TIMEOUT_MS +
	READY_POLL_MS +
	// The readiness DEADLINE is checked before each poll, not during one, so the final lookup can start
	// a millisecond inside the window and still run to its own timeout. Without this term the ceiling
	// is one control-plane call short of what the loop can actually spend.
	CONTROL_PLANE_TIMEOUT_MS +
	// Each cleanup attempt spends up to TWO bounded calls, not one: `rm`, then the `list` that confirms
	// absence when `rm` failed ambiguously.
	CREATE_FAILURE_CLEANUP_ATTEMPTS * 2 * CONTROL_PLANE_TIMEOUT_MS +
	(CREATE_FAILURE_CLEANUP_ATTEMPTS - 1) * CREATE_FAILURE_CLEANUP_RETRY_MS;

/** One machine as `tama --json` reports it. Only the fields this adapter relies on are named; the CLI
 *  emits more (desktop_url, labels, capabilities) and may add others, so unknown keys are ignored
 *  rather than rejected. */
export interface TamaMachine {
	id: string;
	name: string;
	/** `ready` is the only state that accepts exec; the CLI also reports transitional and failed ones. */
	status: string;
	status_detail?: string;
	cpu_millicores?: number;
	memory_mb?: number;
	image?: string;
	gpu?: string;
	gpu_count?: number;
}

export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

/** Test seam: every process spawn and clock read this adapter performs goes through these. */
export interface TamaComputeOptions {
	cli?: (args: string[], options?: CliInvokeOptions) => Promise<CliResult>;
	binary?: string;
	createTimeoutMs?: number;
	controlPlaneTimeoutMs?: number;
	readyPollMs?: number;
	readyTimeoutMs?: number;
	cleanupAttempts?: number;
	cleanupRetryMs?: number;
	reconcileAttempts?: number;
	reconcileRetryMs?: number;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
	/** Read once per authentication probe; injected so tests never depend on ambient credentials. */
	token?: () => string | undefined;
}

export interface CliInvokeOptions {
	timeoutMs?: number;
	onStdout?: (chunk: string) => void;
	onStderr?: (chunk: string) => void;
}

/** Flags whose VALUE is a credential and must never reach a message. Only `login --token` today; a
 *  list because the next secret-bearing flag has to be added here, not remembered at the call site. */
const SECRET_FLAGS = new Set(["--token"]);
const REDACTED = "<redacted>";

/**
 * Render an argument vector for a diagnostic with credential values masked.
 *
 * Every error this adapter raises quotes the args it ran, and those messages travel further than a
 * console: into gap markers, run annotations, the job summary and the retained Run document. `tama
 * login --token <TAMA_TOKEN>` therefore has to be redacted at the point the message is BUILT — a
 * caller that remembers to sanitize is one forgotten path away from persisting the credential.
 */
export function redactArgs(args: string[]): string {
	return args
		.map((arg, i) => (i > 0 && SECRET_FLAGS.has(args[i - 1] ?? "") ? REDACTED : arg))
		.join(" ");
}

class CliTimeoutError extends Error {
	constructor(
		readonly args: string[],
		readonly timeoutMs: number,
	) {
		super(`tama ${redactArgs(args)} did not settle within ${timeoutMs}ms`);
		this.name = "CliTimeoutError";
	}
}

class CliError extends Error {
	constructor(
		readonly args: string[],
		readonly result: CliResult,
	) {
		super(
			`tama ${redactArgs(args)} exited ${result.exitCode}: ${
				result.stderr.trim() || result.stdout.trim() || "(no output)"
			}`,
		);
		this.name = "CliError";
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Spawn the CLI and resolve its exit code and captured output. The timeout is enforced by killing the
 * process (SIGTERM, then SIGKILL): unlike an HTTP client there is nothing to abort, so leaving the
 * child alive would leak a process that still holds the control-plane operation.
 */
function spawnCli(
	binary: string,
	args: string[],
	options: CliInvokeOptions = {},
): Promise<CliResult> {
	const timeoutMs = Math.max(1, Math.floor(options.timeoutMs ?? CONTROL_PLANE_TIMEOUT_MS));
	return new Promise<CliResult>((resolve, reject) => {
		const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		let settled = false;
		const kill = setTimeout(() => {
			if (settled) return;
			settled = true;
			child.kill("SIGTERM");
			// A CLI wedged in a syscall ignores SIGTERM; escalate so the deadline is real.
			setTimeout(() => child.kill("SIGKILL"), 5_000).unref?.();
			reject(new CliTimeoutError(args, timeoutMs));
		}, timeoutMs);
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			stdout += chunk;
			options.onStdout?.(chunk);
		});
		child.stderr.on("data", (chunk: string) => {
			stderr += chunk;
			options.onStderr?.(chunk);
		});
		child.on("error", (error) => {
			if (settled) return;
			settled = true;
			clearTimeout(kill);
			reject(error);
		});
		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			clearTimeout(kill);
			resolve({ stdout, stderr, exitCode: code ?? 1 });
		});
	});
}

/** Single-quote a string for `sh -c`, so a command containing quotes survives the extra shell hop. */
function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** `tama rm` on an already-deleted machine is a success for teardown purposes, not a failure. */
function isNotFound(result: CliResult): boolean {
	return /not found|no such machine|unknown machine/i.test(`${result.stderr} ${result.stdout}`);
}

function parseMachines(stdout: string): TamaMachine[] {
	const trimmed = stdout.trim();
	if (!trimmed) return [];
	const parsed: unknown = JSON.parse(trimmed);
	const list = Array.isArray(parsed) ? parsed : [parsed];
	return list.filter(
		(entry): entry is TamaMachine =>
			typeof entry === "object" &&
			entry !== null &&
			typeof (entry as TamaMachine).id === "string" &&
			typeof (entry as TamaMachine).name === "string",
	);
}

/** `ready` accepts exec. Terminal failures must stop a readiness wait rather than burn its window. */
function isTerminalFailure(status: string): boolean {
	return /^(failed|error|terminated|deleted|gone)$/i.test(status);
}

function mapStatus(status: string): SandboxInfo["status"] {
	if (/^ready$/i.test(status)) return "running";
	if (isTerminalFailure(status)) return "error";
	// Transitional (creating/starting/snapshotting) and clean stops both report stopped; create() waits
	// for ready, so getInfo rarely observes a transitional state.
	return "stopped";
}

export function createTamaClient(options: TamaComputeOptions) {
	const binary = options.binary ?? process.env.TAMA_CLI ?? "tama";
	const invoke = options.cli ?? ((args, invokeOptions) => spawnCli(binary, args, invokeOptions));
	const wait = options.sleep ?? sleep;
	const now = options.now ?? Date.now;
	const controlPlaneTimeoutMs = options.controlPlaneTimeoutMs ?? CONTROL_PLANE_TIMEOUT_MS;

	/** Run a CLI call that is expected to succeed, turning a non-zero exit into a thrown error. */
	async function checked(args: string[], invokeOptions: CliInvokeOptions = {}): Promise<CliResult> {
		const result = await invoke(args, {
			timeoutMs: controlPlaneTimeoutMs,
			...invokeOptions,
		});
		if (result.exitCode !== 0) throw new CliError(args, result);
		return result;
	}

	async function list(): Promise<TamaMachine[]> {
		return parseMachines((await checked(["list", "--json"])).stdout);
	}

	/**
	 * Authenticate only when the ambient profile cannot already answer a control-plane call.
	 *
	 * `tama login --token` REPLACES the CLI profile's stored credential, so running it unconditionally
	 * would sign a developer out of their own account as a side effect of running one benchmark. Probing
	 * first keeps a working local profile untouched and still authenticates a fresh CI runner, where the
	 * probe is what fails.
	 */
	let authenticated: Promise<void> | undefined;
	function ensureAuthenticated(): Promise<void> {
		authenticated ??= (async () => {
			try {
				await list();
				return;
			} catch (probeError) {
				const token = (options.token ?? (() => process.env.TAMA_TOKEN))();
				if (!token) {
					throw new Error(
						`tama CLI is not authenticated and TAMA_TOKEN is unset (${errorMessage(probeError)}); ` +
							`run \`tama login\` locally or mint a token with \`tama tokens create\``,
					);
				}
				await checked(["login", "--token", token]);
			}
		})();
		return authenticated;
	}

	async function getByName(name: string): Promise<TamaMachine | undefined> {
		return (await list()).find((machine) => machine.name === name);
	}

	async function getById(id: string): Promise<TamaMachine | undefined> {
		return (await list()).find((machine) => machine.id === id);
	}

	async function waitUntilReady(id: string): Promise<TamaMachine> {
		const pollMs = options.readyPollMs ?? READY_POLL_MS;
		const deadline = now() + (options.readyTimeoutMs ?? READY_TIMEOUT_MS);
		let last: TamaMachine | undefined;
		while (now() < deadline) {
			last = await getById(id);
			if (last && /^ready$/i.test(last.status)) return last;
			if (last && isTerminalFailure(last.status)) {
				throw new Error(
					`tama machine ${id} entered terminal state "${last.status}"${
						last.status_detail ? ` (${last.status_detail})` : ""
					}`,
				);
			}
			await wait(pollMs);
		}
		throw new Error(
			`tama machine ${id} not ready within the readiness window (last status: ${last?.status ?? "unknown"})`,
		);
	}

	async function remove(id: string): Promise<void> {
		const result = await invoke(["rm", "-y", id], { timeoutMs: controlPlaneTimeoutMs });
		if (result.exitCode === 0 || isNotFound(result)) return;
		throw new CliError(["rm", "-y", id], result);
	}

	/**
	 * Remove a machine whose readiness wait failed. A rejected `rm` is ambiguous — the request may have
	 * been accepted before the CLI died — so confirm absence via `list` before retrying, and surface
	 * exhaustion to create() instead of reducing teardown to one best-effort call that can strand a
	 * billable machine.
	 */
	async function cleanupFailedCreate(id: string): Promise<void> {
		const attempts = Math.max(
			1,
			Math.floor(options.cleanupAttempts ?? CREATE_FAILURE_CLEANUP_ATTEMPTS),
		);
		const retryMs = Math.max(0, options.cleanupRetryMs ?? CREATE_FAILURE_CLEANUP_RETRY_MS);
		let lastError: unknown;
		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				await remove(id);
				return;
			} catch (error) {
				lastError = error;
				try {
					if (!(await getById(id))) return;
				} catch {
					// A failed confirmation is not proof of anything; the next attempt re-asks.
				}
				if (attempt < attempts) await wait(retryMs);
			}
		}
		throw lastError;
	}

	/**
	 * Resolve what a failed `tama new` actually DID, by looking up the caller-owned name stamped on the
	 * request. This is a read: unlike replaying `new` it cannot allocate a second machine, and it answers
	 * the only question that matters — does a machine carrying this name exist?
	 *
	 * A lookup that itself fails is not proof of absence, so exhausting the window without a single
	 * answer reports `unanswered` rather than `absent`: concluding "nothing was created" is what strands
	 * a billable machine, and that conclusion has to be earned by a lookup that actually answered.
	 */
	async function reconcile(
		name: string,
	): Promise<
		| { status: "adopted"; machine: TamaMachine }
		| { status: "absent" }
		| { status: "unanswered"; lastError: unknown }
	> {
		const attempts = Math.max(
			1,
			Math.floor(options.reconcileAttempts ?? CREATE_RECONCILE_ATTEMPTS),
		);
		const retryMs = Math.max(0, options.reconcileRetryMs ?? CREATE_RECONCILE_RETRY_MS);
		let answered = false;
		let lastError: unknown;
		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				const machine = await getByName(name);
				answered = true;
				if (machine) return { status: "adopted", machine };
			} catch (error) {
				lastError = error;
			}
			if (attempt < attempts) await wait(retryMs);
		}
		return answered ? { status: "absent" } : { status: "unanswered", lastError };
	}

	return {
		binary,
		invoke,
		list,
		getById,
		getByName,
		waitUntilReady,
		remove,
		cleanupFailedCreate,
		reconcile,
		ensureAuthenticated,
		checked,
	};
}

export type TamaClient = ReturnType<typeof createTamaClient>;

/**
 * Build the `tama new` argument vector from the benchmark's create options.
 *
 * `--ttl 0` is not optional: any other value lets the control plane reclaim the machine while a
 * multi-minute suite is mid-step, and the harness guarantees teardown itself.
 */
export function newArgs(name: string, createOptions?: CreateSandboxOptions): string[] {
	const image = createOptions?.templateId ?? createOptions?.image;
	const args = ["new", name, "--ttl", "0", "--json"];
	if (image) args.push("--image", String(image));
	if (createOptions?.cpu !== undefined) args.push("--cpu", String(createOptions.cpu));
	// computesdk expresses memory in MiB, which is exactly what --memory takes.
	if (createOptions?.memory !== undefined) args.push("--memory", String(createOptions.memory));
	return args;
}

/**
 * Compose the in-guest command line. `tama exec` has no `--env` flag, so environment variables are
 * exported inside the guest shell; there is no detach flag either, so a background step is daemonized
 * explicitly and the harness observes the real job through its own done file, exactly as it does for
 * providers whose SDK also lacks one.
 *
 * `export …;` rather than an `env K=V <command>` PREFIX, because the command is a shell line and not
 * an argv: the suites send pipelines, `&&` chains and `cd`. `env K=V cd /repo && make` would hand
 * `cd` to execve (a builtin no binary implements, so it fails) and leave `make` — a separate command
 * to the shell — running without the variables that were the point. An export statement applies to
 * the whole line, builtins included, which is the semantics every other adapter's `env` option has.
 */
export function execCommandLine(command: string, options?: RunCommandOptions): string {
	const env = options?.env ?? {};
	const assignments = Object.entries(env).map(([key, value]) => {
		// Values are quoted, but a NAME is syntax: an unchecked key composes straight into the shell
		// line. Nothing in the harness produces one, which is exactly why an odd key should fail here
		// rather than execute.
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
			throw new Error(`tama exec: "${key}" is not a valid environment variable name`);
		}
		return `${key}=${shellQuote(String(value))}`;
	});
	const prefixed = assignments.length > 0 ? `export ${assignments.join(" ")}; ${command}` : command;
	return options?.background
		? `nohup /bin/sh -lc ${shellQuote(prefixed)} </dev/null >/dev/null 2>&1 &`
		: prefixed;
}

export function sandboxMethods(
	adapterOptions: TamaComputeOptions = {},
): SandboxMethods<TamaMachine, undefined> {
	const client = createTamaClient(adapterOptions);
	return {
		create: async (_config, createOptions?: CreateSandboxOptions) => {
			if (createOptions?.snapshotId) {
				// tama does have snapshots, but the benchmark boots the shared toolchain image by ref; a
				// snapshot id would silently benchmark different content.
				throw new Error("tama snapshots are not supported by this adapter; pass an image ref");
			}
			await client.ensureAuthenticated();
			// Chosen HERE, before the request: that is what makes it a recovery handle when the response
			// is lost. A caller-supplied name is kept as a readable prefix and the uuid makes the later
			// lookup unambiguous.
			const name = `${createOptions?.name ?? RECOVERY_NAME_PREFIX}-${randomUUID()}`;
			const args = newArgs(name, createOptions);
			let machine: TamaMachine | undefined;
			try {
				const result = await client.invoke(args, {
					timeoutMs: adapterOptions.createTimeoutMs ?? TAMA_CREATE_TIMEOUT_MS,
				});
				if (result.exitCode !== 0) throw new CliError(args, result);
				[machine] = parseMachines(result.stdout);
			} catch (error) {
				const reconciled = await client.reconcile(name);
				// Nothing carries this name, so nothing was created and there is nothing to leak. A timed-out
				// create whose absence IS established is transient and safe to retry; a definite CLI error is
				// left unmarked so a real misconfiguration fails promptly instead of masquerading as capacity.
				if (reconciled.status === "absent") {
					throw error instanceof CliTimeoutError ? markRetryableCreate(error) : error;
				}
				if (reconciled.status === "unanswered") {
					throw new AggregateError(
						[error, reconciled.lastError],
						`tama create failed ambiguously (${errorMessage(error)}) and every reconciliation lookup ` +
							`also failed (${errorMessage(reconciled.lastError)}), so it is unknown whether a machine ` +
							`was created; if one was it carries the name ${name} and manual cleanup may be required`,
					);
				}
				// A machine exists, so `new` SUCCEEDED and only its output was lost. Adopt it rather than
				// throwing away a completed image pull; readiness below still gates whether it is usable.
				machine = reconciled.machine;
			}
			// A zero exit means `new` ran to completion, so an unusable record ({}, [], a shape without
			// id/name, or a future output change) is a REPORTING failure, not evidence that nothing was
			// created — and `new` only exits 0 once the machine is ready, which makes it a billable one.
			// Take the same reconcile-then-clean path an ambiguous create takes rather than throwing with
			// no handle: adopt the machine if the name finds it, and if it doesn't, still say what name to
			// look for. Only an ANSWERED absence is allowed to conclude that nothing leaked.
			if (!machine) {
				const reconciled = await client.reconcile(name);
				if (reconciled.status === "adopted") {
					machine = reconciled.machine;
				} else if (reconciled.status === "absent") {
					throw new Error(
						`tama ${redactArgs(args)} exited 0 but returned no machine record, and no machine ` +
							`carries the name ${name}, so none was created`,
					);
				} else {
					throw new AggregateError(
						[reconciled.lastError],
						`tama ${redactArgs(args)} exited 0 but returned no machine record, and every ` +
							`reconciliation lookup also failed (${errorMessage(reconciled.lastError)}), so it is ` +
							`unknown whether a machine was created; if one was it carries the name ${name} and ` +
							`manual cleanup may be required`,
					);
				}
			}
			// `new` blocks until ready, so this is normally one confirming lookup — it exists for the
			// adopted-after-ambiguous-create path, where the record came from `list` instead.
			if (!/^ready$/i.test(machine.status)) {
				try {
					machine = await client.waitUntilReady(machine.id);
				} catch (error) {
					try {
						await client.cleanupFailedCreate(machine.id);
					} catch (removeError) {
						throw new AggregateError(
							[error, removeError],
							`tama machine ${machine.id} failed readiness (${errorMessage(error)}) and could not be ` +
								`removed after retries (${errorMessage(removeError)}); manual cleanup may be required`,
						);
					}
					throw error;
				}
			}
			return { sandbox: machine, sandboxId: machine.id };
		},

		getById: async (_config, sandboxId) => {
			const machine = await client.getById(sandboxId);
			return machine ? { sandbox: machine, sandboxId: machine.id } : null;
		},

		list: async () =>
			(await client.list()).map((machine) => ({ sandbox: machine, sandboxId: machine.id })),

		destroy: async (_config, sandboxId) => client.remove(sandboxId),

		runCommand: async (
			sandbox,
			command,
			runOptions?: RunCommandOptions,
		): Promise<CommandResult> => {
			const started = Date.now();
			const args = ["exec"];
			if (runOptions?.cwd) args.push("--cwd", runOptions.cwd);
			// Everything after the machine name is the command; the guest shell is explicit so that
			// pipelines, redirections and `&&` in a step behave as the suites expect.
			args.push(sandbox.id, "--", "bash", "-lc", execCommandLine(command, runOptions));
			const result = await client.invoke(args, {
				timeoutMs: runOptions?.timeout ?? CONTROL_PLANE_TIMEOUT_MS,
				// A backgrounded launch returns immediately and its output is not the job's, so streaming
				// callbacks are attached only for a synchronous exec.
				...(runOptions?.background
					? {}
					: { onStdout: runOptions?.onStdout, onStderr: runOptions?.onStderr }),
			});
			return {
				stdout: runOptions?.background ? "" : result.stdout,
				stderr: runOptions?.background ? "" : result.stderr,
				exitCode: result.exitCode,
				durationMs: Date.now() - started,
			};
		},

		getUrl: async (sandbox, urlOptions) => {
			// `tama expose <machine> <port>` publishes a public URL and prints it as prose rather than
			// JSON, so take the first absolute URL in its output instead of assuming a fixed line shape.
			const args = ["expose", sandbox.id, String(urlOptions.port)];
			const result = await client.checked(args);
			const url = /https?:\/\/\S+/.exec(`${result.stdout}\n${result.stderr}`)?.[0];
			if (!url) {
				throw new Error(`tama ${args.join(" ")} published no URL: ${result.stdout.trim()}`);
			}
			// Trailing punctuation from the surrounding sentence is not part of the URL.
			return url.replace(/[.,;)]+$/, "");
		},

		getInfo: async (sandbox) => {
			const current = (await client.getById(sandbox.id)) ?? sandbox;
			return {
				id: current.id,
				provider: PROVIDER,
				status: mapStatus(current.status),
				// The CLI reports no creation timestamp, and inventing one would put a fabricated value in
				// the retained record.
				createdAt: new Date(0),
				// `--ttl 0` disables idle expiry, so there is no provider-side deadline to report.
				timeout: 0,
				metadata: {
					name: current.name,
					image: current.image,
					statusDetail: current.status_detail,
					cpuMillicores: current.cpu_millicores,
					memoryMb: current.memory_mb,
					gpu: current.gpu,
					gpuCount: current.gpu_count,
				},
			};
		},
	};
}

export function tamaCompute(options: TamaComputeOptions = {}) {
	return defineProvider<TamaMachine, undefined>({
		name: PROVIDER,
		methods: { sandbox: sandboxMethods(options) },
	})(undefined);
}
