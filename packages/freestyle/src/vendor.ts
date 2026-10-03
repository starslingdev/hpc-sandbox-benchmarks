// Freestyle's vendor adapter: translation only, over the `freestyle` SDK with a bounded transport.
// Readiness, cleanup confirmation, recovery, inventory and probes live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).
//
// Freestyle boots a VM from a native snapshot. Benchmark execution boots an immutable `sh-` ID and
// verifies the booted one; the stock alias is bootable only from a native-snapshot build's context,
// whose resolved artifact is that alias (the kit's artifact guard already holds a request to it).
// A VM's create returns once it runs, then grows to the requested shape; its record reports both.
// A paused or stopped VM still owns its disk: only a 404 proves removal.

import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { shellQuote } from "@sandbox-benchmarks/driver";
import type { Vendor, VendorPage, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { httpStatus, markerSpelling, refusedOn } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";
import type { Vm } from "freestyle";
import { Freestyle, FreestyleApiError } from "freestyle";
import { freestyleFetch } from "./transport.ts";

/** Freestyle's stock Ubuntu snapshot: a mutable alias, bootable only by a native-snapshot build. */
export const FREESTYLE_BASE_SNAPSHOT = "freestyle/ubuntu";
export const IMMUTABLE_SNAPSHOT_ID = /^sh-[A-Za-z0-9_-]+$/;
// Match the shared image's system PATH. The harness adds the user's pinned mise and pnpm dirs.
// Stock Ubuntu's NVM globals include language servers that change workload test semantics.
const FREESTYLE_PATH =
	"/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
export function freestyleCommand(command: string): string {
	// Reset inside the guest shell: an exec env alone can be overwritten by stock shell startup.
	const script = `if [ -f /etc/mise/config.toml ]; then export MISE_DATA_DIR=/usr/local/share/mise MISE_CONFIG_DIR=/etc/mise; fi; ${command}`;
	return `env -u BASH_ENV -u ENV -u NODE_PATH -u NODE_OPTIONS -u NVM_DIR -u NVM_BIN -u NVM_INC PATH=${shellQuote(FREESTYLE_PATH)} bash --noprofile --norc -c ${shellQuote(script)}`;
}
/** The metadata key every benchmark create writes its ownership marker under. */
export const FREESTYLE_OWNER_KEY = "sandbox-benchmarks-attempt";
/** Each create's slug: the marker's attempt UUID, the name a lost create is looked up by. */
export const FREESTYLE_SLUG = markerSpelling("sandbox-benchmarks-");
// Longest supported benchmark job is 330 minutes; leave headroom for cleanup.
export const FREESTYLE_VM_TTL_SECONDS = 6 * 60 * 60;
const FREESTYLE_CONTROL_TIMEOUT_MS = 30_000;
const EXEC_TIMEOUT_MS = 300_000;
const PAGE_SIZE = 100;
export const FREESTYLE_SANDBOX_ID = type(/^[A-Za-z0-9_-]+$/);
const vmRecord = type({
	id: FREESTYLE_SANDBOX_ID,
	state: "'starting' | 'running' | 'pausing' | 'paused' | 'stopped'",
	"slug?": "string | null",
	"metadata?": { "[string]": "string" },
	"snapshotId?": "string | null",
	resources: {
		cpu: "number.integer > 0",
		memory: "number.integer > 0",
		storage: "number.integer > 0",
	},
});
type FreestyleRow = typeof vmRecord.infer;
const pageSchema = type({ vms: vmRecord.array(), totalCount: "number.integer >= 0" });
const execResult = type({
	"stdout?": "string | null",
	"stderr?": "string | null",
	"statusCode?": "number.integer | null",
});
const snapshotResult = type({ snapshotId: FREESTYLE_SANDBOX_ID });
const durableSnapshotResult = type({
	snapshotId: FREESTYLE_SANDBOX_ID,
	snapshot: { "ttlSeconds?": "number | null", "autoDeleteSeconds?": "number | null" },
});

const status = httpStatus(FreestyleApiError, (error) => error.status);
/** Only a 404 proves removal, of a VM or a snapshot. */
const absent = (error: unknown) => status(error) === 404;

/** A create's own response carries only the VM id; every read carries the whole record. */
type Raw = Pick<FreestyleRow, "id"> & Partial<FreestyleRow>;

function record(row: FreestyleRow): VendorRecord<Raw> {
	const marker = row.metadata?.[FREESTYLE_OWNER_KEY];
	return {
		id: row.id,
		phase: row.state === "starting" ? "pending" : "ready",
		...(marker && { marker }),
		...((row.state === "paused" || row.state === "stopped") && { stopped: true }),
		raw: row,
	};
}

export function freestyleVendor(
	{ env, resolvedArtifact }: Pick<DriverContext<"freestyle">, "env" | "resolvedArtifact">,
	fetchImpl: typeof fetch = fetch,
): Vendor<Raw, Vm> {
	const api = (signal?: AbortSignal, timeoutMs = FREESTYLE_CONTROL_TIMEOUT_MS) =>
		new Freestyle({
			apiKey: env.FREESTYLE_API_KEY,
			fetch: freestyleFetch(fetchImpl, timeoutMs, signal),
		});

	async function exec(vm: Vm, command: string, options?: ExecOptions) {
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
		options?.signal?.throwIfAborted();
		return {
			stdout: result.stdout ?? "",
			stderr: result.stderr ?? "",
			...(result.statusCode == null ? {} : { exitCode: result.statusCode }),
		};
	}

	return {
		control: {
			// The create request is bounded by the harness's attempt budget, not the VM's lifetime.
			create: async ({ request, marker }, { signal }) => {
				const created = await api(signal, request.deadlineMs).vms.create({
					snapshotId: resolvedArtifact.ref,
					slug: FREESTYLE_SLUG.toVendor(marker),
					metadata: { [FREESTYLE_OWNER_KEY]: marker },
					idleTimeoutSeconds: -1,
					autoDeleteSeconds: 0,
					ttlSeconds: FREESTYLE_VM_TTL_SECONDS,
					firewall: { rules: [{ action: "allow", source: {}, destination: { public: true } }] },
				});
				const id = FREESTYLE_SANDBOX_ID.assert(created.vm.id);
				return { id, phase: "ready", marker, raw: { id } };
			},
			// A read by id, or by the attempt's slug (recovery's lookup).
			get: async (idOrSlug, { signal }) =>
				record(vmRecord.assert(await api(signal).vms.get(idOrSlug))),
			// DELETE is acknowledgement only; a later 404 is removal.
			remove: async (id, { signal }) => {
				await api(signal).vms.delete(id);
				return "accepted";
			},
			absent,
			// Offset pagination: the cursor carries the offset and the total the first page reported,
			// so a total that moves under the scan fails closed instead of skipping a VM.
			page: async (cursor, { signal }): Promise<VendorPage<Raw>> => {
				const [offset = 0, total] = cursor?.split(":").map(Number) ?? [];
				const page = pageSchema.assert(await api(signal).vms.list({ limit: PAGE_SIZE, offset }));
				if (total !== undefined && total !== page.totalCount)
					throw new Error("Freestyle inventory changed during pagination");
				const records = page.vms.map(record);
				const next = offset + page.vms.length;
				if (next === page.totalCount) return { records };
				if (next > page.totalCount || page.vms.length === 0)
					throw new Error("Freestyle inventory is incomplete");
				return { records, next: `${next}:${page.totalCount}` };
			},
			refused: refusedOn(status, [400, 401, 403, 404, 422, 429]),
		},
		data: {
			// Do not retain the create signal in the session's native filesystem transport.
			attach: ({ id }) => api().vms.ref(id),
			prepare: async ({ record: { id }, native }, { spec, artifact }, { signal }) => {
				const requested = {
					cpu: spec.vcpus,
					memory: spec.memoryGb * 1024,
					storage: (spec.diskGb ?? 32) * 1024,
				};
				const current = api(signal).vms.ref(id);
				await current.resize(requested);
				const row = vmRecord.assert(await current.data());
				const ref = artifact.kind === "baked" ? artifact.ref : undefined;
				// A stock bootstrap slug differs from the immutable ID and is not benchmark evidence.
				const stock = ref === FREESTYLE_BASE_SNAPSHOT;
				if (!stock && row.snapshotId !== ref)
					throw new Error("Freestyle did not boot the requested immutable snapshot");
				const actual = row.resources;
				if (
					actual.cpu !== requested.cpu ||
					actual.memory !== requested.memory ||
					actual.storage !== requested.storage
				)
					return {
						status: "unsupported",
						detail: "Freestyle did not apply the requested resources",
					};
				const ready = await exec(native, "true", { signal });
				if (ready.exitCode !== 0) throw new Error("Freestyle guest readiness command failed");
				return {
					status: "honored",
					...(!stock &&
						row.snapshotId && {
							reportedArtifact: { kind: "baked", ref: row.snapshotId } as const,
						}),
				};
			},
			exec,
			files: {
				read: (vm, path) => vm.fs.readTextFile(path),
				exists: (vm, path) => vm.fs.exists(path),
				write: (vm, path, text) => vm.fs.writeTextFile(path, text),
			},
		},
		snapshots: {
			create: async ({ record: { id } }, { signal }, retention) => {
				const vm = api(signal, EXEC_TIMEOUT_MS).vms.ref(id);
				/** A capture the caller never learns: deleted here rather than left behind. */
				const refuse = async (snapshotId: string, reason: string): Promise<never> => {
					await api()
						.vms.snapshots.delete(snapshotId)
						.catch(() => {});
					throw new Error(reason);
				};
				/** Only an immutable `sh-` ID is bootable as a benchmark artifact. */
				const immutable = async (snapshotId: string) => {
					if (!IMMUTABLE_SNAPSHOT_ID.test(snapshotId))
						await refuse(snapshotId, "Freestyle captured a snapshot without an immutable sh- ID");
					return { snapshotId };
				};
				// A lifecycle measurement's snapshot carries a ten-minute expiry as a cleanup backstop.
				if (retention !== "durable")
					return immutable(
						snapshotResult.assert(await vm.snapshot({ ttlSeconds: 600 })).snapshotId,
					);
				const created = durableSnapshotResult.assert(await vm.snapshot({ autoDeleteSeconds: -1 }));
				if (
					[created.snapshot.ttlSeconds, created.snapshot.autoDeleteSeconds].some(
						(expiry) => expiry !== undefined && expiry !== null && expiry !== -1,
					)
				)
					await refuse(
						created.snapshotId,
						"Freestyle plan applies snapshot expiry; a durable benchmark artifact requires a plan without automatic snapshot deletion",
					);
				return immutable(created.snapshotId);
			},
			delete: async (snapshotId, { signal }) => {
				try {
					await api(signal).vms.snapshots.delete(snapshotId);
				} catch (error) {
					if (!absent(error)) throw error;
				}
			},
		},
	};
}
