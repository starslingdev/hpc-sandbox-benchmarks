// The Munito Sandboxes DriverModule: the kit's driver over the adapter, bound to the real transport
// here and nowhere else. Tests lower the same module over a fake router through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { MUNITO_PROVENANCE } from "./provenance.ts";
import {
	MUNITO_CONTROL_TIMEOUT_MS,
	MUNITO_CREATE_ATTEMPTS,
	MUNITO_CREATE_RETRY_MAX_MS,
	MUNITO_CREATE_TIMEOUT_MS,
	MUNITO_EXEC_TIMEOUT_MS,
	MUNITO_MARKER_KEY,
	MUNITO_SANDBOX_ID,
	munitoSize,
	munitoVendor,
} from "./vendor.ts";

export { MUNITO_PROVENANCE, MUNITO_SANDBOX_ID };

/** The API fails a sandbox that does not start in 120 s; readiness waits longer than that. */
const READY_TIMEOUT_MS = 5 * 60_000;
/** A delete answers `stopped` at once; the budget covers a refused or dropped delete. */
const DELETE_TIMEOUT_MS = 2 * 60_000;
/** Every bound one create can spend: the attempts, readiness, the disk proof, and teardown. */
export const MUNITO_CREATE_CEILING_MS =
	MUNITO_CREATE_ATTEMPTS * MUNITO_CREATE_TIMEOUT_MS +
	(MUNITO_CREATE_ATTEMPTS - 1) * MUNITO_CREATE_RETRY_MAX_MS +
	READY_TIMEOUT_MS +
	MUNITO_EXEC_TIMEOUT_MS +
	DELETE_TIMEOUT_MS;

export default defineVendorDriver("munito", {
	provenance: MUNITO_PROVENANCE,
	sandboxId: MUNITO_SANDBOX_ID,
	// CPU and memory map onto a preset or a custom size, and the disk onto `disk_gib` up to
	// MUNITO_DISK_GIB; `unsupported` refuses a larger disk before any create. `prepare` checks the
	// size and the disk that the API reports, and the disk is proven after boot.
	coverage: coverage({
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: "mapped",
	}),
	unsupported: ({ spec }) => {
		const size = munitoSize(spec);
		return typeof size === "string" ? size : undefined;
	},
	// ext4 keeps part of the disk for its own metadata, which df does not count: 10 and 40 GiB disks
	// showed 9.68 and 38.75 GiB live (3.2%), so the proof allows 4% of the request and nothing more.
	diskProof: { allowanceRatio: 0.04 },
	// No background exec: steps near the 60 s policy cap detach through the kit's shell launcher.
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
	createBudget: { owner: "harness", timeoutMs: MUNITO_CREATE_CEILING_MS },
	timing: {
		pollMs: 1_000,
		readyTimeoutMs: READY_TIMEOUT_MS,
		removeRetryMs: 2_000,
		deleteTimeoutMs: DELETE_TIMEOUT_MS,
		controlTimeoutMs: MUNITO_CONTROL_TIMEOUT_MS,
	},
	// The list keeps every ended sandbox, 100 to a page.
	pageCap: 1_000,
	markerKey: MUNITO_MARKER_KEY,
	// A create that the API received can still land after every lookup, so an empty listing proves
	// nothing.
	recovery: { provesAbsence: false },
	vendor: (context) => munitoVendor(context, globalThis.fetch),
});
