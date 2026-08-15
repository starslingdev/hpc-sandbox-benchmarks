// The sandbox driver port (ADR-0007 §2): the contract every provider implements and the only
// provider-facing surface the harness consumes. Three required operations — create, exec,
// destroy — plus capabilities that are either present and working or absent (`undefined`),
// never a stub that lies (the `UnsupportedFileSystem` incident is why).
//
// This module is types plus two tiny constructors. It imports nothing.

/** Branded so a sandbox id cannot be swapped with a snapshot id or a provider id. */
export type SandboxId = string & { readonly __sandboxId: unique symbol };

/** The one blessed constructor; empty ids are wiring bugs and fail here, not at the vendor. */
export function sandboxId(raw: string): SandboxId {
	if (raw.length === 0) {
		throw new Error("sandboxId must be non-empty");
	}
	return raw as SandboxId;
}

/**
 * How a command ended. "Didn't tell us" is representable (`unknown`), so no driver ever forges
 * an exit code (`?? 1`, `?? 127`) — a missing code becomes evidence in the run document instead
 * of a fake failure (ADR-0008: exec MUST report the guest's real exit status).
 */
export type Exit =
	| { readonly kind: "exited"; readonly code: number }
	| { readonly kind: "signalled"; readonly signal: string }
	| { readonly kind: "unknown"; readonly detail: string };

export const succeeded = (exit: Exit): boolean => exit.kind === "exited" && exit.code === 0;

export interface ExecResult {
	readonly exit: Exit;
	readonly stdout: string;
	readonly stderr: string;
	readonly durationMs: number;
	/** True when a per-call {@link ExecOptions.maxOutputBytes} cap cut a stream. */
	readonly truncated: boolean;
}

export interface ExecOptions {
	/**
	 * Opt-in output cap for probes and queries. Deliberately NEVER a kit-wide default: results
	 * collection is a multi-MB base64 tar over stdout (`collect.ts`), and a blanket cap would
	 * turn it into a bounded retry loop that can never succeed (ADR-0007 §9).
	 */
	readonly maxOutputBytes?: number;
}

/**
 * The benchmark's resource target, in the registry's own vocabulary and units
 * (`targetSpecSchema`: vcpus / memoryGb / diskGb). Never mint a parallel spec shape — vendor
 * unit conversions (e.g. Gb→MiB) live in exactly one driver-local expression (ADR-0007 §9).
 * `diskGb` is optional: a driver that cannot express a *present* disk requirement MUST fail
 * create loudly rather than silently dropping it.
 */
export interface TargetSpec {
	readonly vcpus: number;
	readonly memoryGb: number;
	readonly diskGb?: number;
}

/** Vendor-neutral GPU request; drivers map it to vendor syntax (Modal: "H100!", "A100:2"). */
export interface GpuSpec {
	readonly model: string;
	readonly count: number;
}

export interface CreateRequest {
	readonly spec: TargetSpec;
	/**
	 * The boot artifact reference resolved from the registry's artifact descriptor — or, for
	 * artifacts built at run time (kind "built"), the ref the driver's context factory produced.
	 * Drivers may report the ref they actually booted; see {@link MethodTable.create} in table.ts.
	 */
	readonly artifactRef: string;
	readonly deadlineMs: number;
	/** A driver that cannot honor a requested GPU MUST fail create — never silently run on CPU. */
	readonly gpu?: GpuSpec;
	readonly env?: Readonly<Record<string, string>>;
}

/**
 * A working filesystem API — reads AND writes — or the capability is absent. All-or-nothing:
 * every vendor with a real filesystem API supports both directions, and sessions without it get
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
	readonly sandboxId: SandboxId;
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
	describe(id: SandboxId): Promise<unknown>;
}

export interface SnapshotCapability {
	create(id: SandboxId): Promise<{ readonly snapshotId: string }>;
	delete(snapshotId: string): Promise<void>;
}

/** Everything a provider must supply. One required member; capabilities by presence. */
export interface SandboxDriver<Handle = unknown> {
	create(request: CreateRequest): Promise<SandboxSession<Handle>>;
	/**
	 * Optional: destroy by bare id, no session required — reaper/cleanup lanes. Bound by the
	 * same clauses as destroy: idempotent, convergent, and destroy-of-missing MUST succeed.
	 */
	destroyById?(id: SandboxId): Promise<void>;
	readonly probes?: ControlPlaneProbes;
	readonly snapshots?: SnapshotCapability;
}

/**
 * Who owns the create attempt's time budget. Replaces the old `createTimeoutMs: null` sentinel
 * ("null means the harness must not race create") with a self-describing union: either the
 * harness races create against a timeout, or the driver owns bounds AND failed-create cleanup —
 * in which case abandoning it mid-teardown would strand a billable sandbox, so the harness
 * awaits it.
 */
export type CreateBudget =
	| { readonly owner: "harness"; readonly timeoutMs?: number }
	| { readonly owner: "driver"; readonly attemptCeilingMs: number };
