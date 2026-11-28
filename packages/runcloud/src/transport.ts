import { Client } from "@run-cloud/sdk";
import type { RuncloudTransport } from "./vendor.ts";
import { RUNCLOUD_CONTROL_TIMEOUT_MS } from "./vendor.ts";

/** One cost read's bound (see cost.ts): well inside the harness's 30 s cost-hook budget. */
export const RUNCLOUD_COST_READ_TIMEOUT_MS = 8_000;

/** Every fetch bounded by the control-plane timeout and, for an inventory page, the caller. */
function boundedFetch(fetchImpl: typeof fetch, signal?: AbortSignal): typeof fetch {
	return Object.assign(
		(...[input, init]: Parameters<typeof fetch>) =>
			fetchImpl(input, {
				...init,
				signal: AbortSignal.any([
					AbortSignal.timeout(RUNCLOUD_CONTROL_TIMEOUT_MS),
					...(signal ? [signal] : []),
					...(init?.signal ? [init.signal] : []),
				]),
			}),
		{ preconnect: fetch.preconnect },
	);
}

/**
 * The real transport. Inventory reads the raw envelope at the API's 200-row maximum, because the
 * SDK's `list` drops `nextCursor` and admission must read every page, including old allocations
 * hidden behind newer `destroyed` tombstones.
 */
export function runcloudTransport(
	apiKey: string,
	fetchImpl: typeof fetch = fetch,
): RuncloudTransport {
	const client = (signal?: AbortSignal) =>
		new Client({ apiKey, fetch: boundedFetch(fetchImpl, signal) });
	return {
		sandboxes: client().sandboxes,
		page: (cursor, signal) =>
			client(signal).request(
				"GET",
				`/run-cloud/sandboxes?limit=200${cursor === undefined ? "" : `&cursor=${encodeURIComponent(cursor)}`}`,
			),
	};
}

/**
 * One sandbox's bill, `GET /run-cloud/sandboxes/{id}/cost`, as the raw body. Bounded by its own
 * short timeout (inside the control-plane bound) so a hung read leaves the cost hook time to answer.
 */
export function readRuncloudSandboxCost(
	apiKey: string,
	sandboxId: string,
	fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
	return new Client({
		apiKey,
		fetch: boundedFetch(fetchImpl, AbortSignal.timeout(RUNCLOUD_COST_READ_TIMEOUT_MS)),
	}).request("GET", `/run-cloud/sandboxes/${encodeURIComponent(sandboxId)}/cost`);
}
