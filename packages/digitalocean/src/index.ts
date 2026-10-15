// The DigitalOcean MicroVMs DriverModule: the kit's driver over the adapter, bound to the real
// transport here and nowhere else. Tests lower the same module over a fake router through
// `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { DIGITALOCEAN_PROVENANCE } from "./provenance.ts";
import {
	CONTROL_TIMEOUT_MS,
	coveringSize,
	DIGITALOCEAN_MICROVM_ID,
	digitalOceanVendor,
	EXEC_TIMEOUT_MS,
	OFFERED_SIZES,
} from "./vendor.ts";

export { DIGITALOCEAN_MICROVM_ID, DIGITALOCEAN_PROVENANCE };

/** Creating includes a cold pull of the multi-GB toolchain image (~45-60s observed). */
const READY_TIMEOUT_MS = 10 * 60_000;
/** A delete is refused while the MicroVM is still provisioning, so teardown can outlast readiness. */
const DELETE_TIMEOUT_MS = READY_TIMEOUT_MS + 3 * 60_000;

export default defineVendorDriver("digitalocean", {
	provenance: DIGITALOCEAN_PROVENANCE,
	sandboxId: DIGITALOCEAN_MICROVM_ID,
	// CPU and memory map onto the fixed pairs (`prepare` proves the reported size). Disk has no
	// create-time knob; every pair's (50-400 GB) clears the target's, and it is proven after boot.
	coverage: coverage({
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: TARGET_SPEC.diskGb },
	}),
	unsupported: ({ spec }) =>
		coveringSize(spec)
			? undefined
			: `no DigitalOcean MicroVM size covers ${spec.vcpus} vCPU / ${spec.memoryGb} GiB (offered: ${OFFERED_SIZES})`,
	diskProof: {},
	// No file API and exec dies past ~41s: long steps detach and are polled over short execs.
	execution: { syncCapMs: 30_000, durable: "shell-detach" },
	// Every bound one create can spend: the POST, readiness, the exec-backed disk proof, and teardown.
	createBudget: {
		owner: "harness",
		timeoutMs: CONTROL_TIMEOUT_MS + READY_TIMEOUT_MS + 2 * EXEC_TIMEOUT_MS + DELETE_TIMEOUT_MS,
	},
	timing: {
		pollMs: 2_000,
		readyTimeoutMs: READY_TIMEOUT_MS,
		removeRetryMs: 5_000,
		deleteTimeoutMs: DELETE_TIMEOUT_MS,
	},
	// Each create is named by its marker; names are unique per region and listable by exact name.
	markerKey: "name",
	// A create whose response was lost may still allocate; an empty listing proves nothing yet.
	recovery: { provesAbsence: false },
	vendor: (context) => digitalOceanVendor(context, globalThis.fetch),
});
