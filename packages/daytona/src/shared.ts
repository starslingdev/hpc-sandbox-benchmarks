// The Daytona DriverModules: the kit's driver over Daytona's adapter, bound to the real SDK here
// and nowhere else. daytona-vm runs on the v2 plane (Linux sandboxes are VMs), daytona-container on v0.
// Tests lower the same module over a stub client through `vendorDriver`.

import { Daytona } from "@daytona/sdk";
import { RootOnlyClientV0 } from "@daytona/sdk/v0";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Vendor } from "@sandbox-benchmarks/driver/vendor";
import { defineVendorDriver, pinned, VERBATIM_MARKER } from "@sandbox-benchmarks/driver/vendor";
import { daytonaCostEvidence } from "./cost.ts";
import { DAYTONA_PROVENANCE } from "./provenance.ts";
import type { DaytonaId } from "./vendor.ts";
import {
	DAYTONA_CONTROL_TIMEOUT_MS,
	DAYTONA_LISTING_TIMEOUT_MS,
	DAYTONA_SANDBOX_ID,
	daytonaV2Vendor,
	daytonaVendor,
} from "./vendor.ts";

export type { DaytonaId };
export { DAYTONA_SANDBOX_ID };

function defineDaytonaDriver<P extends DaytonaId, Raw, Native>(
	id: P,
	vendor: (context: DriverContext<P>) => Vendor<Raw, Native>,
) {
	return defineVendorDriver(id, {
		provenance: DAYTONA_PROVENANCE,
		sandboxId: DAYTONA_SANDBOX_ID,
		// The cell's CPU and memory (v2: guarantee and ceiling at create; v0: the snapshot); `prepare` proves them.
		// Disk is reported, not requested: daytona-container's snapshot is this org's 10 GiB ceiling,
		// not TARGET_SPEC.diskGb (40). v0 prepare() honors that ceiling; observed disk is recorded.
		coverage: pinned(4, 8),
		diskProof: "reported",
		// Daytona returns HTTP 408 on a multi-minute synchronous executeCommand while the process
		// keeps running (docs/evidence/daytona-exec-transport.md). The threshold is unmeasured, so
		// anything past a conservative 60s takes native background launch plus done-file polling.
		execution: { syncCapMs: 60_000, durable: "native-launch" },
		costEvidence: daytonaCostEvidence(id),
		markerKey: "name",
		// One listing page is the whole account (the SDK drains its own cursor); every other read is
		// already bounded by the SDK's per-request timeout.
		timing: { controlTimeoutMs: DAYTONA_LISTING_TIMEOUT_MS },
		// Every create is named by its marker, so a lost create is looked up by that name.
		recovery: { lookup: VERBATIM_MARKER, provesAbsence: false },
		// Lazy: the client is built only when a driver is bound, never on import.
		vendor,
	});
}

/** daytona-vm boots on the v2 control plane, where every Linux sandbox is a VM. */
export const defineDaytonaVmDriver = () =>
	defineDaytonaDriver("daytona-vm", ({ env, resolvedArtifact }) =>
		daytonaV2Vendor(
			{ resolvedArtifact },
			env.DAYTONA_TARGET,
			new Daytona({
				apiKey: env.DAYTONA_API_KEY,
				requestTimeoutSeconds: DAYTONA_CONTROL_TIMEOUT_MS / 1000,
			}).v2,
		),
	);

/** v2 has no container class, so daytona-container stays on the v0 control plane. */
export const defineDaytonaContainerDriver = () =>
	defineDaytonaDriver("daytona-container", ({ env, resolvedArtifact }) =>
		daytonaVendor(
			{ resolvedArtifact },
			"container",
			new RootOnlyClientV0({
				apiKey: env.DAYTONA_API_KEY,
				apiUrl: "https://app.daytona.io/api",
				target: env.DAYTONA_CONTAINER_TARGET,
				requestTimeoutMs: DAYTONA_CONTROL_TIMEOUT_MS,
			}),
		),
	);
