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

/**
 * The port contract, runnable against any adapter, as the module's kit calls it (its declared
 * not-found read as absence, its `recovery.lookup` as the marker lookup, on its declared account).
 * `make` returns a fresh adapter over a stubbed transport whose sandboxes become ready within a few
 * gets and answer `sh -c 'exit 7'` with exit 7. On a shared account every record must carry the
 * create-time marker the kit attributes it by.
 */
export function vendorContract<Raw, Native>(
	name: string,
	module: { readonly traits: Pick<VendorTraits, "account" | "recovery" | "timing"> },
	make: () => Vendor<Raw, Native>,
) {
	const account = module.traits.account ?? "shared";
	const lookup = module.traits.recovery?.lookup;
	const bound = () => ({
		vendor: kitPort(make(), {
			provider: name,
			...(lookup && { lookup }),
			...(module.traits.timing?.controlTimeoutMs !== undefined && {
				controlTimeoutMs: module.traits.timing.controlTimeoutMs,
			}),
		}),
		account,
	});
	const op = { signal: new AbortController().signal };
	const request = {
		spec: { vcpus: 4, memoryGb: 8 },
		artifact: { kind: "none" },
		deadlineMs: 1,
	} as const;
	const create = (vendor: KitVendor<Raw, Native>, marker: string) =>
		vendor.control.create({ request, marker }, op);
	// Markers of the shape the kit mints: a vendor may encode the attempt UUID in a strict name.
	const mint = () => `${MARKER_PREFIX}${randomUUID()}`;
	const drain = (
		fetch: (
			cursor: string | undefined,
		) => Promise<{ records: readonly VendorRecord<Raw>[]; next?: string }>,
	) =>
		// The kit's own fail-closed cursor rules, so a looping cursor fails, not hangs.
		drainPages(name as ProviderId, fetch, op);

	test(`${name}: get of an unknown id is null, not an error`, async () => {
		expect(await bound().vendor.control.get("does-not-exist", op)).toBeNull();
	});

	test(`${name}: removing an unknown id is already removed`, async () => {
		expect(await bound().vendor.control.remove("does-not-exist", op)).toBe("removed");
	});

	test(`${name}: a created sandbox is observable, listable and attributable`, async () => {
		const { vendor, account } = bound();
		const marker = mint();
		const created = await create(vendor, marker);
		// The kit attaches every create's record before readiness, so a vendor may mark it there (a
		// rename).
		await vendor.data.attach(created, op);
		const observed = await vendor.control.get(created.id, op);
		expect(observed?.id).toBe(created.id);
		const listed = (await drain((cursor) => vendor.control.page(cursor, op))).filter(
			(record) => record.id === created.id,
		);
		expect(listed).toHaveLength(1);
		if (account === "shared")
			for (const record of [created, observed, ...listed]) expect(record?.marker).toBe(marker);
	});

	test(`${name}: a marker lookup returns only what the marker attributes`, async () => {
		const { vendor, account } = bound();
		const find = vendor.control.find;
		if (!find) {
			expect(account).toBe("shared"); // a dedicated account recovers by replay, through find
			return;
		}
		const marker = mint();
		const mine = await create(vendor, marker);
		await create(vendor, mint());
		const found = await drain((cursor) => find(marker, cursor, op));
		expect(found.map((record) => record.id)).toContain(mine.id);
		for (const record of found)
			if (account === "shared" || record.marker !== undefined) expect(record.marker).toBe(marker);
	});

	test(`${name}: a server-side readiness wait answers like get`, async () => {
		const { vendor, account } = bound();
		const settle = vendor.control.settle;
		if (!settle) return;
		expect(await settle("does-not-exist", op)).toBeNull();
		const marker = mint();
		const created = await create(vendor, marker);
		const settled = await settle(created.id, op);
		expect(settled?.id).toBe(created.id);
		expect(settled?.phase).toBe("ready");
		if (account === "shared") expect(settled?.marker).toBe(marker);
	});

	test(`${name}: removal is eventually observed, and "removed" means gone`, async () => {
		const { vendor } = bound();
		const created = await create(vendor, mint());
		let outcome = await vendor.control.remove(created.id, op);
		for (let polls = 0; outcome !== "removed" && polls < 20; polls++) {
			const current = await vendor.control.get(created.id, op);
			if (current === null || current.phase === "gone") outcome = "removed";
		}
		expect(outcome).toBe("removed");
		const after = await vendor.control.get(created.id, op);
		expect(after === null || after.phase === "gone").toBe(true);
	});

	test(`${name}: a created sandbox attaches, and once ready executes and round-trips files`, async () => {
		const { vendor } = bound();
		// As in the kit: attach the create's own record, then wait for readiness.
		let current: VendorRecord<Raw> | null = await create(vendor, mint());
		const native = await vendor.data.attach(current, op);
		for (let polls = 0; current?.phase === "pending" && polls < 20; polls++)
			current = await vendor.control.get(current.id, op);
		if (current === null) throw new Error("the created sandbox disappeared before readiness");
		expect(current.phase).toBe("ready");
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

/** The stand-in E2B-protocol SDK's own typed errors, for a test that passes no SDK classes. */
class StubSandboxNotFound extends Error {}
class StubAuthenticationError extends Error {}
class StubInvalidArgumentError extends Error {}
class StubRateLimitError extends Error {}

/** The protocol's nonzero-exit envelope, which the shared adapter reads by shape. */
class StubCommandExit extends Error {
	override readonly name = "CommandExitError";
	constructor(
		readonly exitCode: number,
		readonly stdout = "",
		readonly stderr = "",
	) {
		super(`exit ${exitCode}`);
	}
}

export interface E2bProtocolStubOptions {
	readonly pageSize?: number;
	/** The root filesystem capacity `df` reports (default 80 GiB). */
	readonly diskGb?: number;
	/** The first create allocates and then loses its response. */
	readonly ambiguousFirstCreate?: boolean;
	/** A listing reports more pages but withholds its continuation token. */
	readonly omitsToken?: boolean;
	/** The metadata query is ignored: a lookup returns every live row (a loose filter). */
	readonly looseLookup?: boolean;
	/** The process id a background command returns (default 42). */
	readonly launchPid?: number;
	/** The error a nonzero foreground exit throws (default: a `CommandExitError`-shaped error). */
	readonly exitError?: (exitCode: number) => unknown;
	/** `false`: killing an unknown sandbox resolves `false` (E2B). Default: it throws not-found. */
	readonly killMissing?: "false" | "throws";
	/** The SDK's own error classes, where the test exercises them (default: local stand-ins). */
	readonly errors?: {
		readonly SandboxNotFoundError: new (message: string) => Error;
		readonly AuthenticationError: abstract new (...args: never[]) => unknown;
		readonly InvalidArgumentError: abstract new (...args: never[]) => unknown;
		readonly RateLimitError: abstract new (...args: never[]) => unknown;
	};
	/** Further fields every `getInfo` answer carries (a template id, a CPU count). */
	readonly info?: Readonly<Record<string, unknown>>;
}

export interface E2bProtocolStubRow {
	readonly sandboxId: string;
	/** `running` or `paused`; anything else stands in for a state the adapter does not know. */
	state: string;
	readonly metadata: Record<string, string>;
	readonly files: Map<string, string>;
}

/**
 * A whole-account stand-in for an E2B-protocol SDK's statics (`Sandbox.create/getInfo/kill/list`,
 * the typed errors, and `Template` for `e2bProtocolArtifactBuilder`), shared by every package whose
 * adapter is `e2bProtocolVendor`. A template records its steps (`["fromImage", image]`,
 * `["runCmd", command, options]`); `Template.build` records them with its name and options as a
 * `Template.build` call, and streams one build log line. Sandboxes
 * are running once created, answer `df` with `diskGb`, `sh -c 'exit N'` with exit N and any other
 * foreground command with `out`/`err`; a background `echo X > path` writes the file. Every call
 * records its options, so a test can see the channel a credential rode. `Sdk` is the package's own
 * SDK type, which the stand-in satisfies structurally.
 */
export function e2bProtocolStub<Sdk>(options: E2bProtocolStubOptions = {}) {
	const errors = options.errors ?? {
		SandboxNotFoundError: StubSandboxNotFound,
		AuthenticationError: StubAuthenticationError,
		InvalidArgumentError: StubInvalidArgumentError,
		RateLimitError: StubRateLimitError,
	};
	const exitError = options.exitError ?? ((exitCode: number) => new StubCommandExit(exitCode));
	const rows = new Map<string, E2bProtocolStubRow>();
	const calls: Array<{ readonly name: string; readonly options: unknown }> = [];
	let next = 0;
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (metadata: Record<string, string>, state = "running") => {
		const sandboxId = `i${++next}`;
		rows.set(sandboxId, { sandboxId, state, metadata, files: new Map() });
		return sandboxId;
	};
	const reachable = (id: string) => {
		const found = rows.get(id);
		if (found?.state !== "running") throw new Error(`sandbox ${id} is not running`);
		return found;
	};
	const native = (sandboxId: string) => ({
		sandboxId,
		commands: {
			run: async (command: string, runOptions: { readonly background?: boolean }) => {
				calls.push({ name: "commands.run", options: runOptions });
				const guest = reachable(sandboxId);
				if (runOptions.background) {
					const echo = /echo (\S+) > ([^\s']+)/.exec(command);
					if (echo) guest.files.set(echo[2] ?? "", `${echo[1]}\n`);
					return { pid: options.launchPid ?? 42 };
				}
				if (command.startsWith("df -Pk"))
					return { exitCode: 0, stdout: `${(options.diskGb ?? 80) * 1024 * 1024}\n`, stderr: "" };
				const exit = /^sh -c 'exit (\d+)'$/.exec(command);
				if (exit) throw exitError(Number(exit[1]));
				return { exitCode: 0, stdout: "out\n", stderr: "err\n" };
			},
		},
		files: {
			read: async (path: string, fileOptions: unknown) => {
				calls.push({ name: "files.read", options: fileOptions });
				const text = reachable(sandboxId).files.get(path);
				if (text === undefined) throw new Error(`${path}: no such file`);
				return text;
			},
			write: async (path: string, text: string, fileOptions: unknown) => {
				calls.push({ name: "files.write", options: fileOptions });
				reachable(sandboxId).files.set(path, text);
				return { path };
			},
			exists: async (path: string, fileOptions: unknown) => {
				calls.push({ name: "files.exists", options: fileOptions });
				return reachable(sandboxId).files.has(path);
			},
		},
	});
	const Sandbox = {
		create: async (template: string, createOptions: { metadata: Record<string, string> }) => {
			calls.push({ name: "create", options: { template, ...createOptions } });
			const sandboxId = allocate(createOptions.metadata);
			if (ambiguous) {
				ambiguous = false;
				throw new TypeError("connection reset after the vendor accepted the create");
			}
			return native(sandboxId);
		},
		getInfo: async (id: string, getOptions: unknown) => {
			calls.push({ name: "getInfo", options: getOptions });
			const found = rows.get(id);
			if (!found) throw new errors.SandboxNotFoundError(id);
			return {
				sandboxId: id,
				...options.info,
				state: found.state,
				metadata: found.metadata,
			};
		},
		kill: async (id: string, killOptions: unknown) => {
			calls.push({ name: "kill", options: killOptions });
			if (rows.delete(id)) return true;
			if (options.killMissing === "false") return false;
			throw new errors.SandboxNotFoundError(id);
		},
		list: (listOptions: {
			readonly query: { readonly state?: string[]; readonly metadata?: Record<string, string> };
			readonly nextToken?: string;
		}) => {
			calls.push({ name: "list", options: listOptions });
			const { state, metadata } = listOptions.query;
			const items = [...rows.values()]
				.filter((row) => !state || state.includes(row.state))
				.filter(
					(row) =>
						options.looseLookup ||
						!metadata ||
						Object.entries(metadata).every(([key, wanted]) => row.metadata[key] === wanted),
				)
				.map(({ sandboxId, state: live, metadata: labels }) => ({
					sandboxId,
					state: live,
					metadata: labels,
				}));
			// Stateless like the SDK's paginator: a token resumes a fresh listing at its offset, and
			// `hasNext` is true exactly while a token is held.
			const size = options.pageSize ?? 100;
			let token = listOptions.nextToken;
			let fetched = false;
			return {
				get hasNext() {
					return !fetched || token !== undefined;
				},
				get nextToken() {
					return options.omitsToken ? undefined : token;
				},
				nextItems: async (pageOptions?: unknown) => {
					calls.push({ name: "nextItems", options: pageOptions });
					const from = Number(token?.replace("token-", "") ?? 0);
					fetched = true;
					token = from + size < items.length ? `token-${from + size}` : undefined;
					return items.slice(from, from + size);
				},
			};
		},
	};
	interface StubTemplate {
		readonly steps: readonly unknown[][];
		fromImage(image: string): StubTemplate;
		runCmd(command: string, runOptions?: unknown): StubTemplate;
	}
	const template = (steps: readonly unknown[][]): StubTemplate => ({
		steps,
		fromImage: (image) => template([...steps, ["fromImage", image]]),
		runCmd: (command, runOptions) => template([...steps, ["runCmd", command, runOptions]]),
	});
	let builds = 0;
	const Template = Object.assign(() => template([]), {
		build: async (
			built: StubTemplate,
			name: string,
			buildOptions: { readonly onBuildLogs?: (entry: unknown) => void },
		) => {
			calls.push({
				name: "Template.build",
				options: { name, steps: built.steps, ...buildOptions },
			});
			buildOptions.onBuildLogs?.(`building ${name}`);
			builds += 1;
			return { templateId: `tpl-${name}`, buildId: `build-${builds}` };
		},
	});
	return {
		/** The stand-in, typed as the package's SDK it satisfies structurally. */
		sdk: { Sandbox, Template, ...errors } as unknown as Sdk,
		rows,
		calls,
		/** Place a sandbox directly in the account (another tenant's, or one in a given state). */
		allocate,
		count: (name: string) => calls.filter((call) => call.name === name).length,
	};
}

/** The sandboxes of a stand-in account ({@link restStub}, {@link sdkStub}), each with its own guest. */
function stubAccount<Row extends { readonly id: string }>(
	options: Pick<RestStubOptions<Row>, "newId" | "diskGb">,
) {
	const rows = new Map<string, Row>();
	const guests = new Map<string, ReturnType<ReturnType<typeof guestOf>>>();
	const guest = guestOf(options);
	let next = 0;
	const add = (fields: Omit<Row, "id">): Row => {
		next += 1;
		const row = { ...fields, id: options.newId?.(next) ?? `sb-${next}` } as Row;
		rows.set(row.id, row);
		guests.set(row.id, guest());
		return row;
	};
	/** The guest of sandbox `id` (a fresh one for a row placed in `rows` directly). */
	const guestFor = (id: string) => {
		const found = guests.get(id) ?? guest();
		guests.set(id, found);
		return found;
	};
	return { rows, add, guestFor };
}

/** The stand-in SDK's own typed not-found, for a test that passes no SDK class. */
class SdkNotFound extends Error {
	constructor(id: string) {
		super(`sandbox ${id} not found`);
	}
}

/** The account a {@link sdkStub} surface translates onto. */
export interface SdkAccount<Row extends { readonly id: string }> {
	/** The account's sandboxes by id. */
	readonly rows: Map<string, Row>;
	/** Allocate a sandbox under the next id, with its own guest. */
	add(fields: Omit<Row, "id">): Row;
	/** The sandbox `id` names; throws the account's not-found for one it lacks. */
	row(id: string): Row;
	/** Run `command` in sandbox `id`'s guest: exit codes, the kit's files fallback, `df`. */
	run(id: string, command: string): { exitCode: number; stdout: string; stderr: string };
	/** Sandbox `id`'s files, which its guest reads and writes. */
	files(id: string): Map<string, string>;
	/** The class `row` throws for an unknown id, unless `notFound` says otherwise. */
	readonly NotFound: new (
		id: string,
	) => Error;
}

export interface SdkStubOptions<Row> extends Pick<RestStubOptions<Row>, "newId" | "diskGb"> {
	/** The SDK's own not-found error for `id`, where the test exercises it. */
	readonly notFound?: (id: string) => unknown;
}

/**
 * A whole-account stand-in for a vendor SDK, parallel to {@link restStub}: `surface` states the
 * SDK's shape over the account's sandboxes (`add`, `row`, `rows`), each a row with its own guest
 * shell (`run`, `files`) as in {@link memoryVendor}, so the kit's exec, files fallback and disk
 * proof run for real. `Sdk` is the package's own SDK type, which the surface satisfies
 * structurally.
 */
export function sdkStub<Sdk, Row extends { readonly id: string } = { readonly id: string }>(
	surface: (account: SdkAccount<Row>) => unknown,
	options: SdkStubOptions<Row> = {},
) {
	const { rows, add, guestFor } = stubAccount<Row>(options);
	const row = (id: string): Row => {
		const found = rows.get(id);
		if (found !== undefined) return found;
		throw options.notFound?.(id) ?? new SdkNotFound(id);
	};
	const account: SdkAccount<Row> = {
		rows,
		add,
		row,
		run: (id, command) => {
			const { code, stdout, stderr } = guestFor(row(id).id).run(command);
			return { exitCode: code, stdout, stderr };
		},
		files: (id) => guestFor(row(id).id).files,
		NotFound: SdkNotFound,
	};
	return {
		/** The stand-in, typed as the package's SDK it satisfies structurally. */
		sdk: surface(account) as Sdk,
		...account,
	};
}

/** One request a {@link restStub} route answers. */
export interface RestRequest<Row extends { readonly id: string }> {
	readonly method: string;
	readonly url: URL;
	/** The route's `:name` segments, decoded. */
	readonly params: Readonly<Record<string, string>>;
	readonly headers: Headers;
	/** A string body parsed as JSON (or the string, if it is not JSON), a binary body as text. */
	// biome-ignore lint/suspicious/noExplicitAny: a route reads the body its own API defines.
	readonly body: any;
	readonly signal: AbortSignal | undefined;
	/** The account's sandboxes by id. */
	readonly rows: Map<string, Row>;
	/** Allocate a sandbox under the next id, with its own guest. */
	add(fields: Omit<Row, "id">): Row;
	/** The sandbox `:id` names; a route naming `:id` answers 404 for one the account lacks. */
	readonly row: Row;
	/** Run `command` in the `:id` sandbox's guest: exit codes, the kit's files fallback, `df`. */
	run(command: string): { exitCode: number; stdout: string; stderr: string };
	/** The `:id` sandbox's files, which its guest reads and writes. */
	readonly files: Map<string, string>;
}

/** A route's handler: a `Response`, `undefined` (204), or any other value (200 JSON). */
export type RestRoute<Row extends { readonly id: string }> = (request: RestRequest<Row>) => unknown;

export interface RestStubOptions<Row> {
	/** The vendor's id for the `n`th sandbox (default `sb-<n>`). */
	readonly newId?: (n: number) => string;
	/** The guest's root filesystem capacity (default 80 GiB). */
	readonly diskGb?: number;
	/** How `:id` resolves (default: by id), for an API that also addresses a sandbox by name. */
	readonly lookup?: (id: string, rows: ReadonlyMap<string, Row>) => Row | undefined;
	/** How late the API answers a request (a slow transport); a request's signal still aborts it. */
	readonly latencyMs?: (method: string, path: string) => number;
	/** The API's not-found answer (default: 404 `{ error: "not found" }`). */
	readonly missing?: (id: string) => Response;
}

/**
 * A whole-account stand-in for a vendor's REST API, as a route table: `"METHOD /path/:param"` to a
 * handler. Each sandbox is a row with its own guest shell, as in {@link memoryVendor}, so the kit's
 * exec, files fallback and disk proof run for real. Every request is recorded; one no route
 * matches throws, naming it.
 */
export function restStub<Row extends { readonly id: string }>(
	routes: Readonly<Record<string, RestRoute<Row>>>,
	options: RestStubOptions<Row> = {},
) {
	const { rows, add, guestFor } = stubAccount<Row>(options);
	const calls: Array<{ method: string; path: string; headers: Headers; body: unknown }> = [];
	const table = Object.entries(routes).map(([route, handler]) => {
		const [method, path = ""] = route.split(" ");
		return { method, segments: path.split("/"), handler };
	});
	const match = (method: string, path: string) => {
		const segments = path.split("/");
		for (const route of table) {
			if (route.method !== method || route.segments.length !== segments.length) continue;
			const params: Record<string, string> = {};
			const matched = route.segments.every((segment, index) => {
				const actual = segments[index] ?? "";
				if (!segment.startsWith(":")) return segment === actual;
				params[segment.slice(1)] = decodeURIComponent(actual);
				return actual !== "";
			});
			if (matched) return { handler: route.handler, params };
		}
		return undefined;
	};
	const decode = (body: unknown) => {
		if (typeof body === "string") {
			try {
				return JSON.parse(body);
			} catch {
				return body;
			}
		}
		if (body instanceof Uint8Array || body instanceof ArrayBuffer)
			return new TextDecoder().decode(body);
		return undefined;
	};
	const answer = (value: unknown) =>
		value instanceof Response
			? value
			: value === undefined
				? new Response(null, { status: 204 })
				: Response.json(value);
	const route = async (input: string | URL | Request, init: RequestInit = {}) => {
		const url = new URL(String(input));
		const method = init.method ?? "GET";
		const headers = new Headers(init.headers);
		const body = decode(init.body);
		calls.push({ method, path: `${url.pathname}${url.search}`, headers, body });
		const latency = options.latencyMs?.(method, url.pathname) ?? 0;
		if (latency > 0) await abortableDelay(latency, init.signal ?? undefined);
		const found = match(method, url.pathname);
		if (!found) throw new Error(`restStub: no route for ${method} ${url.pathname}`);
		const id = found.params.id;
		const row =
			id === undefined ? undefined : (options.lookup ?? ((key) => rows.get(key)))(id, rows);
		if (id !== undefined && row === undefined)
			return options.missing?.(id) ?? Response.json({ error: "not found" }, { status: 404 });
		const sandbox = () => {
			if (row === undefined) throw new Error(`restStub: ${method} ${url.pathname} names no :id`);
			return { row, guest: guestFor(row.id) };
		};
		return answer(
			await found.handler({
				method,
				url,
				params: found.params,
				headers,
				body,
				signal: init.signal ?? undefined,
				rows,
				add,
				get row() {
					return sandbox().row;
				},
				run: (command) => {
					const { code, stdout, stderr } = sandbox().guest.run(command);
					return { exitCode: code, stdout, stderr };
				},
				get files() {
					return sandbox().guest.files;
				},
			}),
		);
	};
	return {
		/** The stand-in, typed as the `fetch` an adapter receives. */
		fetch: Object.assign(route, { preconnect() {} }) as typeof globalThis.fetch,
		rows,
		/** Every request, in order: method, path with query, headers and decoded body. */
		calls,
		add,
	};
}
