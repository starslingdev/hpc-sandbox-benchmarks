// Ascii Box (box.ascii.dev) — a computesdk-compatible provider driven DIRECTLY over the public Box
// REST API plus SSH, because no @computesdk/* wrapper exists for Box. The split mirrors what the
// wrappers do internally: REST for control-plane (create/get/list/stop/sshkey), an exec channel for
// runCommand + the sandbox filesystem.
//
// Why SSH is the exec channel: Box's REST exec endpoint (`POST /boxes/{id}/commands`) caps a command
// at timeoutSeconds ≤ 60 and returns buffered output — fine for probes, unusable for multi-minute
// suite steps or the tar|base64 results stream. SSH has no such cap, propagates the remote exit code,
// and keeps stdout/stderr separate, so `runCommand` is `ssh -T user@<ip> bash -s` with the command
// fed on stdin (never an argv element — quoting a script through Windows process spawning is a
// portability hazard, and stdin needs none).
//
// Key management: the adapter needs ONE ed25519 keypair, authorized per box via
// `POST /boxes/{id}/sshkey`. Resolution order: `ASCII_BOX_SSH_KEY` (path to an existing private key,
// public half at `<path>.pub`) → the Box CLI's managed key (`~/.ssh/ascii_box_ed25519`, already
// permission-correct on every platform) → an ephemeral keypair generated into the OS temp dir. The
// public key is registered on every created box before the handle resolves, so exec works the moment
// the harness's readiness loop probes it.
//
// Teardown is STOP, not delete: user-initiated hard delete is disabled platform-side (stopped boxes
// are archived and free — see handleBoxDelete in the Box backend), so `destroy()` is
// `POST /boxes/{id}/stop` and resolves at the 202 (archive proceeds asynchronously; billing stops
// with the machine). A fresh box can briefly refuse to stop while its first snapshot lands
// (`box_recent_snapshot_required`, 409) — destroy retries through that window.
import { execFileSync, spawn } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type {
	CommandResult,
	FileEntry,
	RunCommandOptions,
	SandboxFileSystem,
	SandboxInfo,
	SandboxInterface,
} from "computesdk";
import type { DirectProvider } from "./types.ts";

/** Default provider label stamped on the historical Hetzner-backed Box variant. */
const PROVIDER = "ascii-box";

/** Box control-plane machine provider values accepted by `box new --machine-provider`. */
export type BoxMachineProvider = "hetzner" | "cloudstack" | "baremetal";

/** Default control plane; overridable for a staging/dev backend (same env name the Box CLI uses). */
const DEFAULT_API_BASE = "https://ascii.dev/api/box/v1";

/** Box API states the adapter waits on / accepts. The full set is an AgentState enum server-side. */
const READY_STATES = new Set(["ready", "idle", "running"]);
const ERROR_STATE = "error";

/** Create→ready poll cadence and deadline. Fresh boxes provision in well under a minute typically;
 *  the deadline only guards a wedged control plane (the harness's own create-attempt timeout is the
 *  outer backstop, and destroys a late handle). */
const READY_POLL_MS = 2_000;
const READY_DEADLINE_MS = 8 * 60_000;

/** Retries for ssh-key registration + the first exec probe: a just-ready box can still be applying
 *  the key or scrubbing env (`box_restoring`/`box_securing`, retryable 409s), so the probe loop
 *  absorbs that window instead of failing the create. */
const PROBE_INTERVAL_MS = 2_500;
const PROBE_DEADLINE_MS = 3 * 60_000;

/** destroy() retries through the fresh-box snapshot guard (409) before giving up. */
const STOP_ATTEMPTS = 4;
const STOP_RETRY_DELAY_MS = 20_000;

/** Hard backstop per ssh process: the harness's own per-step withTimeout governs real budgets; this
 *  only reaps a child whose remote side hung without closing the channel. */
const SSH_BACKSTOP_MS = 30 * 60_000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Single-quote a path for safe embedding in the remote shell (same shape as the harness's shellQuote). */
function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Normalize a local path for ssh's `-i`: Windows OpenSSH accepts forward-slash paths, MSYS ssh needs them. */
function sshPath(p: string): string {
	return p.replace(/\\/g, "/");
}

/** An error from the Box REST API, carrying the HTTP status and the envelope's machine code. */
class BoxApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "BoxApiError";
	}
}

/** The slice of a serialized Box the adapter reads (the API envelope carries more; keep this minimal). */
interface BoxRecord {
	id: string;
	state: string;
	ip: string | null;
	sshEndpoint?: string | null;
	createdAt?: string;
}

/** One non-2xx-safe REST call. Returns the parsed envelope on success; throws BoxApiError otherwise. */
async function boxApi(
	apiKey: string,
	method: string,
	path: string,
	body?: unknown,
): Promise<Record<string, unknown>> {
	const base = process.env.BOX_API_URL ?? DEFAULT_API_BASE;
	const response = await fetch(`${base}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	const text = await response.text();
	let json: Record<string, unknown> = {};
	try {
		json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
	} catch {
		// A non-JSON body is only meaningful on the failure path; fall through to the status check.
	}
	if (!response.ok) {
		const err = (json.error ?? {}) as { code?: string; message?: string };
		const code = err.code ?? (typeof json.code === "string" ? json.code : "unknown");
		const message =
			err.message ?? (typeof json.message === "string" ? json.message : text.slice(0, 200));
		throw new BoxApiError(
			response.status,
			code,
			`Box API ${method} ${path} → ${response.status} ${code}: ${message}`,
		);
	}
	return json;
}

/** Unwrap the `box` member of an envelope (create/get return `{ …, box: {…} }`). */
function boxOf(json: Record<string, unknown>): BoxRecord {
	const box = (json.box ?? json) as BoxRecord;
	if (!box || typeof box.id !== "string" || typeof box.state !== "string") {
		throw new Error(
			`Box API returned an envelope without a box record: ${JSON.stringify(json).slice(0, 200)}`,
		);
	}
	return box;
}

/** The resolved SSH identity: a private key file usable by stock OpenSSH + its OpenSSH public line. */
interface SshIdentity {
	privateKeyPath: string;
	publicKey: string;
}

/** Concatenate byte arrays without Buffer (cross-runtime: the lint gate forbids Node-only globals). */
function concatBytes(parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((n, p) => n + p.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

/** Decode bytes as UTF-8 (TextDecoder is the cross-runtime `Buffer#toString("utf8")`). */
function utf8(bytes: Uint8Array): string {
	return new TextDecoder().decode(bytes);
}

/**
 * Resolve the SSH identity (see the module header for the order). Lazily generates the ephemeral
 * fallback keypair exactly once per process so every box in a run shares one identity.
 */
let cachedIdentity: SshIdentity | undefined;
function sshIdentity(): SshIdentity {
	if (cachedIdentity) return cachedIdentity;
	const override = process.env.ASCII_BOX_SSH_KEY;
	if (override) {
		cachedIdentity = {
			privateKeyPath: override,
			publicKey: readFileSync(`${override}.pub`, "utf8").trim(),
		};
		return cachedIdentity;
	}
	const cliKey = join(homedir(), ".ssh", "ascii_box_ed25519");
	if (existsSync(cliKey) && existsSync(`${cliKey}.pub`)) {
		// The Box CLI's managed key: already authorized for `box ssh` on this account and permission-
		// correct on Windows (an ephemeral key written by Node can fail the Windows OpenSSH ACL check).
		cachedIdentity = {
			privateKeyPath: cliKey,
			publicKey: readFileSync(`${cliKey}.pub`, "utf8").trim(),
		};
		return cachedIdentity;
	}
	const dir = mkdtempSync(join(tmpdir(), "ascii-box-bench-"));
	// Generate with ssh-keygen (ships with OpenSSH, which the adapter already requires): Node's
	// crypto can only export ed25519 as PKCS#8 PEM, which the OpenSSH client refuses ("invalid
	// format") — it wants its own "OPENSSH PRIVATE KEY" format, and ssh-keygen writes exactly that.
	const privateKeyPath = join(dir, "id_ed25519");
	execFileSync(
		"ssh-keygen",
		["-t", "ed25519", "-N", "", "-C", "ascii-box-bench", "-f", privateKeyPath],
		{
			stdio: "ignore",
		},
	);
	try {
		chmodSync(privateKeyPath, 0o600);
	} catch {
		// chmod is best-effort on Windows; the CLI-key branch above is the Windows path in practice.
	}
	cachedIdentity = {
		privateKeyPath,
		publicKey: readFileSync(`${privateKeyPath}.pub`, "utf8").trim(),
	};
	return cachedIdentity;
}

/** Shared ssh client config: non-interactive, no host-key prompts, host keys confined to a temp file. */
function sshBaseArgs(identity: SshIdentity): string[] {
	return [
		"-T",
		"-i",
		sshPath(identity.privateKeyPath),
		"-o",
		"IdentitiesOnly=yes",
		"-o",
		"StrictHostKeyChecking=no",
		"-o",
		`UserKnownHostsFile=${sshPath(join(tmpdir(), "ascii-box-bench-known-hosts"))}`,
		"-o",
		"BatchMode=yes",
		"-o",
		"LogLevel=ERROR",
		"-o",
		"ConnectTimeout=20",
		"-o",
		"ServerAliveInterval=30",
	];
}

function sshEndpointArgs(endpoint: string): string[] {
	const parts = endpoint.split(":");
	if (parts.length === 2 && /^\d+$/.test(parts[1] ?? "")) {
		return ["-p", parts[1] as string, `user@${parts[0]}`];
	}
	return [`user@${endpoint}`];
}

function connectEndpoint(box: BoxRecord): string | undefined {
	return box.sshEndpoint ?? box.ip ?? undefined;
}

/**
 * Run a command on the box over SSH: `ssh -T user@<ip> bash -s`, the command fed on stdin (see the
 * module header for why stdin, not argv). Resolves with stdout/stderr/exitCode — a non-zero exit is
 * NOT a rejection (the harness reads exit codes; 255 is ssh's own transport failure). Rejects only
 * when the ssh process itself can't run or the backstop fires.
 */
function sshExec(identity: SshIdentity, endpoint: string, command: string): Promise<CommandResult> {
	return new Promise((resolve, reject) => {
		const started = performance.now();
		const child = spawn(
			"ssh",
			[...sshBaseArgs(identity), ...sshEndpointArgs(endpoint), "bash -s"],
			{
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		const stdoutChunks: Uint8Array[] = [];
		const stderrChunks: Uint8Array[] = [];
		child.stdout.on("data", (chunk: Uint8Array) => stdoutChunks.push(chunk));
		child.stderr.on("data", (chunk: Uint8Array) => stderrChunks.push(chunk));
		const backstop = setTimeout(() => {
			child.kill("SIGKILL");
			reject(new Error(`ssh exec exceeded the ${SSH_BACKSTOP_MS / 60_000}min backstop`));
		}, SSH_BACKSTOP_MS);
		child.on("error", (err) => {
			clearTimeout(backstop);
			reject(new Error(`failed to spawn ssh: ${err.message}`));
		});
		child.on("close", (code) => {
			clearTimeout(backstop);
			resolve({
				stdout: utf8(concatBytes(stdoutChunks)),
				stderr: utf8(concatBytes(stderrChunks)),
				exitCode: code ?? 1,
				durationMs: Math.round(performance.now() - started),
			});
		});
		child.stdin.on("error", () => {
			// EPIPE when the remote side closes early (e.g. connection dropped): the close event still
			// resolves the call with ssh's exit code, which is the failure the harness should see.
		});
		child.stdin.write(command);
		child.stdin.end();
	});
}

/** runCommand with an optional stdin payload is not needed — writeFile goes through heredoc-free cat. */
function sshWrite(
	identity: SshIdentity,
	endpoint: string,
	path: string,
	content: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			"ssh",
			[...sshBaseArgs(identity), ...sshEndpointArgs(endpoint), `cat > ${shellQuote(path)}`],
			{ stdio: ["pipe", "ignore", "pipe"] },
		);
		const stderrChunks: Uint8Array[] = [];
		child.stderr.on("data", (chunk: Uint8Array) => stderrChunks.push(chunk));
		child.on("error", (err) => reject(new Error(`failed to spawn ssh: ${err.message}`)));
		child.on("close", (code) => {
			if (code === 0) resolve();
			else
				reject(
					new Error(
						`writeFile(${path}) failed with exit ${code}: ${utf8(concatBytes(stderrChunks)).slice(0, 200)}`,
					),
				);
		});
		child.stdin.on("error", () => {});
		child.stdin.write(content);
		child.stdin.end();
	});
}

/** Teardown = stop (archive). Resolves at the 202 — see the module header for why not delete, and
 *  why not waiting for `archived` (the snapshot upload is not the machine's billing lifetime). */
async function stopBox(apiKey: string, sandboxId: string): Promise<void> {
	for (let attempt = 1; ; attempt++) {
		try {
			await boxApi(apiKey, "POST", `/boxes/${sandboxId}/stop`);
			return;
		} catch (err) {
			// Already gone counts as destroyed; a refusing fresh box (snapshot guard 409) is retried.
			if (err instanceof BoxApiError && err.status === 404) return;
			if (!(err instanceof BoxApiError && err.status === 409) || attempt >= STOP_ATTEMPTS) {
				throw err;
			}
			await delay(STOP_RETRY_DELAY_MS);
		}
	}
}

/** A live Box sandbox: runCommand/filesystem over SSH, info/destroy over REST. */
class BoxSandbox implements SandboxInterface {
	readonly provider: string;
	readonly filesystem: SandboxFileSystem;

	constructor(
		readonly sandboxId: string,
		provider: string,
		private readonly apiKey: string,
		private readonly identity: SshIdentity,
		private endpoint: string,
	) {
		this.provider = provider;
		this.filesystem = {
			readFile: async (path) => {
				const result = await sshExec(this.identity, this.endpoint, `cat -- ${shellQuote(path)}`);
				if (result.exitCode !== 0) {
					throw new Error(
						`readFile(${path}) failed with exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
					);
				}
				return result.stdout;
			},
			writeFile: (path, content) => sshWrite(this.identity, this.endpoint, path, content),
			readdir: async (path) => {
				// GNU find on the Ubuntu image: name, type char, size — one line per entry.
				const result = await sshExec(
					this.identity,
					this.endpoint,
					`find ${shellQuote(path)} -mindepth 1 -maxdepth 1 -printf '%f\\t%y\\t%s\\n'`,
				);
				if (result.exitCode !== 0) {
					throw new Error(
						`readdir(${path}) failed with exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
					);
				}
				const entries: FileEntry[] = [];
				for (const line of result.stdout.split("\n")) {
					const [name, type, size] = line.split("\t");
					if (!name || (type !== "f" && type !== "d")) continue;
					entries.push({
						name,
						type: type === "d" ? "directory" : "file",
						size: Number(size) || 0,
					});
				}
				return entries;
			},
			mkdir: async (path) => {
				const result = await sshExec(
					this.identity,
					this.endpoint,
					`mkdir -p -- ${shellQuote(path)}`,
				);
				if (result.exitCode !== 0) {
					throw new Error(
						`mkdir(${path}) failed with exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
					);
				}
			},
			exists: async (path) => {
				const result = await sshExec(this.identity, this.endpoint, `test -e ${shellQuote(path)}`);
				return result.exitCode === 0;
			},
			remove: async (path) => {
				const result = await sshExec(this.identity, this.endpoint, `rm -rf -- ${shellQuote(path)}`);
				if (result.exitCode !== 0) {
					throw new Error(
						`remove(${path}) failed with exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
					);
				}
			},
		};
	}

	/** Execute a shell command. `options.background` needs no special handling: the harness's detached
	 *  steps self-background via nohup double-fork with all fds redirected, so the ssh round-trip
	 *  returns as soon as the launcher exits either way. */
	async runCommand(command: string, _options?: RunCommandOptions): Promise<CommandResult> {
		return sshExec(this.identity, this.endpoint, command);
	}

	async getInfo(): Promise<SandboxInfo> {
		const box = boxOf(await boxApi(this.apiKey, "GET", `/boxes/${this.sandboxId}`));
		this.endpoint = connectEndpoint(box) ?? this.endpoint;
		return {
			id: this.sandboxId,
			provider: PROVIDER,
			status:
				box.state === ERROR_STATE
					? "error"
					: box.state === "archived" || box.state === "archiving"
						? "stopped"
						: "running",
			createdAt: box.createdAt ? new Date(box.createdAt) : new Date(),
			timeout: 0,
			metadata: { state: box.state, ip: box.ip, sshEndpoint: box.sshEndpoint },
		};
	}

	async getUrl(options: { port: number; protocol?: string }): Promise<string> {
		return `${options.protocol ?? "http"}://${this.endpoint}:${options.port}`;
	}

	/** Teardown = stop (archive) — see {@link stopBox}. */
	async destroy(): Promise<void> {
		await stopBox(this.apiKey, this.sandboxId);
	}
}

/**
 * A computesdk-compatible provider for Ascii Box. Construction is lazy-credentialed like every other
 * factory (the harness gates on BOX_API_KEY via requiredEnvVars before this is ever called).
 */
export function asciiBoxCompute(options: {
	apiKey: string | undefined;
	providerName?: string;
	machineProvider?: BoxMachineProvider;
}): DirectProvider {
	const { apiKey, providerName = PROVIDER, machineProvider = "hetzner" } = options;
	if (!apiKey) {
		throw new Error("BOX_API_KEY is required to construct the ascii-box provider");
	}
	const identity = sshIdentity();

	const createSandbox = async (): Promise<BoxSandbox> => {
		const created = boxOf(
			await boxApi(apiKey, "POST", "/boxes", {
				// No auto-stop: a suite's lifetime is governed by the harness's guaranteed teardown, and a
				// TTL firing mid-suite would kill the benchmark. noEnv: no account secrets in the sandbox.
				ttlSeconds: null,
				noEnv: true,
				machineProvider,
			}),
		);

		// Poll until the box is usable. The state machine is provisioning → (provisioned) → ready.
		const deadline = Date.now() + READY_DEADLINE_MS;
		let box = created;
		for (;;) {
			if (READY_STATES.has(box.state)) break;
			if (box.state === ERROR_STATE) {
				throw new Error(`Box ${box.id} entered the error state while provisioning`);
			}
			if (Date.now() > deadline) {
				throw new Error(
					`Box ${box.id} was still "${box.state}" after ${READY_DEADLINE_MS / 60_000}min`,
				);
			}
			await delay(READY_POLL_MS);
			box = boxOf(await boxApi(apiKey, "GET", `/boxes/${created.id}`));
		}
		const endpoint = connectEndpoint(box);
		if (!endpoint) {
			throw new Error(`Box ${box.id} is ${box.state} but has no SSH endpoint yet`);
		}

		// Authorize the run's SSH key, then probe exec until it works: a just-ready box can still be
		// applying the key or scrubbing env (retryable 409s), and the harness's suite path runs its
		// first step immediately — it has no readiness loop of its own.
		const probeDeadline = Date.now() + PROBE_DEADLINE_MS;
		for (;;) {
			try {
				await boxApi(apiKey, "POST", `/boxes/${box.id}/sshkey`, { key: identity.publicKey });
				const probe = await sshExec(identity, endpoint, "echo ok");
				if (probe.exitCode === 0) break;
				throw new Error(`ssh probe exit ${probe.exitCode}: ${probe.stderr.slice(0, 120)}`);
			} catch (err) {
				if (Date.now() > probeDeadline) {
					throw new Error(
						`Box ${box.id} never accepted the SSH key/probe within ${PROBE_DEADLINE_MS / 60_000}min: ${
							err instanceof Error ? err.message : String(err)
						}`,
					);
				}
				await delay(PROBE_INTERVAL_MS);
			}
		}

		return new BoxSandbox(box.id, providerName, apiKey, identity, endpoint);
	};

	return {
		name: providerName,
		sandbox: {
			create: () => createSandbox(),
			getById: async (sandboxId) => {
				try {
					const box = boxOf(await boxApi(apiKey, "GET", `/boxes/${sandboxId}`));
					const endpoint = connectEndpoint(box);
					if (!endpoint || !READY_STATES.has(box.state)) return null;
					return new BoxSandbox(box.id, providerName, apiKey, identity, endpoint);
				} catch (err) {
					// Only a genuinely missing box is null; auth/network failures must surface.
					if (err instanceof BoxApiError && err.status === 404) return null;
					throw err;
				}
			},
			// One page is deliberate: the lifecycle benchmark times ONE control-plane list round-trip.
			list: async () => {
				const json = await boxApi(apiKey, "GET", "/boxes?limit=100");
				const boxes = Array.isArray(json.boxes) ? (json.boxes as BoxRecord[]) : [];
				return boxes
					.filter((box) => typeof box?.id === "string" && connectEndpoint(box))
					.map(
						(box) =>
							new BoxSandbox(
								box.id,
								providerName,
								apiKey,
								identity,
								connectEndpoint(box) as string,
							),
					);
			},
			destroy: async (sandboxId) => {
				await stopBox(apiKey, sandboxId);
			},
		},
		// No snapshot manager: Box snapshots are automatic (on stop / periodic), with no create-on-demand
		// API, so the lifecycle snapshot probe records a clean capability skip.
	};
}
