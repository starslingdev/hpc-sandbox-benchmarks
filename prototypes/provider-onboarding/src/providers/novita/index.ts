// Novita on the ops kit: a TypeScript SDK provider states its vendor verbs and nothing else.
// Readiness, convergence, inventory partitioning, recovery, and the disk proof come from the kit.

import { createRequire } from "node:module";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { type } from "arktype";
import type { Sandbox as NativeSandbox } from "novita-sandbox";
import { NOVITA_PROVENANCE } from "../../../../../packages/novita/src/provenance.ts";
import type { SandboxOps } from "../../kit/ops.ts";
import { defineOpsDriver, instanceOfAny, opsSpec, pinnedShape } from "../../kit/ops.ts";

// CJS load avoids Bun's mixed chalk module-load race (unchanged from the current driver).
const { Sandbox, SandboxNotFoundError, AuthenticationError, InvalidArgumentError, RateLimitError } =
	createRequire(import.meta.url)("novita-sandbox") as typeof import("novita-sandbox");
export const NOVITA_DOMAIN = "us-phx-1.sandbox.novita.ai";
const KEY = "sandbox-benchmarks-attempt";
const AS_ROOT = { user: "root", requestTimeoutMs: 5000 } as const;
const row = type({ sandboxId: "string >= 1", "metadata?": { "[string]": "string" } });
type Row = typeof row.infer & { readonly native?: NativeSandbox };
const commandFailure = type({
	name: "'CommandExitError'",
	exitCode: "number.integer",
	stdout: "string",
	stderr: "string",
});

function novitaOps({
	env,
	resolvedArtifact,
}: DriverContext<"novita">): SandboxOps<Row, NativeSandbox> {
	const connection = { apiKey: env.NOVITA_API_KEY, domain: NOVITA_DOMAIN, requestTimeoutMs: 5000 };
	/** Drain a paginator; a repeated or missing continuation token fails closed. */
	async function drain(query: object, signal?: AbortSignal, check?: (value: Row) => void) {
		const paginator = Sandbox.list({ ...connection, query });
		const rows: Row[] = [];
		for (const tokens = new Set<string>(); ; ) {
			signal?.throwIfAborted();
			const page = row.array().assert(await paginator.nextItems());
			for (const value of page) check?.(value);
			rows.push(...page);
			if (!paginator.hasNext) return rows;
			const token = paginator.nextToken;
			if (!token || tokens.has(token) || tokens.size >= 100)
				throw new Error("Novita pagination failed closed");
			tokens.add(token);
		}
	}
	return {
		sandboxId: type(/^[A-Za-z0-9_-]+$/),
		coverage: pinnedShape(4, 8),
		readiness: "on-create",
		removeConfirms: true,
		create: async ({ marker }) => {
			const native = await Sandbox.create(resolvedArtifact.ref, {
				...connection,
				requestTimeoutMs: 300_000,
				timeoutMs: 3 * 60 * 60_000,
				metadata: { [KEY]: marker },
			});
			return { sandboxId: native.sandboxId, metadata: { [KEY]: marker }, native };
		},
		get: async (id) => ({ sandboxId: (await Sandbox.getInfo(id, connection)).sandboxId }),
		remove: async (id) => {
			await Sandbox.kill(id, connection);
		},
		list: (signal) => drain({ state: ["running", "paused"] }, signal),
		idOf: (value) => value.sandboxId,
		phase: () => "ready",
		ownership: {
			kind: "marker",
			key: KEY,
			of: (value) => value.metadata?.[KEY],
			find: async (marker, signal) => {
				const rows = await drain({ metadata: { [KEY]: marker } }, signal, (value) => {
					if (value.metadata?.[KEY] !== marker)
						throw new Error("Novita recovery returned an unrelated sandbox");
				});
				return rows.map((value) => value.sandboxId);
			},
		},
		connect: (value) =>
			value.native ?? Promise.reject(new Error("Novita row has no native handle")),
		exec: async (native, command, options?: ExecOptions) => {
			options?.signal?.throwIfAborted();
			try {
				return await native.commands.run(command, {
					...AS_ROOT,
					background: false,
					timeoutMs: 60_000,
				});
			} catch (error) {
				const result = commandFailure(error);
				if (!(result instanceof type.errors) && result.exitCode !== 0) return result;
				throw error;
			}
		},
		launch: async (native, command) => {
			const handle = await native.commands.run(command, {
				...AS_ROOT,
				background: true,
				timeoutMs: 0,
			});
			if (!Number.isSafeInteger(handle.pid) || handle.pid <= 0)
				throw new Error("Novita returned no positive process id");
		},
		files: {
			read: (native, path) => native.files.read(path, AS_ROOT),
			exists: (native, path) => native.files.exists(path, AS_ROOT),
			write: async (native, path, text) => {
				await native.files.write(path, text, AS_ROOT);
			},
		},
		errors: {
			notFound: instanceOfAny(SandboxNotFoundError),
			definitive: instanceOfAny(AuthenticationError, InvalidArgumentError, RateLimitError),
			retryable: instanceOfAny(RateLimitError),
		},
	};
}

export const novitaSpec = (context: DriverContext<"novita">) =>
	opsSpec("novita", context, novitaOps(context));

export default defineOpsDriver("novita", {
	provenance: NOVITA_PROVENANCE,
	nativeLaunch: true,
	ops: novitaOps,
});
