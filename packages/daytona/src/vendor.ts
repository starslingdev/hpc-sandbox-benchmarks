// Daytona's vendor adapter: translation only, over @daytona/sdk. Readiness, cleanup confirmation,
// recovery, inventory and probes live in the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Both isolation variants share one org. Every create is named by its ownership marker (the kit's
// `benchmark-<uuid>`), so each variant's inventory claims every benchmark sandbox it finds: batches
// on the shared account never overlap (one concurrency queue), so anything present at admission is
// a leftover, and a sibling variant's later teardown of the same id converges on not-found. The
// SDK's create waits until the sandbox has started and its waited delete until it is destroyed, so
// both responses are evidence, not acknowledgements.

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { Daytona, Sandbox } from "@daytona/sdk";
import { DaytonaError, DaytonaNotFoundError, DaytonaRateLimitError } from "@daytona/sdk";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { shellQuote } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { instanceOfAny } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export type DaytonaId = "daytona-vm" | "daytona-container";
export const DAYTONA_SANDBOX_ID = type("string.uuid");
/** The bound on one SDK request. */
export const DAYTONA_CONTROL_TIMEOUT_MS = 10_000;
/** The create and waited-delete bounds the SDK takes, in seconds. */
const CREATE_TIMEOUT_SECS = 300;
const DELETE_TIMEOUT_SECS = 30;
const BENCHMARK_NAME = /^benchmark-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The SDK client surface the adapter translates; the package entry passes the real client. */
export type DaytonaClient = Pick<Daytona, "create" | "get" | "list" | "delete" | "snapshot">;

type CommandSandbox = {
	readonly process: Pick<Sandbox["process"], "createSession" | "executeSessionCommand">;
};

/** A reusable control shell and independent asynchronous shells preserve stream and exit identity. */
export function daytonaCommands() {
	const controls = new WeakMap<CommandSandbox, Promise<string>>();
	const controlSession = (sandbox: CommandSandbox) => {
		let session = controls.get(sandbox);
		if (!session) {
			const id = `benchmark-control-${randomUUID()}`;
			session = sandbox.process.createSession(id).then(() => id);
			controls.set(sandbox, session);
			void session.catch(() => controls.delete(sandbox));
		}
		return session;
	};
	return {
		invalidate: (sandbox: CommandSandbox) => controls.delete(sandbox),
		exec: async (sandbox: CommandSandbox, command: string, options?: ExecOptions) => {
			options?.signal?.throwIfAborted();
			const id = await controlSession(sandbox);
			options?.signal?.throwIfAborted();
			const result = await sandbox.process.executeSessionCommand(
				id,
				{
					command: `bash -lc ${shellQuote(command)}`,
					runAsync: false,
				},
				60,
			);
			return {
				...(result.exitCode !== undefined && { exitCode: result.exitCode }),
				stdout: result.stdout ?? "",
				stderr: result.stderr ?? "",
			};
		},
		launch: async (sandbox: CommandSandbox, command: string, options?: ExecOptions) => {
			options?.signal?.throwIfAborted();
			// A durable command must not occupy the control shell used to poll its done file.
			const id = `benchmark-job-${randomUUID()}`;
			await sandbox.process.createSession(id);
			options?.signal?.throwIfAborted();
			const result = await sandbox.process.executeSessionCommand(
				id,
				{
					command: `bash -lc ${shellQuote(command)}`,
					runAsync: true,
				},
				DAYTONA_CONTROL_TIMEOUT_MS / 1000,
			);
			if (typeof result.cmdId !== "string" || !result.cmdId)
				throw new Error("Daytona returned no asynchronous command id");
		},
	};
}

/**
 * A sandbox on its way out (`destroying`) holds nothing the benchmark competes with; a state this
 * adapter does not know is still pending, never released.
 */
function phaseOf(state: Sandbox["state"]): Phase {
	switch (state) {
		case "started":
			return "ready";
		case "destroyed":
			return "gone";
		case "destroying":
			return "deleting";
		case "error":
		case "build_failed":
			return "failed";
		default:
			return "pending";
	}
}

function record(sandbox: Sandbox): VendorRecord<Sandbox> {
	const marker = BENCHMARK_NAME.test(sandbox.name) ? sandbox.name : undefined;
	return {
		id: sandbox.id,
		phase: phaseOf(sandbox.state),
		...(marker && { marker }),
		...(sandbox.state === "destroying" && { stopped: true }),
		...(sandbox.errorReason && { detail: sandbox.errorReason }),
		raw: sandbox,
	};
}

const notFound = instanceOfAny(DaytonaNotFoundError);
const definitive = (error: unknown) =>
	matchesAnyCause(
		error,
		(cause) =>
			cause instanceof DaytonaError && [400, 401, 403, 422, 429].includes(cause.statusCode ?? 0),
	);

export function daytonaVendor(
	{ resolvedArtifact }: Pick<DriverContext<DaytonaId>, "resolvedArtifact">,
	sandboxClass: "linux-vm" | "container",
	client: DaytonaClient,
): Vendor<Sandbox, Sandbox> {
	const commands = daytonaCommands();
	// Refusals that activated an inactive snapshot: a fresh create may then succeed.
	const inactiveRefusals = new WeakSet<object>();
	// The SDK deletes through a sandbox handle; keep the latest one each read returned.
	const handles = new Map<string, Sandbox>();
	const read = (sandbox: Sandbox) => {
		handles.set(sandbox.id, sandbox);
		return record(sandbox);
	};
	const lookup = async (idOrName: string) => {
		try {
			return read(await client.get(idOrName));
		} catch (error) {
			if (notFound(error)) return null;
			throw error;
		}
	};

	return {
		control: {
			create: async ({ marker }) => {
				const snapshot = resolvedArtifact.ref;
				try {
					return read(
						await client.create(
							{ snapshot, name: marker, autoStopInterval: 0 },
							{ timeout: CREATE_TIMEOUT_SECS },
						),
					);
				} catch (error) {
					// An HTTP validation refusal allocated nothing. Confirm snapshot state with the SDK
					// instead of classifying retryability from prose, and leave retries to the harness.
					if (error instanceof DaytonaError && error.statusCode === 400) {
						try {
							const state = await client.snapshot.get(snapshot);
							if (state.state === "inactive") {
								inactiveRefusals.add(error);
								await client.snapshot.activate(state);
							}
						} catch {
							/* Preserve the original allocation refusal if activation fails. */
						}
					}
					throw error;
				}
			},
			get: (id) => lookup(id),
			remove: async (id) => {
				const sandbox = handles.get(id) ?? (await lookup(id))?.raw;
				try {
					if (sandbox) await client.delete(sandbox, DELETE_TIMEOUT_SECS, true);
				} catch (error) {
					if (!notFound(error)) throw error;
				}
				handles.delete(id);
				return "removed";
			},
			// The SDK drains its own cursor; the whole account is one page.
			page: async (_cursor, { signal }) => {
				const records = [];
				for await (const sandbox of client.list()) {
					signal.throwIfAborted();
					records.push(record(sandbox));
				}
				return { records };
			},
			// A get by name: the marker is the sandbox name.
			find: async (marker) => {
				const found = await lookup(marker);
				return { records: found ? [found] : [] };
			},
			refused: (error) =>
				definitive(error)
					? {
							retryable: matchesAnyCause(
								error,
								(cause) =>
									cause instanceof DaytonaRateLimitError ||
									(cause instanceof Error && inactiveRefusals.has(cause)),
							),
						}
					: undefined,
		},
		data: {
			attach: ({ raw }) => raw,
			// The snapshot pins the class and the control plane reports every resource it allocated.
			prepare: async ({ native }, { spec }) => {
				if (native.sandboxClass !== sandboxClass)
					return {
						status: "unsupported",
						detail: `requested ${sandboxClass} but snapshot allocates ${native.sandboxClass ?? "unknown"}`,
					};
				if (native.cpu !== spec.vcpus || native.memory !== spec.memoryGb)
					return {
						status: "unsupported",
						detail: "Daytona snapshot resources differ from the requested CPU or memory",
					};
				return spec.diskGb === undefined || native.disk >= spec.diskGb
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `requested ${spec.diskGb} GiB but snapshot allocates ${native.disk} GiB`,
						};
			},
			exec: (native, command, options) => commands.exec(native, command, options),
			launch: (native, command, options) => commands.launch(native, command, options),
			files: {
				read: async (native, path) => (await native.fs.downloadFile(path)).toString("utf8"),
				exists: async (native, path) => {
					try {
						await native.fs.getFileDetails(path);
						return true;
					} catch (error) {
						if (error instanceof DaytonaNotFoundError) return false;
						throw error;
					}
				},
				write: (native, path, text) => native.fs.uploadFile(Buffer.from(text), path),
			},
		},
		snapshots: {
			create: async ({ native }) => {
				const name = `benchmark-snapshot-${randomUUID()}`;
				// A VM snapshots only while stopped; its restart opens a fresh control shell.
				const vm = native.sandboxClass === "linux-vm";
				try {
					if (vm) {
						await native.stop(30);
						commands.invalidate(native);
					}
					let failure: { error: unknown } | undefined;
					try {
						await native.createSnapshot(name, 300);
					} catch (error) {
						failure = { error };
					}
					if (vm) {
						try {
							await native.start(60);
						} catch (error) {
							if (!failure) failure = { error };
						}
					}
					if (failure) throw failure.error;
					return { snapshotId: name };
				} catch (error) {
					// If restart fails after snapshot creation, the harness never receives an id to delete.
					try {
						await client.snapshot.delete(name);
					} catch (cleanup) {
						if (!(cleanup instanceof DaytonaNotFoundError))
							console.warn("Daytona failed-snapshot cleanup also failed");
					}
					throw error;
				}
			},
			delete: (name) => client.snapshot.delete(name),
		},
	};
}
