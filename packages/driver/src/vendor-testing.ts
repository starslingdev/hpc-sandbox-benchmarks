// @sandbox-benchmarks/driver/vendor/testing — the in-memory vendor (the second adapter that makes
// the vendor port real) and the port contract every adapter must satisfy (ADR-0023 §1, ADR-0008's
// kit tier). The kit's lifecycle behaviour is tested once against memoryVendor; provider packages
// test only their translation, then run vendorContract against their adapter over a stubbed
// transport.

import { expect, test } from "bun:test";
import type { ProviderId } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { DISK_PROBE, drainPages, MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { guestShell } from "./lib/guest.fixture.ts";

export interface MemoryRow {
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
	/** Live sandboxes another tenant of the account already holds. */
	readonly foreign?: number;
	/** The root filesystem capacity the guest reports to the kit's disk proof. */
	readonly diskGb?: number;
	/** Files present in every guest before the kit runs (an in-image marker, for fingerprinting). */
	readonly seedFiles?: Readonly<Record<string, string>>;
	readonly faults?: {
		/** The vendor allocates, then the create response is lost. */
		readonly createAmbiguous?: boolean;
		/** The vendor refuses before allocating. */
		readonly createRefused?: { readonly retryable: boolean };
		/** The listing repeats its cursor instead of ending. */
		readonly pageRepeatsCursor?: boolean;
		/** A server-side marker lookup also returns an unrelated sandbox. */
		readonly findReturnsForeign?: boolean;
		/** The vendor acknowledges every delete but never removes the sandbox. */
		readonly removalStalls?: boolean;
	};
}

class Refused extends Error {
	constructor(readonly retryable: boolean) {
		super("refused before allocation");
	}
}

/**
 * An in-memory vendor account. Each sandbox is a guest shell faithful to the commands the kit emits
 * (exec, the shell-detach launcher, the files fallback) and answers {@link DISK_PROBE}.
 */
export function memoryVendor(options: MemoryVendorOptions = {}) {
	const rows = new Map<string, MemoryRow>();
	const guests = new Map<string, ReturnType<typeof guestShell>>();
	const disks = new Map<string, Map<string, string>>();
	const calls: string[] = [];
	let next = 0;
	const allocate = (marker?: string, state: Phase = "pending"): MemoryRow => {
		const row: MemoryRow = { id: `mem-${++next}`, ...(marker && { marker }), state, gets: 0 };
		rows.set(row.id, row);
		const files = new Map(Object.entries(options.seedFiles ?? {}));
		disks.set(row.id, files);
		guests.set(
			row.id,
			guestShell(files, {
				answer: (command) =>
					command === DISK_PROBE
						? { stdout: `${(options.diskGb ?? 80) * 1024 * 1024}\n`, code: 0 }
						: undefined,
			}),
		);
		return row;
	};
	for (let index = 0; index < (options.foreign ?? 0); index++)
		allocate(`someone-else-${index}`, "ready");
	const readyAfter = options.readyAfterGets ?? 0;
	const record = (row: MemoryRow): VendorRecord<MemoryRow> => ({
		id: row.id,
		phase: row.state,
		...(row.marker !== undefined && options.account !== "dedicated" && { marker: row.marker }),
		raw: { ...row },
	});
	const live = () => [...rows.values()].filter((row) => row.state !== "gone");
	const pageOf = (list: readonly MemoryRow[], cursor: string | undefined) => {
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
	const reachable = (row: MemoryRow) => {
		if (row.state !== "ready") throw new Error(`sandbox ${row.id} is ${row.state}`);
		return row;
	};
	const disk = (row: MemoryRow) => disks.get(reachable(row).id) ?? new Map<string, string>();
	let ambiguousPending = options.faults?.createAmbiguous ?? false;

	const vendor: Vendor<MemoryRow, MemoryRow> = {
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
				if (row.state === "deleting" && !options.faults?.removalStalls) row.state = "gone";
				return record(row);
			},
			remove: async (id) => {
				calls.push("remove");
				const row = rows.get(id);
				if (!row || row.state === "gone") return "removed";
				if (options.removal === "removed" && !options.faults?.removalStalls) {
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
					// A dedicated account's lookup is an idempotent replay of the create itself.
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
			exec: async (row, command) => {
				const current = rows.get(row.id);
				if (!current) throw new Error(`sandbox ${row.id} does not exist`);
				const outcome = guests.get(reachable(current).id)?.(command);
				if (!outcome) throw new Error(`sandbox ${row.id} has no guest`);
				return { exitCode: outcome.code, stdout: outcome.stdout, stderr: outcome.stderr };
			},
			files: {
				read: async (row, path) => {
					const body = disk(rows.get(row.id) ?? row).get(path);
					if (body === undefined) throw new Error(`${path}: no such file`);
					return body;
				},
				write: async (row, path, text) => {
					disk(rows.get(row.id) ?? row).set(path, text);
				},
				exists: async (row, path) => disk(rows.get(row.id) ?? row).has(path),
			},
		},
	};
	return {
		vendor,
		/** Every port call, in order, for asserting the kit's call protocol. */
		calls,
		/** Allocations the vendor still holds that the benchmark created (leak detector). */
		allocations: () => live().filter((row) => row.marker?.startsWith(MARKER_PREFIX)).length,
		/** Every allocation the vendor still holds, benchmark-owned or not. */
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
		const marker = `${MARKER_PREFIX}contract`;
		const created = await vendor.control.create({ request, marker }, op);
		expect((await vendor.control.get(created.id, op))?.id).toBe(created.id);
		// Drained with the kit's own fail-closed cursor rules, so a looping cursor fails, not hangs.
		const records = await drainPages(
			name as ProviderId,
			(cursor) => vendor.control.page(cursor, op),
			op,
		);
		expect(records.map((record) => record.id)).toContain(created.id);
		if (account === "shared") expect(created.marker).toBe(marker);
	});
	test(`${name}: removal is eventually observed`, async () => {
		const { vendor } = make();
		const created = await vendor.control.create({ request, marker: `${MARKER_PREFIX}remove` }, op);
		let outcome = await vendor.control.remove(created.id, op);
		for (let polls = 0; outcome !== "removed" && polls < 20; polls++) {
			const current = await vendor.control.get(created.id, op);
			if (current === null || current.phase === "gone") outcome = "removed";
		}
		expect(outcome).toBe("removed");
	});
}
