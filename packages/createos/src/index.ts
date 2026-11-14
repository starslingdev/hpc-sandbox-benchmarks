// The CreateOS DriverModule: the kit's driver over the adapter, bound to @nodeops-createos/sandbox
// here and nowhere else. Tests lower the same module over a stub transport through `vendorDriver`.

import { CreateosSandboxClient } from "@nodeops-createos/sandbox";
import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { type } from "arktype";
import { CREATEOS_PROVENANCE } from "./provenance.ts";
import { CREATEOS_MARKER, createosVendor, SYNC_CAP_MS } from "./vendor.ts";

export { CREATEOS_PROVENANCE };

const MIN = 60_000;

export default defineVendorDriver("createos", {
	provenance: CREATEOS_PROVENANCE,
	sandboxId: type(/^sb[-_][A-Za-z0-9]+$/),
	coverage: mapped(),
	// The only shape requested is the target's; `prepare` proves the allocation reports it.
	unsupported: ({ spec }) =>
		spec.vcpus === TARGET_SPEC.vcpus &&
		spec.memoryGb === TARGET_SPEC.memoryGb &&
		spec.diskGb === TARGET_SPEC.diskGb
			? undefined
			: "CreateOS requires 4 vCPU, 8 GiB RAM and a 40 GiB overlay",
	diskProof: { allowanceRatio: 0.03 },
	execution: { syncCapMs: SYNC_CAP_MS, durable: "shell-detach" },
	// Boot (10m), readiness (3m), preparation (2m), disk proof (1m), cleanup (5m), and reads.
	createBudget: { owner: "harness", timeoutMs: 22 * MIN },
	timing: {
		pollMs: 1_000,
		readyTimeoutMs: 3 * MIN,
		deleteTimeoutMs: 5 * MIN,
		controlTimeoutMs: 30_000,
	},
	markerKey: "envs",
	markerSpelling: CREATEOS_MARKER,
	// A create whose response was lost may still allocate; an empty listing proves nothing yet.
	recovery: { provesAbsence: false },
	vendor: ({ env }) =>
		createosVendor(
			// A retried POST must not obscure whether an earlier attempt allocated a VM.
			new CreateosSandboxClient({ apiKey: env.CREATEOS_API_KEY, timeoutMs: 30_000, retry: false }),
		),
});
