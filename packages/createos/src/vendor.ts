// CreateOS's vendor adapter: translation only, over `@nodeops-createos/sandbox`. Readiness,
// cleanup confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).
//
// Four vendor facts shape it. `createSandbox` is synchronous — the POST returns only once the VM is
// `running` — so a create response itself proves readiness. The ownership marker rides in an
// environment *key* (`SB_BENCHMARK_<attempt hex>`) instead of the sandbox name: the name is a
// user-facing hostname and in-network DNS label, and the attempt UUID belongs nowhere in one, while
// the control plane echoes env keys back (values are never returned) on every single-sandbox read.
// The account-wide listing is documented without `envs`, so a row that only *looks* ours (name
// prefix) is re-read by id before the kit is told a marker: a row this adapter cannot attribute must
// never read as owned in inventory nor be destroyed as one. And the item and collection views move
// independently, so a teardown confirms removal against both.

import type {
	CreateSandboxOptions,
	CreateSandboxRequest,
	ListSandboxesOptions,
	RequestOptions,
	Sandbox,
	SandboxView,
} from "@nodeops-createos/sandbox";
import {
	CreateosSandboxApiError,
	CreateosSandboxConnectionError,
	CreateosSandboxTimeoutError,
} from "@nodeops-createos/sandbox";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { DriverError } from "@sandbox-benchmarks/driver";
import type {
	ControlPlane,
	DataPlane,
	MarkerSpelling,
	Vendor,
	VendorRecord,
} from "@sandbox-benchmarks/driver/vendor";
import {
	httpClassifiers,
	httpStatus,
	instanceOfAny,
	MARKER_PREFIX,
} from "@sandbox-benchmarks/driver/vendor";

/** The SDK surface the adapter uses: one create, one read by id, and the whole account listing. */
export interface CreateosTransport {
	create(request: CreateSandboxRequest, options: CreateSandboxOptions): Promise<Sandbox>;
	get(id: string, options: RequestOptions): Promise<Sandbox>;
	list(options: ListSandboxesOptions): Promise<Sandbox[]>;
}

/** The adapter's binding to the real client, in the one place the SDK is constructed. */
export const createosTransport = (client: {
	createSandbox(request: CreateSandboxRequest, options?: CreateSandboxOptions): Promise<Sandbox>;
	getSandbox(id: string, options?: RequestOptions): Promise<Sandbox>;
	listSandboxes(options?: ListSandboxesOptions): Promise<Sandbox[]>;
}): CreateosTransport => ({
	create: (request, options) => client.createSandbox(request, options),
	get: (id, options) => client.getSandbox(id, options),
	list: (options) => client.listSandboxes(options),
});

/** The catalog image every benchmark sandbox boots; the artifact is mounted into it by the kit. */
export const CREATEOS_ROOTFS = "devbox:1";
/** The shape whose 4 vCPU / 8 GiB is exactly the target size. */
export const CREATEOS_SHAPE = "s-4vcpu-8gb";

/**
 * The marker's vendor spelling: an environment key. Env keys are documented as
 * `^[A-Za-z_][A-Za-z0-9_]*$` and are the one create field the control plane returns (by name) on
 * every view, so the attempt UUID round-trips through them unchanged. The reverse direction is
 * strict: a key that is not exactly this spelling carries no attempt of ours.
 */
const MARKER_ENV_PREFIX = "SB_BENCHMARK_";
const MARKED_ENV = /^SB_BENCHMARK_([0-9a-f]{32})$/;

export const CREATEOS_MARKER: MarkerSpelling = Object.freeze({
	toVendor: (marker: string) =>
		`${MARKER_ENV_PREFIX}${marker.slice(MARKER_PREFIX.length).replaceAll("-", "")}`,
	fromVendor: (value: string) => {
		const hex = MARKED_ENV.exec(value)?.[1];
		if (hex === undefined) return undefined;
		return `${MARKER_PREFIX}${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	},
});

/**
 * The name a create stamps on the row: a readable inventory hint carrying the marker's first 14 hex
 * characters, never the marker itself. The sandbox name is a hostname; the marker is
 * {@link CREATEOS_MARKER}, so nothing depends on this name round-tripping.
 */
const NAME_PREFIX = "sbbench-";
const OUR_NAME = /^sbbench-[0-9a-f]{14}$/;

/** Whether a name looks like one of ours, so a list row without env keys is worth re-reading. */
const looksOurs = (name: string | undefined) => name !== undefined && OUR_NAME.test(name);

const nameOf = (marker: string) =>
	`${NAME_PREFIX}${marker.slice(MARKER_PREFIX.length).replaceAll("-", "").slice(0, 14)}`;

/**
 * devbox:1 exposes python3 through an ASDF shim, and Phoronix runs its profiles with a sanitized
 * environment, so the shim is resolved to the installed interpreter before the harness starts. This
 * is deliberately provider-local: it changes only the disposable CreateOS benchmark sandbox, never
 * the shared harness, another provider, or the catalog image.
 */
export const CREATEOS_PYTHON_PREFLIGHT =
	'if command -v asdf >/dev/null 2>&1; then python_dir="$(asdf where python)"; ' +
	'test -x "$python_dir/bin/python3"; ln -sfn "$python_dir/bin/python3" /usr/local/bin/python3; fi; ' +
	'python3 --version; test -x "$(readlink -f "$(command -v python3)")"';

const absent = httpClassifiers(
	httpStatus(CreateosSandboxApiError, (error) => error.statusCode),
).absent;
/** A status the SDK could not read (no HTTP exchange at all) is still a transient failure. */
const network = instanceOfAny(CreateosSandboxConnectionError, CreateosSandboxTimeoutError);

/**
 * `destroyed` and `failed` are terminal rows that hold nothing: the control plane keeps them as
 * tombstones and rejects a delete on them, so both are removal evidence rather than work to do.
 * `pausing`/`paused` are the one state a create never asks for (auto-pause is left off), so a paused
 * allocation is a stopped sandbox the kit tears down. `error` is the host's "gave up resuming": a
 * create retried elsewhere gets a healthy VM, and only after the failed one is gone.
 */
function phaseOf(
	status: SandboxView["status"],
): Pick<VendorRecord<SandboxView>, "phase" | "stopped" | "retryCreate" | "detail"> {
	switch (status) {
		case "running":
			return { phase: "ready" };
		case "destroying":
			return { phase: "deleting" };
		case "destroyed":
		case "failed":
			return { phase: "gone" };
		case "paused":
			return { phase: "failed", stopped: true };
		case "error":
			return {
				phase: "failed",
				retryCreate: true,
				detail: "CreateOS exhausted its resume retries for this sandbox",
			};
		default:
			return { phase: "pending" };
	}
}

/** The marker a view carries, if any: the first env key spelled as one of ours. */
function markerOf(view: SandboxView): string | undefined {
	for (const name of view.envs ?? []) {
		const marker = CREATEOS_MARKER.fromVendor(name);
		if (marker !== undefined) return marker;
	}
	return undefined;
}

function recordOf(view: SandboxView, marker = markerOf(view)): VendorRecord<SandboxView> {
	return {
		id: view.id,
		...phaseOf(view.status),
		...(marker !== undefined && { marker }),
		// The view is plain data on purpose: the kit serializes it into cleanup diagnostics, and a
		// `Sandbox` handle would carry its HTTP client (and the API key) along.
		raw: { ...view },
	};
}

const tail = (text: string) => {
	const trimmed = text.trim();
	return trimmed.length <= 400 ? trimmed : `…${trimmed.slice(-400)}`;
};

export function createosVendor(transport: CreateosTransport): Vendor<SandboxView, Sandbox> {
	/** Handles already read this session, so the common paths do not re-resolve one by id. */
	const handles = new Map<string, Sandbox>();
	/** Ids this session asked CreateOS to delete: only those may keep a teardown waiting. */
	const removals = new Set<string>();

	const remember = (handle: Sandbox) => {
		handles.set(handle.id, handle);
		return handle;
	};
	const forget = (id: string) => {
		handles.delete(id);
		removals.delete(id);
	};

	/**
	 * Attribute a listed row. The account listing is documented without `envs`, so a row whose name
	 * looks ours is re-read by id to see the marker; a row that vanished in between keeps its stale
	 * view (a marker it may carry cannot be recovered, and a listing must not fail on a tombstone).
	 */
	async function attribute(
		handle: Sandbox,
		signal: AbortSignal,
	): Promise<VendorRecord<SandboxView>> {
		const view = handle.data;
		if (view.envs !== undefined || !looksOurs(view.name)) return recordOf(view);
		try {
			await handle.refresh({ signal });
		} catch (error) {
			if (!absent(error)) throw error;
		}
		return recordOf(handle.data);
	}

	/**
	 * A read by id that 404s while the account listing still holds the row. The two views are
	 * updated independently, so the row is still being removed: report it `deleting` — never `null` —
	 * until the listing agrees, but only for a row this session asked to delete. Otherwise the kit
	 * would spend its delete budget waiting on a row it never deleted.
	 */
	async function reconcile(
		id: string,
		signal: AbortSignal,
	): Promise<VendorRecord<SandboxView> | null> {
		const listed = (await transport.list({ signal })).find((handle) => handle.id === id);
		if (listed === undefined) {
			forget(id);
			return null;
		}
		const current = await attribute(remember(listed), signal);
		if (current.phase === "gone") {
			forget(id);
			return current;
		}
		return removals.has(id) ? { ...current, phase: "deleting" } : null;
	}

	const control: ControlPlane<SandboxView> = {
		// The POST does not return before the sandbox is `running`, so its response proves readiness.
		create: async ({ request: { spec }, marker }, { signal }) => {
			const handle = remember(
				await transport.create(
					{
						shape: CREATEOS_SHAPE,
						rootfs: CREATEOS_ROOTFS,
						name: nameOf(marker),
						// The kit proves the overlay after boot; the create states the size it asked for.
						...(spec.diskGb !== undefined && { disk_mib: spec.diskGb * 1024 }),
						envs: { [CREATEOS_MARKER.toVendor(marker)]: marker },
						// The benchmark installs its toolchain from the network; the harness owns egress.
						egress: ["*"],
						// `auto_pause_after_seconds` is left off on purpose: a detached benchmark run must
						// never be paused while the harness waits on its done file.
					},
					// The create blocks for the whole boot; the harness's create budget bounds it.
					{ signal, timeoutMs: 0 },
				),
			);
			// The create response omits `envs`, so the marker is the one the attempt chose.
			return { ...recordOf(handle.data, marker), marker };
		},
		get: async (id, { signal }) => {
			const known = handles.get(id);
			try {
				const fresh = remember(
					known === undefined
						? await transport.get(id, { signal })
						: await known.refresh({ signal }),
				);
				const current = recordOf(fresh.data);
				if (current.phase === "gone") forget(id);
				return current;
			} catch (error) {
				if (!absent(error)) throw error;
				return reconcile(id, signal);
			}
		},
		// CreateOS deletes asynchronously: only `destroyed` (or a 404) is removal.
		remove: async (id, op) => {
			const current = await op.current();
			if (current === null || current.phase === "gone") return "removed";
			if (current.phase === "deleting") return "accepted";
			const handle = handles.get(id) ?? (await transport.get(id, { signal: op.signal }));
			const destroyed = await handle.destroy({ signal: op.signal, timeoutMs: 0 });
			removals.add(remember(handle).id);
			return destroyed.status === "destroyed" ? "removed" : "accepted";
		},
		absent,
		// One page of the whole account: `listSandboxes()` fetches every page itself.
		page: async (cursor, { signal }) => {
			if (cursor !== undefined)
				throw new DriverError(
					"vendor-contract-violation",
					"CreateOS lists the whole account in one page",
					{ provider: "createos" },
				);
			const listed = await transport.list({ signal });
			const records = await Promise.all(
				listed.map((handle) => attribute(remember(handle), signal)),
			);
			return { records };
		},
		refused: httpClassifiers(httpStatus(CreateosSandboxApiError, (error) => error.statusCode))
			.refused,
		// A 408/409/429/5xx, or a request that never reached the control plane: the create is
		// reconciled against the account rather than read as a refusal.
		transient: (error) =>
			network(error) ||
			httpClassifiers(httpStatus(CreateosSandboxApiError, (e) => e.statusCode)).transient(error),
	};

	const data: DataPlane<SandboxView, Sandbox> = {
		attach: (record, { signal }) =>
			handles.get(record.id) ?? transport.get(record.id, { signal }).then(remember),
		// The allocation reports the resources it was created with; the kit proves the disk after.
		prepare: async ({ record, native }, { spec }, { signal }) => {
			const view = record.raw;
			if (view.vcpu !== spec.vcpus || view.mem_mib !== spec.memoryGb * 1024)
				return {
					status: "unsupported",
					detail: `requested ${spec.vcpus} vCPU / ${spec.memoryGb} GiB but the allocation reports ${view.vcpu} vCPU / ${view.mem_mib} MiB`,
				};
			if (spec.diskGb !== undefined && view.disk_mib < spec.diskGb * 1024)
				return {
					status: "unsupported",
					detail: `requested ${spec.diskGb} GiB of disk but the allocation reports ${view.disk_mib} MiB`,
				};
			const preflight = await native.runCommand("bash", ["-lc", CREATEOS_PYTHON_PREFLIGHT], {
				signal,
				timeoutMs: 0,
			});
			if (preflight.result.exit_code !== 0) {
				const diagnostic = preflight.result.stderr || preflight.result.stdout;
				throw new DriverError(
					"create-failed",
					`CreateOS python preflight failed (exit ${preflight.result.exit_code}): ${tail(diagnostic)}`,
					{
						provider: "createos",
						vendorExitCode: preflight.result.exit_code,
						...(diagnostic.trim() && { vendorMessage: diagnostic.trim() }),
					},
				);
			}
			return { status: "honored" };
		},
		exec: async (native, command, options?: ExecOptions) => {
			const response = await native.runCommand("bash", ["-lc", command], {
				timeoutMs: 0,
				...(options?.signal === undefined ? {} : { signal: options.signal }),
			});
			return {
				// An agent-level failure never ran the command: its exit status is unknown, not zero.
				...(response.result.error === undefined && { exitCode: response.result.exit_code }),
				stdout: response.result.stdout,
				stderr: response.result.stderr,
			};
		},
		// A real file API beats the kit's shell fallback: no quoting, and `hasWorkingFilesystem` holds.
		files: {
			read: async (native, path) =>
				new TextDecoder().decode(await native.files.download(path, { timeoutMs: 0 })),
			write: async (native, path, text) => {
				await native.files.upload(path, text, { timeoutMs: 0 });
			},
		},
	};

	return { control, data };
}

/** The adapter's own view of a driver context: the vendor binding uses no other field. */
export type CreateosContext = DriverContext<"createos">;
