// The E2B DriverModule: the kit's driver over E2B's adapter, bound to the real SDK here and
// nowhere else. Tests lower the same module over a stub SDK through `specFor`.

import { defineVendorDriver, pinned } from "@sandbox-benchmarks/driver/vendor";
import * as sdk from "e2b";
import { E2B_PROVENANCE } from "./provenance.ts";
import { E2B_ATTEMPT_METADATA_KEY, E2B_SANDBOX_ID, e2bVendor } from "./vendor.ts";

export { E2B_PROVENANCE, E2B_SANDBOX_ID };

export default defineVendorDriver("e2b", {
	provenance: E2B_PROVENANCE,
	sandboxId: E2B_SANDBOX_ID,
	// The template pins CPU and memory; E2B disk is platform-fixed and proven after boot.
	coverage: pinned(4, 8),
	// Commands budgeted at or past the 60s synchronous cap launch natively in the background.
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	markerKey: E2B_ATTEMPT_METADATA_KEY,
	vendor: (context) => e2bVendor(sdk, context),
});
