// The ComputeSDK bridge (ADR-0007 §6): computesdk keeps all its real value — maintained vendor
// translations — as ONE driver among several, and stops being the substrate every provider
// must impersonate.
//
// The bridge is a MethodTable, not a hand-assembled driver, so it flows through the same
// assembly layer as every other driver (table.ts) and inherits its session invariants for free:
// central output capping, the use-after-destroy guard, and artifact reconciliation. It is also
// deliberately STRUCTURAL: it declares the shape it consumes instead of importing computesdk,
// so this package adds no vendor dependency. Two rules from ADR-0007 are load-bearing:
//
//   - `hasWorkingFilesystem` is EXPLICIT, because computesdk's UnsupportedFileSystem is a
//     truthy stub whose every method throws — the sentinel that killed a namespace step. The
//     stub is filtered here and never reaches a consumer.
//   - `native` is the WRAPPER's sandbox object, typed by the wrapper's own (vendored) SDK —
//     never cast to this repo's copy of a vendor SDK. Wrappers vendor their own builds; the
//     classes are nominally different. Code that needs the repo's SDK types is code that
//     should be a native driver.

import type { ProviderId } from "@sandbox-benchmarks/schema/providers";
import type { CreateRequest, SandboxDriver } from "./index.ts";
import { driverFromTable, sandboxRef } from "./index.ts";
import { DriverError } from "./lib/errors.ts";
import type { MethodTable } from "./lib/table.ts";

/** The structural slice of a computesdk provider instance this bridge consumes. */
export interface ComputeSdkLike<TSandbox extends ComputeSdkSandboxLike = ComputeSdkSandboxLike> {
	readonly sandbox: {
		create(options?: Record<string, unknown>): Promise<TSandbox>;
		list?(): Promise<unknown>;
	};
}

export interface ComputeSdkSandboxLike {
	readonly sandboxId?: string;
	runCommand(
		command: string,
		options?: { readonly background?: boolean },
	): Promise<{ readonly exitCode?: number; readonly stdout?: string; readonly stderr?: string }>;
	destroy(): Promise<unknown>;
	readonly filesystem?: {
		readFile(path: string): Promise<string>;
		exists(path: string): Promise<boolean>;
		writeFile(path: string, content: string): Promise<void>;
	};
}

export interface ComputeSdkDriverOptions {
	/** The provider this wrapper fronts — sandbox refs are validated in its id format. */
	readonly provider: ProviderId;
	/**
	 * Extra create options for the wrapper (the `snapshotId`/`templateId` conventions the bake
	 * path relies on). An open passthrough by design: the port does not model every vendor's
	 * create surface, and this is real computesdk knowledge that belongs at the bridge.
	 */
	readonly createOptions?: Readonly<Record<string, unknown>>;
	/**
	 * Whether the wrapper's filesystem actually works. Explicit, because the wrapper cannot be
	 * asked: UnsupportedFileSystem is truthy and throws. ADR-0008's smoke conformance verifies
	 * the answer against the live vendor.
	 */
	readonly hasWorkingFilesystem: boolean;
}

type ComputeCtx<TSandbox extends ComputeSdkSandboxLike> = ComputeSdkLike<TSandbox>;

/** Compile a computesdk provider instance to a method table. */
export function computeSdkMethodTable<TSandbox extends ComputeSdkSandboxLike>(
	options: ComputeSdkDriverOptions,
): MethodTable<TSandbox, ComputeCtx<TSandbox>> {
	const wantsFiles = options.hasWorkingFilesystem;
	return {
		async create(compute, request: CreateRequest) {
			const created = await compute.sandbox.create({
				...options.createOptions,
				timeout: request.deadlineMs,
			});
			const id = created.sandboxId;
			if (id === undefined || id.length === 0) {
				throw new DriverError(
					"vendor-contract-violation",
					"computesdk wrapper returned a sandbox without a sandboxId",
					{
						provider: options.provider,
					},
				);
			}
			return { handle: created, sandboxRef: sandboxRef(options.provider, id) };
		},
		async exec(_compute, sandbox, command) {
			const started = Date.now();
			const result = await sandbox.runCommand(command);
			return {
				// No forged `?? 1`: a wrapper that withholds the exit code yields the representable
				// `unknown` arm instead of a fake failure.
				exit:
					result.exitCode === undefined
						? { kind: "unknown" as const, detail: "computesdk adapter reported no exit code" }
						: { kind: "exited" as const, code: result.exitCode },
				stdout: result.stdout ?? "",
				stderr: result.stderr ?? "",
				durationMs: Date.now() - started,
				truncated: false, // the kit applies caps centrally (table.ts / output.ts)
			};
		},
		async destroy(_compute, sandbox) {
			await sandbox.destroy();
		},
		async launch(_compute, sandbox, command) {
			await sandbox.runCommand(command, { background: true });
		},
		// The stub never escapes: files exists only when the wrapper's filesystem is declared
		// working AND present on the created sandbox (checked per sandbox, hence the guards).
		...(wantsFiles
			? {
					files: {
						readFile: (_compute, sandbox, path) =>
							requireFilesystem(sandbox, options.provider).readFile(path),
						exists: (_compute, sandbox, path) =>
							requireFilesystem(sandbox, options.provider).exists(path),
						writeText: (_compute, sandbox, path, text) =>
							requireFilesystem(sandbox, options.provider).writeFile(path, text),
					},
				}
			: {}),
		// probes carried through the table layer; describe is genuinely absent (no per-sandbox
		// describe on the wrapper) — omitted, not stubbed.
		probes: { list: (compute) => compute.sandbox.list?.() ?? Promise.resolve(undefined) },
	};
}

function requireFilesystem<TSandbox extends ComputeSdkSandboxLike>(
	sandbox: TSandbox,
	provider: ProviderId,
): NonNullable<TSandbox["filesystem"]> {
	if (!sandbox.filesystem) {
		throw new DriverError(
			"vendor-contract-violation",
			"computesdk wrapper declared a filesystem it did not provide",
			{
				provider,
			},
		);
	}
	return sandbox.filesystem;
}

/** Adapt a computesdk provider instance to the port. */
export function computeSdkDriver<TSandbox extends ComputeSdkSandboxLike>(
	compute: ComputeSdkLike<TSandbox>,
	options: ComputeSdkDriverOptions,
): SandboxDriver<TSandbox> {
	// `list` presence is a per-instance fact; drop the probes capability when the wrapper lacks it.
	const table = computeSdkMethodTable<TSandbox>(options);
	const withProbes = compute.sandbox.list ? table : { ...table, probes: undefined };
	return driverFromTable(withProbes, () => Promise.resolve(compute));
}
