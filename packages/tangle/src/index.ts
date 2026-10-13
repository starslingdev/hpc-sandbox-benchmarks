// The Tangle Sandbox DriverModule: the kit's driver over Tangle's adapter, bound to the real SDK
// here and nowhere else. Tests lower the same module over a stub client through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { Sandbox } from "@tangle-network/sandbox";
import { TANGLE_PROVENANCE } from "./provenance.ts";
import {
	TANGLE_CONTROL_TIMEOUT_MS,
	TANGLE_CREATE_TIMEOUT_MS,
	TANGLE_DEFAULT_BASE_URL,
	TANGLE_NAME,
	TANGLE_SANDBOX_ID,
	tangleVendor,
} from "./vendor.ts";

export { TANGLE_PROVENANCE, TANGLE_SANDBOX_ID };

/** Readiness is normally proven inside create; this bounds a create that answered `provisioning`. */
const TANGLE_READY_TIMEOUT_MS = 5 * 60_000;
const TANGLE_DELETE_TIMEOUT_MS = 2 * 60_000;

export default defineVendorDriver("tangle", {
	provenance: TANGLE_PROVENANCE,
	sandboxId: TANGLE_SANDBOX_ID,
	// CPU and memory map to the create's resources and are checked against the granted shape. The
	// create also requests the disk, but the API grants it as a workspace volume quota, not as `/`;
	// the kit's `df` proves the benchmark's filesystem has at least the target's capacity.
	coverage: coverage({
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: TARGET_SPEC.diskGb },
	}),
	diskProof: {},
	// Exec is a blocking runtime request with a vendor ceiling of 10 minutes; long sync transport is
	// unvalidated, so the repository's conservative 60s policy applies and longer steps run as
	// non-blocking spawned processes.
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	createBudget: {
		owner: "harness",
		timeoutMs:
			TANGLE_CREATE_TIMEOUT_MS + TANGLE_READY_TIMEOUT_MS + TANGLE_DELETE_TIMEOUT_MS + 60_000,
	},
	timing: {
		pollMs: 2_000,
		readyTimeoutMs: TANGLE_READY_TIMEOUT_MS,
		deleteTimeoutMs: TANGLE_DELETE_TIMEOUT_MS,
		controlTimeoutMs: TANGLE_CONTROL_TIMEOUT_MS,
	},
	pageCap: 1_000,
	// The attempt's UUID travels in the sandbox name; `get` is by id, so recovery lists by name.
	markerKey: "name",
	markerSpelling: TANGLE_NAME,
	// A create whose response was lost can still register after every bounded lookup.
	recovery: { provesAbsence: false },
	// Constructing the client performs no I/O.
	vendor: ({ env, resolvedArtifact }) =>
		tangleVendor(
			new Sandbox({
				apiKey: env.TANGLE_API_KEY,
				baseUrl: env.TANGLE_SANDBOX_BASE_URL ?? TANGLE_DEFAULT_BASE_URL,
			}),
			{ resolvedArtifact },
		),
});
