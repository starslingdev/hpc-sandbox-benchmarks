// Vercel Sandbox's vendor adapter: translation only. It receives the SDK's `Sandbox` statics and
// states what the v2 name-keyed API means in the vendor port's terms: the OIDC credential
// projection, the sandbox name as identity and ownership marker, record statuses as phases, and
// current-session execution. Readiness, cleanup confirmation, recovery, inventory and the disk proof
// live in the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Every lookup passes `resume: false`: the SDK defaults to resuming a stopped session on `get`, and
// a benchmark that silently booted a replacement VM after loss would hide the loss it exists to
// measure.

import { Buffer } from "node:buffer";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	bounded,
	httpStatus,
	LEAK_EXPIRY_MS,
	markerSpelling,
	refusedOn,
} from "@sandbox-benchmarks/driver/vendor";
import type { Sandbox } from "@vercel/sandbox";
import { APIError } from "@vercel/sandbox";
import { type } from "arktype";

/** The SDK surface the adapter translates; the package entry passes the real `Sandbox` class. */
export type VercelSdk = Pick<typeof Sandbox, "create" | "get" | "list">;
type VercelCredentials = Required<
	Pick<NonNullable<Parameters<VercelSdk["list"]>[0]>, "token" | "teamId" | "projectId">
>;

/** Every benchmark create is named with this prefix plus its attempt's UUID; ownership keys on it. */
export const VERCEL_NAME_PREFIX = "sandbox-benchmarks-";
/** The sandbox name spells the kit marker's attempt UUID under the Vercel prefix. */
export const VERCEL_NAME = markerSpelling(VERCEL_NAME_PREFIX);
/** Second ownership marker, recorded as a tag on the sandbox record (list rows do not carry tags). */
export const VERCEL_OWNER_TAG = "sandbox-benchmarks";
export const VERCEL_OWNER_VALUE = "vercel";
export const VERCEL_SANDBOX_ID = type(
	/^sandbox-benchmarks-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
);
/** Per-call ceiling on control-plane requests: the kit bounds each read by it. */
export const VERCEL_CONTROL_TIMEOUT_MS = 20_000;
/** Vercel derives memory at a fixed 2048 MB per vCPU; the target's 4 vCPU × 8 GiB is that ratio. */
export const VERCEL_MEMORY_GB_PER_VCPU = 2;

/** One record: a list row, or a looked-up or created sandbox carrying its SDK handle. */
interface VercelRow {
	readonly name: string;
	readonly status: string;
	readonly sandbox?: Sandbox;
}

const OIDC_CLAIMS = type({ owner_id: "string >= 1", project_id: "string >= 1" });

/**
 * Project the registry's one credential into what every SDK call needs. The OIDC token is a JWT
 * whose payload names the team (`owner_id`) and project (`project_id`), which is exactly how the
 * SDK itself resolves them from `VERCEL_OIDC_TOKEN`; decoding here lets the driver pass all three
 * explicitly instead of letting the SDK read ambient process env (or fall into its interactive
 * device-login flow when it finds none). The token never appears in a diagnostic.
 */
export function vercelCredentials(oidcToken: string): VercelCredentials {
	const [, payload] = oidcToken.split(".");
	if (payload === undefined || payload.length === 0)
		throw new Error(
			"VERCEL_OIDC_TOKEN is not a JWT: expected a dot-separated header.payload.signature",
		);
	let decoded: unknown;
	try {
		decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
	} catch {
		throw new Error("VERCEL_OIDC_TOKEN payload is not base64url-encoded JSON");
	}
	const claims = OIDC_CLAIMS(decoded);
	if (claims instanceof type.errors)
		throw new Error(
			"VERCEL_OIDC_TOKEN payload names no owner_id/project_id; it is not a Vercel OIDC token",
		);
	return { token: oidcToken, teamId: claims.owner_id, projectId: claims.project_id };
}

/** The API's typed status, never message text. */
const apiStatus = httpStatus(APIError, (error) => error.response.status);

/**
 * A record that holds (or is about to hold) a VM, or a stopped record that can still be resumed,
 * owns resources; only `running` is usable. A `failed` or `aborted` record is a dead entry nobody
 * can use, so an unmarked one is no allocation at all, but the benchmark's own record is still its
 * to delete in every status. Only the API's 404 proves removal.
 */
function phaseOf(status: string, owned: boolean): Phase {
	if (status === "running") return "ready";
	if (status === "pending") return "pending";
	if (status === "failed" || status === "aborted") return owned ? "failed" : "gone";
	return "failed";
}

function record(row: VercelRow): VendorRecord<VercelRow> {
	const marker = VERCEL_SANDBOX_ID.allows(row.name) ? VERCEL_NAME.fromVendor(row.name) : undefined;
	return {
		id: row.name,
		phase: phaseOf(row.status, marker !== undefined),
		...(marker && { marker }),
		raw: row,
	};
}
const fromSandbox = (sandbox: Sandbox) =>
	record({ name: sandbox.name, status: sandbox.status, sandbox });

/**
 * Foreground and detached execution through the CURRENT session only. `Sandbox.runCommand` wraps
 * its call in the SDK's auto-resume, which could boot a replacement VM after loss and invalidate the
 * benchmark filesystem underneath a running suite; the session call has no such fallback.
 */
function currentSession(sandbox: Sandbox) {
	if (sandbox.status !== "running")
		throw new Error(
			`Vercel sandbox is ${sandbox.status}, not running; refusing to resume or replace it`,
		);
	return sandbox.currentSession();
}

export function vercelVendor(
	sdk: VercelSdk,
	{ env, resolvedArtifact }: Pick<DriverContext<"vercel">, "env" | "resolvedArtifact">,
): Vendor<VercelRow, Sandbox> {
	const credentials = vercelCredentials(env.VERCEL_OIDC_TOKEN);

	return {
		control: {
			// `Sandbox.create` resolves with a running session, which its status proves.
			create: async ({ request, marker }, { signal }) =>
				fromSandbox(
					await sdk.create({
						...credentials,
						name: VERCEL_NAME.toVendor(marker),
						image: resolvedArtifact.ref,
						resources: { vcpus: request.spec.vcpus },
						persistent: false,
						tags: { [VERCEL_OWNER_TAG]: VERCEL_OWNER_VALUE },
						timeout: LEAK_EXPIRY_MS,
						signal,
					}),
				),
			get: async (name, { signal }) =>
				fromSandbox(await sdk.get({ ...credentials, name, resume: false, signal })),
			// `stop()` only ends the current VM session and leaves the named record resumable;
			// `delete()` removes the record with all its sessions and snapshots, whatever its status.
			remove: async (_name, { signal, current }) => {
				const sandbox = (await current())?.raw.sandbox;
				if (sandbox === undefined) return "removed";
				await bounded(signal, VERCEL_CONTROL_TIMEOUT_MS, (bound) =>
					sandbox.delete({ signal: bound }),
				);
				return "accepted";
			},
			// Only the API's 404 proves removal.
			absent: (error) => apiStatus(error) === 404,
			// The project is the account boundary the credential names: one cursor page of it.
			page: async (cursor, { signal }) => {
				const page = await sdk.list({
					...credentials,
					...(cursor !== undefined && { cursor }),
					signal,
				});
				const records = page.sandboxes.map(record);
				return page.pagination.next === null
					? { records }
					: { records, next: page.pagination.next };
			},
			// Typed rejections before allocation; only the API's rate limit is worth waiting out.
			refused: refusedOn(apiStatus, [400, 401, 403, 404, 422, 429]),
		},
		data: {
			attach: ({ raw }) => {
				if (!raw.sandbox) throw new Error("Vercel attaches only a sandbox it looked up or created");
				return raw.sandbox;
			},
			exec: async (sandbox, command, options?: ExecOptions) => {
				const finished = await currentSession(sandbox).runCommand({
					cmd: "/bin/sh",
					args: ["-lc", command],
					signal: options?.signal,
				});
				const [stdout, stderr] = await Promise.all([
					finished.stdout({ signal: options?.signal }),
					finished.stderr({ signal: options?.signal }),
				]);
				return { exitCode: finished.exitCode, stdout, stderr };
			},
			// Accepted only once the current session has returned a handle for the detached command.
			launch: async (sandbox, command, options?: ExecOptions) => {
				const handle: unknown = await currentSession(sandbox).runCommand({
					cmd: "/bin/sh",
					args: ["-lc", command],
					signal: options?.signal,
					detached: true,
				});
				if ((typeof handle !== "object" && typeof handle !== "function") || handle === null)
					throw new Error("Vercel returned no handle for the detached command");
			},
			// No files: the session file API writes as the `vercel-sandbox` user, not the root the
			// toolchain runs as, and the high-level wrapper can auto-resume a stopped sandbox. The kit
			// polls done-files over this same non-resuming exec instead.
		},
	};
}
