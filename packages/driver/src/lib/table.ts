// The method-table layer (ADR-0007 §2): driver authors write a flat table of pure functions
// over a typed native handle — trivially unit-testable, extraction-safe (`satisfies
// MethodTable<…>` on a named const), and patchable by ordinary composition. The kit assembles
// the harness-facing SandboxSession from it — and, because every generic driver flows through
// here, this is the ONE place the session-lifecycle invariants live: output capping (§2 below),
// the use-after-destroy guard, artifact reconciliation, and the lazy-context memo. A driver that
// bypassed this layer would have to re-implement all four; none do.

import { DriverError } from "./errors.ts";
import { capExecOutput } from "./output.ts";
import type {
	ControlPlaneProbes,
	CreateRequest,
	ExecOptions,
	ExecResult,
	SandboxDriver,
	SandboxRef,
	SandboxSession,
	SnapshotCapability,
} from "./port.ts";

export interface MethodTable<Handle, Ctx> {
	/**
	 * Boot a sandbox. `artifactRef`, when returned, is the ref the driver ACTUALLY booted (for
	 * "built" artifacts, the ctx factory's product); the kit fails create on a contradiction
	 * with the request so a measurement is never attributed to the wrong artifact.
	 */
	create(
		ctx: Ctx,
		request: CreateRequest,
	): Promise<{
		readonly handle: Handle;
		readonly sandboxRef: SandboxRef;
		readonly artifactRef?: string;
	}>;
	/** Run a command. The kit applies output caps around this — tables return full output. */
	exec(ctx: Ctx, handle: Handle, command: string): Promise<ExecResult>;
	destroy(ctx: Ctx, handle: Handle): Promise<void>;
	destroyById?(ctx: Ctx, ref: SandboxRef): Promise<void>;
	launch?(ctx: Ctx, handle: Handle, command: string): Promise<void>;
	readonly files?: {
		readFile(ctx: Ctx, handle: Handle, path: string): Promise<string>;
		exists(ctx: Ctx, handle: Handle, path: string): Promise<boolean>;
		writeText(ctx: Ctx, handle: Handle, path: string, text: string): Promise<void>;
	};
	/** Optional measurement capabilities, carried so a driver never bypasses this layer for them. */
	readonly probes?: {
		list(ctx: Ctx): Promise<unknown>;
		describe?(ctx: Ctx, ref: SandboxRef): Promise<unknown>;
	};
	readonly snapshots?: {
		create(ctx: Ctx, ref: SandboxRef): Promise<{ readonly snapshotId: string }>;
		delete(ctx: Ctx, snapshotId: string): Promise<void>;
	};
}

/**
 * Assemble a SandboxDriver from a method table and a lazy context factory.
 *
 * The context is vendor plumbing that is async and built once on demand (clients, apps, built
 * images, volumes). A failed load CLEARS the memo, so one transient plumbing failure does not
 * brick the driver for the process lifetime; concurrent callers share the in-flight attempt
 * (ADR-0007 §9).
 */
export function driverFromTable<Handle, Ctx>(
	table: MethodTable<Handle, Ctx>,
	loadCtx: () => Promise<Ctx>,
): SandboxDriver<Handle> {
	let memo: Promise<Ctx> | undefined;
	const ctx = () =>
		(memo ??= loadCtx().then(
			(value) => value,
			(error: unknown) => {
				memo = undefined;
				throw error;
			},
		));
	const files = table.files;
	const launch = table.launch;
	const destroyById = table.destroyById;
	const tableProbes = table.probes;
	const probeDescribe = tableProbes?.describe;
	const tableSnapshots = table.snapshots;
	return {
		async create(request) {
			const resolved = await ctx();
			const created = await table.create(resolved, request);
			if (created.artifactRef !== undefined && created.artifactRef !== request.artifactRef) {
				const mismatch = new DriverError(
					"artifact-mismatch",
					`artifact mismatch: request says ${request.artifactRef}, driver booted ${created.artifactRef}`,
					{ ref: created.sandboxRef },
				);
				// Tear the orphan down before failing — but never let a teardown failure hide the
				// mismatch (the primary, and the one naming the wrong-artifact boot). Same double-fault
				// shape as withSessionTeardown.
				try {
					await table.destroy(resolved, created.handle);
				} catch (teardown) {
					throw new SuppressedError(
						teardown,
						mismatch,
						"orphan teardown failed after an artifact mismatch",
					);
				}
				throw mismatch;
			}
			const handle = created.handle;
			const ref = created.sandboxRef;
			let destroyed = false;
			const alive = <T>(operation: () => Promise<T>): Promise<T> => {
				if (destroyed) {
					// Calling a dead sandbox would surface as a confusing vendor error the harness
					// would misclassify; make the invalid state a typed, unmistakable one instead.
					return Promise.reject(
						new DriverError("use-after-destroy", `sandbox ${ref.id} was used after destroy`, {
							ref,
						}),
					);
				}
				return operation();
			};
			const session: SandboxSession<Handle> = {
				sandboxRef: ref,
				artifactRef: created.artifactRef ?? request.artifactRef,
				native: handle,
				exec: (command, options?: ExecOptions) =>
					alive(() =>
						table
							.exec(resolved, handle, command)
							.then((result) => capExecOutput(result, options?.maxOutputBytes)),
					),
				async destroy() {
					if (destroyed) return; // idempotent (ADR-0008): a second destroy is a no-op, not an error
					destroyed = true;
					await table.destroy(resolved, handle);
				},
				...(launch
					? { launch: (command: string) => alive(() => launch(resolved, handle, command)) }
					: {}),
				...(files
					? {
							files: {
								readFile: (path: string) => alive(() => files.readFile(resolved, handle, path)),
								exists: (path: string) => alive(() => files.exists(resolved, handle, path)),
								writeText: (path: string, text: string) =>
									alive(() => files.writeText(resolved, handle, path, text)),
							},
						}
					: {}),
			};
			return session;
		},
		...(destroyById
			? { destroyById: async (ref: SandboxRef) => destroyById(await ctx(), ref) }
			: {}),
		...(tableProbes
			? {
					probes: {
						list: async () => tableProbes.list(await ctx()),
						...(probeDescribe
							? { describe: async (ref: SandboxRef) => probeDescribe(await ctx(), ref) }
							: {}),
					} satisfies ControlPlaneProbes,
				}
			: {}),
		...(tableSnapshots
			? {
					snapshots: {
						create: async (ref: SandboxRef) => tableSnapshots.create(await ctx(), ref),
						delete: async (snapshotId: string) => tableSnapshots.delete(await ctx(), snapshotId),
					} satisfies SnapshotCapability,
				}
			: {}),
	};
}
