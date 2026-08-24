// Freestyle (freestyle.sh) — a computesdk-compatible provider driven DIRECTLY over the official
// `freestyle` SDK, NOT the `@computesdk/freestyle` wrapper. Two reasons: the wrapper's
// `@computesdk/provider` chain requires `daemond` (OS-gated to Linux/macOS, uninstallable on this
// repo's Windows dev host), and it pins the legacy `freestyle-sandboxes` SDK whose default API
// host (api.freestyle.sh/v1) no longer accepts current API keys — the live API is v5 on
// beta-api.freestyle.sh, which only the current `freestyle` package speaks. Same precedent as
// ascii-box.ts: a local adapter implementing computesdk's SandboxInterface structurally, with
// computesdk used for types only.
//
// The SDK covers the whole surface the harness needs: `vm.exec` for runCommand (buffered
// stdout/stderr + statusCode, timeoutMs capped at 300s server-side), `vm.fs` for the sandbox
// filesystem, and the vms namespace for the control plane (create/get/list/delete). The schema
// transport conservatively declares a 60s sync budget and lets long steps take the harness's
// detached+poll path (nohup + done-file over vm.fs) — the same policy as Daytona/Blaxel.
//
// Sizing: the platform default VM is already exactly the target spec's compute axes (4 vCPU /
// 8 GiB), and CreateVmOptions exposes no sizing knobs (resize is grow-only), so create pins
// nothing — the in-sandbox spec probe verifies the axes like every provider. Disk is the default
// 16 GB: per-plan ceilings (Free 16 / Hobby 32 / Pro 64 GB) make the 40 GB target un-creatable
// below Pro, and disk is a coverage-gate axis, not part of the compute-match verdict. cpu-node
// needs ~5 GiB.
//
// Firewall is REQUIRED at create ("a VM gets nothing implicitly"), so the adapter states the one
// rule the benchmark needs: unrestricted outbound to the public internet (PTS downloads its
// harness deps on first use). No inbound rule — exec/fs ride the control plane, not guest ports.
//
// Teardown is DELETE (vms.delete), not stop: a stopped persistent VM keeps counting as a saved VM
// against the plan's budget, and the benchmark never resumes a sandbox after a cell.
import type {
	CommandResult,
	FileEntry,
	RunCommandOptions,
	SandboxFileSystem,
	SandboxInfo,
	SandboxInterface,
} from "computesdk";
import type { Vm } from "freestyle";
import { Freestyle, FreestyleApiError } from "freestyle";
import type { DirectProvider } from "./types.ts";

/** Provider label stamped on every sandbox handle (computesdk's Sandbox.provider). */
const PROVIDER = "freestyle";

/** Create→running poll cadence and deadline. Fresh VMs boot in seconds typically; the deadline
 *  only guards a wedged control plane (the harness's own create-attempt timeout is the outer
 *  backstop, and destroys a late handle). */
const READY_POLL_MS = 2_000;
const READY_DEADLINE_MS = 8 * 60_000;

/** Exec-probe cadence/deadline after the VM reports running: the first exec can still race VM
 *  userspace bring-up, and the harness's suite path runs its first step immediately — it has no
 *  readiness loop of its own. */
const PROBE_INTERVAL_MS = 2_500;
const PROBE_DEADLINE_MS = 3 * 60_000;

/** Headroom passed to vm.exec on synchronous commands. The harness budgets sync steps under the
 *  schema transport's 60s syncCapMs (longer steps self-background via detached+poll), so 120s is
 *  a safety bound well inside the API's 300s cap — the harness's per-step withTimeout governs. */
const EXEC_TIMEOUT_MS = 120_000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Single-quote a string for safe embedding in a remote shell (same shape as the harness's shellQuote). */
function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Is this error the API's VM-not-found (the only miss getById/destroy treat as benign)? */
function isVmNotFound(err: unknown): boolean {
	return err instanceof FreestyleApiError && err.status === 404;
}

/** A live Freestyle VM: runCommand via vm.exec, filesystem via vm.fs, info/destroy over the vms API. */
class FreestyleSandbox implements SandboxInterface {
	readonly provider = PROVIDER;
	readonly filesystem: SandboxFileSystem;

	constructor(
		readonly sandboxId: string,
		private readonly client: Freestyle,
		private readonly vm: Vm,
		private readonly publicIpv6: string | null,
	) {
		this.filesystem = {
			readFile: async (path) => {
				return this.vm.fs.readTextFile(path);
			},
			writeFile: async (path, content) => {
				await this.vm.fs.writeTextFile(path, content);
			},
			readdir: async (path) => {
				const entries = await this.vm.fs.readDir(path);
				// DirEntry carries no size; FileEntry.size is optional, so skip the N stat calls.
				const out: FileEntry[] = [];
				for (const entry of entries) {
					if (entry.kind === "symlink") continue;
					out.push({ name: entry.name, type: entry.kind === "directory" ? "directory" : "file" });
				}
				return out;
			},
			mkdir: async (path) => {
				await this.vm.fs.mkdir(path);
			},
			exists: async (path) => {
				return this.vm.fs.exists(path);
			},
			remove: async (path) => {
				await this.vm.fs.remove(path);
			},
		};
	}

	/** Execute a shell command. Runs through `bash -lc` for parity with the other providers' shell
	 *  semantics (login-shell PATH: the toolchain installer drops shims under ~/.local and /etc
	 *  profile.d). `options.background` needs no special handling: the harness's detached steps
	 *  self-background via nohup double-fork with all fds redirected, so the exec round-trip returns
	 *  as soon as the launcher exits either way. */
	async runCommand(command: string, _options?: RunCommandOptions): Promise<CommandResult> {
		const started = performance.now();
		const result = await this.vm.exec({
			command: `bash -lc ${shellQuote(command)}`,
			timeoutMs: EXEC_TIMEOUT_MS,
		});
		return {
			stdout: result.stdout ?? "",
			stderr: result.stderr ?? "",
			// statusCode is null when the command was killed by its timeout; map to 1 so a lost status
			// can never masquerade as success.
			exitCode: result.statusCode ?? 1,
			durationMs: performance.now() - started,
		};
	}

	async getInfo(): Promise<SandboxInfo> {
		const data = await this.vm.data();
		return {
			id: this.sandboxId,
			provider: PROVIDER,
			status:
				data.state === "stopped" || data.state === "paused" || data.state === "pausing"
					? "stopped"
					: "running",
			createdAt: new Date(data.createdAt),
			timeout: 0,
			metadata: { state: data.state, resources: data.resources },
		};
	}

	async getUrl(options: { port: number; protocol?: string }): Promise<string> {
		if (!this.publicIpv6) throw new Error(`Freestyle VM ${this.sandboxId} has no public IPv6`);
		return `${options.protocol ?? "https"}://[${this.publicIpv6}]:${options.port}`;
	}

	/** Teardown = delete — see the module header for why not stop. */
	async destroy(): Promise<void> {
		try {
			await this.client.vms.delete(this.sandboxId);
		} catch (err) {
			// Already gone counts as destroyed.
			if (!isVmNotFound(err)) throw err;
		}
	}
}

/**
 * A computesdk-compatible provider for Freestyle. Construction is lazy-credentialed like every
 * other factory (the harness gates on FREESTYLE_API_KEY via requiredEnvVars before this is ever
 * called).
 */
export function freestyleCompute(apiKey: string | undefined): DirectProvider {
	if (!apiKey) {
		throw new Error("FREESTYLE_API_KEY is required to construct the freestyle provider");
	}
	const client = new Freestyle({ apiKey });

	const createSandbox = async (): Promise<FreestyleSandbox> => {
		const created = await client.vms.create({
			// Required — a VM gets nothing implicitly. The one rule the benchmark needs: unrestricted
			// outbound (PTS downloads its harness deps on first use). No inbound: exec/fs ride the
			// control plane, not guest ports.
			firewall: { rules: [{ action: "allow", source: {}, destination: { public: true } }] },
		});

		// Poll until the VM is usable. The state machine is starting → running.
		const deadline = Date.now() + READY_DEADLINE_MS;
		let data = created.data;
		for (;;) {
			if (data.state === "running") break;
			if (Date.now() > deadline) {
				throw new Error(
					`Freestyle VM ${created.vmId} was still "${data.state}" after ${READY_DEADLINE_MS / 60_000}min`,
				);
			}
			await delay(READY_POLL_MS);
			data = await created.vm.data();
		}

		// Probe exec until it works: a just-running VM can still be finishing userspace bring-up, and
		// the harness's suite path runs its first step immediately.
		const sandbox = new FreestyleSandbox(created.vmId, client, created.vm, data.publicIpv6 ?? null);
		const probeDeadline = Date.now() + PROBE_DEADLINE_MS;
		for (;;) {
			try {
				const probe = await sandbox.runCommand("echo ok");
				if (probe.exitCode === 0) break;
				throw new Error(`exec probe exit ${probe.exitCode}: ${probe.stderr.slice(0, 120)}`);
			} catch (err) {
				if (Date.now() > probeDeadline) {
					throw new Error(
						`Freestyle VM ${created.vmId} never accepted an exec probe within ${PROBE_DEADLINE_MS / 60_000}min: ${
							err instanceof Error ? err.message : String(err)
						}`,
					);
				}
				await delay(PROBE_INTERVAL_MS);
			}
		}

		return sandbox;
	};

	return {
		name: PROVIDER,
		sandbox: {
			create: () => createSandbox(),
			getById: async (sandboxId) => {
				try {
					const data = await client.vms.get(sandboxId);
					if (data.state !== "running") return null;
					return new FreestyleSandbox(
						sandboxId,
						client,
						client.vms.ref(sandboxId),
						data.publicIpv6 ?? null,
					);
				} catch (err) {
					// Only a genuinely missing VM is null; auth/network failures must surface.
					if (isVmNotFound(err)) return null;
					throw err;
				}
			},
			// One page is deliberate: the lifecycle benchmark times ONE control-plane list round-trip.
			list: async () => {
				const { vms } = await client.vms.list({ state: "running" });
				return vms.map(
					(data) =>
						new FreestyleSandbox(data.id, client, client.vms.ref(data.id), data.publicIpv6 ?? null),
				);
			},
			destroy: async (sandboxId) => {
				try {
					await client.vms.delete(sandboxId);
				} catch (err) {
					if (!isVmNotFound(err)) throw err;
				}
			},
		},
		// No snapshot manager: Freestyle snapshots exist but the harness's lifecycle snapshot probe
		// isn't wired through this direct adapter yet, so it records a clean capability skip.
	};
}
