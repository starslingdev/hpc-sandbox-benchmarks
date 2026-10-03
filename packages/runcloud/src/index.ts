// run.cloud is a native SDK module. Four vendor facts shape everything below, each reproduced live:
// create returns as soon as the control plane accepts the sandbox while the OCI pull/boot continues
// asynchronously (`building_image`, exec 4409 until `running`); overload can stall a create (matrix
// run 30960125032) or explicitly refuse quota with 429 (run 34781421576); an ambiguous create leaks
// a sandbox that never auto-pauses; and the API keeps `destroyed` tombstones in every listing. Every control-plane
// call is individually bounded, the create name is a recovery handle chosen before the request, a
// lost response is reconciled by READING (never by replaying the create), readiness is owned here,
// and nothing is ever reported as gone until the control plane has said so.

import { randomUUID } from "node:crypto";
import type { Sandbox } from "@run-cloud/sdk";
import { Client, RunCloudError } from "@run-cloud/sdk";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import { DriverError } from "@sandbox-benchmarks/driver";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { runcloudCostEvidence } from "./cost.ts";
import type {
	InventoryPageReader,
	inventoryRows,
	RuncloudCreateOptions,
	RuncloudSandboxClient,
	RuncloudSpecOptions,
	Timing,
} from "./legacy-facts.ts";
import {
	INVENTORY_MAX_PAGES,
	INVENTORY_PAGE_SIZE,
	inventoryPage,
	RUNCLOUD_CREATE_BUDGET,
	RUNCLOUD_EXECUTION,
	RUNCLOUD_READINESS,
	RUNCLOUD_RECOVERY_NAME_PREFIX,
	RUNCLOUD_REQUEST_COVERAGE,
	RUNCLOUD_SANDBOX_ID,
	RUNCLOUD_SANDBOX_LIFETIME_SECS,
	timingOf,
} from "./legacy-facts.ts";
import {
	bounded,
	controlPlaneFetch,
	createdAt,
	errorMessage,
	execCommand,
	hostGaveUp,
	isNotFound,
	isRuncloudDefinitiveCreateRejection,
	isTerminalBootState,
	isTombstone,
	RuncloudAmbiguousCreateError,
	RuncloudBootFailureError,
	RuncloudCallTimeoutError,
	runcloudCreateHttpStatus,
	runcloudObservation,
	verifyRuncloudAllocation,
} from "./legacy-guest.ts";
import { RUNCLOUD_PROVENANCE } from "./provenance.ts";

export {
	RUNCLOUD_CLEANUP_ATTEMPTS,
	RUNCLOUD_CLEANUP_RETRY_MS,
	RUNCLOUD_CONTROL_TIMEOUT_MS,
	RUNCLOUD_CREATE_BUDGET,
	RUNCLOUD_CREATE_CEILING_MS,
	RUNCLOUD_DISK_FILESYSTEM_OVERHEAD,
	RUNCLOUD_EXECUTION,
	RUNCLOUD_READINESS,
	RUNCLOUD_READY_POLL_MS,
	RUNCLOUD_READY_TIMEOUT_MS,
	RUNCLOUD_RECONCILE_ATTEMPTS,
	RUNCLOUD_RECONCILE_RETRY_MS,
	RUNCLOUD_RECOVERY_NAME_PREFIX,
	RUNCLOUD_REMOVAL_DEADLINE_MS,
	RUNCLOUD_REQUEST_COVERAGE,
	RUNCLOUD_SANDBOX_ID,
	RUNCLOUD_SANDBOX_LIFETIME_SECS,
	type RuncloudSpecOptions,
} from "./legacy-facts.ts";
export {
	isRuncloudDefinitiveCreateRejection,
	RuncloudAmbiguousCreateError,
	RuncloudBootFailureError,
	RuncloudCallTimeoutError,
	runcloudObservation,
} from "./legacy-guest.ts";

export { RUNCLOUD_PROVENANCE };

/** Poll until the sandbox can accept execs; returns the freshest record, never the stale create
 *  response. A terminal state throws the internal boot verdict for the create path to classify. */
class BootTerminalState extends Error {
	constructor(
		readonly sandboxId: string,
		readonly state: string,
		readonly vendorDetail?: string,
	) {
		super(
			`run.cloud sandbox ${sandboxId} entered terminal state "${state}" while booting${vendorDetail ? `: ${vendorDetail}` : ""}`,
		);
	}
}

async function waitUntilRunning(
	sdk: RuncloudSandboxClient,
	sandboxId: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox> {
	const deadline = timing.now() + timing.readyTimeoutMs;
	let last: Sandbox | undefined;
	while (timing.now() < deadline) {
		last = await bounded(
			`readiness get for sandbox ${sandboxId}`,
			() => sdk.get(sandboxId),
			timing,
			signal,
		);
		if (last.state === "running") return last;
		if (isTerminalBootState(last.state)) {
			// Snapshot the failure before teardown changes the record. Diagnostic rendering redacts
			// credentials before truncation; ignore malformed provider detail here.
			const detail = typeof last.last_error === "string" ? last.last_error.trim() : undefined;
			throw new BootTerminalState(sandboxId, last.state, detail);
		}
		await timing.sleep(timing.readyPollMs);
		signal?.throwIfAborted();
	}
	throw new Error(
		`run.cloud sandbox ${sandboxId} not running after ${timing.readyTimeoutMs}ms (last state: ${last?.state ?? "unknown"})`,
	);
}

/** An accepted DELETE whose removal the deadline never confirmed. Retrying would only re-send the
 *  DELETE and restart the same watch, so failed-create cleanup stops on it. */
class RuncloudRemovalUnconfirmed extends Error {}

async function destroySandbox(
	sdk: RuncloudSandboxClient,
	sandboxId: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<void> {
	// One deadline for the DELETE and the watch after it: run.cloud removes asynchronously, so
	// `destroying` can outlast any fixed number of polls. Only `destroyed`/404 confirms removal.
	const deadline = timing.now() + timing.removalDeadlineMs;
	try {
		await bounded(`destroy sandbox ${sandboxId}`, () => sdk.destroy(sandboxId), timing, signal);
	} catch (error) {
		if (isNotFound(error)) return;
		throw error;
	}
	let last: string | undefined;
	for (;;) {
		try {
			// Cap each read at the time left, so a hung read cannot carry the destroy past its deadline.
			const remaining = Math.max(1, deadline - timing.now());
			const current = await bounded(
				`observe destroy ${sandboxId}`,
				() => sdk.get(sandboxId),
				{ ...timing, controlPlaneTimeoutMs: Math.min(timing.controlPlaneTimeoutMs, remaining) },
				signal,
			);
			if (isTombstone(current.state)) return;
			last = current.state;
		} catch (error) {
			if (isNotFound(error)) return;
			throw error;
		}
		if (timing.now() + timing.cleanupRetryMs >= deadline) break;
		await timing.sleep(timing.cleanupRetryMs);
		signal?.throwIfAborted();
	}
	throw new RuncloudRemovalUnconfirmed(
		`run.cloud sandbox ${sandboxId} has not confirmed removal after destroy (last state: ${last} after ${timing.removalDeadlineMs}ms)`,
	);
}

/**
 * Only destroyed/404 confirms removal. A pending delete can race image preparation and return
 * to running, so destroying must remain visible to inventory and cannot release an allocation.
 * A read that cannot answer returns false; the caller does not claim the allocation is released.
 */
async function teardownConfirmed(
	sdk: RuncloudSandboxClient,
	sandboxId: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<boolean> {
	try {
		const current = await bounded(
			`confirm teardown for sandbox ${sandboxId}`,
			() => sdk.get(sandboxId),
			timing,
			signal,
		);
		return isTombstone(current.state);
	} catch (error) {
		return isNotFound(error);
	}
}

/** Tear down an allocation whose readiness wait failed. A rejected destroy is ambiguous (the request
 *  may have landed before the response was lost), so confirm through get() before retrying. */
async function cleanupFailedCreate(
	sdk: RuncloudSandboxClient,
	sandboxId: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<void> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= timing.cleanupAttempts; attempt++) {
		try {
			await destroySandbox(sdk, sandboxId, timing, signal);
			return;
		} catch (error) {
			// The DELETE was accepted and the full removal deadline already watched it.
			if (error instanceof RuncloudRemovalUnconfirmed) throw error;
			lastError = error;
			if (await teardownConfirmed(sdk, sandboxId, timing, signal)) return;
			if (attempt < timing.cleanupAttempts) await timing.sleep(timing.cleanupRetryMs);
		}
	}
	throw lastError;
}

/** One exact-name lookup: never a prefix/fuzzy match, never a tombstone. */
async function liveSandboxesNamed(
	sdk: RuncloudSandboxClient,
	name: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox[]> {
	const rows = await bounded(`reconcile create ${name}`, () => sdk.list({ name }), timing, signal);
	if (!Array.isArray(rows)) throw new Error("run.cloud list returned a non-array result");
	return rows
		.filter((sandbox) => sandbox.name === name && !isTombstone(sandbox.state))
		.sort((a, b) => createdAt(a.createdAt) - createdAt(b.createdAt));
}

type ReconcileOutcome =
	| { readonly status: "adopted"; readonly sandbox: Sandbox }
	| { readonly status: "absent" }
	| { readonly status: "unanswered"; readonly lastError: unknown };

/**
 * Resolve what a failed create actually DID by querying the control plane for the name stamped on
 * the request. A failed lookup costs an attempt rather than ending the search. An answered empty
 * window is distinguished from an unanswered window for diagnostics; neither cancels a POST that
 * can still finish later. Only a matching allocation can be adopted here.
 */
async function reconcileAmbiguousCreate(
	sdk: RuncloudSandboxClient,
	name: string,
	timing: Timing,
	attempts: number,
	signal?: AbortSignal,
): Promise<ReconcileOutcome> {
	let answered = false;
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const [oldest] = await liveSandboxesNamed(sdk, name, timing, signal);
			answered = true;
			// One unique name per create, so a second match means the server allocated twice; adopting
			// the oldest keeps the original from being orphaned.
			if (oldest) return { status: "adopted", sandbox: oldest };
		} catch (error) {
			lastError = error;
		}
		if (attempt < attempts) await timing.sleep(timing.reconcileRetryMs);
	}
	return answered ? { status: "absent" } : { status: "unanswered", lastError };
}

async function allocate(
	sdk: RuncloudSandboxClient,
	options: RuncloudCreateOptions,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox> {
	const input = { ...options, idempotencyKey: options.name };
	let created: Sandbox;
	try {
		created = await bounded("create", () => sdk.create(input), timing, signal);
	} catch (error) {
		// Ask what the request actually did rather than assuming. A definitive 4xx says no allocation
		// was accepted, so one confirming pass is enough — but never zero, because even a rejection
		// can sit on top of a real allocation. A 409 gets the full window.
		const definitive = isRuncloudDefinitiveCreateRejection(error);
		const reconciled = await reconcileAmbiguousCreate(
			sdk,
			options.name,
			timing,
			definitive ? 1 : timing.reconcileAttempts,
			signal,
		);
		if (reconciled.status !== "adopted") {
			// A definitive rejection supplied its own verdict; an empty or unanswered confirming lookup
			// does not put it back in doubt. Anything else stays unknown: a lookup miss does not cancel
			// a POST that may still finish on the server.
			if (definitive) throw error;
			throw new RuncloudAmbiguousCreateError(
				options.name,
				error,
				reconciled.status === "unanswered"
					? reconciled.lastError
					: new Error("no allocation visible during reconciliation"),
			);
		}
		// The create SUCCEEDED and only its response was lost. Adopt it: destroying a healthy
		// sandbox to honour a lost HTTP response would throw away a slow cold pull for no reason.
		created = reconciled.sandbox;
	}
	// Do not return until the guest can accept commands — exec during `building_image` fails 4409.
	try {
		return await waitUntilRunning(sdk, created.id, timing, signal);
	} catch (error) {
		// Allocation already succeeded, but the kit has no handle until create resolves. Own the
		// cleanup (with transient-destroy retries) rather than leaving a billable sandbox behind.
		try {
			await cleanupFailedCreate(sdk, created.id, timing, signal);
		} catch (destroyError) {
			throw new AggregateError(
				[error, destroyError],
				`run.cloud sandbox ${created.id} failed readiness (${errorMessage(error)}) and could not ` +
					`be destroyed after retries (${errorMessage(destroyError)}); manual cleanup may be required`,
			);
		}
		if (!(error instanceof BootTerminalState)) throw error;
		// A resolved destroy is a request accepted, not a microVM removed (~800 ms vs ~4 s live). Ask
		// the control plane before letting the verdict carry the "nothing remains allocated" half.
		throw new RuncloudBootFailureError(
			created.id,
			error.state,
			hostGaveUp(error.state),
			await teardownConfirmed(sdk, created.id, timing, signal),
			error.vendorDetail,
		);
	}
}

/** The SDK drops nextCursor from its array return. Whole-account admission must read every page,
 * including old stopped allocations hidden behind newer destroyed tombstones. Never return a
 * partial inventory after a failed, malformed, repeated, or over-budget page. */
async function completeInventory(
	readPage: InventoryPageReader,
	timing: Timing,
	signal?: AbortSignal,
): Promise<typeof inventoryRows.infer> {
	const deadline = timing.now() + timing.inventoryTimeoutMs;
	const inventorySignal = AbortSignal.any([
		AbortSignal.timeout(timing.inventoryTimeoutMs),
		...(signal ? [signal] : []),
	]);
	const rows: typeof inventoryRows.infer = [];
	const cursors = new Set<string>();
	const ids = new Set<string>();
	let cursor: string | undefined;
	for (let index = 0; index < INVENTORY_MAX_PAGES; index++) {
		const remaining = deadline - timing.now();
		if (remaining <= 0)
			throw new RuncloudCallTimeoutError("list sandbox inventory", timing.inventoryTimeoutMs);
		const page = inventoryPage.assert(
			await bounded(
				"list sandbox inventory page",
				() => readPage(cursor, inventorySignal),
				{ ...timing, controlPlaneTimeoutMs: Math.min(remaining, timing.controlPlaneTimeoutMs) },
				inventorySignal,
			),
		);
		inventorySignal.throwIfAborted();
		if (timing.now() >= deadline)
			throw new RuncloudCallTimeoutError("list sandbox inventory", timing.inventoryTimeoutMs);
		for (const row of page.items) {
			if (ids.has(row.id)) throw new Error("run.cloud inventory returned a duplicate sandbox id");
			ids.add(row.id);
			rows.push(row);
		}
		if (page.nextCursor === null) return rows;
		if (cursors.has(page.nextCursor)) throw new Error("run.cloud inventory repeated a page cursor");
		cursors.add(page.nextCursor);
		cursor = page.nextCursor;
	}
	throw new Error("run.cloud inventory exceeded its page limit before reaching the end");
}

export function runcloudSpec(
	{ env, resolvedArtifact }: DriverContext<"runcloud">,
	options: RuncloudSpecOptions = {},
) {
	const timing = timingOf(options);
	// A timed-out POST can finish after every bounded lookup. Empty inventory cannot prove
	// cancellation; retain uncertainty until a matching resource is positively removed.
	const unresolvedCreates = new Set<string>();
	let cached: RuncloudSandboxClient | undefined;
	let nativeClient: Client | undefined;
	const api = (): Client =>
		(nativeClient ??= new Client({
			apiKey: env.RUN_CLOUD_API_KEY,
			fetch: controlPlaneFetch(timing.controlPlaneTimeoutMs, undefined, options.fetch),
		}));
	// Lazy: importing the fleet must never construct a vendor client or need credentials.
	const sdk = (): RuncloudSandboxClient => {
		cached ??= options.client ?? api().sandboxes;
		return cached;
	};
	const readInventoryPage: InventoryPageReader =
		options.inventoryPage ??
		(options.client
			? async () => ({ items: await sdk().list(), nextCursor: null })
			: (cursor, signal) =>
					new Client({
						apiKey: env.RUN_CLOUD_API_KEY,
						fetch: controlPlaneFetch(timing.controlPlaneTimeoutMs, signal, options.fetch),
					}).request(
						"GET",
						`/run-cloud/sandboxes?limit=${INVENTORY_PAGE_SIZE}${cursor === undefined ? "" : `&cursor=${encodeURIComponent(cursor)}`}`,
					));
	const compute = nativeSdkCompute(
		async (createOptions: RuncloudCreateOptions, operation) => {
			try {
				return await allocate(sdk(), createOptions, timing, operation.signal);
			} catch (error) {
				// allocate() folds every non-definitive create failure, timeouts included, into this type.
				if (error instanceof RuncloudAmbiguousCreateError)
					unresolvedCreates.add(createOptions.name);
				if (!(error instanceof RunCloudError)) throw error;
				// The generic bridge deliberately does not infer vendor metadata. Preserve this SDK's
				// typed status so account admission can distinguish quota refusal from other failures.
				throw new DriverError("create-failed", error.message, {
					provider: "runcloud",
					vendorHttpStatus: error.status,
					vendorMessage: error.detail,
					cause: error,
				});
			}
		},
		(native) => ({
			sandboxId: native.id,
			runCommand: (command, commandOptions) =>
				execCommand(sdk(), native.id, command, commandOptions?.signal),
			destroy: () => destroySandbox(sdk(), native.id, timing),
		}),
	);
	return computeSdkSpec(compute, {
		sandboxId: RUNCLOUD_SANDBOX_ID,
		createOptions: {
			coverage: RUNCLOUD_REQUEST_COVERAGE,
			map: (request, unsupported) => {
				if (request.artifact.kind !== "image" || request.artifact.ref !== resolvedArtifact.ref) {
					unsupported("the request artifact does not match the resolved run.cloud image");
				}
				return {
					name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-${randomUUID()}`,
					image: resolvedArtifact.ref,
					cpu: request.spec.vcpus,
					memory: request.spec.memoryGb * 1024,
					...(request.spec.diskGb === undefined ? {} : { disk: request.spec.diskGb }),
					idlePauseSeconds: RUNCLOUD_SANDBOX_LIFETIME_SECS,
					timeoutSeconds: RUNCLOUD_SANDBOX_LIFETIME_SECS,
				} satisfies RuncloudCreateOptions;
			},
		},
		lifecycle: {
			destroy: async (sandbox, ref, operation) =>
				destroySandbox(sdk(), ref?.id ?? sandbox.getInstance().id, timing, operation.signal),
		},
		createRecovery: {
			absenceConfirmationMs: options.recoveryAbsenceConfirmationMs ?? 2_000,
			maxAttempts: 4,
			locator: (createOptions) => ({
				kind: "name",
				value: createOptions.name,
			}),
			isDefinitive: (error) =>
				isRuncloudDefinitiveCreateRejection(error) ||
				(error instanceof RuncloudBootFailureError && error.teardownConfirmed),
			isRetryableCreate: (error) =>
				runcloudCreateHttpStatus(error) === 429 ||
				(error instanceof RuncloudBootFailureError && error.hostGaveUp && error.teardownConfirmed),
			cleanup: async (_compute, locator, operation) => {
				const matches = await liveSandboxesNamed(sdk(), locator.value, timing, operation.signal);
				if (matches.length === 0) {
					if (unresolvedCreates.has(locator.value))
						throw new Error(
							"timed-out create has no terminal allocation verdict; empty lookups cannot confirm cancellation",
						);
					return { status: "absent" };
				}
				for (const match of matches) {
					await destroySandbox(sdk(), match.id, timing, operation.signal);
				}
				for (const match of matches) {
					if (!(await teardownConfirmed(sdk(), match.id, timing, operation.signal))) {
						throw new Error(
							`run.cloud sandbox ${match.id} has not confirmed teardown after create recovery`,
						);
					}
				}
				unresolvedCreates.delete(locator.value);
				return { status: "destroyed" };
			},
		},
		prepareAndVerifyCreatedRequest: async (_sandbox, native, request, operation) =>
			verifyRuncloudAllocation(sdk(), native, request, operation.signal),
		// The SDK's readFile/writeFile exist, but the harness never needed a filesystem here; the kit's
		// direct-exec fallback keeps one fewer vendor surface in the measurement path.
		hasWorkingFilesystem: false,
		probes: {
			observe: async (_compute, ref) => {
				try {
					const current = await bounded(`get sandbox ${ref.id}`, () => sdk().get(ref.id), timing);
					return runcloudObservation(current.state);
				} catch (error) {
					if (isNotFound(error)) return { state: "absent" };
					throw error;
				}
			},
			describe: (_compute, ref) =>
				bounded(`get sandbox ${ref.id}`, () => sdk().get(ref.id), timing),
			// This is the single-request control-plane latency probe; account admission uses the
			// complete paginated inventory below.
			list: () => bounded("list sandboxes", () => sdk().list(), timing),
		},
		inventory: {
			list: async (_compute, operation) => {
				const rows = await completeInventory(readInventoryPage, timing, operation.signal);
				const owned: string[] = [];
				let foreignCount = 0;
				for (const row of rows) {
					if (isTombstone(row.state)) continue;
					if (row.name?.startsWith(`${RUNCLOUD_RECOVERY_NAME_PREFIX}-`)) owned.push(row.id);
					else foreignCount += 1;
				}
				return { owned, foreignCount };
			},
		},
		destroyById: (_compute, ref, operation) =>
			destroySandbox(sdk(), ref.id, timing, operation.signal),
	});
}

export default defineComputeSdkDriver("runcloud", {
	provenance: RUNCLOUD_PROVENANCE,
	readiness: RUNCLOUD_READINESS,
	execution: RUNCLOUD_EXECUTION,
	createBudget: RUNCLOUD_CREATE_BUDGET,
	costEvidence: runcloudCostEvidence,
	spec: (context) => runcloudSpec(context),
});
