// cliDriver (ADR-0007 §5): the generic driver for CLI-only vendors. A provider whose control
// plane is `spawn()` on a binary becomes a declarative table of argv templates and parsers.
// The generic driver owns spawn, secret redaction and not-found matching ONCE; vendor stdout
// is a trust boundary, so the table's `parse` fields are arktype pipelines and a vendor
// changing its output shape produces a path-bearing report, not an `undefined` threading
// through readiness logic.
//
// The compiled shape is a MethodTable whose handle is the PARSED READINESS ROW — so every
// generated member is unit-testable as a pure function and `session.native` is the vendor's
// own typed record, not an opaque id string.

import type { ProviderId } from "@sandbox-benchmarks/schema/providers";
import type { ArkErrors } from "arktype";
import type { CreateRequest, ExecResult, SandboxDriver, SandboxRef } from "./index.ts";
import { driverFromTable, sandboxRef } from "./index.ts";
import type { MethodTable } from "./lib/table.ts";

export interface CliRunResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly code: number;
}

/** Runs the vendor binary. Injectable so cliDriver tables are testable without a real CLI. */
export type CliRunner = (binary: string, args: readonly string[]) => Promise<CliRunResult>;

export interface CliSpec<Row> {
	/** The provider this CLI fronts — sandbox refs are validated in its id format. */
	readonly provider: ProviderId;
	/** Resolved binary path or name (the caller applies any env override). */
	readonly binary: string;
	/** Flags whose FOLLOWING argv value is a secret: redacted from every diagnostic. */
	readonly secretFlags: readonly string[];
	/** argv to create a sandbox named `name` for `request`. */
	readonly create: (request: CreateRequest, name: string) => readonly string[];
	readonly ready: {
		/** argv that lists/inspects sandboxes; polled until `select` finds the row. */
		readonly poll: readonly string[];
		/** Trust boundary: raw stdout → rows, as an arktype pipeline (path-bearing errors). */
		readonly parse: (raw: string) => readonly Row[] | ArkErrors;
		/** The created-and-ready row for `name`, or null to keep polling. */
		readonly select: (rows: readonly Row[], name: string) => Row | null;
		readonly pollIntervalMs?: number;
	};
	/** The row's stable sandbox id (validated into a SandboxRef by the kit). */
	readonly idOf: (row: Row) => string;
	readonly exec: (id: string, command: string) => readonly string[];
	readonly destroy: (id: string) => readonly string[];
	/** Vendor prose meaning "already gone" — destroy-of-missing MUST succeed (ADR-0008). */
	readonly notFound: RegExp;
}

export interface CliDriverOptions {
	/** Override the spawn runner (tests). Defaults to Bun.spawn on the spec's binary. */
	readonly run?: CliRunner;
}

const isArkErrors = (value: unknown): value is ArkErrors =>
	typeof value === "object" && value !== null && "summary" in value && Symbol.iterator in (value as object);

const defaultRunner: CliRunner = async (binary, args) => {
	const child = Bun.spawn([binary, ...args], { stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { stdout, stderr, code };
};

/** Redact secret values from an argv for diagnostics: the value AFTER a secret flag becomes ***. */
export function redactArgs(args: readonly string[], secretFlags: readonly string[]): string[] {
	const redacted: string[] = [];
	let hide = false;
	for (const arg of args) {
		redacted.push(hide ? "***" : arg);
		hide = secretFlags.includes(arg);
	}
	return redacted;
}

class CliError extends Error {
	constructor(binary: string, args: readonly string[], secretFlags: readonly string[], detail: string) {
		super(`${binary} ${redactArgs(args, secretFlags).join(" ")}: ${detail}`);
		this.name = "CliError";
	}
}

/** Compile a CLI spec down to a method table (handle = the parsed readiness row). */
export function cliMethodTable<Row>(
	spec: CliSpec<Row>,
	options: CliDriverOptions = {},
): MethodTable<Row, null> {
	const run = options.run ?? defaultRunner;
	const call = async (args: readonly string[]): Promise<CliRunResult> => {
		const result = await run(spec.binary, args);
		return result;
	};
	const fail = (args: readonly string[], detail: string): never => {
		throw new CliError(spec.binary, args, spec.secretFlags, detail);
	};
	const parseRows = (raw: string, sourceArgs: readonly string[]): readonly Row[] => {
		const rows = spec.ready.parse(raw);
		if (isArkErrors(rows)) {
			return fail(sourceArgs, `unparseable output: ${rows.summary}`);
		}
		return rows;
	};
	const destroyByArgs = async (id: string): Promise<void> => {
		const args = spec.destroy(id);
		const result = await call(args);
		if (result.code !== 0 && !spec.notFound.test(result.stderr) && !spec.notFound.test(result.stdout)) {
			fail(args, `exit ${result.code}: ${result.stderr.trim()}`);
		}
	};
	return {
		async create(_ctx, request) {
			const name = `bench-${Math.random().toString(36).slice(2, 10)}`;
			const createArgs = spec.create(request, name);
			const created = await call(createArgs);
			if (created.code !== 0) {
				fail(createArgs, `exit ${created.code}: ${created.stderr.trim()}`);
			}
			const deadline = Date.now() + request.deadlineMs;
			const interval = spec.ready.pollIntervalMs ?? 1_000;
			for (;;) {
				const polled = await call(spec.ready.poll);
				if (polled.code !== 0) {
					fail(spec.ready.poll, `exit ${polled.code}: ${polled.stderr.trim()}`);
				}
				const row = spec.ready.select(parseRows(polled.stdout, spec.ready.poll), name);
				if (row !== null) {
					return { handle: row, sandboxRef: sandboxRef(spec.provider, spec.idOf(row)) };
				}
				if (Date.now() >= deadline) {
					return fail(createArgs, `${name} not ready within ${request.deadlineMs}ms`);
				}
				await new Promise((resolve) => setTimeout(resolve, interval));
			}
		},
		async exec(_ctx, row, command, options_): Promise<ExecResult> {
			const started = Date.now();
			const args = spec.exec(spec.idOf(row), command);
			const result = await call(args);
			const cap = options_?.maxOutputBytes;
			const clip = (text: string) => (cap !== undefined && text.length > cap ? text.slice(0, cap) : text);
			return {
				exit: { kind: "exited", code: result.code },
				stdout: clip(result.stdout),
				stderr: clip(result.stderr),
				durationMs: Date.now() - started,
				truncated:
					cap !== undefined && (result.stdout.length > cap || result.stderr.length > cap),
			};
		},
		destroy: (_ctx, row) => destroyByArgs(spec.idOf(row)),
		// CLI vendors get bare-ref reaping for free: the destroy argv only needs the id, and
		// notFound tolerance already makes it idempotent.
		destroyById: (_ctx, ref) => destroyByArgs(ref.id),
		// No files, no launch: absent, not stubbed — the harness fallbacks (shell.ts) cover both.
	};
}

/** One generic driver; a CLI-only provider becomes a table of argv templates and parsers. */
export function cliDriver<Row>(spec: CliSpec<Row>, options: CliDriverOptions = {}): SandboxDriver<Row> {
	return driverFromTable(cliMethodTable(spec, options), async () => null);
}
