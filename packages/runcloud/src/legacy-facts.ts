import type { Client, CreateSandboxOptions } from "@run-cloud/sdk";
import type { ComputeSdkCreateRequestCoverage } from "@sandbox-benchmarks/driver/computesdk";
import { type } from "arktype";

/** Poll cadence while a create sits in `building_image`/`starting`. */
export const RUNCLOUD_READY_POLL_MS = 2_000;

/** Cold pulls of the ~1.5 GiB toolchain image on a first-use host can take several minutes. */
export const RUNCLOUD_READY_TIMEOUT_MS = 20 * 60_000;

/** A destroy can fail transiently after allocation succeeded; retry it here, because the kit has no
 *  handle (and so no generic cleanup path) until create resolves. */
export const RUNCLOUD_CLEANUP_ATTEMPTS = 5;

export const RUNCLOUD_CLEANUP_RETRY_MS = 2_000;

/**
 * How long one destroy (the DELETE plus watching for `destroyed`/404) may take. run.cloud deletes
 * asynchronously and a record can sit in `destroying` well past a few polls: in run 36356024651 two
 * sandboxes failed cleanup after the old 5-poll (~8 s) window and were found absent at recovery.
 * 50 s keeps the whole destroy inside the harness's 60 s destroy timeout.
 */
export const RUNCLOUD_REMOVAL_DEADLINE_MS = 50_000;

/** Bound each REST control-plane call independently: a fetch that never settles must not suspend a
 *  deadline check or a failed-create cleanup. */
export const RUNCLOUD_CONTROL_TIMEOUT_MS = 30_000;

/** An allocation can take a moment to become visible to `list()`; an ambiguous create polls before
 *  concluding nothing was allocated. Guessing "absent" too early is what leaks a sandbox. */
export const RUNCLOUD_RECONCILE_ATTEMPTS = 5;

export const RUNCLOUD_RECONCILE_RETRY_MS = 2_000;

/**
 * The caller-owned name stamped on every create. Chosen locally BEFORE the request, so a create
 * whose response is lost still leaves an allocation the control plane can be queried for by name;
 * it also makes every benchmark sandbox identifiable to the account inventory.
 */
export const RUNCLOUD_RECOVERY_NAME_PREFIX = "sandbox-benchmarks";

/** Lifetime and idle-pause window, both above the longest suite so a detached benchmark is never
 *  paused while the harness polls its done file. */
export const RUNCLOUD_SANDBOX_LIFETIME_SECS = 3 * 60 * 60;

export const RUNCLOUD_SANDBOX_ID = type(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

/**
 * run.cloud honours the requested disk as a block-device quota and formats it; the guest's
 * filesystem then reports the device minus its own metadata (measured live: a 40 GiB request
 * exposes 39.30 GiB, 1.75 %). Verification allows that formatting overhead and nothing more — a
 * genuinely smaller allocation still fails the request.
 */
export const RUNCLOUD_DISK_FILESYSTEM_OVERHEAD = 0.03;

export const RUNCLOUD_READINESS = Object.freeze({ startup: "create-returns-ready" as const });

/** The registry declares detached polling; the SDK has no truthful background launch, so the durable
 *  route is the kit's shell detach over the same exec channel. */
export const RUNCLOUD_EXECUTION = Object.freeze({
	syncCapMs: 60_000,
	durable: "shell-detach" as const,
});

/**
 * Worst-case wall time ONE create can spend before it settles, summed over every bound this module
 * enforces on its longest path: the create POST, reconciling an ambiguous response, the readiness
 * wait, and destroying an allocation that failed readiness. Derived from the constants so tightening
 * any one tightens this in the same edit. A CEILING, not an expectation: the observed create is
 * seconds.
 *
 * The legacy adapter turned the harness's per-attempt race OFF and handed this ceiling over as the
 * attempt bound, so an in-flight cleanup was never abandoned. A ComputeSDK module can only declare a
 * harness-owned budget, so the ceiling IS that budget: every internal bound settles strictly inside
 * it, which means the harness race can only fire after this module has already finished (including
 * its cleanup) — it never abandons a teardown mid-flight — while the retry loop still knows what one
 * attempt can cost.
 */
export const RUNCLOUD_CREATE_CEILING_MS =
	RUNCLOUD_CONTROL_TIMEOUT_MS +
	RUNCLOUD_RECONCILE_ATTEMPTS * RUNCLOUD_CONTROL_TIMEOUT_MS +
	(RUNCLOUD_RECONCILE_ATTEMPTS - 1) * RUNCLOUD_RECONCILE_RETRY_MS +
	RUNCLOUD_READY_TIMEOUT_MS +
	RUNCLOUD_CONTROL_TIMEOUT_MS +
	RUNCLOUD_READY_POLL_MS +
	RUNCLOUD_CLEANUP_ATTEMPTS * (RUNCLOUD_CLEANUP_ATTEMPTS + 2) * RUNCLOUD_CONTROL_TIMEOUT_MS +
	RUNCLOUD_CLEANUP_ATTEMPTS * (RUNCLOUD_CLEANUP_ATTEMPTS - 1) * RUNCLOUD_CLEANUP_RETRY_MS +
	(RUNCLOUD_CLEANUP_ATTEMPTS - 1) * RUNCLOUD_CLEANUP_RETRY_MS;

export const RUNCLOUD_CREATE_BUDGET = Object.freeze({
	owner: "harness" as const,
	timeoutMs: RUNCLOUD_CREATE_CEILING_MS,
});

export const RUNCLOUD_REQUEST_COVERAGE = {
	spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: "mapped" },
	artifact: "context",
	deadlineMs: "harness",
	gpu: { model: "unsupported", count: "unsupported" },
	env: "unsupported",
} as const satisfies ComputeSdkCreateRequestCoverage;

export type RuncloudCreateOptions = CreateSandboxOptions & { name: string };

export const inventoryRows = type({
	id: "string >= 1",
	state: "string",
	"name?": "string | null",
}).array();

export const inventoryPage = type({ items: inventoryRows, nextCursor: "string >= 1 | null" });

export type InventoryPageReader = (cursor?: string, signal?: AbortSignal) => Promise<unknown>;

// A live 566-row account takes about 100 seconds at the API's default 50 rows per page.
// Request its supported 200-row maximum and allow several minutes for the whole scan.
export const INVENTORY_TIMEOUT_MS = 5 * 60_000;

export const INVENTORY_PAGE_SIZE = 200;

export const INVENTORY_MAX_PAGES = 1_000;

export type RuncloudSandboxClient = Pick<
	Client["sandboxes"],
	"create" | "get" | "list" | "destroy" | "exec"
>;

/** Test seams; production keeps the defaults and constructs the SDK client from the registry env. */
export interface RuncloudSpecOptions {
	readonly client?: RuncloudSandboxClient;
	readonly inventoryPage?: InventoryPageReader;
	readonly inventoryTimeoutMs?: number;
	readonly fetch?: typeof fetch;
	readonly readyPollMs?: number;
	readonly readyTimeoutMs?: number;
	readonly cleanupAttempts?: number;
	readonly cleanupRetryMs?: number;
	readonly removalDeadlineMs?: number;
	readonly controlPlaneTimeoutMs?: number;
	readonly reconcileAttempts?: number;
	readonly reconcileRetryMs?: number;
	readonly recoveryAbsenceConfirmationMs?: number;
	readonly sleep?: (ms: number) => Promise<void>;
	readonly now?: () => number;
}

export interface Timing {
	readonly readyPollMs: number;
	readonly readyTimeoutMs: number;
	readonly cleanupAttempts: number;
	readonly cleanupRetryMs: number;
	readonly removalDeadlineMs: number;
	readonly controlPlaneTimeoutMs: number;
	readonly inventoryTimeoutMs: number;
	readonly reconcileAttempts: number;
	readonly reconcileRetryMs: number;
	readonly sleep: (ms: number) => Promise<void>;
	readonly now: () => number;
}

export function timingOf(options: RuncloudSpecOptions): Timing {
	return {
		inventoryTimeoutMs: Math.max(1, Math.floor(options.inventoryTimeoutMs ?? INVENTORY_TIMEOUT_MS)),
		readyPollMs: options.readyPollMs ?? RUNCLOUD_READY_POLL_MS,
		readyTimeoutMs: options.readyTimeoutMs ?? RUNCLOUD_READY_TIMEOUT_MS,
		cleanupAttempts: Math.max(1, Math.floor(options.cleanupAttempts ?? RUNCLOUD_CLEANUP_ATTEMPTS)),
		cleanupRetryMs: Math.max(0, options.cleanupRetryMs ?? RUNCLOUD_CLEANUP_RETRY_MS),
		removalDeadlineMs: Math.max(1, options.removalDeadlineMs ?? RUNCLOUD_REMOVAL_DEADLINE_MS),
		controlPlaneTimeoutMs: Math.max(
			1,
			Math.floor(options.controlPlaneTimeoutMs ?? RUNCLOUD_CONTROL_TIMEOUT_MS),
		),
		reconcileAttempts: Math.max(
			1,
			Math.floor(options.reconcileAttempts ?? RUNCLOUD_RECONCILE_ATTEMPTS),
		),
		reconcileRetryMs: Math.max(0, options.reconcileRetryMs ?? RUNCLOUD_RECONCILE_RETRY_MS),
		sleep: options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
		now: options.now ?? Date.now,
	};
}
