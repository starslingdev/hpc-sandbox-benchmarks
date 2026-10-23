import type { Sandbox, SandboxView } from "@nodeops-createos/sandbox";
import {
	CreateosSandboxApiError,
	CreateosSandboxClient,
	CreateosSandboxConnectionError,
	CreateosSandboxTimeoutError,
} from "@nodeops-createos/sandbox";
import type { ExecOptions } from "@sandbox-benchmarks/driver";
import { DriverError } from "@sandbox-benchmarks/driver";
import type {
	ControlPlane,
	DataPlane,
	MarkerSpelling,
	Vendor,
	VendorRecord,
} from "@sandbox-benchmarks/driver/vendor";
import {
	defineVendorDriver,
	httpClassifiers,
	httpStatus,
	instanceOfAny,
	MARKER_PREFIX,
	mapped,
} from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { type } from "arktype";
import { CREATEOS_PROVENANCE } from "./provenance.ts";

export { CREATEOS_PROVENANCE };

const MIN = 60_000;
const CREATEOS_ROOTFS = "devbox:1";
const CREATEOS_SHAPE = "s-4vcpu-8gb";

// Names are hostnames; the full attempt marker travels in an environment key.
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

const NAME_PREFIX = "sbbench-";
const OUR_NAME = /^sbbench-[0-9a-f]{14}$/;

const looksOurs = (name: string | undefined) => name !== undefined && OUR_NAME.test(name);

const nameOf = (marker: string) =>
	`${NAME_PREFIX}${marker.slice(MARKER_PREFIX.length).replaceAll("-", "").slice(0, 14)}`;

export const CREATEOS_PYTHON_PREFLIGHT =
	'set -eu; if command -v asdf >/dev/null 2>&1; then python_dir="$(asdf where python)"; ' +
	'test -x "$python_dir/bin/python3"; ln -sfn "$python_dir/bin/python3" /usr/local/bin/python3; fi; ' +
	'python3 --version; test -x "$(readlink -f "$(command -v python3)")"';

const classifiers = httpClassifiers(
	httpStatus(CreateosSandboxApiError, (error) => error.statusCode),
);
const { absent } = classifiers;
const network = instanceOfAny(CreateosSandboxConnectionError, CreateosSandboxTimeoutError);
class DeleteNotVisible extends Error {}

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
			// CreateOS retains these as resource-free tombstones, unlike its live `error` state.
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
		raw: { ...view },
	};
}

const tail = (text: string) => {
	const trimmed = text.trim();
	return trimmed.length <= 400 ? trimmed : `…${trimmed.slice(-400)}`;
};

export function createosVendor(client: CreateosSandboxClient): Vendor<SandboxView, Sandbox> {
	const handles = new Map<string, Sandbox>();
	const removals = new Set<string>();

	const remember = (handle: Sandbox) => {
		handles.set(handle.id, handle);
		return handle;
	};
	const forget = (id: string) => {
		handles.delete(id);
		removals.delete(id);
	};

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

	async function reconcile(
		id: string,
		signal: AbortSignal,
	): Promise<VendorRecord<SandboxView> | null> {
		// Item and account views propagate separately; a live listing is never absence evidence.
		const listed = (await client.listSandboxes({ signal })).find((handle) => handle.id === id);
		if (listed === undefined) {
			forget(id);
			return null;
		}
		const current = await attribute(remember(listed), signal);
		if (current.phase === "gone") {
			forget(id);
			return current;
		}
		return removals.has(id) ? { ...current, phase: "deleting" } : current;
	}

	const control: ControlPlane<SandboxView> = {
		create: async ({ request: { spec }, marker }, { signal }) => {
			const handle = remember(
				await client.createSandbox(
					{
						shape: CREATEOS_SHAPE,
						rootfs: CREATEOS_ROOTFS,
						name: nameOf(marker),
						...(spec.diskGb !== undefined && { disk_mib: spec.diskGb * 1024 }),
						envs: { [CREATEOS_MARKER.toVendor(marker)]: marker },
						egress: ["*"],
					},
					{ signal, timeoutMs: 10 * MIN, retry: false },
				),
			);
			return { ...recordOf(handle.data, marker), marker };
		},
		get: async (id, { signal }) => {
			const known = handles.get(id);
			try {
				const fresh = remember(
					known === undefined
						? await client.getSandbox(id, { signal })
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
		remove: async (id, op) => {
			const current = await op.current();
			if (current === null || current.phase === "gone") return "removed";
			if (current.phase === "deleting") return "accepted";
			const handle = handles.get(id) ?? (await client.getSandbox(id, { signal: op.signal }));
			try {
				const destroyed = await handle.destroy({ signal: op.signal });
				removals.add(remember(handle).id);
				return destroyed.status === "destroyed" ? "removed" : "accepted";
			} catch (error) {
				if (!absent(error)) throw error;
				const listed = await reconcile(id, op.signal);
				if (listed === null || listed.phase === "gone") return "removed";
				throw new DeleteNotVisible(`CreateOS still lists ${id} after DELETE returned 404`);
			}
		},
		absent,
		page: async (cursor, { signal }) => {
			if (cursor !== undefined)
				throw new DriverError(
					"vendor-contract-violation",
					"CreateOS lists the whole account in one page",
					{ provider: "createos" },
				);
			const listed = await client.listSandboxes({ signal });
			const records = await Promise.all(
				listed.map((handle) => attribute(remember(handle), signal)),
			);
			return { records };
		},
		refused: classifiers.refused,
		transient: (error) =>
			error instanceof DeleteNotVisible || network(error) || classifiers.transient(error),
	};

	const data: DataPlane<SandboxView, Sandbox> = {
		attach: (record, { signal }) =>
			handles.get(record.id) ?? client.getSandbox(record.id, { signal }).then(remember),
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
				timeoutMs: 2 * MIN,
			});
			if (preflight.result.error !== undefined || preflight.result.exit_code !== 0) {
				const diagnostic =
					preflight.result.error || preflight.result.stderr || preflight.result.stdout;
				throw new DriverError(
					"create-failed",
					`CreateOS python preflight failed (exit ${preflight.result.exit_code}): ${tail(diagnostic)}`,
					{
						provider: "createos",
						...(preflight.result.error === undefined && {
							vendorExitCode: preflight.result.exit_code,
						}),
						...(diagnostic.trim() && { vendorMessage: diagnostic.trim() }),
					},
				);
			}
			return { status: "honored" };
		},
		exec: async (native, command, options?: ExecOptions) => {
			const response = await native.runCommand("bash", ["-lc", command], {
				timeoutMs: MIN,
				...(options?.signal === undefined ? {} : { signal: options.signal }),
			});
			return {
				...(response.result.error === undefined && { exitCode: response.result.exit_code }),
				stdout: response.result.stdout,
				stderr: response.result.error ?? response.result.stderr,
			};
		},
		files: {
			read: async (native, path) => new TextDecoder().decode(await native.files.download(path)),
			write: async (native, path, text) => {
				await native.files.upload(path, text);
			},
		},
	};

	return { control, data };
}

export default defineVendorDriver("createos", {
	provenance: CREATEOS_PROVENANCE,
	sandboxId: type(/^sb[-_][A-Za-z0-9]+$/),
	coverage: mapped(),
	unsupported: ({ spec }) =>
		spec.vcpus === TARGET_SPEC.vcpus &&
		spec.memoryGb === TARGET_SPEC.memoryGb &&
		spec.diskGb === TARGET_SPEC.diskGb
			? undefined
			: "CreateOS requires 4 vCPU, 8 GiB RAM and a 40 GiB overlay",
	diskProof: { allowanceRatio: 0.03 },
	execution: { syncCapMs: MIN, durable: "shell-detach" },
	// Boot (10m), readiness (3m), preparation (2m), disk proof (1m), cleanup (5m), and reads.
	createBudget: { owner: "harness", timeoutMs: 22 * MIN },
	timing: {
		pollMs: 1_000,
		readyTimeoutMs: 3 * MIN,
		deleteTimeoutMs: 5 * MIN,
		controlTimeoutMs: 30_000,
	},
	markerKey: "envs",
	markerSpelling: CREATEOS_MARKER,
	recovery: { provesAbsence: false },
	vendor: ({ env }) =>
		createosVendor(
			new CreateosSandboxClient({
				apiKey: env.CREATEOS_API_KEY,
				baseUrl: env.CREATEOS_SANDBOX_BASE_URL,
				timeoutMs: 30_000,
				// A retried POST must not obscure whether an earlier attempt allocated a VM.
				retry: false,
			}),
		),
});
