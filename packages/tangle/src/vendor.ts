// The Tangle Sandbox adapter over @tangle-network/sandbox. Probed live (2026-11-14): commands run
// as uid 1000 with no passwd entry and a Nix-first PATH, and /usr/share is read-only, so `prepare`
// gives PTS writable state and code under HOME and every command carries the prefix below.

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

export const TANGLE_NAME = markerSpelling("sandbox-benchmarks-");
export const CONTROL_TIMEOUT_MS = 30_000;
/** The create blocks until running; a cold pull of the toolchain image needs well over the SDK's 120s. */
export const CREATE_TIMEOUT_MS = 15 * 60_000;

/**
 * PTS resolves its default state through getpwuid (no entry here) and the image filesystem is
 * read-only, so state and installs live under HOME (PTS_STATE_SELECT_SH leaves them alone). The
 * writable PTS copy comes first so its parser can be patched; the image toolchain precedes Nix.
 */
const PREFIX =
	'export PATH="$HOME/.local/pts/bin:/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH" ' +
	'PTS_USER_PATH_OVERRIDE="$HOME/.phoronix-test-suite/" PTS_TEST_INSTALL_ROOT_PATH="$HOME/.phoronix-test-suite/installed-tests/"; ';

/**
 * Idempotent: a writable copy of the baked installs (several profiles rebuild or write in their
 * own directory), and a PTS code copy whose launcher points at itself.
 */
export const TANGLE_PTS_PREFLIGHT = [
	"set -eu",
	'state="$HOME/.phoronix-test-suite"',
	'mkdir -p "$state"',
	'[ -d "$state/installed-tests" ] || cp -R /var/lib/phoronix-test-suite/installed-tests "$state/"',
	'pts="$HOME/.local/pts"',
	'if [ ! -x "$pts/bin/phoronix-test-suite" ]; then',
	'  rm -rf "$pts" && mkdir -p "$pts/bin" "$pts/share"',
	'  cp -R /usr/share/phoronix-test-suite "$pts/share/"',
	`  sed "s#^export PTS_DIR='/usr/share/phoronix-test-suite/'#export PTS_DIR='$pts/share/phoronix-test-suite/'#" /usr/bin/phoronix-test-suite > "$pts/bin/phoronix-test-suite"`,
	`  grep -qF "PTS_DIR='$pts/share/" "$pts/bin/phoronix-test-suite"`,
	'  chmod 755 "$pts/bin/phoronix-test-suite"',
	"fi",
	'"$pts/bin/phoronix-test-suite" version',
].join("\n");

function phaseOf(status: string): Phase {
	if (status === "running") return "ready";
	if (status === "pending" || status === "provisioning") return "pending";
	return status === "deleted" ? "gone" : "failed";
}

function record(sandbox: SandboxInstance): VendorRecord<SandboxInstance> {
	const marker = TANGLE_NAME.fromVendor(sandbox.name ?? "");
	return {
		id: sandbox.id,
		phase: phaseOf(sandbox.status),
		...(marker !== undefined && { marker }),
		...(sandbox.status === "stopped" && { stopped: true }),
		raw: sandbox,
	};
}

const status = httpStatus(SandboxError, (error) => error.status);
const http = httpClassifiers(status);

export function tangleVendor(
	client: Pick<Sandbox, "createIsolated" | "get" | "list">,
	{ resolvedArtifact }: Pick<DriverContext<"tangle">, "resolvedArtifact">,
): Vendor<SandboxInstance, SandboxInstance> {
	const exec = async (sandbox: SandboxInstance, command: string, options?: ExecOptions) => {
		const { exitCode, stdout, stderr } = await sandbox.exec(PREFIX + command, {
			timeoutMs: 600_000, // the runtime's per-command ceiling; the harness owns step deadlines
			...(options?.signal && { signal: options.signal }),
		});
		return { exitCode, stdout, stderr };
	};
	return {
		control: {
			create: async ({ request: { spec }, marker }, { signal }) => {
				const name = TANGLE_NAME.toVendor(marker);
				return record(
					await client.createIsolated(
						{
							name,
							idempotencyKey: name,
							environment: resolvedArtifact.ref,
							agent: false,
							ephemeral: true,
							resources: {
								cpuCores: spec.vcpus,
								memoryMB: spec.memoryGb * 1024,
								...(spec.diskGb !== undefined && { diskGB: spec.diskGb }),
							},
							// Omitted egress still blocks some hosts (nodejs.org, binaries.prisma.sh).
							egressPolicy: { mode: "open" },
							maxLifetimeSeconds: LEAK_EXPIRY_MS / 1000,
							idleTimeoutSeconds: LEAK_EXPIRY_MS / 1000,
							deleteAfterStoppedSeconds: 300,
							metadata: { "sandbox-benchmarks": "tangle" },
						},
						{ timeoutMs: CREATE_TIMEOUT_MS, signal },
					),
				);
			},
			get: async (id) => {
				const sandbox = await client.get(id);
				return sandbox === null ? null : record(sandbox);
			},
			remove: async (_id, { signal, current }) => {
				const sandbox = (await current())?.raw;
				if (sandbox === undefined) return "removed";
				await bounded(signal, CONTROL_TIMEOUT_MS, (bound) => sandbox.delete({ signal: bound }));
				return "accepted";
			},
			page: async (cursor) => {
				const offset = Number(cursor ?? 0);
				const rows = await client.list({ limit: 100, offset });
				return {
					records: rows.map(record),
					...(rows.length === 100 && { next: String(offset + 100) }),
				};
			},
			absent: http.absent,
			transient: http.transient,
			// The SDK retries a create only on retryable errors, under one idempotency key, so a
			// non-retryable 4xx refused before allocating. A 429 is only proven by the SDK's own label.
			refused: (error) =>
				error instanceof SandboxError && error.createFailureDisposition === "not-admitted"
					? { retryable: true }
					: status(error) === 429
						? undefined
						: http.refused(error),
		},
		data: {
			attach: ({ raw }) => raw,
			prepare: async ({ native }, { spec }, { signal }) => {
				const granted = native.resources;
				if (
					granted &&
					(granted.cpuCores !== spec.vcpus || granted.memoryMB !== spec.memoryGb * 1024)
				)
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU / ${spec.memoryGb} GiB but the sandbox was granted ${granted.cpuCores} vCPU / ${granted.memoryMB} MiB`,
					};
				const { exitCode, stdout, stderr } = await exec(native, TANGLE_PTS_PREFLIGHT, { signal });
				if (exitCode !== 0)
					throw new Error(
						`Tangle PTS preflight failed (exit ${exitCode}): ${(stderr || stdout).trim().slice(-400)}`,
					);
				return { status: "honored" };
			},
			exec,
			// Accepted once the runtime returns a pid; the harness observes completion via its done-file.
			launch: async (sandbox, command) => {
				const { pid } = await sandbox.process.spawn(PREFIX + command, { timeoutMs: 0 });
				if (!Number.isSafeInteger(pid) || pid <= 0)
					throw new Error("Tangle spawn returned no process id");
			},
		},
	};
}
