// The Brezel DriverModule: the kit's driver over Brezel's adapter, bound to the real transport here
// and nowhere else. Tests lower the same module over a fake transport through `specFor`.

import { defineVendorDriver, pinned } from "@sandbox-benchmarks/driver/vendor";
import { BREZEL_PROVENANCE } from "./provenance.ts";
import { BREZEL_CONTROL_TIMEOUT_MS, BREZEL_SANDBOX_ID, brezelVendor } from "./vendor.ts";

export { BREZEL_SANDBOX_ID };

export default defineVendorDriver("brezel", {
	provenance: BREZEL_PROVENANCE,
	sandboxId: BREZEL_SANDBOX_ID,
	// The operator-qualified environment revision pins 4 vCPU / 8 GiB; disk is proven after boot.
	coverage: pinned(4, 8),
	// The project holds only benchmark allocations (Brezel attaches no arbitrary labels).
	account: "dedicated",
	timing: { controlTimeoutMs: BREZEL_CONTROL_TIMEOUT_MS },
	recovery: { absenceConfirmationMs: 1000, maxAttempts: 3 },
	// The ownership marker is the create's Idempotency-Key.
	markerKey: "Idempotency-Key",
	vendor: (context) => brezelVendor(context, globalThis.fetch),
});
