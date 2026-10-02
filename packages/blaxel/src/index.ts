// The Blaxel DriverModule: the kit's driver over Blaxel's adapter, bound to @blaxel/core here and
// nowhere else. Tests lower the same module over a stub SDK through `specFor`.

import { initialize, SandboxInstance } from "@blaxel/core";
import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import { BLAXEL_PROVENANCE } from "./provenance.ts";
import {
	BLAXEL_MEMORY_MB_PER_VCPU,
	BLAXEL_PTS_DATA_DIR,
	BLAXEL_SANDBOX_ID,
	blaxelVendor,
} from "./vendor.ts";

export { BLAXEL_PROVENANCE, BLAXEL_SANDBOX_ID };

export default defineVendorDriver("blaxel", {
	provenance: BLAXEL_PROVENANCE,
	sandboxId: BLAXEL_SANDBOX_ID,
	// vCPU is mapped through memory, and disk through a sized ephemeral volume whose mount (where the
	// image links PTS and HOME) is proven after boot.
	coverage: mapped(),
	unsupported: ({ spec }) =>
		spec.memoryGb * 1024 !== spec.vcpus * BLAXEL_MEMORY_MB_PER_VCPU
			? `Blaxel couples vCPU to RAM at ${BLAXEL_MEMORY_MB_PER_VCPU} MB per vCPU; ${spec.vcpus} vCPU and ${spec.memoryGb} GiB are off that curve`
			: spec.diskGb === undefined
				? "the Blaxel toolchain image requires a mounted benchmark volume"
				: undefined,
	diskProof: { path: BLAXEL_PTS_DATA_DIR },
	// Sync execs cross the sandbox gateway unvalidated past a minute; long steps use native processes.
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	// The attempt's marker is the sandbox name.
	markerKey: "name",
	vendor: (context) => {
		// The core SDK is configured process-wide. One benchmark cell drives one provider, so the
		// registry's parsed input slice is the only configuration this process ever applies.
		initialize({ apikey: context.env.BL_API_KEY, workspace: context.env.BL_WORKSPACE });
		return blaxelVendor(SandboxInstance, context);
	},
});
