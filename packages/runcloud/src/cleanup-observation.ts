import type { CleanupRecovery } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { runcloudTransport } from "./index.ts";
import type { RuncloudTransport } from "./vendor.ts";
import { RUNCLOUD_SANDBOX_ID } from "./vendor.ts";

const nameSchema = type(
	/^sandbox-benchmarks-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
);
const pageSchema = type({
	items: type({ id: RUNCLOUD_SANDBOX_ID, state: "string", "name?": "string | null" }).array(),
	nextCursor: "string >= 1 | null",
});

/** An empty inventory cannot settle a lost POST; one identical destroyed tombstone can. */
export async function observeRuncloudNamedCleanup(
	name: string,
	signal: AbortSignal,
	transport: Pick<RuncloudTransport, "page"> = runcloudTransport(
		type("string >= 1").assert(process.env.RUN_CLOUD_API_KEY),
	),
): Promise<CleanupRecovery["observation"]> {
	nameSchema.assert(name);
	let sandboxId: string | undefined;
	for (let pass = 0; pass < 2; pass++) {
		let cursor: string | undefined;
		const seen = new Set<string>();
		const matches: Array<{ id: string; state: string }> = [];
		for (let page = 0; ; page++) {
			signal.throwIfAborted();
			const { items, nextCursor } = pageSchema.assert(await transport.page(cursor, signal));
			signal.throwIfAborted();
			matches.push(...items.filter((row) => row.name === name));
			if (nextCursor === null) break;
			if (seen.has(nextCursor) || page >= 999)
				throw new Error("Runcloud cleanup inventory is incomplete");
			seen.add(nextCursor);
			cursor = nextCursor;
		}
		const match = matches[0];
		if (matches.length !== 1 || !match || match.state !== "destroyed")
			throw new Error(
				"Runcloud cleanup requires exactly one destroyed sandbox with the retained name",
			);
		if (sandboxId !== undefined && sandboxId !== match.id)
			throw new Error("Runcloud named sandbox identity changed between inventories");
		sandboxId = match.id;
	}
	return {
		kind: "runcloud-named-sandbox",
		sandboxName: name,
		sandboxId: RUNCLOUD_SANDBOX_ID.assert(sandboxId),
		state: "destroyed",
		inventoryPasses: 2,
	};
}
