import type { BoatApi } from "@boatdev/sdk";
import type { ComputeSdkCreateRequestCoverage } from "@sandbox-benchmarks/driver/computesdk";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { type } from "arktype";

export const BOAT_API_BASE = "https://boat.dev/api/v1";

export const BOAT_SANDBOX_ID = type(/^bx_[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);

export const BOAT_RECOVERY_NAME_PREFIX = "sandbox-benchmarks";

export const BOAT_MACHINE_TYPE = "default" as const;

export const BOAT_MACHINE_PROVIDER = "baremetal" as const;

export const BOAT_COMMAND_TIMEOUT_SECONDS = 600;

export const BOAT_READY_POLL_MS = 2_000;

export const BOAT_READY_TIMEOUT_MS = 8 * 60_000;

export const BOAT_CONTROL_TIMEOUT_MS = 30_000;

export const BOAT_CLEANUP_ATTEMPTS = 6;

export const BOAT_CLEANUP_RETRY_MS = 5_000;

export const BOAT_DELETE_CONFIRM_MS = 60_000;

export const BOAT_DELETE_POLL_MS = 1_000;

// Exec is accepted before the guest's outbound network is up: a clone issued ~1s after boot was
// refused in 6ms on one of 30 sandboxes. Readiness therefore also waits for DNS plus a TCP connect.
export const BOAT_EGRESS_PROBE_HOST = "boat.dev";

export const BOAT_EGRESS_TIMEOUT_MS = 90_000;

export const BOAT_EGRESS_POLL_MS = 1_000;

export const BOAT_CREATE_ATTEMPTS = 5;

export const BOAT_CREATE_RETRY_MS = 2_000;

// Boat counts create, fork, and resume against one account-wide starts-per-minute limit.
// A 429 needs a fresh minute window; the ordinary 2s transient retry is too soon.
export const BOAT_CREATE_RATE_LIMIT_RETRY_MS = 60_000;

export const BOAT_INVENTORY_PAGE_SIZE = 100;

export const BOAT_INVENTORY_MAX_PAGES = 1_000;

export const BOAT_INVENTORY_TIMEOUT_MS = 5 * 60_000;

export const BOAT_READINESS = { startup: "create-returns-ready" } as const;

export const BOAT_EXECUTION = { syncCapMs: 60_000, durable: "native-launch" } as const;

export const BOAT_CREATE_CEILING_MS =
	BOAT_CREATE_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CREATE_ATTEMPTS - 1) * Math.max(BOAT_CREATE_RETRY_MS, BOAT_CREATE_RATE_LIMIT_RETRY_MS) +
	BOAT_CONTROL_TIMEOUT_MS +
	BOAT_READY_TIMEOUT_MS +
	BOAT_READY_POLL_MS +
	BOAT_EGRESS_TIMEOUT_MS +
	BOAT_CONTROL_TIMEOUT_MS + // rename
	BOAT_CONTROL_TIMEOUT_MS + // disk capacity probe
	BOAT_CLEANUP_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CLEANUP_ATTEMPTS - 1) * BOAT_CLEANUP_RETRY_MS +
	BOAT_DELETE_CONFIRM_MS +
	BOAT_CONTROL_TIMEOUT_MS + // observe before stop fallback
	BOAT_CLEANUP_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CLEANUP_ATTEMPTS - 1) * BOAT_CLEANUP_RETRY_MS +
	BOAT_DELETE_CONFIRM_MS;
// confirm stop fallback
export const BOAT_CREATE_BUDGET = {
	owner: "harness",
	timeoutMs: BOAT_CREATE_CEILING_MS,
} as const;

export const BOAT_REQUEST_COVERAGE = {
	spec: {
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: TARGET_SPEC.diskGb },
	},
	artifact: "context",
	deadlineMs: "harness",
	gpu: { model: "unsupported", count: "unsupported" },
	env: "unsupported",
} as const satisfies ComputeSdkCreateRequestCoverage;

export const READY_STATES: ReadonlySet<string> = new Set(["ready", "idle", "running"]);

export const TERMINAL_BOOT_STATES: ReadonlySet<string> = new Set([
	"error",
	"archived",
	"archiving",
]);

// Stopped rows hold no compute ("a stopped sandbox costs nothing"). A foreign one is therefore not
// capacity this benchmark competes with; an owned one can still be deleted if the key permits.
export const STOPPED_STATES: ReadonlySet<string> = new Set(["archived"]);

export const boatSandboxSchema = type({
	id: BOAT_SANDBOX_ID,
	name: "string",
	state: "string >= 1",
	"vcpu?": "number > 0",
	"memoryGB?": "number > 0",
});

export const boatSandboxResponseSchema = type({ sandbox: boatSandboxSchema });

export const boatInventoryPageSchema = type({
	sandboxes: boatSandboxSchema.array(),
	"pageInfo?": {
		"nextCursor?": "string >= 1 | null",
		"hasMore?": "boolean",
	},
});

export const boatCommandResponseSchema = type.or(
	{
		type: "'command.finished'",
		"exitCode?": "number.integer",
		stdout: "string",
		stderr: "string",
	},
	{
		type: "'command.started'",
		processId: "number.integer > 0",
	},
);

// Deletion is accepted asynchronously. In practice the sandbox 404s within seconds while its
// operation settles at `blocked` rather than `completed`, so convergence is proven by observing the
// sandbox gone, never by the operation status.
export const boatDeletionResponseSchema = type({
	operation: { id: "string >= 1", targetId: "string", status: "string >= 1" },
});

export const boatErrorBodySchema = type("string.json.parse").to({
	"code?": "string",
	"message?": "string",
});

export const boatCreateOptionsSchema = type({
	name: "string >= 1",
	idempotencyKey: "string >= 1",
	type: "'default'",
	machineProvider: "'baremetal'",
	ttlSeconds: "null",
	noEnv: "true",
});

export const serializedCreateBodySchema = type({ "[string]": "unknown" });

export const diskCapacityKbSchema = type("string.integer.parse").to("number > 0");

export type BoatSandbox = typeof boatSandboxSchema.infer;

export type BoatCreateOptions = typeof boatCreateOptionsSchema.infer;

/** The create response plus the owner-visible name this allocation is renamed to while preparing. */
export type BoatAllocation = BoatSandbox & { readonly recoveryName: string };

export type BoatClient = Pick<
	BoatApi,
	"create" | "get" | "update" | "deleteSandbox" | "stop" | "command" | "sandboxes"
>;

export interface BoatSpecOptions {
	readonly client?: BoatClient;
	readonly readyPollMs?: number;
	readonly readyTimeoutMs?: number;
	readonly egressPollMs?: number;
	readonly egressTimeoutMs?: number;
	readonly deleteConfirmMs?: number;
	readonly deletePollMs?: number;
	readonly cleanupAttempts?: number;
	readonly cleanupRetryMs?: number;
	readonly createAttempts?: number;
	readonly createRetryMs?: number;
	readonly createDelay?: (ms: number, signal?: AbortSignal) => Promise<void>;
	readonly recoveryAbsenceConfirmationMs?: number;
	readonly inventoryTimeoutMs?: number;
}

export class BoatBootFailureError extends Error {
	constructor(
		readonly sandboxId: string,
		readonly state: string,
	) {
		super(`boat sandbox ${sandboxId} entered terminal state "${state}" while booting`);
		this.name = "BoatBootFailureError";
	}
}
