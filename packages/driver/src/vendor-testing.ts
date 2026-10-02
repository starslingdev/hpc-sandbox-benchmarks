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
	/** Gets observed while `deleting`. */
	deletingGets: number;
}

export interface MemoryVendorOptions {
	readonly account?: "shared" | "dedicated";
	/** Gets observed in `pending` before a sandbox turns ready; 0 means create returns ready. */
	readonly readyAfterGets?: number;
	/** `accepted`: removal is observed after `removalAfterGets`. `removed`: the delete proves removal. */
	readonly removal?: "accepted" | "removed";
	/** Gets that still observe `deleting` after an accepted delete (default 0: the next get is gone). */
	readonly removalAfterGets?: number;
	readonly pageSize?: number;
	/** Live sandboxes another tenant of the account already holds. */
	readonly foreign?: number;
	/** The root filesystem capacity the guest reports to the kit's disk proof. */
	readonly diskGb?: number;
	/** Files present in every guest before the kit runs (an in-image marker, for fingerprinting). */
	readonly seedFiles?: Readonly<Record<string, string>>;
	/** Serve a server-side marker lookup (`find`) on a shared account too. */
	readonly lookup?: boolean;
	/** Every control-plane call answers this late, ignoring its signal (a slow or hung transport). */
	readonly latencyMs?: number;
	readonly faults?: {
		/** The vendor allocates, then the create response is lost. */
		readonly createAmbiguous?: boolean;
		/** Listings and lookups that do not yet show an ambiguous create's allocation. */
		readonly ambiguousHiddenForListings?: number;
		/** The vendor refuses before allocating. */
		readonly createRefused?: { readonly retryable: boolean };
		/** A pending sandbox fails instead of becoming ready. */
		readonly failsDuringReadiness?: boolean;
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
	const faults = options.faults ?? {};
	let next = 0;
	const allocate = (marker?: string, state: Phase = "pending"): MemoryRow => {
		const row: MemoryRow = {
			id: `mem-${++next}`,
			...(marker && { marker }),
			state,
			gets: 0,
			deletingGets: 0,
		};
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
	let hiddenListings = faults.ambiguousHiddenForListings ?? 0;
	let hidden: string | undefined;
	/** What one listing or lookup sees: everything live, minus a not-yet-visible allocation. */
	const listed = () => {
		const visible = [...rows.values()].filter(
			(row) => row.state !== "gone" && !(hiddenListings > 0 && row.id === hidden),
		);
		if (hiddenListings > 0 && hidden !== undefined) hiddenListings -= 1;
		return visible;
	};
	const live = () => [...rows.values()].filter((row) => row.state !== "gone");
	const pageOf = (list: readonly MemoryRow[], cursor: string | undefined) => {
		const size = options.pageSize ?? 100;
		const start = cursor === undefined ? 0 : Number(cursor);
		const slice = list.slice(start, start + size);
		const more = start + size < list.length;
		return {
			records: slice.map(record),
			...(more && { next: faults.pageRepeatsCursor ? String(start) : String(start + size) }),
		};
	};
	const reachable = (row: MemoryRow) => {
		if (row.state !== "ready") throw new Error(`sandbox ${row.id} is ${row.state}`);
		return row;
	};
	const disk = (id: string) => {
		const row = rows.get(id);
		if (!row) throw new Error(`sandbox ${id} does not exist`);
		return disks.get(reachable(row).id) ?? new Map<string, string>();
	};
	const control = async (name: string) => {
		calls.push(name);
		if (options.latencyMs) await Bun.sleep(options.latencyMs);
	};
	let ambiguousPending = faults.createAmbiguous ?? false;

	const vendor: Vendor<MemoryRow, MemoryRow> = {
		control: {
			create: async ({ marker }) => {
				await control("create");
				if (faults.createRefused) throw new Refused(faults.createRefused.retryable);
				const row = allocate(marker, readyAfter === 0 ? "ready" : "pending");
				if (ambiguousPending) {
					ambiguousPending = false;
					hidden = row.id;
					throw new TypeError("connection reset after the vendor accepted the create");
				}
				return record(row);
			},
			get: async (id) => {
				await control("get");
				const row = rows.get(id);
				if (!row) return null;
				row.gets += 1;
				if (row.state === "pending" && row.gets >= readyAfter)
					row.state = faults.failsDuringReadiness ? "failed" : "ready";
				if (row.state === "deleting" && !faults.removalStalls) {
					if (row.deletingGets >= (options.removalAfterGets ?? 0)) row.state = "gone";
					row.deletingGets += 1;
				}
				return record(row);
			},
			remove: async (id) => {
				await control("remove");
				const row = rows.get(id);
				if (!row || row.state === "gone") return "removed";
				if (options.removal === "removed" && !faults.removalStalls) {
					row.state = "gone";
					return "removed";
				}
				row.state = "deleting";
				return "accepted";
			},
			page: async (cursor) => {
				await control("page");
				return pageOf(listed(), cursor);
			},
			...((options.account === "dedicated" || options.lookup || faults.findReturnsForeign) && {
				find: async (marker: string) => {
					await control("find");
					// A dedicated account's lookup is an idempotent replay of the create itself: it
					// allocates at most once per marker and afterwards returns that same resource,
					// even once it is gone.
					if (options.account === "dedicated") {
						const mine = [...rows.values()].filter((row) => row.marker === marker);
						return { records: (mine.length ? mine : [allocate(marker, "ready")]).map(record) };
					}
					const mine = listed().filter((row) => row.marker === marker);
					const foreign = faults.findReturnsForeign ? [allocate("unrelated", "ready")] : [];
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
					const body = disk(row.id).get(path);
					if (body === undefined) throw new Error(`${path}: no such file`);
					return body;
				},
				write: async (row, path, text) => {
					disk(row.id).set(path, text);
				},
				exists: async (row, path) => disk(row.id).has(path),
			},
		},
	};
	return {
		vendor,
		/** Every control-plane call, in order, for asserting the kit's call protocol. */
		calls,
		/** Allocations the vendor still holds that the benchmark created (leak detector). */
		allocations: () => live().filter((row) => row.marker?.startsWith(MARKER_PREFIX)).length,
		/** Every allocation the vendor still holds, benchmark-owned or not. */
		live,
	};
}

/**
 * The port contract, runnable against any adapter. `make` returns a fresh adapter over a stubbed
 * transport whose sandboxes become ready within a few gets and answer `sh -c 'exit 7'` with exit 7.
 * On a shared account every record must carry the create-time marker the kit attributes it by.
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
	const create = (vendor: Vendor<Raw, Native>, marker: string) =>
		vendor.control.create({ request, marker: `${MARKER_PREFIX}${marker}` }, op);
	const drain = (
		fetch: (
			cursor: string | undefined,
		) => Promise<{ records: readonly VendorRecord<Raw>[]; next?: string }>,
	) =>
		// The kit's own fail-closed cursor rules, so a looping cursor fails, not hangs.
		drainPages(name as ProviderId, fetch, op);

	test(`${name}: get of an unknown id is null, not an error`, async () => {
		expect(await make().vendor.control.get("does-not-exist", op)).toBeNull();
	});

	test(`${name}: removing an unknown id is already removed`, async () => {
		expect(await make().vendor.control.remove("does-not-exist", op)).toBe("removed");
	});

	test(`${name}: a created sandbox is observable, listable and attributable`, async () => {
		const { vendor, account } = make();
		const created = await create(vendor, "contract");
		const observed = await vendor.control.get(created.id, op);
		expect(observed?.id).toBe(created.id);
		const listed = (await drain((cursor) => vendor.control.page(cursor, op))).filter(
			(record) => record.id === created.id,
		);
		expect(listed).toHaveLength(1);
		if (account === "shared")
			for (const record of [created, observed, ...listed])
				expect(record?.marker).toBe(`${MARKER_PREFIX}contract`);
	});

	test(`${name}: a marker lookup returns only what the marker attributes`, async () => {
		const { vendor, account } = make();
		const find = vendor.control.find;
		if (!find) {
			expect(account).toBe("shared"); // a dedicated account recovers by replay, through find
			return;
		}
		const mine = await create(vendor, "find-mine");
		await create(vendor, "find-other");
		const found = await drain((cursor) => find(`${MARKER_PREFIX}find-mine`, cursor, op));
		expect(found.map((record) => record.id)).toContain(mine.id);
		for (const record of found)
			if (account === "shared" || record.marker !== undefined)
				expect(record.marker).toBe(`${MARKER_PREFIX}find-mine`);
	});

	test(`${name}: removal is eventually observed, and "removed" means gone`, async () => {
		const { vendor } = make();
		const created = await create(vendor, "remove");
		let outcome = await vendor.control.remove(created.id, op);
		for (let polls = 0; outcome !== "removed" && polls < 20; polls++) {
			const current = await vendor.control.get(created.id, op);
			if (current === null || current.phase === "gone") outcome = "removed";
		}
		expect(outcome).toBe("removed");
		const after = await vendor.control.get(created.id, op);
		expect(after === null || after.phase === "gone").toBe(true);
	});

	test(`${name}: a ready sandbox attaches, executes, and round-trips files`, async () => {
		const { vendor } = make();
		let current: VendorRecord<Raw> | null = await create(vendor, "data");
		for (let polls = 0; current?.phase === "pending" && polls < 20; polls++)
			current = await vendor.control.get(current.id, op);
		if (current === null) throw new Error("the created sandbox disappeared before readiness");
		expect(current.phase).toBe("ready");
		const native = await vendor.data.attach(current, op);
		const seven = await vendor.data.exec(native, "sh -c 'exit 7'");
		expect(seven.exitCode).toBe(7);
		const files = vendor.data.files;
		if (files) {
			await files.write(native, "/tmp/vendor-contract", "round trip");
			expect(await files.read(native, "/tmp/vendor-contract")).toBe("round trip");
			if (files.exists) expect(await files.exists(native, "/tmp/vendor-contract")).toBe(true);
		}
	});
}
