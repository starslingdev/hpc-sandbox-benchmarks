// The CreateOS adapter over @nodeops-createos/sandbox. Probed live (2026-11-14): destroyed and
// failed sandboxes stay readable as tombstones (only an unknown id is a 404), a repeated DELETE
// succeeds, and list rows carry the same `envs` names as a get.

import type { CreateosSandboxClient, Sandbox, SandboxView } from "@nodeops-createos/sandbox";
import {
	CreateosSandboxApiError,
	CreateosSandboxConnectionError,
	CreateosSandboxTimeoutError,
} from "@nodeops-createos/sandbox";
import { DriverError } from "@sandbox-benchmarks/driver";
import type { MarkerSpelling, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	httpClassifiers,
	httpStatus,
	instanceOfAny,
	MARKER_PREFIX,
} from "@sandbox-benchmarks/driver/vendor";

export const SYNC_CAP_MS = 60_000;
const BOOT_TIMEOUT_MS = 10 * 60_000;
const PREFLIGHT_TIMEOUT_MS = 2 * 60_000;

/** The kit marker's UUID without dashes: env keys and names allow neither `-` nor its length. */
const hexOf = (marker: string) => marker.slice(MARKER_PREFIX.length).replaceAll("-", "");

/** The full marker travels as an env key; values are write-only, but names are listed. */
export const CREATEOS_MARKER: MarkerSpelling = Object.freeze({
	toVendor: (marker: string) => `SB_BENCHMARK_${hexOf(marker)}`,
	fromVendor: (key: string) =>
		/^SB_BENCHMARK_([0-9a-f]{32})$/
			.exec(key)?.[1]
			?.replace(/^(.{8})(.{4})(.{4})(.{4})/, `${MARKER_PREFIX}$1-$2-$3-$4-`),
});

/** Names are capped at 22 characters, so they carry only a readable prefix of the marker. */
const nameOf = (marker: string) => `sbbench-${hexOf(marker).slice(0, 14)}`;

/** Exposes devbox:1's ASDF Python interpreter to PTS as a real `python3` on PATH. */
export const CREATEOS_PYTHON_PREFLIGHT =
	'set -eu; if command -v asdf >/dev/null 2>&1; then python_dir="$(asdf where python)"; ' +
	'test -x "$python_dir/bin/python3"; ln -sfn "$python_dir/bin/python3" /usr/local/bin/python3; fi; ' +
	'python3 --version; test -x "$(readlink -f "$(command -v python3)")"';

type StatusFacts = Pick<VendorRecord, "phase" | "stopped" | "retryCreate" | "detail">;
const STATUS: Partial<Record<SandboxView["status"], StatusFacts>> = {
	running: { phase: "ready" },
	destroying: { phase: "deleting" },
	// Resource-free tombstones, unlike the live `error` state.
	destroyed: { phase: "gone" },
	failed: { phase: "gone" },
	paused: { phase: "failed", stopped: true },
	error: {
		phase: "failed",
		retryCreate: true,
		detail: "CreateOS exhausted its resume retries for this sandbox",
	},
};

function recordOf(
	view: SandboxView,
	marker = view.envs?.map(CREATEOS_MARKER.fromVendor).find((found) => found !== undefined),
): VendorRecord<SandboxView> {
	return {
		id: view.id,
		...(STATUS[view.status] ?? { phase: "pending" }),
		...(marker !== undefined && { marker }),
		raw: view,
	};
}

const http = httpClassifiers(httpStatus(CreateosSandboxApiError, (error) => error.statusCode));
const network = instanceOfAny(CreateosSandboxConnectionError, CreateosSandboxTimeoutError);

async function exec(
	sandbox: Sandbox,
	command: string,
	signal?: AbortSignal,
	timeoutMs = SYNC_CAP_MS,
) {
	const { result } = await sandbox.runCommand("bash", ["-lc", command], {
		timeoutMs,
		...(signal !== undefined && { signal }),
	});
	// An agent-side `error` means the guest's exit was never observed.
	return {
		...(result.error === undefined && { exitCode: result.exit_code }),
		stdout: result.stdout,
		stderr: result.error ?? result.stderr,
	};
}

export function createosVendor(client: CreateosSandboxClient): Vendor<SandboxView, Sandbox> {
	return {
		control: {
			create: async ({ request: { spec }, marker }, { signal }) => {
				const sandbox = await client.createSandbox(
					{
						shape: "s-4vcpu-8gb",
						rootfs: "devbox:1",
						name: nameOf(marker),
						...(spec.diskGb !== undefined && { disk_mib: spec.diskGb * 1024 }),
						envs: { [CREATEOS_MARKER.toVendor(marker)]: marker },
						egress: ["*"],
					},
					{ signal, timeoutMs: BOOT_TIMEOUT_MS, retry: false },
				);
				// The create response omits `envs`, so the marker is stated rather than read back.
				return recordOf(sandbox.data, marker);
			},
			get: async (id, { signal }) => recordOf((await client.getSandbox(id, { signal })).data),
			remove: async (id, { signal }) => {
				const sandbox = await client.getSandbox(id, { signal });
				const { phase } = recordOf(sandbox.data);
				if (phase === "gone") return "removed";
				if (phase === "deleting") return "accepted";
				const { status } = await sandbox.destroy({ signal });
				return status === "destroyed" ? "removed" : "accepted";
			},
			// The whole account arrives in one unpaginated response.
			page: async (_cursor, { signal }) => ({
				records: (await client.listSandboxes({ signal })).map((sandbox) => recordOf(sandbox.data)),
			}),
			absent: http.absent,
			refused: http.refused,
			transient: (error) => network(error) || http.transient(error),
		},
		data: {
			attach: (record, { signal }) => client.getSandbox(record.id, { signal }),
			// Disk is proven by the kit's `df`; CPU and memory are proven against the reported shape.
			prepare: async ({ record: { raw }, native }, { spec }, { signal }) => {
				if (raw.vcpu !== spec.vcpus || raw.mem_mib !== spec.memoryGb * 1024)
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU / ${spec.memoryGb} GiB but the allocation reports ${raw.vcpu} vCPU / ${raw.mem_mib} MiB`,
					};
				const { exitCode, stdout, stderr } = await exec(
					native,
					CREATEOS_PYTHON_PREFLIGHT,
					signal,
					PREFLIGHT_TIMEOUT_MS,
				);
				if (exitCode !== 0)
					throw new DriverError(
						"create-failed",
						`CreateOS python preflight failed (exit ${exitCode ?? "unknown"}): ${(stderr || stdout).trim().slice(-400)}`,
						{ provider: "createos", ...(exitCode !== undefined && { vendorExitCode: exitCode }) },
					);
				return { status: "honored" };
			},
			exec: (native, command, options) => exec(native, command, options?.signal),
			files: {
				read: async (native, path) => new TextDecoder().decode(await native.files.download(path)),
				write: async (native, path, text) => {
					await native.files.upload(path, text);
				},
			},
		},
	};
}
