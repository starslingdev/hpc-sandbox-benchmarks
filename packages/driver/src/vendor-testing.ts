// @sandbox-benchmarks/driver/vendor/testing — the in-memory vendor (the second adapter that makes
// the vendor port real) and the port contract every adapter must satisfy (ADR-0023 §1, ADR-0008's
// kit tier). The kit's lifecycle behaviour is tested once against memoryVendor; provider packages
// test only their translation, then run vendorContract against their adapter over a stubbed
// transport: the shared e2bProtocolStub for an E2B-protocol SDK, an sdkStub surface for another
// SDK, a restStub route table for a REST API.

import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DriverContext, EnvOf, ProviderId, SandboxDriver } from "@sandbox-benchmarks/driver";
import type { OciArtifactBuildRequest } from "@sandbox-benchmarks/driver/artifact";
import { parseDriverEnv, sensitiveEnvValuesFor } from "@sandbox-benchmarks/driver/env";
import type {
	MarkerSpelling,
	Phase,
	Vendor,
	VendorDriverModule,
	VendorHandle,
	VendorOverrides,
	VendorRecord,
	VendorTraits,
} from "@sandbox-benchmarks/driver/vendor";
import {
	abortableDelay,
	DISK_PROBE,
	diskProbe,
	drainPages,
	MARKER_PREFIX,
} from "@sandbox-benchmarks/driver/vendor";
import { normalizeProviderInput } from "@sandbox-benchmarks/schema/provider-meta";
import { REGISTRY } from "@sandbox-benchmarks/schema/providers";
import { driverFromComputeSpec } from "./lib/computesdk.ts";
import { guestShell } from "./lib/guest.fixture.ts";
import type { KitVendor } from "./lib/vendor-port.ts";
import { kitPort } from "./lib/vendor-port.ts";

/**
 * An adapter as the kit calls it: its declared not-found read as absence, a `recovery.lookup` as
 * its marker lookup, no call started on a cancelled signal. Translation tests read through it.
 */
export { kitPort };

/**
 * A provider's own module lowered over another vendor or timing (its adapter over a stubbed
 * transport) into the driver its `driver(context)` would build, credentials redacted the same way.
 */
export function vendorDriver<P extends ProviderId, Raw, Native>(
	module: VendorDriverModule<P, Raw, Native>,
	context: DriverContext<P>,
	overrides: VendorOverrides<Raw, Native> = {},
): SandboxDriver<VendorHandle<Raw, Native>> {
	return driverFromComputeSpec(
		module.id,
		module.specFor(context, overrides),
		context.resolvedArtifact,
		sensitiveEnvValuesFor(module.id, context.env),
	);
}

/**
 * A provider's driver context for its tests, derived from its registry entry: every required input
 * set to a sentinel (`<name>-test`), defaults applied, and the declared artifact resolved to a test
 * ref. A test built on it keeps compiling and parsing as the provider's metadata changes.
 */
export function testContext<P extends ProviderId>(id: P): DriverContext<P> {
	const ambient: Record<string, string> = {};
	for (const raw of REGISTRY[id].inputs) {
		const input = normalizeProviderInput(raw);
		if (input.required && input.default === undefined)
			ambient[input.name] = `${input.name.toLowerCase()}-test`;
	}
	const artifact = REGISTRY[id].artifact;
	const resolvedArtifact =
		artifact.kind === "none"
			? artifact
			: { kind: artifact.kind, ref: `${id}-test-${artifact.kind}` };
	// The registry entry is the same one `DriverContext<P>` maps statically; the cast records it.
	return { env: parseDriverEnv(id, ambient), artifact, resolvedArtifact } as DriverContext<P>;
}

/**
 * An OCI build request for provider `id`'s artifact builder in a test: its {@link testContext}
 * credentials, a digest-pinned base and a 4 vCPU / 8 GiB target, with `overrides` applied.
 */
export function ociBuildRequest<P extends ProviderId>(
	id: P,
	overrides: Partial<OciArtifactBuildRequest<EnvOf<P>>> = {},
): OciArtifactBuildRequest<EnvOf<P>> {
	return {
		bakes: "oci",
		name: `${id}-toolchain-test`,
		base: {
			digestRef: `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"c".repeat(64)}`,
		},
		spec: { vcpus: 4, memoryGb: 8 },
		env: testContext(id).env,
		replace: "allowed",
		imagesDir: "/unused",
		dockerConfig: "/unused",
		log: () => {},
		signal: new AbortController().signal,
		...overrides,
	};
}

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
	/** Capacities (GiB) of further mounts the guest reports to a disk proof of their path. */
	readonly mounts?: Readonly<Record<string, number>>;
	/** Files present in every guest before the kit runs (an in-image marker, for fingerprinting). */
	readonly seedFiles?: Readonly<Record<string, string>>;
	/** Serve a server-side marker lookup (`find`) on a shared account too. */
	readonly lookup?: boolean;
	/** Serve a server-side readiness wait (`settle`) that answers once a sandbox leaves pending. */
	readonly settles?: boolean;
	/**
	 * `throws`: the vendor reports an unknown sandbox as a typed not-found error, which the adapter
	 * declares as `control.absent`, instead of answering `null`.
	 */
	readonly notFound?: "null" | "throws";
	/** Name each sandbox by its marker's spelling, which `get` resolves (a vendor-chosen name). */
	readonly names?: MarkerSpelling;
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

/**
 * A sandbox's guest: its files (seeded) and the shell that runs the commands the kit emits (exec,
 * the shell-detach launcher, the files fallback), answering the disk probe of the root and of each
 * declared mount with its capacity.
 */
function guestOf(options: Pick<MemoryVendorOptions, "diskGb" | "mounts" | "seedFiles">) {
	const capacities = new Map([
		[DISK_PROBE, options.diskGb ?? 80],
		...Object.entries(options.mounts ?? {}).map(([path, gb]) => [diskProbe(path), gb] as const),
	]);
	return () => {
		const files = new Map(Object.entries(options.seedFiles ?? {}));
		const run = guestShell(files, {
			answer: (command) => {
				const gb = capacities.get(command);
				return gb === undefined
					? undefined
					: { stdout: `${Math.round(gb * 1024 * 1024)}\n`, code: 0 };
			},
		});
		return { files, run };
	};
}

/** The in-memory vendor's typed not-found. */
export class MemoryNotFound extends Error {
	constructor(id: string) {
		super(`sandbox ${id} not found`);
	}
}

class Refused extends Error {
	constructor(readonly retryable: boolean) {
		super("refused before allocation");
	}
}

/**
 * An in-memory vendor account. Each sandbox is a guest shell faithful to the commands the kit emits
 * (exec, the shell-detach launcher, the files fallback) and answers {@link DISK_PROBE} (and the
 * probe of each declared mount).
 */
export function memoryVendor(options: MemoryVendorOptions = {}) {
	const rows = new Map<string, MemoryRow>();
	const guests = new Map<string, ReturnType<typeof guestShell>>();
	const disks = new Map<string, Map<string, string>>();
	const calls: string[] = [];
	const faults = options.faults ?? {};
	let next = 0;
	const guest = guestOf(options);
	const allocate = (marker?: string, state: Phase = "pending"): MemoryRow => {
		next += 1;
		const row: MemoryRow = {
			id: marker && options.names ? options.names.toVendor(marker) : `mem-${next}`,
			...(marker && { marker }),
			state,
			gets: 0,
			deletingGets: 0,
		};
		rows.set(row.id, row);
		const { files, run } = guest();
		disks.set(row.id, files);
		guests.set(row.id, run);
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
	/** An unknown sandbox: `null`, or the vendor's typed not-found. */
	const missing = (id: string): null => {
		if (options.notFound === "throws") throw new MemoryNotFound(id);
		return null;
	};

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
				if (!row) return missing(id);
				row.gets += 1;
				if (row.state === "pending" && row.gets >= readyAfter)
					row.state = faults.failsDuringReadiness ? "failed" : "ready";
				if (row.state === "deleting" && !faults.removalStalls) {
					if (row.deletingGets >= (options.removalAfterGets ?? 0)) row.state = "gone";
					row.deletingGets += 1;
				}
				return record(row);
			},
			...(options.settles && {
				settle: async (id: string) => {
					await control("settle");
					const row = rows.get(id);
					if (!row) return missing(id);
					if (row.state === "pending") row.state = faults.failsDuringReadiness ? "failed" : "ready";
					return record(row);
				},
			}),
			remove: async (id) => {
				await control("remove");
				const row = rows.get(id);
				if (!row) return missing(id) ?? "removed";
				if (row.state === "gone") return "removed";
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
			...(options.notFound === "throws" && {
				absent: (error: unknown) => error instanceof MemoryNotFound,
			}),
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