// The Daytona DriverModules: the kit's driver over Daytona's adapter, bound to the real SDK here
// and nowhere else. Each isolation variant is the same module with its own target and class.
// Tests lower the same module over a stub client through `vendorDriver`.

import { Daytona } from "@daytona/sdk";
import { defineVendorDriver, pinned, VERBATIM_MARKER } from "@sandbox-benchmarks/driver/vendor";
import { DAYTONA_PROVENANCE } from "./provenance.ts";
import type { DaytonaId } from "./vendor.ts";
import { DAYTONA_CONTROL_TIMEOUT_MS, DAYTONA_SANDBOX_ID, daytonaVendor } from "./vendor.ts";

export type { DaytonaId };
export { DAYTONA_SANDBOX_ID };

export function defineDaytonaDriver<P extends DaytonaId>(id: P) {
	return defineVendorDriver(id, {
		provenance: DAYTONA_PROVENANCE,
		sandboxId: DAYTONA_SANDBOX_ID,
		// The snapshot pins CPU and memory; the allocation's reported disk is proven by `prepare`.
		coverage: pinned(4, 8),
		diskProof: "reported",
		// Daytona returns HTTP 408 on a multi-minute synchronous executeCommand while the process
		// keeps running (docs/evidence/daytona-exec-transport.md). The threshold is unmeasured, so
		// anything past a conservative 60s takes native background launch plus done-file polling.
		execution: { syncCapMs: 60_000, durable: "native-launch" },
		markerKey: "name",
		// Every create is named by its marker, so a lost create is looked up by that name.
		recovery: { lookup: VERBATIM_MARKER },
		// Lazy: the client is built only when a driver is bound, never on import.
		vendor: ({ env, resolvedArtifact }) =>
			daytonaVendor(
				{ resolvedArtifact },
				id === "daytona-container" ? "container" : "linux-vm",
				new Daytona({
					apiKey: env.DAYTONA_API_KEY,
					apiUrl: "https://app.daytona.io/api",
					target:
						"DAYTONA_CONTAINER_TARGET" in env ? env.DAYTONA_CONTAINER_TARGET : env.DAYTONA_TARGET,
					requestTimeoutMs: DAYTONA_CONTROL_TIMEOUT_MS,
				}),
			),
	});
}
