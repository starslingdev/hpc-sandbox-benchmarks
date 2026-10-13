// Tangle Sandbox's vendor adapter: translation only, over @tangle-network/sandbox. It states what the
// Sandbox API means in the vendor port's terms: the toolchain image as `environment`, the sandbox
// name (the attempt's UUID under a vendor prefix) as ownership marker, the API's statuses as phases,
// blocking exec through the runtime's process API, and a non-blocking spawn as the durable route.
// Readiness, cleanup confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).
//
// Every create is isolated (no owner secrets, startup scripts or Hub authority), agent-free (no model
// backend provisioned) and ephemeral (no persistent home volume), so the guest runs only the
// benchmark on the image the harness names.

import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	bounded,
	httpClassifiers,
	httpStatus,
	LEAK_EXPIRY_MS,
	markerSpelling,
} from "@sandbox-benchmarks/driver/vendor";
import type { Sandbox, SandboxInstance } from "@tangle-network/sandbox";
import { SandboxError } from "@tangle-network/sandbox";
import { type } from "arktype";

/** The SDK surface the adapter translates; the package entry passes a real `Sandbox` client. */
export type TangleClient = Pick<Sandbox, "createIsolated" | "get" | "list">;

/** Every benchmark create is named with this prefix plus its attempt's UUID; ownership keys on it. */
export const TANGLE_NAME_PREFIX = "sandbox-benchmarks-";
/** The sandbox name spells the kit marker's attempt UUID under the Tangle prefix. */
export const TANGLE_NAME = markerSpelling(TANGLE_NAME_PREFIX);
/** Console tag recorded in the sandbox's metadata (ownership is the name; see `record`). */
export const TANGLE_OWNER_KEY = "sandbox-benchmarks";
export const TANGLE_OWNER_VALUE = "tangle";
/** The Sandbox API's id alphabet (products/sandbox/api: `^[A-Za-z0-9_-]+$`, at most 128). */
export const TANGLE_SANDBOX_ID = type(/^[A-Za-z0-9_-]{1,128}$/);
export const TANGLE_DEFAULT_BASE_URL = "https://sandbox.tangle.tools";

/** Per-call ceiling on control-plane requests: the kit bounds each read by it. */
export const TANGLE_CONTROL_TIMEOUT_MS = 30_000;
/**
 * The SDK's create blocks until the sandbox is running and polls it there itself; the default 120s
 * budget is sized for the server's default image. A first pull of the ~1.5 GiB toolchain image on a
 * cold host needs longer, so the create carries its own budget.
 */
export const TANGLE_CREATE_TIMEOUT_MS = 15 * 60_000;
/**
 * The runtime's per-command ceiling (SDK `EXEC_MAX_TIMEOUT_MS`). The harness owns every step
 * deadline and routes anything past the module's 60s synchronous cap to `launch`, so foreground
 * commands ask for the ceiling rather than the SDK's 30s default, which would kill a 45s step.
 */
export const TANGLE_EXEC_TIMEOUT_MS = 600_000;
/**
 * Tangle's unprivileged runtime starts commands with a Nix PATH that hides the image's baked
 * Node/pnpm toolchain. Keep the image shims first for both synchronous and detached commands;
 * otherwise setup sees older Nix versions and tries to modify root-owned mise directories.
 */
const TANGLE_TOOLCHAIN_PATH =
	"export PATH=/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH; ";
/** Page size for the account listing (offset pagination). */
export const TANGLE_PAGE_SIZE = 100;
/** Minimum the API accepts for stopped-sandbox retention; a leaked stopped box is reclaimed by it. */
const TANGLE_DELETE_AFTER_STOPPED_SECONDS = 300;

/** The API's typed status, never message text. */
export const tangleStatus = httpStatus(SandboxError, (error) => error.status);

/**
 * Only `running` is usable. A `stopped` sandbox holds no compute but is still the benchmark's to
 * delete; `failed` and `expired` still own a record; only `deleted` (or the API's 404) is removal.
 */
function phaseOf(status: string): Phase {
	switch (status) {
		case "running":
			return "ready";
		case "pending":
		case "provisioning":
			return "pending";
		case "deleted":
			return "gone";
		default:
			return "failed";
	}
}

function record(sandbox: SandboxInstance): VendorRecord<SandboxInstance> {
	// Ownership is the name's spelling alone; the metadata tag is a console aid, never attribution.
	const marker = TANGLE_NAME.fromVendor(sandbox.name ?? "");
	return {
		id: sandbox.id,
		phase: phaseOf(sandbox.status),
		...(marker !== undefined && { marker }),
		...(sandbox.status === "stopped" && { stopped: true }),
		raw: sandbox,
	};
}

export function tangleVendor(
	client: TangleClient,
	{ resolvedArtifact }: Pick<DriverContext<"tangle">, "resolvedArtifact">,
): Vendor<SandboxInstance, SandboxInstance> {
	const page = async (offset: number) => {
		const rows = await client.list({ limit: TANGLE_PAGE_SIZE, offset });
		const records = rows.map(record);
		return rows.length < TANGLE_PAGE_SIZE
			? { records }
			: { records, next: String(offset + TANGLE_PAGE_SIZE) };
	};
	const offsetOf = (cursor: string | undefined) => {
		const offset = cursor === undefined ? 0 : Number(cursor);
		if (!Number.isSafeInteger(offset) || offset < 0)
			throw new Error(`Tangle listing cursor ${cursor} is not an offset`);
		return offset;
	};

	return {
		control: {
			// The SDK's create resolves once the sandbox is running (it polls a `provisioning` answer
			// itself); the status it returns is still classified, never assumed. The idempotency key is
			// the marker's spelling, so a caller-level replay converges on one allocation.
			create: async ({ request, marker }, { signal }) => {
				const name = TANGLE_NAME.toVendor(marker);
				const diskGb = request.spec.diskGb;
				return record(
					await client.createIsolated(
						{
							name,
							idempotencyKey: name,
							environment: resolvedArtifact.ref,
							agent: false,
							ephemeral: true,
							resources: {
								cpuCores: request.spec.vcpus,
								memoryMB: request.spec.memoryGb * 1024,
								...(diskGb !== undefined && { diskGB: diskGb }),
							},
							// Omitted egress reports "open" but the proxy stays strict for some hosts
							// (nodejs.org, binaries.prisma.sh 403), so ask for open egress explicitly.
							egressPolicy: { mode: "open" },
							maxLifetimeSeconds: LEAK_EXPIRY_MS / 1000,
							idleTimeoutSeconds: LEAK_EXPIRY_MS / 1000,
							deleteAfterStoppedSeconds: TANGLE_DELETE_AFTER_STOPPED_SECONDS,
							metadata: { [TANGLE_OWNER_KEY]: TANGLE_OWNER_VALUE },
						},
						{ timeoutMs: TANGLE_CREATE_TIMEOUT_MS, signal },
					),
				);
			},
			// `get` answers null on the API's 404.
			get: async (id) => {
				const sandbox = await client.get(id);
				return sandbox === null ? null : record(sandbox);
			},
			// The default delete answers once the sandbox is dead and billed; the kit then observes the
			// 404 that proves removal.
			remove: async (_id, { signal, current }) => {
				const sandbox = (await current())?.raw;
				if (sandbox === undefined) return "removed";
				await bounded(signal, TANGLE_CONTROL_TIMEOUT_MS, (bound) =>
					sandbox.delete({ signal: bound }),
				);
				return "accepted";
			},
			// One offset page of the caller's sandboxes; the kit drains and caps it.
			page: (cursor) => page(offsetOf(cursor)),
			// An ambiguous create is found by its name in the account listing.
			find: async (marker, cursor) => {
				const name = TANGLE_NAME.toVendor(marker);
				const { records, next } = await page(offsetOf(cursor));
				const matches = records.filter((row) => row.raw.name === name);
				return next === undefined ? { records: matches } : { records: matches, next };
			},
			// The REST reading: 4xx (not 408/409) refused before allocation, 429 retryable; 404 absent.
			...httpClassifiers(tangleStatus),
		},
		data: {
			attach: ({ raw }) => raw,
			// The granted shape is what the create resolved and what the ledger bills; an off-request
			// grant is refused rather than measured. Disk is proven by the kit's `df` afterwards.
			prepare: async ({ native }, { spec }) => {
				const granted = native.resources;
				if (granted === undefined) return { status: "honored" };
				if (granted.cpuCores !== spec.vcpus || granted.memoryMB !== spec.memoryGb * 1024)
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU / ${spec.memoryGb} GiB but the sandbox was granted ${granted.cpuCores} vCPU / ${granted.memoryMB} MiB`,
					};
				return { status: "honored" };
			},
			exec: async (sandbox, command, options?: ExecOptions) => {
				const { exitCode, stdout, stderr } = await sandbox.exec(
					`${TANGLE_TOOLCHAIN_PATH}${command}`,
					{
						timeoutMs: TANGLE_EXEC_TIMEOUT_MS,
						...(options?.signal && { signal: options.signal }),
					},
				);
				return { exitCode, stdout, stderr };
			},
			// Accepted only once the runtime returns a process id for the non-blocking spawn; timeout 0
			// leaves the deadline to the harness, which observes completion through its done-file.
			launch: async (sandbox, command) => {
				const spawned = await sandbox.process.spawn(`${TANGLE_TOOLCHAIN_PATH}${command}`, {
					timeoutMs: 0,
				});
				if (!Number.isSafeInteger(spawned.pid) || spawned.pid <= 0)
					throw new Error("Tangle spawn returned no process id");
			},
			// No files: the kit's shell fallback reads the done-file over the same exec, so a path is
			// never resolved against the runtime's workspace root.
		},
	};
}
