import { Client } from "@run-cloud/sdk";
import type { RuncloudTransport } from "./vendor.ts";
import { RUNCLOUD_CONTROL_TIMEOUT_MS } from "./vendor.ts";

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
