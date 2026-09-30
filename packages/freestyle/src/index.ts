import { randomUUID } from "node:crypto";
import type { DriverContext, DriverOperationOptions } from "@sandbox-benchmarks/driver";
import { pollUntilReady, shellQuote } from "@sandbox-benchmarks/driver";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { type } from "arktype";
import type { Vm } from "freestyle";
import { Freestyle, FreestyleApiError } from "freestyle";
import { FREESTYLE_PROVENANCE } from "./provenance.ts";
import { freestyleFetch } from "./transport.ts";

export const FREESTYLE_BASE_SNAPSHOT = "freestyle/ubuntu";
// Match the shared image's system PATH. The harness adds the user's pinned mise and pnpm dirs.
// Stock Ubuntu's NVM globals include language servers that change workload test semantics.
export const FREESTYLE_PATH =
	"/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
export function freestyleCommand(command: string): string {
	// Reset inside the guest shell: an exec env alone can be overwritten by stock shell startup.
	const script = `if [ -f /etc/mise/config.toml ]; then export MISE_DATA_DIR=/usr/local/share/mise MISE_CONFIG_DIR=/etc/mise; fi; ${command}`;
	return `env -u BASH_ENV -u ENV -u NODE_PATH -u NODE_OPTIONS -u NVM_DIR -u NVM_BIN -u NVM_INC PATH=${shellQuote(FREESTYLE_PATH)} bash --noprofile --norc -c ${shellQuote(script)}`;
}
export const FREESTYLE_OWNER_KEY = "sandbox-benchmarks-attempt";
// Longest supported benchmark job is 330 minutes; leave headroom for cleanup.
export const FREESTYLE_VM_TTL_SECONDS = 6 * 60 * 60;
const CONTROL_TIMEOUT_MS = 30_000;
const DELETE_TIMEOUT_MS = 60_000;
const INVENTORY_TIMEOUT_MS = 5 * 60_000;
const EXEC_TIMEOUT_MS = 300_000;
const OWNER_PREFIX = "benchmark-";
const vmId = type(/^[A-Za-z0-9_-]+$/);
const resources = type({
	cpu: "number.integer > 0",
	memory: "number.integer > 0",
	storage: "number.integer > 0",
});
const vmRecord = type({
	id: vmId,
	state: "'starting' | 'running' | 'pausing' | 'paused' | 'stopped'",
	"slug?": "string | null",
	"metadata?": { "[string]": "string" },
	"snapshotId?": "string | null",
	resources,
});
const pageSchema = type({ vms: vmRecord.array(), totalCount: "number.integer >= 0" });
const execResult = type({
	"stdout?": "string | null",
	"stderr?": "string | null",
	"statusCode?": "number.integer | null",
});
const snapshotResult = type({ snapshotId: vmId });

function hasStatus(error: unknown, statuses: readonly number[]): boolean {
	return matchesAnyCause(
		error,
		(cause) => cause instanceof FreestyleApiError && statuses.includes(cause.status),
	);
}

export interface FreestyleSpecOptions {
	/** Release composition only: boot stock once, then record its immutable ID in the recipe. */
	readonly allowStockBaseForBake?: boolean;
	readonly fetch?: typeof fetch;
	readonly controlTimeoutMs?: number;
	readonly deleteTimeoutMs?: number;
	readonly inventoryTimeoutMs?: number;
}

export function freestyleSpec(
	{ env }: DriverContext<"freestyle">,
	options: FreestyleSpecOptions = {},
) {
	const controlTimeoutMs = options.controlTimeoutMs ?? CONTROL_TIMEOUT_MS;
	const deleteTimeoutMs = options.deleteTimeoutMs ?? DELETE_TIMEOUT_MS;
	const inventoryTimeoutMs = options.inventoryTimeoutMs ?? INVENTORY_TIMEOUT_MS;
	const unresolvedCreates = new Set<string>();
	const api = (operation?: DriverOperationOptions, timeoutMs = controlTimeoutMs) =>
		new Freestyle({
			apiKey: env.FREESTYLE_API_KEY,
			fetch: freestyleFetch(options.fetch ?? fetch, timeoutMs, operation?.signal),
		});

	async function exec(vm: Vm, command: string, operation?: DriverOperationOptions) {
		operation?.signal?.throwIfAborted();
		// Native file writes belong to ubuntu. Root cannot overwrite those files in sticky /tmp
		// with fs.protected_regular=2; use the same user and let harness setup elevate with sudo.
		const result = execResult.assert(
			// The synchronous API cannot kill accepted work. Wait for its bounded completion before
			// reporting cancellation, so a caller never overlaps the next command with this one.
			await api(undefined, EXEC_TIMEOUT_MS + 10_000)
				.vms.ref(vm.id)
				.exec({
					command: freestyleCommand(command),
					linuxUser: "ubuntu",
					timeoutMs: EXEC_TIMEOUT_MS,
				}),
		);
		operation?.signal?.throwIfAborted();
		return {
			stdout: result.stdout ?? "",
			stderr: result.stderr ?? "",
			...(result.statusCode == null ? {} : { exitCode: result.statusCode }),
		};
	}
	async function observe(id: string, operation?: DriverOperationOptions) {
		try {
			// Paused/stopped VMs still own disk: only a missing record proves deletion.
			vmRecord.assert(await api(operation).vms.get(id));
			return { state: "running" as const };
		} catch (error) {
			if (hasStatus(error, [404])) return { state: "absent" as const };
			throw error;
		}
	}
	async function destroy(id: string, operation?: DriverOperationOptions) {
		const bounded = {
			signal: AbortSignal.any([
				AbortSignal.timeout(deleteTimeoutMs),
				...(operation?.signal ? [operation.signal] : []),
			]),
		};
		bounded.signal.throwIfAborted();
		try {
			await api(bounded).vms.delete(id);
		} catch (error) {
			if (!hasStatus(error, [404])) throw error;
		}
		await pollUntilReady({
			provider: "freestyle",
			deadlineMs: deleteTimeoutMs,
			intervalMs: 500,
			signal: bounded.signal,
			poll: async () => ((await observe(id, bounded)).state === "absent" ? true : null),
		});
	}
	const compute = nativeSdkCompute(
		async (
			options: { slug: string; marker: string; deadlineMs: number; snapshotId: string },
			operation,
		) => {
			operation.signal?.throwIfAborted();
			unresolvedCreates.add(options.marker);
			try {
				const created = await api(operation, options.deadlineMs).vms.create({
					snapshotId: options.snapshotId,
					slug: options.slug,
					metadata: { [FREESTYLE_OWNER_KEY]: options.marker },
					idleTimeoutSeconds: -1,
					autoDeleteSeconds: 0,
					ttlSeconds: FREESTYLE_VM_TTL_SECONDS,
					firewall: { rules: [{ action: "allow", source: {}, destination: { public: true } }] },
				});
				const id = vmId.assert(created.vm.id);
				unresolvedCreates.delete(options.marker);
				// Do not retain the create signal in the session's native filesystem transport.
				return api().vms.ref(id);
			} catch (error) {
				if (hasStatus(error, [400, 401, 403, 404, 422, 429]))
					unresolvedCreates.delete(options.marker);
				throw error;
			}
		},
		(vm) => ({
			sandboxId: vm.id,
			runCommand: (command, options) => exec(vm, command, options),
			destroy: () => destroy(vm.id),
			filesystem: {
				readFile: (path) => vm.fs.readTextFile(path),
				exists: (path) => vm.fs.exists(path),
				writeFile: (path, content) => vm.fs.writeTextFile(path, content),
			},
		}),
	);
	return computeSdkSpec(compute, {
		sandboxId: vmId,
		createOptions: {
			coverage: {
				spec: {
					vcpus: "runtime-verified",
					memoryGb: "runtime-verified",
					diskGb: "runtime-verified",
				},
				artifact: "context",
				deadlineMs: "harness",
				gpu: { model: "unsupported", count: "unsupported" },
				env: "unsupported",
			},
			map: (request, unsupported) => {
				if (request.artifact.kind !== "baked")
					unsupported("Freestyle requires a native baked snapshot");
				if (
					request.artifact.kind === "baked" &&
					!/^sh-[A-Za-z0-9_-]+$/.test(request.artifact.ref) &&
					!(options.allowStockBaseForBake && request.artifact.ref === FREESTYLE_BASE_SNAPSHOT)
				)
					unsupported("Freestyle requires an immutable snapshot ID rather than a mutable slug");
				if (
					request.spec.vcpus < 4 ||
					request.spec.memoryGb < 8 ||
					(request.spec.diskGb !== undefined && request.spec.diskGb < 32)
				)
					unsupported("freestyle/ubuntu starts at 4 vCPU / 8 GiB / 32 GiB; resizing is grow-only");
				const attempt = randomUUID();
				return {
					slug: `sandbox-benchmarks-${attempt}`,
					marker: `${OWNER_PREFIX}${attempt}`,
					deadlineMs: request.deadlineMs,
					snapshotId: request.artifact.kind === "baked" ? request.artifact.ref : "",
				};
			},
		},
		prepareAndVerifyCreatedRequest: async (_sandbox, vm, request, operation) => {
			operation.signal?.throwIfAborted();
			const requested = {
				cpu: request.spec.vcpus,
				memory: request.spec.memoryGb * 1024,
				storage: (request.spec.diskGb ?? 32) * 1024,
			};
			const current = api(operation).vms.ref(vm.id);
			await current.resize(requested);
			const record = vmRecord.assert(await current.data());
			if (
				request.artifact.kind === "baked" &&
				!(options.allowStockBaseForBake && request.artifact.ref === FREESTYLE_BASE_SNAPSHOT) &&
				record.snapshotId !== request.artifact.ref
			)
				throw new Error("Freestyle did not boot the requested immutable snapshot");
			const actual = record.resources;
			if (
				actual.cpu !== requested.cpu ||
				actual.memory !== requested.memory ||
				actual.storage !== requested.storage
			)
				return { status: "unsupported", detail: "Freestyle did not apply the requested resources" };
			const ready = await exec(vm, "true", operation);
			if (ready.exitCode !== 0) throw new Error("Freestyle guest readiness command failed");
			return {
				status: "honored",
				// A stock bootstrap slug differs from the immutable ID and is not benchmark evidence.
				...(request.artifact.kind === "baked" && record.snapshotId === request.artifact.ref
					? { reportedArtifact: { kind: "baked", ref: record.snapshotId } as const }
					: {}),
			};
		},
		lifecycle: {
			destroy: (sandbox, ref, operation) => destroy(ref?.id ?? sandbox.getInstance().id, operation),
		},
		createRecovery: {
			absenceConfirmationMs: 2_000,
			maxAttempts: 4,
			locator: (options) => ({ kind: "marker", key: FREESTYLE_OWNER_KEY, value: options.marker }),
			isDefinitive: (error) => hasStatus(error, [400, 401, 403, 404, 422, 429]),
			isRetryableCreate: (error) => hasStatus(error, [429]),
			cleanup: async (_compute, locator, operation) => {
				const slug = `sandbox-benchmarks-${locator.value.slice(OWNER_PREFIX.length)}`;
				let vm: typeof vmRecord.infer;
				try {
					vm = vmRecord.assert(await api(operation).vms.get(slug));
				} catch (error) {
					if (hasStatus(error, [404])) {
						if (unresolvedCreates.has(locator.value))
							throw new Error(
								"Freestyle create has no terminal allocation verdict; absence is unconfirmed",
							);
						return { status: "absent" };
					}
					throw error;
				}
				if (vm.metadata?.[FREESTYLE_OWNER_KEY] !== locator.value)
					throw new Error("Freestyle recovery found an unrelated VM");
				await destroy(vm.id, operation);
				unresolvedCreates.delete(locator.value);
				return { status: "destroyed" };
			},
		},
		hasWorkingFilesystem: true,
		probes: {
			observe: (_compute, ref) => observe(ref.id),
			describe: (_compute, ref) => api().vms.get(ref.id),
			list: async () => pageSchema.assert(await api().vms.list({ limit: 100 })).vms,
		},
		inventory: {
			list: async (_compute, operation) => {
				const signal = AbortSignal.any([
					AbortSignal.timeout(inventoryTimeoutMs),
					...(operation.signal ? [operation.signal] : []),
				]);
				const owned: string[] = [];
				const seen = new Set<string>();
				let foreignCount = 0;
				let total: number | undefined;
				for (let offset = 0; offset < 100_000; ) {
					signal.throwIfAborted();
					const page = pageSchema.assert(await api({ signal }).vms.list({ limit: 100, offset }));
					if (total !== undefined && total !== page.totalCount)
						throw new Error("Freestyle inventory changed during pagination");
					total = page.totalCount;
					for (const row of page.vms) {
						if (seen.has(row.id)) throw new Error("Freestyle inventory repeated a VM");
						seen.add(row.id);
						if (row.metadata?.[FREESTYLE_OWNER_KEY]?.startsWith(OWNER_PREFIX)) owned.push(row.id);
						else if (row.state !== "stopped" && row.state !== "paused") foreignCount++;
					}
					offset += page.vms.length;
					if (offset === total) return { owned, foreignCount };
					if (offset > total || page.vms.length === 0)
						throw new Error("Freestyle inventory is incomplete");
				}
				throw new Error("Freestyle inventory exceeded its page limit");
			},
		},
		destroyById: (_compute, ref, operation) => destroy(ref.id, operation),
		snapshots: {
			create: async (_compute, session) =>
				snapshotResult.assert(
					await api(undefined, EXEC_TIMEOUT_MS)
						.vms.ref(session.native.id)
						.snapshot({ ttlSeconds: 600 }),
				),
			delete: async (_compute, id) => {
				try {
					await api().vms.snapshots.delete(id);
				} catch (error) {
					if (!hasStatus(error, [404])) throw error;
				}
			},
		},
	});
}

export default defineComputeSdkDriver("freestyle", {
	provenance: FREESTYLE_PROVENANCE,
	readiness: { startup: "create-returns-ready" },
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
	spec: freestyleSpec,
});
