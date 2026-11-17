// The Tangle Sandbox DriverModule: the kit's driver over the adapter, bound to @tangle-network/sandbox
// here and nowhere else. Tests lower the same module over a stub client through `vendorDriver`.

import { billingJson, coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { Sandbox } from "@tangle-network/sandbox";
import { type } from "arktype";
import { TANGLE_PROVENANCE } from "./provenance.ts";
import { CREATE_TIMEOUT_MS, TANGLE_NAME, tangleVendor } from "./vendor.ts";

export { TANGLE_PROVENANCE };

const MIN = 60_000;

export default defineVendorDriver("tangle", {
	provenance: TANGLE_PROVENANCE,
	sandboxId: type(/^[A-Za-z0-9_-]{1,128}$/),
	// Disk is granted as a workspace quota rather than `/`, so the kit's `df` proves the capacity.
	coverage: coverage({
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: TARGET_SPEC.diskGb },
	}),
	diskProof: {},
	execution: { syncCapMs: MIN, durable: "native-launch" },
	// Create (15m), readiness (5m), cleanup (2m), and the preflight and disk proof (1m).
	createBudget: { owner: "harness", timeoutMs: CREATE_TIMEOUT_MS + 8 * MIN },
	timing: { pollMs: 2_000, readyTimeoutMs: 5 * MIN, deleteTimeoutMs: 2 * MIN },
	// The sandbox name carries the attempt's UUID; `get` is by id, so recovery scans the listing.
	markerKey: "name",
	markerSpelling: TANGLE_NAME,
	recovery: { provesAbsence: false },
	// One compute row per ~30 s tick, then one stop row written with the delete: the stop row means
	// the ledger is final. The rows round hours to 0.01 h, so the ledger gives no billed seconds.
	billing: {
		operation: "GET /v1/billing/transactions?groupKey=sandbox:{sandboxId}",
		stableReads: 1,
		read: async ({ id, env, signal }) => {
			const page = type({
				data: {
					items: type({
						id: "string",
						amount: "number <= 0",
						type: "'compute'",
						groupKey: `'sandbox:${id}'`,
						referenceId: new RegExp(`^sandbox:(compute|stop):${id}:`),
					}).array(),
					total: "number",
				},
			});
			const rows = new Map<string, (typeof page.infer.data.items)[number]>();
			for (let offset = 0; offset < 800; offset += 100) {
				const query = new URLSearchParams({
					groupKey: `sandbox:${id}`,
					limit: "100",
					offset: `${offset}`,
				});
				const { data } = await billingJson(
					`https://sandbox.tangle.tools/v1/billing/transactions?${query}`,
					{ headers: { Authorization: `Bearer ${env.TANGLE_API_KEY}` }, signal },
					page,
				);
				for (const row of data.items) rows.set(row.id, row);
				if (data.items.length === 100 && rows.size < data.total) continue;
				const items = [...rows.values()];
				return items.some((row) => row.referenceId.startsWith("sandbox:stop:"))
					? { usd: -items.reduce((sum, row) => sum + row.amount, 0), evidence: items }
					: { pending: "The sandbox's stop row had not landed.", evidence: items };
			}
			return { missing: "invalid_provider_response", detail: "The ledger exceeded 800 rows." };
		},
	},
	vendor: ({ env, resolvedArtifact }) =>
		tangleVendor(
			new Sandbox({ apiKey: env.TANGLE_API_KEY, baseUrl: "https://sandbox.tangle.tools" }),
			{ resolvedArtifact },
		),
});
