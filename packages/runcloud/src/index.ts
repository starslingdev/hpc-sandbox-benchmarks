// The run.cloud DriverModule: the kit's driver over run.cloud's adapter, bound to the real SDK
// here and nowhere else. Tests lower the same module over a fake transport through `specFor`.

import { Client } from "@run-cloud/sdk";
import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import { runcloudCostEvidence } from "./cost.ts";
import { RUNCLOUD_PROVENANCE } from "./provenance.ts";
import type { RuncloudTransport } from "./vendor.ts";
import {
	RUNCLOUD_CONTROL_TIMEOUT_MS,
	RUNCLOUD_NAME,
	RUNCLOUD_RECONCILE_ATTEMPTS,
	RUNCLOUD_RECONCILE_RETRY_MS,
	RUNCLOUD_SANDBOX_ID,
	runcloudVendor,
} from "./vendor.ts";

export { RUNCLOUD_PROVENANCE, RUNCLOUD_SANDBOX_ID };

/** Poll cadence while a create sits in `building_image`/`starting`, and while a delete settles. */
export const RUNCLOUD_POLL_MS = 2_000;
/** Cold pulls of the ~1.5 GiB toolchain image on a first-use host can take several minutes. */
export const RUNCLOUD_READY_TIMEOUT_MS = 20 * 60_000;
/**
 * How long one destroy (the DELETE plus watching for `destroyed`/404) may take. run.cloud deletes
 * asynchronously and a record can sit in `destroying` well past a few polls: in run 36356024651 two
 * sandboxes failed cleanup after an ~8 s window and were found absent at recovery. 50 s keeps the
 * whole destroy inside the harness's 60 s destroy timeout.
 */
export const RUNCLOUD_REMOVAL_DEADLINE_MS = 50_000;
/**
 * Worst-case wall time one create can spend: the create POST, reconciling a lost response, the
 * readiness wait, the disk probe, and removing an allocation that failed. A ceiling, not an
 * expectation (the observed create is seconds): every internal bound settles inside it, so the
 * harness race never abandons a teardown mid-flight.
 */
export const RUNCLOUD_CREATE_CEILING_MS =
	RUNCLOUD_CONTROL_TIMEOUT_MS +
	RUNCLOUD_RECONCILE_ATTEMPTS * RUNCLOUD_CONTROL_TIMEOUT_MS +
	(RUNCLOUD_RECONCILE_ATTEMPTS - 1) * RUNCLOUD_RECONCILE_RETRY_MS +
	RUNCLOUD_READY_TIMEOUT_MS +
	RUNCLOUD_POLL_MS +
	RUNCLOUD_CONTROL_TIMEOUT_MS +
	RUNCLOUD_REMOVAL_DEADLINE_MS;

/** Every fetch bounded by the control-plane timeout and, for an inventory page, the caller. */
function boundedFetch(fetchImpl: typeof fetch, signal?: AbortSignal): typeof fetch {
	return Object.assign(
		(...[input, init]: Parameters<typeof fetch>) =>
			fetchImpl(input, {
				...init,
				signal: AbortSignal.any([
					AbortSignal.timeout(RUNCLOUD_CONTROL_TIMEOUT_MS),
					...(signal ? [signal] : []),
					...(init?.signal ? [init.signal] : []),
				]),
			}),
		{ preconnect: fetch.preconnect },
	);
}

/**
 * The real transport. Inventory reads the raw envelope at the API's 200-row maximum, because the
 * SDK's `list` drops `nextCursor` and admission must read every page, including old allocations
 * hidden behind newer `destroyed` tombstones.
 */
export function runcloudTransport(
	apiKey: string,
	fetchImpl: typeof fetch = fetch,
): RuncloudTransport {
	const client = (signal?: AbortSignal) =>
		new Client({ apiKey, fetch: boundedFetch(fetchImpl, signal) });
	return {
		sandboxes: client().sandboxes,
		page: (cursor, signal) =>
			client(signal).request(
				"GET",
				`/run-cloud/sandboxes?limit=200${cursor === undefined ? "" : `&cursor=${encodeURIComponent(cursor)}`}`,
			),
	};
}

export default defineVendorDriver("runcloud", {
	provenance: RUNCLOUD_PROVENANCE,
	sandboxId: RUNCLOUD_SANDBOX_ID,
	// The requested disk is a block-device quota the guest formats; its filesystem then reports the
	// device minus its own metadata (a 40 GiB request exposed 39.30 GiB live, 1.75%), so the proof
	// allows 3% of the request and nothing more.
	coverage: mapped(),
	diskProof: { allowanceRatio: 0.03 },
	createBudget: { owner: "harness", timeoutMs: RUNCLOUD_CREATE_CEILING_MS },
	costEvidence: runcloudCostEvidence,
	timing: {
		pollMs: RUNCLOUD_POLL_MS,
		readyTimeoutMs: RUNCLOUD_READY_TIMEOUT_MS,
		deleteTimeoutMs: RUNCLOUD_REMOVAL_DEADLINE_MS,
		controlTimeoutMs: RUNCLOUD_CONTROL_TIMEOUT_MS,
	},
	// A live 566-row account spans a few pages, most of them tombstones.
	pageCap: 1_000,
	markerKey: "name",
	markerSpelling: RUNCLOUD_NAME,
	// A timed-out POST can finish after every bounded lookup: empty lookups cannot prove it absent.
	recovery: { provesAbsence: false },
	// Lazy: the client is built only when a driver is bound, never on import.
	vendor: ({ env, resolvedArtifact }) =>
		runcloudVendor({ resolvedArtifact }, runcloudTransport(env.RUN_CLOUD_API_KEY)),
});
