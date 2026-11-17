// The Tangle Sandbox DriverModule: the kit's driver over the adapter, bound to @tangle-network/sandbox
// here and nowhere else. Tests lower the same module over a stub client through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { Sandbox } from "@tangle-network/sandbox";
import { type } from "arktype";
import { TANGLE_PROVENANCE } from "./provenance.ts";
import { CREATE_TIMEOUT_MS, TANGLE_NAME, tangleVendor } from "./vendor.ts";

export { TANGLE_PROVENANCE };

const MIN = 60_000;
const BASE_URL = "https://sandbox.tangle.tools";

// The sandbox's ledger: a compute row per ~30 s tick, then one stop row, written with the delete.
const ledgerPage = type({
	success: "true",
	data: {
		items: type({
			id: "string",
			amount: "number <= 0",
			type: "'compute'",
			product: "'sandbox'",
			description: "string",
			referenceId: /^sandbox:(compute|stop):/,
			groupKey: "string",
		}).array(),
		total: "number.integer >= 0",
	},
});

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
	// The rows round hours to 0.01 h, so the ledger gives no billed seconds.
	billing: {
		operation: "GET /v1/billing/transactions?groupKey=sandbox:{sandboxId}",
		timing: { intervalMs: 3_000, stableReads: 4 },
		read: async ({ id, env, signal }) => {
			const rows = new Map<
				string,
				{ id: string; amount: number; tick: string; description: string }
			>();
			for (let offset = 0; offset < 800; offset += 100) {
				const query = new URLSearchParams({
					groupKey: `sandbox:${id}`,
					limit: "100",
					offset: `${offset}`,
				});
				const response = await fetch(`${BASE_URL}/v1/billing/transactions?${query}`, {
					headers: { Authorization: `Bearer ${env.TANGLE_API_KEY}` },
					signal,
				});
				if (!response.ok) throw new Error(`Tangle billing transactions: HTTP ${response.status}`);
				const body: unknown = await response.json();
				const page = ledgerPage(body);
				if (
					page instanceof type.errors ||
					page.data.items.some(
						(r) => r.groupKey !== `sandbox:${id}` || r.referenceId.split(":")[2] !== id,
					)
				) {
					return {
						missing: "invalid_provider_response",
						detail: "The ledger was not exactly this sandbox's compute rows.",
						evidence: { response: body },
					};
				}
				for (const r of page.data.items) {
					const tick = r.referenceId.split(":")[1] ?? "";
					rows.set(r.id, { id: r.id, amount: r.amount, tick, description: r.description });
				}
				if (rows.size < page.data.total && page.data.items.length === 100) continue;
				const items = [...rows.values()];
				const evidence = { request: { groupKey: `sandbox:${id}` }, items };
				return items.some((r) => r.tick === "stop")
					? { usd: -items.reduce((sum, r) => sum + r.amount, 0), evidence }
					: { pending: "The sandbox's final (stop) ledger row had not landed.", evidence };
			}
			return { missing: "invalid_provider_response", detail: "The ledger exceeded 800 rows." };
		},
	},
	vendor: ({ env, resolvedArtifact }) =>
		tangleVendor(new Sandbox({ apiKey: env.TANGLE_API_KEY, baseUrl: BASE_URL }), {
			resolvedArtifact,
		}),
});
