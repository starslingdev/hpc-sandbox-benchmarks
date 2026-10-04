import { expect, test } from "bun:test";
import { observeRuncloudNamedCleanup } from "./cleanup-observation.ts";

const name = "sandbox-benchmarks-efda2427-1008-4157-91d0-2a06215216e9";
const tombstone = { id: "sbx-original", name, state: "destroyed" };

test("two complete paginated inventories bind the exact name to one destroyed identity", async () => {
	const cursors: Array<string | undefined> = [];
	const observation = await observeRuncloudNamedCleanup(name, AbortSignal.timeout(5000), {
		page: async (cursor) => {
			cursors.push(cursor);
			return cursor === undefined
				? {
						items: [{ ...tombstone, name: `${name}-foreign`, state: "running" }],
						nextCursor: "next",
					}
				: { items: [tombstone], nextCursor: null };
		},
	});
	expect(cursors).toEqual([undefined, "next", undefined, "next"]);
	expect(observation).toEqual({
		kind: "runcloud-named-sandbox",
		sandboxName: name,
		sandboxId: "sbx-original",
		state: "destroyed",
		inventoryPasses: 2,
	});
});

test("empty, fuzzy, live, duplicate and changing matches cannot attest cleanup", async () => {
	for (const fault of [
		"empty",
		"fuzzy",
		"running",
		"destroying",
		"failed",
		"duplicate",
		"changed",
		"lost",
	]) {
		let reads = 0;
		await expect(
			observeRuncloudNamedCleanup(name, AbortSignal.timeout(5000), {
				page: async () => {
					reads++;
					let items = [tombstone];
					if (fault === "empty" || (fault === "lost" && reads === 2)) items = [];
					if (fault === "fuzzy") items = [{ ...tombstone, name: `${name}-other` }];
					if (["running", "destroying", "failed"].includes(fault))
						items = [{ ...tombstone, state: fault }];
					if (fault === "duplicate") items = [tombstone, { ...tombstone, id: "sbx-duplicate" }];
					if (fault === "changed" && reads === 2) items = [{ ...tombstone, id: "sbx-other" }];
					return { items, nextCursor: null };
				},
			}),
		).rejects.toThrow();
	}
});

test("incomplete or failed reads and an aborted observer cannot authorize recovery", async () => {
	for (const fault of ["cursor", "envelope", "read", "abort"]) {
		const controller = new AbortController();
		await expect(
			observeRuncloudNamedCleanup(name, controller.signal, {
				page: async () => {
					if (fault === "read") throw new Error("transport unavailable");
					if (fault === "abort") controller.abort(new Error("observer stopped"));
					return { items: [tombstone], ...(fault === "envelope" ? {} : { nextCursor: "same" }) };
				},
			}),
		).rejects.toThrow();
	}
});
