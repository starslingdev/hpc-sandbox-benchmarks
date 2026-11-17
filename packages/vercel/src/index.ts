// The Vercel Sandbox DriverModule: the kit's driver over Vercel's adapter, bound to the real SDK
// here and nowhere else. Tests lower the same module over a stub SDK through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { Sandbox } from "@vercel/sandbox";
import { VERCEL_PROVENANCE } from "./provenance.ts";
import {
	VERCEL_CONTROL_TIMEOUT_MS,
	VERCEL_MEMORY_GB_PER_VCPU,
	VERCEL_NAME,
	VERCEL_SANDBOX_ID,
	VERCEL_USAGE,
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
	// The attempt's UUID travels in the sandbox name, so a create whose response was lost is found
	// by it.
	markerKey: "name",
	markerSpelling: VERCEL_NAME,
	recovery: { lookup: VERCEL_NAME },
	vendor: (context) => vercelVendor(Sandbox, context),
	billing: {
		operation: "POST /v2/sandboxes/sessions/{sessionId}/stop",
		read: async ({ id }) => {
			const s = VERCEL_USAGE.get(id);
			VERCEL_USAGE.delete(id);
			if (s === undefined || "error" in s)
				return {
					missing: "provider_api_error",
					detail:
						s?.error ?? "Teardown kept no stopped-session usage; Vercel answers 404 once deleted.",
				};
			const evidence = { session: s };
			if (s.status !== "stopped" || s.duration === undefined || s.activeCpuDurationMs === undefined)
				return {
					missing: "invalid_provider_response",
					detail: "The stop reported no final usage.",
					evidence,
				};
			if (s.region !== "iad1")
				return {
					missing: "unsupported_public_api",
					detail: `Only iad1 rates are published here; ran in ${s.region}.`,
					evidence,
				};
			// Active CPU sums over vCPUs; Vercel's GB is 1024 MB.
			return {
				usage: {
					"active-cpu": s.activeCpuDurationMs / 3.6e6,
					memory: ((s.memory / 1024) * s.duration) / 3.6e6,
				},
				seconds: s.duration / 1000,
				final: true,
				evidence,
			};
		},
	},
});
