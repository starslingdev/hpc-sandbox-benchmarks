// The Runloop DriverModule: the kit's driver over Runloop's adapter, bound to the real SDK here and
// nowhere else. Tests lower the same module over a fake client through `specFor`.

import { RunloopSDK } from "@runloop/api-client";
import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import { RUNLOOP_PROVENANCE } from "./provenance.ts";
import {
	RUNLOOP_ATTEMPT_METADATA_KEY,
	RUNLOOP_CONTROL_TIMEOUT_MS,
	RUNLOOP_CREATE_TIMEOUT_MS,
	RUNLOOP_SANDBOX_ID,
	runloopVendor,
} from "./vendor.ts";

export { RUNLOOP_CREATE_TIMEOUT_MS, RUNLOOP_PROVENANCE, RUNLOOP_SANDBOX_ID };

/**
 * Pages one listing may span. Runloop never forgets a Devbox, so its `shutdown` and `failure`
 * tombstones accumulate in every listing; its only server-side filter is a single status, and a
 * union of per-status listings could miss a Devbox that changes status between them, hiding an
 * allocation from inventory. The whole account is drained instead, under this cap (100,000
 * records) rather than the kit's default 100 pages.
 */
const RUNLOOP_PAGE_CAP = 1_000;

export default defineVendorDriver("runloop", {
	provenance: RUNLOOP_PROVENANCE,
	sandboxId: RUNLOOP_SANDBOX_ID,
	// The create maps every axis; `custom_disk_size` provisions the root disk, but a filesystem never
	// exposes its whole device (a 40 GB request has reported a few hundred MiB less), so the disk is
	// still proven in-guest with that overhead allowed and no more.
	coverage: mapped(),
	diskProof: { allowanceGb: 1 },
	// Long steps leave the single control-plane request for background exec plus done-file polling.
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	createBudget: { owner: "harness", timeoutMs: RUNLOOP_CREATE_TIMEOUT_MS },
	// Readiness is Runloop's own long poll (`settle`); the interval spaces only a retry after a
	// long poll that ended early, and teardown's retrieves.
	timing: {
		pollMs: 1_000,
		readyTimeoutMs: RUNLOOP_CREATE_TIMEOUT_MS,
		controlTimeoutMs: RUNLOOP_CONTROL_TIMEOUT_MS,
	},
	markerKey: RUNLOOP_ATTEMPT_METADATA_KEY,
	pageCap: RUNLOOP_PAGE_CAP,
	// Constructing the SDK performs no I/O; one client per driver keeps the credential in one place.
	vendor: (context) =>
		runloopVendor(
			context,
			new RunloopSDK({
				bearerToken: context.env.RUNLOOP_API_KEY,
				timeout: RUNLOOP_CONTROL_TIMEOUT_MS,
				maxRetries: 2,
			}),
		),
});
