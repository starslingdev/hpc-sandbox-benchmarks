// The ComputeSDK bridge (ADR-0007 §6): computesdk keeps all its real value — maintained vendor
// translations — as ONE driver among several, and stops being the substrate every provider
// must impersonate.
//
// The bridge is deliberately STRUCTURAL: it declares the shape it consumes instead of
// importing computesdk, so this package adds no vendor dependency and the wrapper packages
// stay confined to the fleet. Two rules from ADR-0007 are load-bearing here:
//
//   - `hasWorkingFilesystem` is EXPLICIT, because computesdk's UnsupportedFileSystem is a
//     truthy stub whose every method throws — the sentinel that killed a namespace step. The
//     stub is filtered at this boundary and never reaches a consumer.
//   - `native` is the WRAPPER's sandbox object, typed by the wrapper's own (vendored) SDK —
//     never cast to this repo's copy of a vendor SDK. Wrappers vendor their own builds; the
//     classes are nominally different. Code that needs the repo's SDK types is code that
//     should be a native driver.

import type { CreateRequest, SandboxDriver, SandboxSession } from "./index.ts";
import { sandboxId } from "./index.ts";

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

/** Adapt a computesdk provider instance to the port. */
export function computeSdkDriver<TSandbox extends ComputeSdkSandboxLike>(
	compute: ComputeSdkLike<TSandbox>,
	options: ComputeSdkDriverOptions,
): SandboxDriver<TSandbox> {
	const list = compute.sandbox.list?.bind(compute.sandbox);
	return {
		async create(request: CreateRequest): Promise<SandboxSession<TSandbox>> {
			const created = await compute.sandbox.create({
				...options.createOptions,
				timeout: request.deadlineMs,
			});
			const id = created.sandboxId;
			if (id === undefined || id.length === 0) {
				throw new Error("computesdk wrapper returned a sandbox without a sandboxId");
			}
			return {
				sandboxId: sandboxId(id),
				artifactRef: request.artifactRef,
				native: created,
				async exec(command) {
					const started = Date.now();
					const result = await created.runCommand(command);
					return {
						// No forged `?? 1`: a wrapper that withholds the exit code yields the
						// representable `unknown` arm instead of a fake failure.
						exit:
							result.exitCode === undefined
								? { kind: "unknown" as const, detail: "computesdk adapter reported no exit code" }
								: { kind: "exited" as const, code: result.exitCode },
						stdout: result.stdout ?? "",
						stderr: result.stderr ?? "",
						durationMs: Date.now() - started,
						truncated: false,
					};
				},
				async destroy() {
					await created.destroy();
				},
				async launch(command) {
					await created.runCommand(command, { background: true });
				},
				// The stub never escapes this boundary: files exists only when the wrapper's
				// filesystem is declared working AND present.
				...(options.hasWorkingFilesystem && created.filesystem
					? {
							files: {
								readFile: (path: string) => created.filesystem!.readFile(path),
								exists: (path: string) => created.filesystem!.exists(path),
								writeText: (path: string, text: string) => created.filesystem!.writeFile(path, text),
							},
						}
					: {}),
			};
		},
		...(list
			? {
					probes: {
						list,
						describe: async () => undefined,
					},
				}
			: {}),
	};
}
