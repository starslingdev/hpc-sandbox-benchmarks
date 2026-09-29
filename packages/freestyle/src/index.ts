import { randomUUID } from "node:crypto";
import type { DriverContext, DriverOperationOptions } from "@sandbox-benchmarks/driver";
import { pollUntilReady } from "@sandbox-benchmarks/driver";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { type } from "arktype";
import type { Vm } from "freestyle";
import { Freestyle, FreestyleApiError } from "freestyle";
import { FREESTYLE_PROVENANCE } from "./provenance.ts";

export const FREESTYLE_SNAPSHOT = "freestyle/ubuntu";
export const FREESTYLE_OWNER_KEY = "sandbox-benchmarks-attempt";
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

async function exec(vm: Vm, command: string, options?: DriverOperationOptions) {
	options?.signal?.throwIfAborted();
	// Native file writes belong to ubuntu. Root cannot overwrite those files in sticky /tmp
	// with fs.protected_regular=2; use the same user and let harness setup elevate with sudo.
	const result = execResult.assert(
		await vm.exec({ command, linuxUser: "ubuntu", timeoutMs: 300_000 }),
	);
	return {
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		...(result.statusCode == null ? {} : { exitCode: result.statusCode }),
	};
}

export function freestyleSpec(
	{ env }: DriverContext<"freestyle">,
	client = new Freestyle({ apiKey: env.FREESTYLE_API_KEY }),
) {
	async function observe(id: string) {
		try {
			// Paused/stopped VMs still own disk: only a missing record proves deletion.
			vmRecord.assert(await client.vms.get(id));
			return { state: "running" as const };
		} catch (error) {
			if (hasStatus(error, [404])) return { state: "absent" as const };
			throw error;
		}
	}
	async function destroy(id: string, operation?: DriverOperationOptions) {
		operation?.signal?.throwIfAborted();
		try {
			await client.vms.delete(id);
		} catch (error) {
			if (!hasStatus(error, [404])) throw error;
		}
		await pollUntilReady({
			provider: "freestyle",
			deadlineMs: 60_000,
			intervalMs: 500,
			signal: operation?.signal,
			poll: async () => ((await observe(id)).state === "absent" ? true : null),
		});
	}
	const compute = nativeSdkCompute(
		async (options: { slug: string; marker: string; ttlSeconds: number }, operation) => {
			operation.signal?.throwIfAborted();
			const created = await client.vms.create({
				snapshotId: FREESTYLE_SNAPSHOT,
				slug: options.slug,
				metadata: { [FREESTYLE_OWNER_KEY]: options.marker },
				idleTimeoutSeconds: -1,
				autoDeleteSeconds: 0,
				ttlSeconds: options.ttlSeconds,
				firewall: { rules: [{ action: "allow", source: {}, destination: { public: true } }] },
			});
			return created.vm;
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
				if (request.artifact.kind !== "none")
					unsupported("Freestyle boots its stock Ubuntu snapshot");
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
					// The harness owns the attempt deadline; TTL is a final cleanup backstop.
					ttlSeconds: Math.ceil(request.deadlineMs / 1000) + 600,
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
			await vm.resize(requested);
			const actual = vmRecord.assert(await vm.data()).resources;
			if (
				actual.cpu !== requested.cpu ||
				actual.memory !== requested.memory ||
				actual.storage !== requested.storage
			)
				return { status: "unsupported", detail: "Freestyle did not apply the requested resources" };
			const ready = await exec(vm, "true", operation);
			if (ready.exitCode !== 0) throw new Error("Freestyle guest readiness command failed");
			return { status: "honored" };
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
					vm = vmRecord.assert(await client.vms.get(slug));
				} catch (error) {
					if (hasStatus(error, [404])) return { status: "absent" };
					throw error;
				}
				if (vm.metadata?.[FREESTYLE_OWNER_KEY] !== locator.value)
					throw new Error("Freestyle recovery found an unrelated VM");
				await destroy(vm.id, operation);
				return { status: "destroyed" };
			},
		},
		hasWorkingFilesystem: true,
		probes: {
			observe: (_compute, ref) => observe(ref.id),
			describe: (_compute, ref) => client.vms.get(ref.id),
			list: () => client.vms.list({ limit: 100 }),
		},
		inventory: {
			list: async (_compute, operation) => {
				const owned: string[] = [];
				const seen = new Set<string>();
				let foreignCount = 0;
				let total: number | undefined;
				for (let offset = 0; offset < 100_000; ) {
					operation.signal?.throwIfAborted();
					const page = pageSchema.assert(await client.vms.list({ limit: 100, offset }));
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
				snapshotResult.assert(await session.native.snapshot({ ttlSeconds: 600 })),
			delete: async (_compute, id) => {
				try {
					await client.vms.snapshots.delete(id);
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
