// The Vercel Sandbox DriverModule: the kit's driver over Vercel's adapter, bound to the real SDK
// here and nowhere else. Tests lower the same module over a stub SDK through `specFor`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { Sandbox } from "@vercel/sandbox";
import { VERCEL_PROVENANCE } from "./provenance.ts";
import {
	VERCEL_CONTROL_TIMEOUT_MS,
	VERCEL_MEMORY_GB_PER_VCPU,
	VERCEL_NAME,
	VERCEL_SANDBOX_ID,
	vercelVendor,
} from "./vendor.ts";

export { VERCEL_PROVENANCE, VERCEL_SANDBOX_ID };

export default defineVendorDriver("vercel", {
	provenance: VERCEL_PROVENANCE,
	sandboxId: VERCEL_SANDBOX_ID,
	// Memory is not an independent axis on Vercel: a request off the 2 GiB/vCPU line is refused
	// before treating both as mapped. Disk has no create-time knob and is proven after boot.
	coverage: coverage({ vcpus: "mapped", memoryGb: "mapped", diskGb: "runtime-verified" }),
	unsupported: ({ spec }) =>
		spec.memoryGb === spec.vcpus * VERCEL_MEMORY_GB_PER_VCPU
			? undefined
			: `Vercel derives memory at ${VERCEL_MEMORY_GB_PER_VCPU} GiB per vCPU; ${spec.vcpus} vCPU cannot carry ${spec.memoryGb} GiB`,
	// No hard vendor cap is claimed: long synchronous transport is unvalidated, so the conservative
	// 60s policy applies. A detached current-session command is the durable route.
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	timing: { controlTimeoutMs: VERCEL_CONTROL_TIMEOUT_MS },
	// The attempt's UUID travels in the sandbox name.
	markerKey: "name",
	markerSpelling: VERCEL_NAME,
	vendor: (context) => vercelVendor(Sandbox, context),
});
