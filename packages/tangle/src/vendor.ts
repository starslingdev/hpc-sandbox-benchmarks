// The Tangle Sandbox adapter over @tangle-network/sandbox.

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
/** The create blocks until running; a cold pull of the toolchain image needs well over the SDK's 120s. */
export const CREATE_TIMEOUT_MS = 15 * 60_000;

/** PTS state, installs and a patchable PTS copy live under HOME; the image toolchain precedes Nix. */
const PREFIX =
	'export PATH="$HOME/.local/pts/bin:/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH" ' +
	'PTS_USER_PATH_OVERRIDE="$HOME/.phoronix-test-suite/" PTS_TEST_INSTALL_ROOT_PATH="$HOME/.phoronix-test-suite/installed-tests/"; ';

/**
 * Stage the baked profiles and a writable PTS copy. Older images without a portable
 * pgbench fixture report their permission gap in the leaf.
 */
export const TANGLE_PTS_PREFLIGHT = [
	"set -eu",
	'installed="$HOME/.phoronix-test-suite/installed-tests/pts"',
	'mkdir -p "$installed"',
	"for profile in /var/lib/phoronix-test-suite/installed-tests/pts/*; do",
	'  dest="$installed/$(basename "$profile")"',
	'  seed="/usr/local/share/sandbox-benchmarks/$(basename "$profile").tar.gz"',
	'  if [ ! -e "$dest" ] && [ -f "$seed" ]; then',
	'    staged=$(mktemp -d "$installed/.stage.XXXXXXXX")',
	`    trap 'rm -rf "$staged"' EXIT`,
	`    bash -o pipefail -c 'tar -C "$1" --exclude="./pg_/data/db" -cf - . | tar -C "$2" --no-same-owner -xf -' _ "$profile" "$staged"`,
	'    tar -C "$staged/pg_/data" --no-same-owner -xzf "$seed"',
	'    mv -T "$staged" "$dest"',
	'    trap - EXIT',
	"  fi",
	'  [ -e "$dest" ] || cp -R "$profile" "$dest" 2>/dev/null || { rm -rf "$dest"; ln -s "$profile" "$dest"; }',
	"done",
	'pts="$HOME/.local/pts" bin="$HOME/.local/pts/bin/phoronix-test-suite"',
	'if [ ! -x "$bin" ]; then',
	'  rm -rf "$pts" && mkdir -p "$pts/bin" "$pts/share" && cp -R /usr/share/phoronix-test-suite "$pts/share/"',
	`  sed "s#^export PTS_DIR='/usr/share/#export PTS_DIR='$pts/share/#" /usr/bin/phoronix-test-suite > "$bin"`,
	`  grep -qF "PTS_DIR='$pts/share/" "$bin" && chmod 755 "$bin"`,
	"fi",
	'"$bin" version',
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
		// 600s is the runtime's per-command ceiling; the harness owns step deadlines.
		const opts = { timeoutMs: 600_000, ...(options?.signal && { signal: options.signal }) };
		return sandbox.exec(PREFIX + command, opts);
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
				await bounded(signal, 30_000, (bound) => sandbox.delete({ signal: bound }));
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
				const g = native.resources;
				if (g && (g.cpuCores !== spec.vcpus || g.memoryMB !== spec.memoryGb * 1024))
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU / ${spec.memoryGb} GiB, granted ${g.cpuCores} vCPU / ${g.memoryMB} MiB`,
					};
				// Measure the workspace before copying profiles, in the same guest command.
				const workspace =
					spec.diskGb === undefined
						? ""
						: [
								'geometry=$(stat -f -c "%S %b" "$HOME") || exit 1',
								"set -- $geometry",
								"bytes=$(($1 * $2))",
								`if [ "$bytes" -lt ${Math.ceil(spec.diskGb * 1024 ** 3)} ]; then echo "requested ${spec.diskGb} GiB workspace, mounted $bytes bytes at $HOME"; exit 78; fi`,
								"",
							].join("\n");
				const { exitCode, stdout, stderr } = await exec(native, workspace + TANGLE_PTS_PREFLIGHT, { signal });
				if (exitCode === 78 && stdout.startsWith("requested "))
					return { status: "unsupported", detail: stdout.trim() };
				if (exitCode === 0) return { status: "honored" };
				throw new Error(`Tangle PTS preflight exit ${exitCode}: ${(stderr || stdout).slice(-400)}`);
			},
			exec,
			// Accepted once the runtime returns a pid; the harness observes completion via its done-file.
			launch: async (sandbox, command) => {
				const { pid } = await sandbox.process.spawn(PREFIX + command, { timeoutMs: 0 });
				if (!(pid > 0)) throw new Error("Tangle spawn returned no process id");
			},
		},
	};
}
