// The Blaxel DriverModule: the kit's driver over Blaxel's adapter, bound to @blaxel/core here and
// nowhere else. Tests lower the same module over a stub SDK through `vendorDriver`.

import { initialize, SandboxInstance } from "@blaxel/core";
import { defineVendorDriver, mapped, VERBATIM_MARKER } from "@sandbox-benchmarks/driver/vendor";
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
	// The sandbox's metered memory GB-s, by name. Its deleted (TERMINATED) record gives the memory and
	// the create-to-delete window the bill must cover; the meter trails live by ~18 s and settled 9 s
	// after delete (measured 2026-11-17).
	billing: {
		operation: "GET /v0/accounts/{accountId}/metrics",
		// Each read chains two ~0.1–3.5 s calls.
		timing: { requestTimeoutMs: 6_000, deadlineMs: 20_000 },
		read: async ({ id, env, signal }) => {
			const get = async (path: string) => {
				const response = await fetch(`https://api.blaxel.ai/v0${path}`, {
					headers: {
						Authorization: `Bearer ${env.BL_API_KEY}`,
						"X-Blaxel-Workspace": env.BL_WORKSPACE,
					},
					signal,
				});
				if (response.status === 404) return undefined;
				if (!response.ok)
					throw new Error(`Blaxel GET ${path.split("?")[0]} returned ${response.status}`);
				return response.json();
			};
			const [{ accountId }, found] = await Promise.all([
				get(`/workspaces/${env.BL_WORKSPACE}`).then(type({ accountId: "string >= 1" }).assert),
				get(`/sandboxes/${id}`),
			]);
			if (found === undefined)
				return {
					missing: "provider_api_error",
					detail:
						"Blaxel no longer has the deleted sandbox's record, so its memory and lifetime are unknown.",
				};
			const sandbox = type({
				status: "'TERMINATED'",
				metadata: { name: `'${id}'`, createdAt: "string.date.iso", updatedAt: "string.date.iso" },
				spec: { runtime: { memory: "number.integer > 0" } },
			})(found);
			if (sandbox instanceof type.errors)
				return {
					missing: "invalid_provider_response",
					detail: `Blaxel's sandbox record: ${sandbox.summary}`.slice(0, 512),
				};
			const { createdAt, updatedAt } = sandbox.metadata;
			const hour = (iso: string, plus = 0) =>
				new Date((Math.floor(Date.parse(iso) / 3_600_000) + plus) * 3_600_000).toISOString();
			const query = new URLSearchParams({
				resourceType: "sandbox",
				resourceName: id,
				groupBy: "resource_name,billing_dimension",
				startTime: hour(createdAt),
				endTime: hour(updatedAt, 2),
			});
			const body = type({
				summary: { totalCost: "number >= 0" },
				data: type({
					resourceName: `'${id}'`,
					billingDimension: "'sandbox_compute_runtime_gbs'",
					summary: { cost: "number >= 0", usage: "number >= 0" },
				})
					.array()
					.atMostLength(1),
			})(await get(`/accounts/${accountId}/metrics?${query}`));
			if (
				body instanceof type.errors ||
				Math.abs((body.data[0]?.summary.cost ?? 0) - body.summary.totalCost) > 1e-9
			)
				return {
					missing: "invalid_provider_response",
					detail:
						"The metrics response was not exactly this sandbox's sandbox_compute_runtime_gbs bill.",
				};
			const memoryGb = sandbox.spec.runtime.memory / 1024;
			const seconds = (body.data[0]?.summary.usage ?? 0) / memoryGb;
			const lifetime = (Date.parse(updatedAt) - Date.parse(createdAt)) / 1000;
			const evidence = {
				accountId,
				query: Object.fromEntries(query),
				sandbox: { createdAt, updatedAt, memoryMb: sandbox.spec.runtime.memory },
				summary: body.summary,
				data: body.data.map(({ resourceName, billingDimension, summary }) => ({
					resourceName,
					billingDimension,
					summary,
				})),
			};
			// Within 5 s: the record's timestamps are the control plane's, not the meter's.
			if (seconds < lifetime - 5)
				return {
					pending: `Blaxel's metrics lag: ${seconds} s billed of a ${lifetime} s lifetime.`,
					evidence,
				};
			return { usd: body.summary.totalCost, seconds, evidence };
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
