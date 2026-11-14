// The Baseten Sandboxes DriverModule: the kit's driver over Baseten's adapter, bound to
// @basetenlabs/sandbox here and nowhere else. Tests lower the same module over a stub SDK through
// `vendorDriver`.

import { SandboxClient } from "@basetenlabs/sandbox";
import { defineVendorDriver, mapped, VERBATIM_MARKER } from "@sandbox-benchmarks/driver/vendor";
import { BASETEN_PROVENANCE } from "./provenance.ts";
import {
	BASETEN_PTS_DATA_DIR,
	BASETEN_SANDBOX_ID,
	BASETEN_VCPUS_BY_MEMORY_MB,
	basetenVendor,
} from "./vendor.ts";

export { BASETEN_PROVENANCE, BASETEN_SANDBOX_ID };

/** Creating includes a cold pull of the multi-GB toolchain image and mounting a fresh volume. */
const READY_TIMEOUT_MS = 10 * 60_000;
/** A sandbox takes minutes to terminate, and its volume can only be deleted after that. */
const DELETE_TIMEOUT_MS = 15 * 60_000;

export default defineVendorDriver("baseten", {
	provenance: BASETEN_PROVENANCE,
	sandboxId: BASETEN_SANDBOX_ID,
	// vCPU is mapped through memory, and disk through a sized persistent volume whose mount (where
	// the image links PTS and HOME) is proven after boot.
	coverage: mapped(),
	unsupported: ({ spec }) => {
		const memoryMb = spec.memoryGb * 1024;
		const vcpus = BASETEN_VCPUS_BY_MEMORY_MB[memoryMb];
		if (vcpus !== spec.vcpus)
			return `Baseten derives vCPU from memory; ${memoryMb} MiB gives ${vcpus ?? "no documented"} vCPU, not ${spec.vcpus}`;
		return spec.diskGb === undefined
			? "the Baseten toolchain image requires a mounted benchmark volume"
			: undefined;
	},
	diskProof: { path: BASETEN_PTS_DATA_DIR },
	// Long synchronous execs through the sandbox API are unvalidated; long steps use native processes.
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	timing: {
		pollMs: 2_000,
		readyTimeoutMs: READY_TIMEOUT_MS,
		removeRetryMs: 10_000,
		deleteTimeoutMs: DELETE_TIMEOUT_MS,
	},
	// The attempt's marker names the sandbox and its volume, so a create whose response was lost is
	// found by it.
	markerKey: "name",
	recovery: { lookup: VERBATIM_MARKER },
	vendor: (context) =>
		basetenVendor(new SandboxClient({ apiKey: context.env.BASETEN_API_KEY }), context),
});
