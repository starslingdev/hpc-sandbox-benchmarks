// Prototype of `@sandbox-benchmarks/driver/vendor/testing`: the in-memory vendor (the second
// adapter that makes the vendor seam real) and the port contract every adapter must satisfy.
// The kit's lifecycle behaviour is tested once against memoryVendor; provider packages test only
// their translation, then run vendorContract against their adapter over a stubbed transport.

import { expect, test } from "bun:test";
import type { ProviderId } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "./vendor.ts";
import { DISK_PROBE, drainPages } from "./vendor.ts";

export interface MemRow {
	readonly id: string;
	readonly marker?: string;
	state: Phase;
	gets: number;
}

export interface MemoryVendorOptions {
	readonly account?: "shared" | "dedicated";
	/** Gets observed in `pending` before a sandbox turns ready; 0 means create returns ready. */
	readonly readyAfterGets?: number;
	/** `accepted`: removal is observed one get later. `removed`: the delete proves removal. */
	readonly removal?: "accepted" | "removed";
	readonly pageSize?: number;
	readonly foreign?: number;
	readonly diskGb?: number;
	readonly faults?: {
		/** The vendor allocates, then the create response is lost. */
		readonly createAmbiguous?: boolean;
		/** The vendor refuses before allocating. */
		readonly createRefused?: { readonly retryable: boolean };
		/** The listing repeats its cursor instead of ending. */
		readonly pageRepeatsCursor?: boolean;
		/** A server-side marker lookup also returns an unrelated sandbox. */
		readonly findReturnsForeign?: boolean;
	};
}

class Refused extends Error {
	constructor(readonly retryable: boolean) {
		super("refused before allocation");
	}
}

export function memoryVendor(options: MemoryVendorOptions = {}) {
	const rows = new Map<string, MemRow>();
	const files = new Map<string, string>();
	const calls: string[] = [];
	let next = 0;
	const allocate = (marker?: string, state: Phase = "pending"): MemRow => {
		const row: MemRow = { id: `mem-${++next}`, ...(marker && { marker }), state, gets: 0 };
		rows.set(row.id, row);
		return row;
	};
	for (let index = 0; index < (options.foreign ?? 0); index++)
		allocate(`someone-else-${index}`, "ready");
	const readyAfter = options.readyAfterGets ?? 0;
	const record = (row: MemRow): VendorRecord<MemRow> => ({
		id: row.id,
		phase: row.state,
		...(row.marker !== undefined && options.account !== "dedicated" && { marker: row.marker }),
		raw: { ...row },
	});
	const live = () => [...rows.values()].filter((row) => row.state !== "gone");
	const pageOf = (list: readonly MemRow[], cursor: string | undefined) => {
		const size = options.pageSize ?? 100;
		const start = cursor === undefined ? 0 : Number(cursor);
		const slice = list.slice(start, start + size);
		const more = start + size < list.length;
		return {
			records: slice.map(record),
			...(more && {
				next: options.faults?.pageRepeatsCursor ? String(start) : String(start + size),
			}),
		};
	};
	let ambiguousPending = options.faults?.createAmbiguous ?? false;

	const vendor: Vendor<MemRow, MemRow> = {
		control: {
			create: async ({ marker }) => {
				calls.push("create");
				if (options.faults?.createRefused)
					throw new Refused(options.faults.createRefused.retryable);
				const row = allocate(marker, readyAfter === 0 ? "ready" : "pending");
				if (ambiguousPending) {
					ambiguousPending = false;
					throw new TypeError("connection reset after the vendor accepted the create");
				}
				return record(row);
			},
			get: async (id) => {
				calls.push("get");
				const row = rows.get(id);
				if (!row) return null;
				row.gets += 1;
				if (row.state === "pending" && row.gets >= readyAfter) row.state = "ready";
				if (row.state === "deleting") row.state = "gone";
				return record(row);
			},
			remove: async (id) => {
				calls.push("remove");
				const row = rows.get(id);
				if (!row || row.state === "gone") return "removed";
				if (options.removal === "removed") {
					row.state = "gone";
					return "removed";
				}
				row.state = "deleting";
				return "accepted";
			},
			page: async (cursor) => {
				calls.push("page");
				return pageOf(live(), cursor);
			},
			...((options.account === "dedicated" || options.faults?.findReturnsForeign) && {
				find: async (marker: string) => {
					calls.push("find");
					const mine = live().filter((row) => row.marker === marker);
					if (options.account === "dedicated")
						return { records: (mine.length ? mine : [allocate(marker, "ready")]).map(record) };
					const foreign = options.faults?.findReturnsForeign
						? [allocate("unrelated", "ready")]
						: [];
					return { records: [...mine, ...foreign].map(record) };
				},
			}),
			refused: (error) => (error instanceof Refused ? { retryable: error.retryable } : undefined),
		},
		data: {
			attach: (value) => value.raw,
			exec: async (_row, command) => {
				if (command === DISK_PROBE)
					return { exitCode: 0, stdout: `${(options.diskGb ?? 80) * 1024 * 1024}\n`, stderr: "" };
				return { exitCode: 0, stdout: `ran: ${command}\n`, stderr: "" };
			},
			files: {
				read: async (_row, path) => files.get(path) ?? "",
				write: async (_row, path, text) => {
					files.set(path, text);
				},
				exists: async (_row, path) => files.has(path),
			},
		},
	};
	return {
		vendor,
		calls,
		/** Allocations the vendor still holds that the benchmark created (leak detector). */
		allocations: () => live().filter((row) => row.marker?.startsWith("benchmark-")).length,
		live,
	};
}

/**
 * The port contract, runnable against any adapter. `make` returns a fresh adapter over a stubbed
 * transport; `marker` must be echoed back on shared accounts.
 */
export function vendorContract<Raw, Native>(
	name: string,
	make: () => { vendor: Vendor<Raw, Native>; account: "shared" | "dedicated" },
) {
	const op = { signal: new AbortController().signal };
	const request = {
		spec: { vcpus: 4, memoryGb: 8 },
		artifact: { kind: "none" },
		deadlineMs: 1,
	} as const;
	test(`${name}: get of an unknown id is null, not an error`, async () => {
		expect(await make().vendor.control.get("does-not-exist", op)).toBeNull();
	});
	test(`${name}: removing an unknown id is already removed`, async () => {
		expect(await make().vendor.control.remove("does-not-exist", op)).toBe("removed");
	});
	test(`${name}: a created sandbox is observable, listable and attributable`, async () => {
		const { vendor, account } = make();
		const created = await vendor.control.create({ request, marker: "benchmark-contract" }, op);
		expect((await vendor.control.get(created.id, op))?.id).toBe(created.id);
		// Drained with the kit's own fail-closed cursor rules, so a looping cursor fails, not hangs.
		const records = await drainPages(
			name as ProviderId,
			(cursor) => vendor.control.page(cursor, op),
			op,
		);
		expect(records.map((record) => record.id)).toContain(created.id);
		if (account === "shared") expect(created.marker).toBe("benchmark-contract");
	});
	test(`${name}: removal is eventually observed`, async () => {
		const { vendor } = make();
		const created = await vendor.control.create({ request, marker: "benchmark-remove" }, op);
		let outcome = await vendor.control.remove(created.id, op);
		for (let polls = 0; outcome !== "removed" && polls < 20; polls++) {
			const current = await vendor.control.get(created.id, op);
			if (current === null || current.phase === "gone") outcome = "removed";
		}
		expect(outcome).toBe("removed");
	});
}
