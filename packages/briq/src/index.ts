// The briq DriverModule: the kit's driver over the adapter, bound to the real transport here and
// nowhere else. Tests lower the same module over a fake router through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { BRIQ_PROVENANCE } from "./provenance.ts";
import {
	BRIQ_DATA_DIR,
	BRIQ_ID,
	briqVendor,
	CONTROL_TIMEOUT_MS,
	coveringSize,
	EXEC_TIMEOUT_MS,
	MARKER_LABEL,
	OFFERED_SIZES,
} from "./vendor.ts";

export { BRIQ_ID, BRIQ_PROVENANCE };

/** Creating includes a cold pull of the multi-GB toolchain image. */
const READY_TIMEOUT_MS = 10 * 60_000;
const DELETE_TIMEOUT_MS = 3 * 60_000;

export default defineVendorDriver("briq", {
	provenance: BRIQ_PROVENANCE,
	sandboxId: BRIQ_ID,
	// CPU and memory map onto fixed sizes (`prepare` proves the reported size). Disk is a volume
	// sized from the request and mounted where the toolchain keeps its state; the kit proves it there.
	coverage: coverage({
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: "mapped",
	}),
	unsupported: ({ spec }) =>
		coveringSize(spec)
			? undefined
			: `no briq size covers ${spec.vcpus} vCPU / ${spec.memoryGb} GiB (offered: ${OFFERED_SIZES})`,
	diskProof: { path: BRIQ_DATA_DIR, allowanceRatio: 0.06 },
	// The REST exec runs a command for at most 60 s and has no file API: long steps detach and are
	// polled over short execs, and the kit's exec-backed fallback serves files.
	execution: { syncCapMs: 45_000, durable: "shell-detach" },
	createBudget: {
		owner: "harness",
		timeoutMs: CONTROL_TIMEOUT_MS + READY_TIMEOUT_MS + 2 * EXEC_TIMEOUT_MS + DELETE_TIMEOUT_MS,
	},
	timing: {
		pollMs: 2_000,
		readyTimeoutMs: READY_TIMEOUT_MS,
		deleteTimeoutMs: DELETE_TIMEOUT_MS,
		controlTimeoutMs: CONTROL_TIMEOUT_MS,
	},
	// The benchmark's team holds only its own briqs: every live record is owned.
	account: "dedicated",
	// The marker is the create's Idempotency-Key and the label that tags the briq.
	markerKey: MARKER_LABEL,
	vendor: (context) => briqVendor(context, globalThis.fetch),
});
