// The Tangle Sandbox DriverModule: the kit's driver over the adapter, bound to @tangle-network/sandbox
// here and nowhere else. Tests lower the same module over a stub client through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { Sandbox } from "@tangle-network/sandbox";
import { type } from "arktype";
import { TANGLE_PROVENANCE } from "./provenance.ts";
import { CONTROL_TIMEOUT_MS, CREATE_TIMEOUT_MS, TANGLE_NAME, tangleVendor } from "./vendor.ts";

export { TANGLE_PROVENANCE };

const MIN = 60_000;

export default defineVendorDriver("tangle", {
	provenance: TANGLE_PROVENANCE,
	sandboxId: type(/^[A-Za-z0-9_-]{1,128}$/),
	// Disk is granted as a workspace quota rather than `/`, so the kit's `df` proves the capacity.
	coverage: coverage({
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: TARGET_SPEC.diskGb },
	}),
	diskProof: {},
	execution: { syncCapMs: MIN, durable: "native-launch" },
	// Create (15m), readiness (5m), cleanup (2m), and the preflight and disk proof (1m).
	createBudget: { owner: "harness", timeoutMs: CREATE_TIMEOUT_MS + 8 * MIN },
	timing: {
		pollMs: 2_000,
		readyTimeoutMs: 5 * MIN,
		deleteTimeoutMs: 2 * MIN,
		controlTimeoutMs: CONTROL_TIMEOUT_MS,
	},
	pageCap: 1_000,
	// The sandbox name carries the attempt's UUID; `get` is by id, so recovery scans the listing.
	markerKey: "name",
	markerSpelling: TANGLE_NAME,
	recovery: { provesAbsence: false },
	vendor: ({ env, resolvedArtifact }) =>
		tangleVendor(
			new Sandbox({ apiKey: env.TANGLE_API_KEY, baseUrl: "https://sandbox.tangle.tools" }),
			{ resolvedArtifact },
		),
});
