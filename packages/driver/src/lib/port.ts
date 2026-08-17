// The sandbox driver port (ADR-0007 §2): the contract every provider implements and the only
// provider-facing surface the harness consumes.
//
// This module is the kit's SINGLE SOURCE OF TRUTH for the port's data shapes: every parsed or
// persisted shape is an arktype schema and its static type is INFERRED from it — one
// declaration yields the runtime validator, the compile-time type, and the error message.
// Behavioral contracts (sessions, drivers, capabilities) stay plain TypeScript below, because
// runtime schemas cannot prove asynchronous behavior, idempotency, or handle/context
// relationships — that is ADR-0008's job.
//
// The target spec is deliberately NOT declared here: it is reused from the registry's own
// `targetSpecSchema` (one spec vocabulary, one unit system — ADR-0007 §9's "never mint a
// parallel spec shape"). The kit's consumers (harness, CLI, drivers) all already evaluate the
// schema package in-process, so this reuse adds no new import cost class.

import { targetSpecSchema } from "@sandbox-benchmarks/schema";
import type { ProviderId } from "@sandbox-benchmarks/schema/providers";
import { regex, type } from "arktype";
import { DriverError } from "./errors.ts";

type DeepReadonly<T> = T extends (infer U)[]
	? readonly DeepReadonly<U>[]
	: T extends object
		? { readonly [K in keyof T]: DeepReadonly<T[K]> }
		: T;

/* ------------------------------ Sandbox identification ------------------------------ */

// Per-provider sandbox id formats, statically parsed by arkregex so the inferred id types are
// template literals where the pattern allows (`sb-${string}` for Modal), plain-but-validated
// strings elsewhere. Confidence varies by vendor and is annotated; every format is a behavioral
// claim ADR-0008's smoke conformance verifies against a live sandbox — a wrong pattern fails in
// smoke, loudly, before any benchmark runs. Formats without vendor evidence start at the
// conservative `slugId` and are tightened by conformance evidence, never by guesswork.
const slugId = regex("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$"); // conservative default
const modalId = regex("^sb-\\w+$"); // observed Modal sandbox id shape
const e2bLikeId = regex("^i[a-z0-9]+$"); // observed E2B id shape; novita is E2B-compatible
const runloopId = regex("^dbx_\\w+$"); // Runloop devbox prefix (bpt_/snp_ siblings observed)
const vercelId = regex("^sbx_\\w+$"); // Vercel Sandbox id prefix

/**
 * Sandbox identification: WHICH provider's control plane owns the sandbox, and its id in that
 * provider's own format. One discriminated schema (arktype auto-discriminates on `provider`)
 * is the source of truth for both the runtime validation and the narrowed static types —
 * `SandboxRef<"modal-gvisor">["id"]` is `` `sb-${string}` ``, not `string`.
 */
export const sandboxRefSchema = type.or(
	{ provider: "'e2b'", id: e2bLikeId },
	{ provider: "'daytona-vm'", id: "string.uuid" },
	{ provider: "'daytona-container'", id: "string.uuid" },
	{ provider: "'blaxel'", id: slugId },
	{ provider: "'microsandbox-local'", id: slugId },
	{ provider: "'microsandbox-cloud'", id: slugId },
	{ provider: "'modal-gvisor'", id: modalId },
	{ provider: "'modal-vm'", id: modalId },
	{ provider: "'novita'", id: e2bLikeId },
	{ provider: "'runloop'", id: runloopId },
	{ provider: "'namespace'", id: slugId },
	{ provider: "'vercel'", id: vercelId },
	{ provider: "'runcloud'", id: slugId },
	{ provider: "'tama'", id: slugId },
);

type SandboxRefUnion = typeof sandboxRefSchema.infer;

// The schema's provider branches must cover ProviderId exactly — both directions pinned at
// compile time (type-only; erases entirely), so a provider added to the registry without an id
// format (or a stray branch) is a type error here, not a runtime surprise.
type Assert<T extends true> = T;
type _refCoversRegistry = Assert<
	[SandboxRefUnion["provider"]] extends [ProviderId]
		? [ProviderId] extends [SandboxRefUnion["provider"]]
			? true
			: false
		: false
>;

export type SandboxRef<P extends ProviderId = ProviderId> = DeepReadonly<
	Extract<SandboxRefUnion, { provider: P }>
>;

/** The one blessed constructor: a ref that parses is a ref in that provider's real format. */
export function sandboxRef<P extends ProviderId>(provider: P, id: string): SandboxRef<P> {
	const parsed = sandboxRefSchema({ provider, id });
	if (parsed instanceof type.errors) {
		throw new DriverError("invalid-sandbox-ref", `invalid sandbox ref: ${parsed.summary}`, {
			provider,
		});
	}
	// The schema just proved the branch for `provider`; Extract names what arktype validated.
	return parsed as SandboxRef<P>;
}

/* --------------------------------- Command results --------------------------------- */

/**
 * How a command ended. "Didn't tell us" is representable (`unknown`), so no driver ever forges
 * an exit code (`?? 1`, `?? 127`) — a missing code becomes evidence in the run document instead
 * of a fake failure (ADR-0008: exec MUST report the guest's real exit status).
 */
export const exitSchema = type.or(
	{ kind: "'exited'", code: "number.integer" },
	{ kind: "'signalled'", signal: "string >= 1" },
	{ kind: "'unknown'", detail: "string" },
);
export type Exit = DeepReadonly<typeof exitSchema.infer>;

export const succeeded = (exit: Exit): boolean => exit.kind === "exited" && exit.code === 0;

export const execResultSchema = type({
	exit: exitSchema,
	stdout: "string",
	stderr: "string",
	durationMs: "number >= 0",
	/** True when a per-call {@link ExecOptions.maxOutputBytes} cap cut a stream. */
	truncated: "boolean",
});
export type ExecResult = DeepReadonly<typeof execResultSchema.infer>;

export interface ExecOptions {
	/**
	 * Opt-in output cap for probes and queries. Deliberately NEVER a kit-wide default: results
	 * collection is a multi-MB base64 tar over stdout (`collect.ts`), and a blanket cap would
	 * turn it into a bounded retry loop that can never succeed (ADR-0007 §9).
	 */
	readonly maxOutputBytes?: number;
}

/* --------------------------------- Create requests --------------------------------- */

/** Vendor-neutral GPU request; drivers map it to vendor syntax (Modal: "H100!", "A100:2"). */
export const gpuSpecSchema = type({
	model: "string >= 1",
	count: "number.integer > 0",
});
export type GpuSpec = DeepReadonly<typeof gpuSpecSchema.infer>;

/**
 * The request a driver boots. `spec` IS the registry's `targetSpecSchema` (vcpus / memoryGb /
 * diskGb?, registry units — vendor conversions live in exactly one driver-local expression);
 * a driver that cannot express a *present* `diskGb` MUST fail create loudly. A driver that
 * cannot honor a requested `gpu` MUST fail create — never silently benchmark CPU.
 */
export const createRequestSchema = type({
	spec: targetSpecSchema,
	/**
	 * The boot artifact reference resolved from the registry's artifact descriptor — or, for
	 * artifacts built at run time (kind "built"), the ref the driver's context factory produced.
	 */
	artifactRef: "string >= 1",
	deadlineMs: "number.integer > 0",
	"gpu?": gpuSpecSchema,
	"env?": "Record<string, string>",
}).onDeepUndeclaredKey("reject"); // shallow "+": "reject" misses nested misspellings (§9)

export type CreateRequest = DeepReadonly<typeof createRequestSchema.infer>;
export type TargetSpec = CreateRequest["spec"];

/**
 * Parse once, where CLI/config/persisted input becomes a trusted request — the plan→request
 * seam. Drivers never re-validate: by the time a request reaches a table, it is trusted.
 */
export function parseCreateRequest(input: unknown): CreateRequest {
	const parsed = createRequestSchema(input);
	if (parsed instanceof type.errors) {
		throw new DriverError("invalid-create-request", `invalid CreateRequest: ${parsed.summary}`);
	}
	return parsed;
}

/* ------------------------- Behavioral contracts (plain TS) ------------------------- */

/**
 * A working filesystem API — reads AND writes — or the capability is absent (`undefined`),
 * never a stub that lies (the `UnsupportedFileSystem` incident is why). All-or-nothing: every
 * vendor with a real filesystem API supports both directions, and sessions without it get
 * harness-owned fallbacks for both (shell.ts).
 */
export interface SandboxFiles {
	readFile(path: string): Promise<string>;
	exists(path: string): Promise<boolean>;
	writeText(path: string, text: string): Promise<void>;
}

/**
 * A live sandbox. The required surface is exactly what every benchmark step needs: identity,
 * run a shell command, tear down.
 */
export interface SandboxSession<Handle = unknown> {
	readonly sandboxRef: SandboxRef;
	/** The ref the driver reports it actually booted (falls back to the request's). */
	readonly artifactRef: string;
	/** The vendor's native handle — the JDBC `unwrap()` idea, typed by the driver. */
	readonly native: Handle;
	exec(command: string, options?: ExecOptions): Promise<ExecResult>;
	/** Idempotent and convergent (ADR-0008): MUST NOT resolve while the vendor still runs it. */
	destroy(): Promise<void>;
	readonly files?: SandboxFiles;
	/** Optional. `undefined` ⇒ the harness wraps `exec` in its own nohup double-fork (shell.ts). */
	launch?(command: string, options?: ExecOptions): Promise<void>;
}

/** Optional, measurement-only capabilities. Absent ⇒ the harness records a clean capability gap. */
export interface ControlPlaneProbes {
	/** Timed only; the value is discarded. */
	list(): Promise<unknown>;
	/** Optional. Absent ⇒ the provider has no per-sandbox describe probe — never a no-op stub. */
	describe?(ref: SandboxRef): Promise<unknown>;
}

export interface SnapshotCapability {
	create(ref: SandboxRef): Promise<{ readonly snapshotId: string }>;
	delete(snapshotId: string): Promise<void>;
}

/** Everything a provider must supply. One required member; capabilities by presence. */
export interface SandboxDriver<Handle = unknown> {
	create(request: CreateRequest): Promise<SandboxSession<Handle>>;
	/**
	 * Optional: destroy by ref, no session required — reaper/cleanup lanes. Bound by the same
	 * clauses as destroy: idempotent, convergent, and destroy-of-missing MUST succeed.
	 */
	destroyById?(ref: SandboxRef): Promise<void>;
	readonly probes?: ControlPlaneProbes;
	readonly snapshots?: SnapshotCapability;
}

/**
 * Who owns the create attempt's time budget. Replaces the old `createTimeoutMs: null` sentinel
 * with a self-describing union: either the harness races create against a timeout, or the
 * driver owns bounds AND failed-create cleanup — in which case abandoning it mid-teardown would
 * strand a billable sandbox, so the harness awaits it. Committed driver-module data (Tier 1),
 * so it stays plain TypeScript by the parsing doctrine.
 */
export type CreateBudget =
	| { readonly owner: "harness"; readonly timeoutMs?: number }
	| { readonly owner: "driver"; readonly attemptCeilingMs: number };
