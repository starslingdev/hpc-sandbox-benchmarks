// The Runloop DriverModule: the kit's driver over Runloop's adapter, bound to the real SDK here and
// nowhere else. Tests lower the same module over a fake client through `specFor`.

import { RunloopSDK } from "@runloop/api-client";
import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import { RUNLOOP_PROVENANCE } from "./provenance.ts";
import {
	RUNLOOP_ATTEMPT_METADATA_KEY,
	RUNLOOP_CONTROL_TIMEOUT_MS,
	RUNLOOP_SANDBOX_ID,
	runloopVendor,
} from "./vendor.ts";

export { RUNLOOP_PROVENANCE, RUNLOOP_SANDBOX_ID };

/**
 * A cold Blueprint boot happens inside create: this bounds readiness and is the harness-owned
 * create budget, so the two cannot disagree about how long one attempt may take.
 */
export const RUNLOOP_CREATE_TIMEOUT_MS = 20 * 60_000;

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
	timing: {
		pollMs: 1_000,
		readyTimeoutMs: RUNLOOP_CREATE_TIMEOUT_MS,
		controlTimeoutMs: RUNLOOP_CONTROL_TIMEOUT_MS,
	},
	markerKey: RUNLOOP_ATTEMPT_METADATA_KEY,
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
