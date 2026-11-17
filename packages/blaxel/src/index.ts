// The Blaxel DriverModule: the kit's driver over Blaxel's adapter, bound to @blaxel/core here and
// nowhere else. Tests lower the same module over a stub SDK through `vendorDriver`.

import { initialize, SandboxInstance } from "@blaxel/core";
import {
	billingJson,
	defineVendorDriver,
	mapped,
	VERBATIM_MARKER,
} from "@sandbox-benchmarks/driver/vendor";
import type { Type } from "arktype";
import { type } from "arktype";
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
	// The bill is metered memory GB-s, by name. The deleted (TERMINATED) record gives the memory and
	// the create-to-delete window the bill must cover; the meter settles ~9 s after delete.
	billing: {
		operation: "GET /v0/accounts/{accountId}/metrics",
		read: async ({ id, window, env, signal }) => {
			const headers = {
				Authorization: `Bearer ${env.BL_API_KEY}`,
				"X-Blaxel-Workspace": env.BL_WORKSPACE,
			};
			const get = <T>(path: string, schema: Type<T>) =>
				billingJson(`https://api.blaxel.ai/v0${path}`, { headers, signal }, schema);
			const [{ accountId }, { metadata, spec }] = await Promise.all([
				get(`/workspaces/${env.BL_WORKSPACE}`, type({ accountId: "string" })),
				get(
					`/sandboxes/${id}`,
					type({
						status: "'TERMINATED'",
						metadata: { createdAt: "string.date.iso", updatedAt: "string.date.iso" },
						spec: { runtime: { memory: "number > 0" } },
					}),
				),
			]);
			const query = new URLSearchParams({
				resourceType: "sandbox",
				resourceName: id,
				groupBy: "resource_name,billing_dimension",
				startTime: window.since,
				endTime: window.until,
			});
			const metrics = await get(
				`/accounts/${accountId}/metrics?${query}`,
				type({
					summary: { totalCost: "number >= 0" },
					data: type({
						resourceName: `'${id}'`,
						billingDimension: "'sandbox_compute_runtime_gbs'",
						summary: { usage: "number >= 0" },
					})
						.array()
						.atMostLength(1),
				}),
			);
			const seconds = (metrics.data[0]?.summary.usage ?? 0) / (spec.runtime.memory / 1024);
			const { createdAt, updatedAt } = metadata;
			const lifetime = (Date.parse(updatedAt) - Date.parse(createdAt)) / 1000;
			const evidence = { accountId, createdAt, updatedAt, memoryMb: spec.runtime.memory, metrics };
			// Within 5 s: the record's timestamps are the control plane's, not the meter's.
			return seconds < lifetime - 5
				? { pending: `Blaxel's metrics lag: ${seconds} s billed of ${lifetime} s.`, evidence }
				: { usd: metrics.summary.totalCost, seconds, evidence };
		},
	},
	// The attempt's marker is the sandbox name, so a create whose response was lost is found by it.
	markerKey: "name",
	recovery: { lookup: VERBATIM_MARKER },
	vendor: (context) => {
		// The core SDK is configured process-wide. One benchmark cell drives one provider, so the
		// registry's parsed input slice is the only configuration this process ever applies.
		initialize({ apikey: context.env.BL_API_KEY, workspace: context.env.BL_WORKSPACE });
		return blaxelVendor(SandboxInstance, context);
	},
});
