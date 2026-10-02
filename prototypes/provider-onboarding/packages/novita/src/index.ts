import type { DriverContext } from "@sandbox-benchmarks/driver";
import { NOVITA_PROVENANCE } from "../../../../../packages/novita/src/provenance.ts";
import { defineVendorDriver, pinned } from "../../driver-vendor/src/vendor.ts";
import { loadNovitaSdk, NOVITA_DOMAIN } from "./sdk.ts";
import { NOVITA_SANDBOX_ID, novitaVendor } from "./vendor.ts";

export { NOVITA_DOMAIN, NOVITA_SANDBOX_ID };

const novita = defineVendorDriver("novita", {
	provenance: NOVITA_PROVENANCE,
	sandboxId: NOVITA_SANDBOX_ID,
	coverage: pinned(4, 8),
	durable: "native-launch",
	vendor: (context) => novitaVendor(loadNovitaSdk(), context),
});
export default novita;

/** Seam kept only so the provider's legacy test suite can inspect the lowered spec. */
export const novitaSpec = (context: DriverContext<"novita">) => novita.specFor(context);
