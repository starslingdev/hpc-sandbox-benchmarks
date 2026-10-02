import type { DriverContext } from "@sandbox-benchmarks/driver";
import { BREZEL_PROVENANCE } from "../../../../../packages/brezel/src/provenance.ts";
import type { VendorTiming } from "../../driver-vendor/src/vendor.ts";
import { defineVendorDriver, pinned, vendorSpec } from "../../driver-vendor/src/vendor.ts";
import { BREZEL_SANDBOX_ID, brezelVendor } from "./vendor.ts";

export { BREZEL_SANDBOX_ID };

const brezel = defineVendorDriver("brezel", {
	provenance: BREZEL_PROVENANCE,
	sandboxId: BREZEL_SANDBOX_ID,
	coverage: pinned(4, 8),
	account: "dedicated",
	recovery: { absenceConfirmationMs: 1000, maxAttempts: 3 },
	vendor: (context) => brezelVendor(context, { fetch: globalThis.fetch }),
});
export default brezel;

/** Seam kept only so the provider's unmodified legacy test suite can inject fetch and timing. */
export interface BrezelSpecOptions extends Partial<VendorTiming> {
	readonly fetch?: typeof globalThis.fetch;
}
export const brezelSpec = (context: DriverContext<"brezel">, seams: BrezelSpecOptions = {}) =>
	vendorSpec(
		"brezel",
		context,
		{ ...brezel.traits, timing: seams },
		brezelVendor(context, { fetch: seams.fetch ?? globalThis.fetch }),
	);
