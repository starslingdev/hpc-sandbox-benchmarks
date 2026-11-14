// The Spawnbox DriverModule: the kit's driver over the adapter, bound to the real transport here and
// nowhere else. Tests lower the same module over a fake router through `vendorDriver`.

import { defineVendorDriver, pinned } from "@sandbox-benchmarks/driver/vendor";
import { SPAWNBOX_PROVENANCE } from "./provenance.ts";
import {
	CONTROL_TIMEOUT_MS,
	SPAWNBOX_MARKER_LABEL,
	SPAWNBOX_SANDBOX_ID,
	spawnboxVendor,
} from "./vendor.ts";

export { SPAWNBOX_PROVENANCE, SPAWNBOX_SANDBOX_ID };

export default defineVendorDriver("spawnbox", {
	provenance: SPAWNBOX_PROVENANCE,
	sandboxId: SPAWNBOX_SANDBOX_ID,
	// The template pins 4 vCPU / 8 GiB (`prepare` proves it); disk is proven after boot with `df`.
	coverage: pinned(4, 8),
	timing: { controlTimeoutMs: CONTROL_TIMEOUT_MS },
	// Each create carries its marker as a label; listings echo it, so `find` filters on it.
	markerKey: SPAWNBOX_MARKER_LABEL,
	// A create whose response was lost may still finish restoring; an empty listing proves nothing yet.
	recovery: { provesAbsence: false },
	vendor: (context) => spawnboxVendor(context, globalThis.fetch),
});
