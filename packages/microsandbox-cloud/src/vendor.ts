// Microsandbox Cloud's vendor adapter: translation only. It receives the SDK's `Sandbox` statics and
// backend selector and states what they mean in the vendor port's terms: the OCI image boot, the
// caller-chosen name as identity and marker, stop-before-remove, and an agent connection that is
// re-established but never replayed. Readiness, cleanup confirmation, recovery and inventory live in
// the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// The control-plane credential lives only in the SDK backend selected around each call; it never
// enters create options, labels, or the guest environment.

import { posix as posixPath } from "node:path";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import { shellQuote } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { LEAK_EXPIRY_MS, markerSpelling } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";
import type {
	DefaultBackend,
	Sandbox as MsbSandbox,
	SandboxHandle as MsbSandboxHandle,
	withDefaultBackend,
} from "microsandbox";
import {
	CloudHttpError,
	HttpError,
	InvalidConfigError,
	IoError,
	ProtocolError,
	SandboxNotFoundError,
} from "microsandbox";

/** The SDK surface the adapter translates; the package entry passes the real module's members. */
export interface MicrosandboxSdk {
	readonly Sandbox: Pick<typeof MsbSandbox, "builder" | "get" | "listWith" | "remove">;
	readonly withDefaultBackend: typeof withDefaultBackend;
}

/** Every benchmark sandbox is named this way; the name IS the vendor id and the ownership marker. */
const MICROSANDBOX_NAME_PREFIX = "bench-cloud-";
/** The sandbox name spells the kit marker's attempt UUID under the benchmark prefix. */
export const MICROSANDBOX_NAME = markerSpelling(MICROSANDBOX_NAME_PREFIX);
export const MICROSANDBOX_SANDBOX_ID = type(
	/^bench-cloud-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
);
/** Vendor-console label written on every create; ownership keys on the name shape. */
export const MICROSANDBOX_LABEL_MARKER = "sandbox-benchmarks.provider";
/**
 * How long teardown waits for a requested stop before removing anyway. A guest whose agent died
 * never finishes stopping (observed live: records held `draining` for 19 h, past their maxDuration),
 * while remove() accepts a draining record. Well inside the harness's 15 s exit-cleanup budget.
 */
export const MICROSANDBOX_STOP_WAIT_MS = 10_000;

/** One record; a create's record also carries the connected sandbox it returned. */
interface MicrosandboxRow {
	readonly name: string;
	readonly status: string;
	readonly sandbox?: MsbSandbox;
}

/**
 * Only `running` is usable. A stopped, draining, crashed, or undocumented record is still an
 * account resource (failed: stopped and removed, never released): remove() is the only transition
 * that makes a record disappear, and a draining stop can wedge forever, so none of them is awaited.
 */
const phaseOf = (status: string): Phase => (status === "running" ? "ready" : "failed");

function record(row: MicrosandboxRow): VendorRecord<MicrosandboxRow> {
	const marker = MICROSANDBOX_SANDBOX_ID.allows(row.name)
		? MICROSANDBOX_NAME.fromVendor(row.name)
		: undefined;
	return { id: row.name, phase: phaseOf(row.status), ...(marker && { marker }), raw: row };
}

/**
 * Did the agent CONNECTION fail, rather than the guest rejecting the operation? Only a transport
 * fault makes a reconnect meaningful: a missing path or a vanished record reproduces identically
 * after one, so retrying it only spends a get+connect round trip — and under the detached poll
 * loop, whose calls are individually bounded, that latency can turn a benign miss into a counted
 * poll failure.
 */
const isConnectionError = (error: unknown) =>
	error instanceof IoError ||
	error instanceof HttpError ||
	error instanceof CloudHttpError ||
	error instanceof ProtocolError;

async function execShell(sandbox: MsbSandbox, command: string) {
	const output = await sandbox.execWith("/bin/sh", (builder) => builder.args(["-c", command]));
	return { exitCode: output.code, stdout: output.stdout(), stderr: output.stderr() };
}

/**
 * The SDK reports one allocation in two shapes (observed live on 0.6.8): a listed record's config
 * carries `resources.{vcpus,memoryMib,diskSizeMib}`, a live sandbox's config carries
 * `resources.{cpus,memoryMib}` with the managed root disk under `image.Oci.rootDisk.sizeMib`.
 */
const allocatedResources = type({
	resources: {
		"cpus?": "number > 0",
		"vcpus?": "number > 0",
		memoryMib: "number > 0",
		"diskSizeMib?": "number > 0",
	},
	"image?": { "Oci?": { "rootDisk?": { kind: "string", "sizeMib?": "number > 0" } } },
});

export function microsandboxVendor(
	sdk: MicrosandboxSdk,
	{ env, resolvedArtifact }: Pick<DriverContext<"microsandbox-cloud">, "env" | "resolvedArtifact">,
) {
	// Omitting the URL delegates to the SDK's production default; the property stays absent rather
	// than undefined so the backend selection shape is explicit.
	const backend: DefaultBackend =
		env.MSB_API_URL === undefined
			? { kind: "cloud", apiKey: env.MSB_API_KEY }
			: { kind: "cloud", url: env.MSB_API_URL, apiKey: env.MSB_API_KEY };
	const { Sandbox } = sdk;
	const inBackend = <T>(work: () => Promise<T>) => sdk.withDefaultBackend(backend, work);

	/**
	 * The create returns a connected agent session. A connection that dies mid-run must not silently
	 * boot a replacement guest: a sandbox that died must surface as lost, not answer every done-file
	 * poll with "not yet" from an empty VM.
	 */
	function connection(name: string, sandbox: MsbSandbox) {
		let connected = sandbox;
		let staleAfterCommand = false;
		const reconnect = () =>
			inBackend(async () => {
				const current = await Sandbox.get(name);
				if (current.status !== "running")
					throw new Error(
						`Microsandbox sandbox "${name}" is ${current.status}, not running; refusing to reboot it`,
					);
				return current.connect();
			});
		// Idempotent filesystem operations may retry once after a CONNECTION failure.
		const withReconnect = async <T>(operation: (current: MsbSandbox) => Promise<T>) => {
			try {
				return await operation(connected);
			} catch (error) {
				if (!isConnectionError(error)) throw error;
				connected = await reconnect();
				return operation(connected);
			}
		};
		return {
			name,
			config: () => connected.config(),
			// The agent may have accepted a command before its connection failed. Reconnect for the
			// NEXT command, but never replay this one: setup mutations and detached launches are not
			// idempotent. Throwing (not a synthesized exit) keeps a never-started launch from being
			// polled for until the step's whole budget expires.
			exec: async (command: string) => {
				if (staleAfterCommand) {
					connected = await reconnect();
					staleAfterCommand = false;
				}
				try {
					return await execShell(connected, command);
				} catch (error) {
					if (isConnectionError(error)) staleAfterCommand = true;
					throw error;
				}
			},
			read: (path: string) => withReconnect((current) => current.fs().readToString(path)),
			exists: (path: string) => withReconnect((current) => current.fs().exists(path)),
			write: async (path: string, content: string) => {
				const parent = posixPath.dirname(path);
				if (parent && parent !== "/" && parent !== ".") {
					const result = await execShell(connected, `mkdir -p ${shellQuote(parent)}`);
					if (result.exitCode !== 0)
						throw new Error(`Microsandbox mkdir failed for ${parent}: ${result.stderr}`);
				}
				await withReconnect((current) => current.fs().write(path, content));
			},
		};
	}

	/** Settle on a stop, or give up quietly after the bound: the remove() that follows is the verdict. */
	async function waitForStop(handle: MsbSandboxHandle): Promise<void> {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const stopped = handle.waitUntilStopped();
		// The race still sees an early rejection (a vanished ephemeral record); a late one is moot.
		stopped.catch(() => {});
		try {
			await Promise.race([
				stopped,
				new Promise<void>((resolve) => {
					timer = setTimeout(resolve, MICROSANDBOX_STOP_WAIT_MS);
				}),
			]);
		} finally {
			clearTimeout(timer);
		}
	}

	const vendor: Vendor<MicrosandboxRow, ReturnType<typeof connection>> = {
		control: {
			// `create` returns only once the sandbox is RUNNING (the image pull happens inside it).
			create: ({ request, marker }) => {
				const name = MICROSANDBOX_NAME.toVendor(marker);
				return inBackend(async () => {
					let builder = Sandbox.builder(name).image(resolvedArtifact.ref);
					if (request.spec.diskGb !== undefined)
						builder = builder.rootDisk(request.spec.diskGb * 1024);
					builder = builder
						.cpus(request.spec.vcpus)
						.memory(request.spec.memoryGb * 1024)
						.maxDuration(LEAK_EXPIRY_MS / 1000)
						.detached(true)
						// Ephemeral: state is deleted when the sandbox stops, so a stopped leftover holds nothing.
						.ephemeral(true)
						.label(MICROSANDBOX_LABEL_MARKER, "microsandbox-cloud");
					if (request.env !== undefined && Object.keys(request.env).length > 0)
						builder = builder.envs(request.env);
					return record({ name, status: "running", sandbox: await builder.create() });
				});
			},
			get: async (name) => record(await inBackend(() => Sandbox.get(name))),
			/**
			 * Stop, then remove. Microsandbox Cloud can persist a status=error record before create
			 * rejects, remove() is documented for STOPPED sandboxes only, and transitional or
			 * undocumented statuses do occur, so anything not already stopped is stopped first or the
			 * remove rejects and the microVM leaks. A `draining` record already has a stop in flight and
			 * refuses another (HTTP 409); remove() follows a bounded wait either way. The whole sequence
			 * converges on the SDK's typed absence: an ephemeral record disappears the moment its stop
			 * completes, so any step can be the one that first sees not-found.
			 */
			remove: async (name, { current }) => {
				// The kit's read is this adapter's `get`, whose record is the SDK's own handle.
				const handle = (await current())?.raw as MsbSandboxHandle | undefined;
				if (handle === undefined) return "removed";
				await inBackend(async () => {
					if (handle.status !== "stopped") {
						if (handle.status !== "draining") await handle.requestStop();
						await waitForStop(handle);
					}
					await Sandbox.remove(name);
				});
				return "removed";
			},
			// The SDK's typed absence, at any step of the remove sequence.
			absent: (error) => error instanceof SandboxNotFoundError,
			// A stopped record is still an account resource (ours to remove, theirs to block on).
			page: (cursor) =>
				inBackend(async () => {
					const page = await Sandbox.listWith((list) =>
						cursor === undefined ? list.limit(100) : list.limit(100).cursor(cursor),
					);
					const records = page.sandboxes.map(record);
					return page.nextCursor ? { records, next: page.nextCursor } : { records };
				}),
			// Only a configuration the SDK refused before contacting the control plane proves nothing
			// was allocated. The SDK types no capacity refusal, so no create is ever marked retryable:
			// vendor prose must never manufacture a retry decision.
			refused: (error) => (error instanceof InvalidConfigError ? { retryable: false } : undefined),
		},
		data: {
			attach: ({ id, raw }) => {
				if (!raw.sandbox)
					throw new Error("Microsandbox attaches only the sandbox its create returned");
				return connection(id, raw.sandbox);
			},
			/**
			 * Prove the control plane allocated what the request mapped, from the sandbox's own config
			 * rather than an in-guest `df`: a managed root disk of N MiB formats to slightly less than N
			 * MiB of filesystem, so a capacity probe would refuse every correctly-sized allocation.
			 */
			prepare: async ({ native }, { spec }) => {
				const config = allocatedResources.assert(await native.config());
				const vcpus = config.resources.cpus ?? config.resources.vcpus;
				const { memoryMib } = config.resources;
				if (vcpus !== spec.vcpus || memoryMib !== spec.memoryGb * 1024)
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU / ${spec.memoryGb} GiB but the allocation reports ${vcpus ?? "unknown"} vCPU / ${memoryMib} MiB`,
					};
				if (spec.diskGb === undefined) return { status: "honored" };
				const rootDisk = config.image?.Oci?.rootDisk;
				const diskSizeMib =
					config.resources.diskSizeMib ??
					(rootDisk?.kind === "managed" ? rootDisk.sizeMib : undefined);
				if (diskSizeMib === undefined)
					throw new Error("Microsandbox reported no managed root disk for the allocation");
				return diskSizeMib >= spec.diskGb * 1024
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `requested ${spec.diskGb} GiB but the allocation reports a ${diskSizeMib} MiB root disk`,
						};
			},
			exec: (native, command) => native.exec(command),
			files: {
				read: (native, path) => native.read(path),
				exists: (native, path) => native.exists(path),
				write: (native, path, text) => native.write(path, text),
			},
		},
	};
	return vendor;
}
