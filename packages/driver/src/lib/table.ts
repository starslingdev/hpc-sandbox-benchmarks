// The method-table layer (ADR-0007 §2): driver authors write a flat table of pure functions
// over a typed native handle — trivially unit-testable, extraction-safe (`satisfies
// MethodTable<…>` on a named const), and patchable by ordinary composition. The kit assembles
// the harness-facing SandboxSession from it.

import type {
	CreateRequest,
	ExecOptions,
	ExecResult,
	SandboxDriver,
	SandboxId,
	SandboxSession,
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
	): Promise<{ readonly handle: Handle; readonly sandboxId: SandboxId; readonly artifactRef?: string }>;
	exec(ctx: Ctx, handle: Handle, command: string, options?: ExecOptions): Promise<ExecResult>;
	destroy(ctx: Ctx, handle: Handle): Promise<void>;
	destroyById?(ctx: Ctx, id: SandboxId): Promise<void>;
	launch?(ctx: Ctx, handle: Handle, command: string, options?: ExecOptions): Promise<void>;
	readonly files?: {
		readFile(ctx: Ctx, handle: Handle, path: string): Promise<string>;
		exists(ctx: Ctx, handle: Handle, path: string): Promise<boolean>;
		writeText(ctx: Ctx, handle: Handle, path: string, text: string): Promise<void>;
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
	return {
		async create(request) {
			const resolved = await ctx();
			const created = await table.create(resolved, request);
			if (created.artifactRef !== undefined && created.artifactRef !== request.artifactRef) {
				// Tear the orphan down before failing: nothing may bill against a wrong-artifact boot.
				await table.destroy(resolved, created.handle);
				throw new Error(
					`artifact mismatch: request says ${request.artifactRef}, driver booted ${created.artifactRef}`,
				);
			}
			const handle = created.handle;
			const session: SandboxSession<Handle> = {
				sandboxId: created.sandboxId,
				artifactRef: created.artifactRef ?? request.artifactRef,
				native: handle,
				exec: (command, options) => table.exec(resolved, handle, command, options),
				destroy: () => table.destroy(resolved, handle),
				...(launch
					? { launch: (command: string, options?: ExecOptions) => launch(resolved, handle, command, options) }
					: {}),
				...(files
					? {
							files: {
								readFile: (path: string) => files.readFile(resolved, handle, path),
								exists: (path: string) => files.exists(resolved, handle, path),
								writeText: (path: string, text: string) => files.writeText(resolved, handle, path, text),
							},
						}
					: {}),
			};
			return session;
		},
		...(table.destroyById
			? { destroyById: async (id: SandboxId) => table.destroyById!(await ctx(), id) }
			: {}),
	};
}
