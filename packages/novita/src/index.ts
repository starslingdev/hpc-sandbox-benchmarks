// The Novita DriverModule: the kit's driver over Novita's adapter, bound to the real SDK here and
// nowhere else. Tests lower the same module over a stub SDK through `specFor`.

import { createRequire } from "node:module";
import { defineVendorDriver, pinned } from "@sandbox-benchmarks/driver/vendor";
import { NOVITA_PROVENANCE } from "./provenance.ts";
import type { NovitaSdk } from "./vendor.ts";
import { NOVITA_DOMAIN, NOVITA_SANDBOX_ID, novitaVendor } from "./vendor.ts";

export { NOVITA_DOMAIN, NOVITA_SANDBOX_ID };

// The SDK's CJS build, loaded once on first use: mixing its ESM build with CJS dependents makes
// Bun's require(chalk) race. This remains the native SDK; no wrapper internals are patched.
let sdk: NovitaSdk | undefined;
const loadSdk = (): NovitaSdk => {
	sdk ??= createRequire(import.meta.url)("novita-sandbox") as NovitaSdk;
	return sdk;
};

export default defineVendorDriver("novita", {
	provenance: NOVITA_PROVENANCE,
	sandboxId: NOVITA_SANDBOX_ID,
	// E2B protocol: the baked template pins 4 vCPU / 8 GiB; disk is proven after boot.
	coverage: pinned(4, 8),
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	vendor: (context) => novitaVendor(loadSdk(), context),
});
