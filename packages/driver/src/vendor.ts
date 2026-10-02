// @sandbox-benchmarks/driver/vendor — the driver authoring module (ADR-0023 §1).
//
// A provider package states what is true about its vendor through two ports, the control plane
// (create/get/remove/page, optionally settle/find/refused/admit) and the data plane (attach/exec,
// optionally launch/files). This module owns everything provider-neutral, once: readiness,
// cleanup confirmation, destroy-by-id, probes, the owned/foreign inventory partition,
// ambiguous-create recovery, the artifact guard, the disk proof and the execution policy. It lowers
// onto the ComputeSDK bridge, so coverage proof, sandbox-id parsing, cleanup double faults,
// redaction and output caps are reused rather than reimplemented.
//
// Behaviour unique to one vendor family stays on explicit, typed passthroughs (snapshots,
// accelerator, cost evidence, a harness-owned create budget, a non-default execution policy) and
// never becomes a port knob: a per-behaviour override would let a provider re-implement teardown.

import { randomUUID } from "node:crypto";
import type {
	AcceleratorStrategy,
	CreateBudget,
	CreateRequest,
	DriverContext,
	ExecOptions,
	ExecutionPolicy,
	ProviderCostEvidenceCapability,
	ProviderId,
	SandboxObservation,
	SnapshotRetention,
} from "@sandbox-benchmarks/driver";
import { isDriverError, pollUntilReady, shellQuote } from "@sandbox-benchmarks/driver";
import type {
	ComputeSdkCreateRequestCoverage,
	ComputeSdkSandboxIdSchema,
} from "@sandbox-benchmarks/driver/computesdk";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import type { SdkProvenance } from "@sandbox-benchmarks/schema";

/* ------------------------------------ the ports ------------------------------------ */

/**
 * A provider-neutral reading of one control-plane record. `failed` still owns resources and is
 * deleted; `gone` is removal evidence (cleanup confirmation), never inferred from a delete request.
 */
export type Phase = "pending" | "ready" | "failed" | "deleting" | "gone";

/**
 * Every port call receives a signal. `create`, `attach` and `prepare` carry the create attempt's
 * signal (the harness owns that budget); every other call's signal also aborts when the kit's own bound for
 * it expires: the readiness or delete budget inside a poll, `controlTimeoutMs` for a single
 * control-plane call, `snapshotTimeoutMs` for a snapshot. The kit stops waiting at that bound even
 * if the adapter ignores the signal, and rejects a response that arrives after it.
 */
export interface Op {
	readonly signal: AbortSignal;
}

/** One control-plane record, parsed by the adapter (Tier 2) into provider-neutral facts. */
export interface VendorRecord<Raw = unknown> {
	readonly id: string;
	readonly phase: Phase;
	/** The create-time ownership marker the vendor echoes back (shared accounts). */
	readonly marker?: string;
	readonly raw: Raw;
}

export interface VendorPage<Raw = unknown> {
	readonly records: readonly VendorRecord<Raw>[];
	/** More records exist. An empty string means the vendor omitted its cursor: the kit fails closed. */
	readonly next?: string;
}

/** What one create attempt asks of the vendor: the trusted request and its ownership marker. */
export interface CreateAttempt {
	readonly request: CreateRequest;
	readonly marker: string;
}

export interface ControlPlane<Raw = unknown> {
	/** May resolve `phase: "ready"` only when the response itself proves readiness. */
	create(attempt: CreateAttempt, op: Op): Promise<VendorRecord<Raw>>;
	/** `null` only on the vendor's own not-found; every other failure throws. */
	get(id: string, op: Op): Promise<VendorRecord<Raw> | null>;
	/**
	 * The vendor's server-side readiness wait (a long poll): `get`'s contract, but the call may stay
	 * open until the record leaves `pending`. Declared, it replaces `get` in the kit's readiness poll,
	 * so readiness is observed when the vendor reports it rather than at the next poll interval. The
	 * kit still bounds it by `readyTimeoutMs`, classifies the phase it settles on, and tears the
	 * allocation down after a failure; a `pending` answer (the wait ended early) is asked again.
	 */
	settle?(id: string, op: Op): Promise<VendorRecord<Raw> | null>;
	/** `removed`: the vendor proved removal (or reported not-found). `accepted`: acknowledgement only. */
	remove(id: string, op: Op): Promise<"removed" | "accepted">;
	/** One page of the whole account. The kit drains, caps, and fails closed on a bad cursor. */
	page(cursor: string | undefined, op: Op): Promise<VendorPage<Raw>>;
	/**
	 * Server-side lookup of an ambiguous create by its marker, one page at a time. Required on a
	 * dedicated account (where it is an idempotent replay). The kit rejects unrelated records.
	 */
	find?(marker: string, cursor: string | undefined, op: Op): Promise<VendorPage<Raw>>;
	/** The vendor refused before allocating; `retryable` marks a capacity or rate refusal. */
	refused?(error: unknown): { readonly retryable: boolean } | undefined;
	/**
	 * A transient create failure the harness may retry once the kit has proven nothing remains
	 * allocated (a gateway or rate error that is not proof of refusal). Independent of `refused`:
	 * a transient failure is still reconciled.
	 */
	transient?(error: unknown): boolean;
	/** A post-readiness invariant beyond the request axes; returns a reason to reject. */
	admit?(record: VendorRecord<Raw>): string | undefined;
}

export interface ExecOutcome {
	/** Omitted when the vendor did not report the guest's exit: recorded as unknown, never zero. */
	readonly exitCode?: number;
	readonly stdout: string;
	readonly stderr: string;
}

/** Whether a ready allocation honours the request: `unsupported` refuses its shape. */
export type Verification =
	| { readonly status: "honored" }
	| { readonly status: "unsupported"; readonly detail: string };

export interface DataPlane<Raw, Native> {
	attach(record: VendorRecord<Raw>, op: Op): Native | Promise<Native>;
	/**
	 * Post-readiness preparation the vendor requires (a keepalive) and proof of mapped request axes
	 * the allocation itself reports (its configured resources). A throw fails the create; either way
	 * the kit tears the allocation down. Runs before the kit's disk proof.
	 */
	prepare?(
		handle: VendorHandle<Raw, Native>,
		request: CreateRequest,
		op: Op,
	): Promise<Verification>;
	exec(native: Native, command: string, options?: ExecOptions): Promise<ExecOutcome>;
	/** Resolves only on genuine background acceptance. Requires `durable: "native-launch"`. */
	launch?(native: Native, command: string, options?: ExecOptions): Promise<void>;
	/** Omitted: the kit's shell fallback serves files and `hasWorkingFilesystem` is false. */
	readonly files?: {
		read(native: Native, path: string): Promise<string>;
		write(native: Native, path: string, text: string): Promise<void>;
		exists?(native: Native, path: string): Promise<boolean>;
	};
}

/** The session handle a vendor driver exposes as `SandboxSession.native`. */
export interface VendorHandle<Raw, Native> {
	readonly record: VendorRecord<Raw>;
	readonly native: Native;
}

/**
 * Snapshot passthrough: the vendor's own capture and delete, carried to the driver's snapshot
 * capability unchanged. Not a port plane — omission records an unsupported capability.
 */
export interface VendorSnapshots<Raw, Native> {
	create(
		handle: VendorHandle<Raw, Native>,
		op: Op,
		retention: SnapshotRetention,
	): Promise<{ readonly snapshotId: string }>;
	delete(snapshotId: string, op: Op): Promise<void>;
}

/** One bound vendor: both ports plus the snapshot passthrough, if the vendor has one. */
export interface Vendor<Raw, Native> {
	readonly control: ControlPlane<Raw>;
	readonly data: DataPlane<Raw, Native>;
	readonly snapshots?: VendorSnapshots<Raw, Native>;
}

export interface VendorTiming {
	readonly pollMs: number;
	readonly readyTimeoutMs: number;
	readonly deleteTimeoutMs: number;
	/** The bound on one control-plane call outside a poll: a probe or one listing page. */
	readonly controlTimeoutMs: number;
	/** The bound on one snapshot capture or delete. */
	readonly snapshotTimeoutMs: number;
}

/** Static per module: decided before any driver context exists. */
export interface VendorTraits {
	readonly sandboxId: ComputeSdkSandboxIdSchema;
	readonly coverage: ComputeSdkCreateRequestCoverage;
	/**
	 * A combination of axes the vendor cannot honour (CPU coupled to memory, a disk the image
	 * requires): the reason the request is refused before any vendor call.
	 */
	readonly unsupported?: (request: CreateRequest) => string | undefined;
	/** `dedicated`: the credential's account is benchmark-only; every live record is owned. */
	readonly account?: "shared" | "dedicated";
	/**
	 * Execution passthrough. Defaults to a 60s synchronous cap over the kit's shell detach; a vendor
	 * with `data.launch` declares `durable: "native-launch"`, and the two must agree.
	 */
	readonly execution?: ExecutionPolicy;
	readonly timing?: Partial<VendorTiming>;
	readonly recovery?: { readonly absenceConfirmationMs?: number; readonly maxAttempts?: number };
	/** The name the ownership marker travels under at the vendor (default `<provider>-marker`). */
	readonly markerKey?: string;
	/**
	 * How the marker reads at the vendor (default: verbatim). The adapter builds its create request
	 * and parses records with the same spelling, and the recovery locator prints it, so a cleanup
	 * diagnostic names the value an operator can find in the vendor's console.
	 */
	readonly markerSpelling?: MarkerSpelling;
	/** Pages one listing may span before the kit treats the cursor as runaway (default 100). */
	readonly pageCap?: number;
	/**
	 * The kit's `df` disk proof. It always runs for a `runtime-verified` disk axis; declaring it
	 * also proves a mapped disk the guest may not expose in full (a sized volume, a root disk).
	 */
	readonly diskProof?: DiskProof;
}

export interface DiskProof {
	/** The mount the requested capacity must land on (default `/`). */
	readonly path?: string;
	/** Capacity a formatted filesystem legitimately loses to its own metadata (default 0). */
	readonly allowanceGb?: number;
}

/** The create-time prefix every kit-minted ownership marker carries. */
export const MARKER_PREFIX = "benchmark-";

/**
 * The vendor-visible spelling of an ownership marker: the attempt's UUID under the vendor's own
 * prefix (a sandbox name, a documented purpose). Built by {@link markerSpelling}, so the two
 * directions cannot disagree.
 */
export interface MarkerSpelling {
	/** The value a create sends for a kit-minted marker. */
	toVendor(marker: string): string;
	/** The kit marker a vendor value spells, or `undefined` when it carries no attempt. */
	fromVendor(value: string): string | undefined;
}

/** Spell the kit marker's attempt UUID under `prefix` at the vendor. */
export function markerSpelling(prefix: string): MarkerSpelling {
	return Object.freeze({
		toVendor: (marker: string) => `${prefix}${marker.slice(MARKER_PREFIX.length)}`,
		fromVendor: (value: string) =>
			value.startsWith(prefix) && value.length > prefix.length
				? `${MARKER_PREFIX}${value.slice(prefix.length)}`
				: undefined,
	});
}
const DEFAULT_EXECUTION: ExecutionPolicy = { syncCapMs: 60_000, durable: "shell-detach" };
const DEFAULT_TIMING: VendorTiming = {
	pollMs: 250,
	readyTimeoutMs: 180_000,
	deleteTimeoutMs: 60_000,
	controlTimeoutMs: 30_000,
	snapshotTimeoutMs: 600_000,
};
const DEFAULT_PAGE_CAP = 100;

/* --------------------------------- coverage presets --------------------------------- */

type Axis = ComputeSdkCreateRequestCoverage["spec"]["vcpus"];
type OptionalAxis = ComputeSdkCreateRequestCoverage["env"];

/**
 * Request coverage with the kit-owned axes fixed: the artifact comes from the context and the
 * attempt deadline belongs to the harness. GPU and env are unsupported unless a vendor maps them.
 */
export function coverage(
	spec: ComputeSdkCreateRequestCoverage["spec"],
	options: { readonly env?: OptionalAxis; readonly gpu?: OptionalAxis } = {},
): ComputeSdkCreateRequestCoverage {
	const gpu = options.gpu ?? "unsupported";
	return {
		spec,
		artifact: "context",
		deadlineMs: "harness",
		gpu: { model: gpu, count: gpu },
		env: options.env ?? "unsupported",
	};
}

/** The artifact pins CPU and memory; disk is proven after boot. */
export const pinned = (vcpus: number, memoryGb: number): ComputeSdkCreateRequestCoverage =>
	coverage({
		vcpus: { artifact: vcpus },
		memoryGb: { artifact: memoryGb },
		diskGb: "runtime-verified",
	});

/** The create request maps every resource axis, with disk mapped, proven, or unsupported. */
export const mapped = (diskGb: Axis = "mapped"): ComputeSdkCreateRequestCoverage =>
	coverage({ vcpus: "mapped", memoryGb: "mapped", diskGb });

/* ------------------------------- error classification ------------------------------- */

/** A cause-chain classifier over typed vendor errors, shared by every SDK adapter. */
export const instanceOfAny =
	(...classes: ReadonlyArray<abstract new (...args: never[]) => unknown>) =>
	(error: unknown): boolean =>
		matchesAnyCause(error, (cause) => classes.some((errorClass) => cause instanceof errorClass));

/* ------------------------------------ mechanics ------------------------------------ */

/** The disk-capacity probe of `path`; exported so test vendors answer the command the kit runs. */
export const diskProbe = (path = "/") =>
	`df -Pk ${path === "/" ? path : shellQuote(path)} | awk 'NR==2 {print $2}'`;
/** The root filesystem's disk-capacity probe. */
export const DISK_PROBE = diskProbe();

function bounded(timeoutMs: number, signal?: AbortSignal): AbortSignal {
	return AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
}

/** Settle with `work`, or reject as soon as `signal` aborts whether or not the adapter honours it. */
function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
	if (signal.aborted) return Promise.reject(signal.reason);
	return new Promise((resolve, reject) => {
		const abort = () => reject(signal.reason);
		signal.addEventListener("abort", abort, { once: true });
		work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
	});
}

/**
 * Drain a paged listing; a repeated, omitted, or runaway cursor fails closed, never empty.
 * `inspect` sees each page before it is accepted, so a caller can refuse a record mid-listing.
 */
export async function drainPages<Raw>(
	provider: ProviderId,
	fetchPage: (cursor: string | undefined) => Promise<VendorPage<Raw>>,
	op: Op,
	options: {
		readonly inspect?: (records: readonly VendorRecord<Raw>[]) => void;
		readonly pageCap?: number;
	} = {},
): Promise<VendorRecord<Raw>[]> {
	const cap = options.pageCap ?? DEFAULT_PAGE_CAP;
	const records: VendorRecord<Raw>[] = [];
	const seen = new Set<string>();
	let cursor: string | undefined;
	for (let pages = 0; ; pages++) {
		op.signal.throwIfAborted();
		if (pages >= cap) throw new Error(`${provider} listing exceeded ${cap} pages`);
		const page = await fetchPage(cursor);
		options.inspect?.(page.records);
		records.push(...page.records);
		if (page.next === undefined) return records;
		if (page.next === "" || seen.has(page.next))
			throw new Error(`${provider} listing repeated or omitted a continuation cursor`);
		seen.add(page.next);
		cursor = page.next;
	}
}

/** The `df` disk-capacity proof for a disk axis the create request cannot control. */
export async function verifyDisk(
	provider: ProviderId,
	requestedGb: number,
	exec: (command: string) => Promise<ExecOutcome>,
	{ path = "/", allowanceGb = 0 }: DiskProof = {},
): Promise<Verification> {
	const result = await exec(diskProbe(path));
	if (result.exitCode !== 0 || !/^\d+$/.test(result.stdout.trim()))
		throw new Error(`${provider} disk capacity probe failed`);
	const capacityGb = Number(result.stdout.trim()) / 1024 / 1024;
	return capacityGb + allowanceGb >= requestedGb
		? { status: "honored" }
		: {
				status: "unsupported",
				detail: `requested ${requestedGb} GiB but ${path === "/" ? "allocation" : path} exposes ${capacityGb.toFixed(2)} GiB`,
			};
}

function executionOf(
	provider: ProviderId,
	traits: VendorTraits,
	launches: boolean | undefined,
): ExecutionPolicy {
	const execution = traits.execution ?? DEFAULT_EXECUTION;
	if (launches !== undefined && (execution.durable === "native-launch") !== launches)
		throw new Error(
			`${provider}: durable "native-launch" and data.launch must be declared together`,
		);
	return execution;
}

/* ------------------------------------ lowering ------------------------------------ */

/** Lower one bound vendor onto the ComputeSDK bridge. */
export function vendorSpec<P extends ProviderId, Raw, Native>(
	provider: P,
	context: DriverContext<P>,
	traits: VendorTraits,
	vendor: Vendor<Raw, Native>,
) {
	const { control, data, snapshots } = vendor;
	const { files, launch } = data;
	const { refused, transient } = control;
	const spelling = traits.markerSpelling ?? markerSpelling(MARKER_PREFIX);
	const timing: VendorTiming = { ...DEFAULT_TIMING, ...traits.timing };
	const dedicated = traits.account === "dedicated";
	if (dedicated && !control.find)
		throw new Error(`${provider}: a dedicated account recovers by replay and needs control.find`);
	executionOf(provider, traits, launch !== undefined);
	const vendorId = (
		"fromVendor" in traits.sandboxId ? traits.sandboxId.fromVendor : traits.sandboxId
	) as { assert(value: unknown): string };
	const op = (signal?: AbortSignal): Op => ({ signal: signal ?? new AbortController().signal });
	const isGone = (record: VendorRecord<Raw> | null) => record === null || record.phase === "gone";
	// On a shared account a record without the kit's marker is foreign. The kit cannot tell an
	// adapter that dropped a marker from another tenant's unlabelled sandbox, so it does not fail
	// on a missing marker here; vendorContract proves every adapter echoes the marker from get,
	// page and find, and marker-based recovery refuses anything it cannot attribute.
	const owned = (record: VendorRecord<Raw>) =>
		dedicated || (record.marker?.startsWith(MARKER_PREFIX) ?? false);
	// Failures after the vendor allocated are never refusals, whatever `refused` would say of them.
	const allocatedFailures = new WeakSet<object>();
	const afterAllocation = (error: unknown) =>
		matchesAnyCause(
			error,
			(link) => typeof link === "object" && link !== null && allocatedFailures.has(link),
		);

	/** One control-plane call outside a poll, bounded by `controlTimeoutMs`. */
	async function call<T>(
		label: string,
		outer: AbortSignal | undefined,
		work: (o: Op) => Promise<T>,
		timeoutMs = timing.controlTimeoutMs,
	): Promise<T> {
		const deadline = Date.now() + timeoutMs;
		const o = op(bounded(timeoutMs, outer));
		const expired = () => !outer?.aborted && (o.signal.aborted || Date.now() >= deadline);
		try {
			const result = await untilAborted(
				Promise.resolve().then(() => work(o)),
				o.signal,
			);
			// A response can arrive after the bound but before the timer callback gets a turn.
			if (Date.now() >= deadline) throw new Error("late response");
			return result;
		} catch (error) {
			if (expired()) throw new Error(`${provider} ${label} did not answer within ${timeoutMs}ms`);
			throw error;
		}
	}

	/**
	 * Poll within one bounded budget. Every port call shares the bounded signal, so expiry cancels
	 * the call in flight; an expiry (rather than the caller's own cancellation) becomes `expired()`.
	 */
	async function within<T>(
		deadlineMs: number,
		outer: AbortSignal | undefined,
		poll: (o: Op) => Promise<T | null>,
		expired: () => Error,
	): Promise<T> {
		const o = op(bounded(deadlineMs, outer));
		try {
			return await pollUntilReady({
				provider,
				deadlineMs,
				intervalMs: timing.pollMs,
				signal: o.signal,
				poll: () => poll(o),
			});
		} catch (error) {
			const timedOut =
				o.signal.aborted || (isDriverError(error) && error.code === "readiness-timeout");
			if (outer?.aborted || !timedOut) throw error;
			throw expired();
		}
	}

	async function liveRecords(signal?: AbortSignal): Promise<VendorRecord<Raw>[]> {
		const records = await drainPages(
			provider,
			(cursor) => call("listing page", signal, (o) => control.page(cursor, o)),
			op(signal),
			{ ...(traits.pageCap !== undefined && { pageCap: traits.pageCap }) },
		);
		return records.filter((record) => !isGone(record));
	}

	// Ids this kit has observed gone (or proven removed): a held session is never deleted again.
	const observedGone = new Set<string>();

	/**
	 * Cleanup confirmation: request removal once, then observe removal; an acknowledged delete is
	 * not removal. `observe-first` (destroy-by-id, recovery: no proof the allocation is live) looks
	 * before it deletes and never sends a delete to a record already observed gone. `remove-first`
	 * (a session the kit created and holds) requests removal straight away. Resolves whether this
	 * teardown requested the removal (false: the sandbox was already gone or going).
	 */
	async function destroy(
		id: string,
		signal?: AbortSignal,
		order: "observe-first" | "remove-first" = "observe-first",
	): Promise<boolean> {
		let requested = false;
		await within(
			timing.deleteTimeoutMs,
			signal,
			async (o) => {
				if (order === "remove-first" && !requested) {
					requested = true;
					if ((await control.remove(id, o)) === "removed") return true;
				}
				const record = await control.get(id, o);
				if (isGone(record)) return true;
				if (!requested && record?.phase !== "deleting") {
					requested = true;
					if ((await control.remove(id, o)) === "removed") return true;
				}
				return null;
			},
			() =>
				new Error(
					`${provider} sandbox ${id} was not observed removed within ${timing.deleteTimeoutMs}ms`,
				),
		);
		observedGone.add(id);
		return requested;
	}

	async function awaitReady(record: VendorRecord<Raw>, outer?: AbortSignal) {
		if (record.phase === "ready") return record;
		const observe = control.settle ?? control.get;
		return within(
			timing.readyTimeoutMs,
			outer,
			async (o) => {
				const current = await observe(record.id, o);
				if (isGone(current)) observedGone.add(record.id);
				if (current === null) throw new Error(`${provider} sandbox disappeared before readiness`);
				if (current.phase === "ready") return current;
				if (current.phase !== "pending")
					throw new Error(`${provider} sandbox entered ${current.phase} before readiness`);
				return null;
			},
			() =>
				new Error(`${provider} sandbox ${record.id} not ready within ${timing.readyTimeoutMs}ms`),
		);
	}

	/** The live allocations an ambiguous create's marker attributes to it, as parsed vendor ids. */
	async function recoveryIds(marker: string, signal?: AbortSignal): Promise<string[]> {
		const lookup = control.find;
		const records = lookup
			? await drainPages(
					provider,
					(cursor) => call("recovery lookup", signal, (o) => lookup(marker, cursor, o)),
					op(signal),
					{
						...(traits.pageCap !== undefined && { pageCap: traits.pageCap }),
						// A lookup may be a loose filter; the kit, not each adapter, refuses to tear down
						// anything the marker does not attribute to this attempt. A dedicated account's
						// replay may omit the marker, but never carries a different one.
						inspect: (page) => {
							for (const record of page)
								if (record.marker !== marker && !(dedicated && record.marker === undefined))
									throw new Error(`${provider} recovery returned an unrelated sandbox`);
						},
					},
				)
			: (await liveRecords(signal)).filter((record) => record.marker === marker);
		return records.filter((record) => !isGone(record)).map((record) => vendorId.assert(record.id));
	}

	/** Teardown of a session the kit created and holds: its allocation is known to exist. */
	const release = (id: string, signal?: AbortSignal) =>
		destroy(id, signal, observedGone.has(id) ? "observe-first" : "remove-first");

	const compute = nativeSdkCompute(
		async (attempt: CreateAttempt, operation): Promise<VendorHandle<Raw, Native>> => {
			const o = op(operation.signal);
			const record = await control.create(attempt, o);
			try {
				o.signal.throwIfAborted();
				return { record, native: await data.attach(record, o) };
			} catch (error) {
				// The vendor allocated: tear the known record down before reporting. Teardown runs on
				// its own budget (the attempt may be what aborted); if it fails, marker recovery,
				// which this failure always triggers, finds the record again.
				const failure = new Error(
					`${provider} sandbox ${record.id} was allocated but not attached`,
					{
						cause: error,
					},
				);
				allocatedFailures.add(failure);
				await release(record.id).catch(() => undefined);
				throw failure;
			}
		},
		({ record, native }) => ({
			sandboxId: record.id,
			runCommand: (command: string, options?: ExecOptions) => data.exec(native, command, options),
			destroy: () => release(record.id),
			...(files && {
				filesystem: {
					readFile: (path: string) => files.read(native, path),
					exists: async (path: string) =>
						files.exists
							? files.exists(native, path)
							: (await data.exec(native, `test -e ${shellQuote(path)}`)).exitCode === 0,
					writeFile: (path: string, text: string) => files.write(native, path, text),
				},
			}),
		}),
	);

	return computeSdkSpec(compute, {
		sandboxId: traits.sandboxId,
		createOptions: {
			coverage: traits.coverage,
			map: (request, unsupported) => {
				// The artifact guard: a request may only boot the artifact this context resolved.
				const resolved = context.resolvedArtifact;
				const same =
					request.artifact.kind === resolved.kind &&
					(resolved.kind === "none" ||
						(request.artifact.kind !== "none" && request.artifact.ref === resolved.ref));
				if (!same) unsupported(`request artifact differs from the resolved ${provider} artifact`);
				const refusal = traits.unsupported?.(request);
				if (refusal !== undefined) unsupported(refusal);
				return { request, marker: `${MARKER_PREFIX}${randomUUID()}` };
			},
		},
		...(launch && {
			commands: {
				exec: (sandbox, command, options) =>
					data.exec(sandbox.getInstance().native, command, options),
				launch: (sandbox, command, options) =>
					launch(sandbox.getInstance().native, command, options),
			},
		}),
		lifecycle: {
			destroy: async (sandbox, ref, operation) => {
				await release(ref?.id ?? sandbox.getInstance().record.id, operation.signal);
			},
		},
		createRecovery: {
			absenceConfirmationMs: traits.recovery?.absenceConfirmationMs ?? 2_000,
			maxAttempts: traits.recovery?.maxAttempts ?? 4,
			locator: (attempt) => ({
				kind: "marker",
				key: traits.markerKey ?? `${provider}-marker`,
				value: spelling.toVendor(attempt.marker),
			}),
			...((refused || transient) && {
				isDefinitive: (error: unknown) =>
					refused !== undefined && !afterAllocation(error) && refused(error) !== undefined,
				isRetryableCreate: (error: unknown) =>
					(refused !== undefined &&
						!afterAllocation(error) &&
						refused(error)?.retryable === true) ||
					transient?.(error) === true,
			}),
			cleanup: async (_compute, locator, operation) => {
				const marker = spelling.fromVendor(locator.value);
				if (marker === undefined)
					throw new Error(`${provider} recovery locator spells no ownership marker`);
				const ids = await recoveryIds(marker, operation.signal);
				if (ids.length === 0) return { status: "absent" };
				// Each teardown is independently bounded; run them together, then surface every failure.
				const outcomes = await Promise.allSettled(ids.map((id) => destroy(id, operation.signal)));
				const failures = outcomes.flatMap((outcome) =>
					outcome.status === "rejected" ? [outcome.reason] : [],
				);
				if (failures.length > 0)
					throw new AggregateError(
						failures,
						`${provider} recovery could not tear down ${failures.length} of ${ids.length} sandboxes`,
					);
				// Listed but already gone by the time teardown observed them: the account was not empty
				// a moment ago, so the bridge restarts its absence-confirmation clock.
				return outcomes.some((outcome) => outcome.status === "fulfilled" && outcome.value)
					? { status: "destroyed" }
					: { status: "absent", contradictedPriorAbsence: true };
			},
		},
		prepareAndVerifyCreatedRequest: async (_sandbox, handle, request, operation) => {
			const ready = await awaitReady(handle.record, operation.signal);
			const reason = control.admit?.(ready);
			if (reason) throw new Error(`${provider} rejected the allocation: ${reason}`);
			const prepared = await data.prepare?.(
				{ record: ready, native: handle.native },
				request,
				op(operation.signal),
			);
			if (prepared?.status === "unsupported") return prepared;
			const proven = traits.coverage.spec.diskGb === "runtime-verified" || traits.diskProof;
			if (!proven || request.spec.diskGb === undefined) return { status: "honored" };
			return verifyDisk(
				provider,
				request.spec.diskGb,
				(command) => data.exec(handle.native, command, operation),
				traits.diskProof,
			);
		},
		hasWorkingFilesystem: files !== undefined,
		probes: {
			observe: async (_compute, ref): Promise<SandboxObservation> => ({
				state: isGone(await call("observe", undefined, (o) => control.get(ref.id, o)))
					? "absent"
					: "running",
			}),
			describe: async (_compute, ref) =>
				(await call("describe", undefined, (o) => control.get(ref.id, o)))?.raw,
			// One page, as a control-plane latency probe rather than a full enumeration.
			list: async () =>
				(await call("list probe", undefined, (o) => control.page(undefined, o))).records.map(
					(record) => record.raw,
				),
		},
		inventory: {
			list: async (_compute, operation) => {
				const ownedIds: string[] = [];
				let foreignCount = 0;
				for (const record of await liveRecords(operation.signal)) {
					if (owned(record)) ownedIds.push(record.id);
					else foreignCount += 1;
				}
				return { owned: ownedIds, foreignCount };
			},
		},
		destroyById: async (_compute, ref, operation) => {
			await destroy(ref.id, operation.signal);
		},
		...(snapshots && {
			snapshots: {
				create: (_compute, session, options) =>
					call(
						"snapshot capture",
						undefined,
						(o) => snapshots.create(session.native, o, options?.retention ?? "ephemeral"),
						timing.snapshotTimeoutMs,
					),
				delete: (_compute, snapshotId) =>
					call(
						"snapshot delete",
						undefined,
						(o) => snapshots.delete(snapshotId, o),
						timing.snapshotTimeoutMs,
					),
			},
		}),
	});
}

/* ---------------------------------- module entry ---------------------------------- */

/** Everything a provider package declares: its traits, its passthroughs, and its vendor binding. */
export interface VendorDriverSpec<P extends ProviderId, Raw, Native> extends VendorTraits {
	readonly provenance: SdkProvenance;
	/** A ComputeSDK-lowered module has no cancellable hard ceiling: only the harness owns create. */
	readonly createBudget?: Extract<CreateBudget, { readonly owner: "harness" }>;
	readonly accelerator?: AcceleratorStrategy;
	readonly costEvidence?: ProviderCostEvidenceCapability<P>;
	/** The composition point: the only place the package binds its real SDK, client, or transport. */
	readonly vendor: (context: DriverContext<P>) => Vendor<Raw, Native>;
}

/**
 * Define a provider's DriverModule from its vendor. `specFor` lowers the same module against
 * another vendor or timing (a stubbed transport in tests), so packages never restate their binding.
 */
export function defineVendorDriver<P extends ProviderId, Raw, Native>(
	provider: P,
	module: VendorDriverSpec<NoInfer<P>, Raw, Native>,
) {
	const { provenance, vendor, createBudget, accelerator, costEvidence, ...traits } = module;
	const specFor = (
		context: DriverContext<P>,
		overrides: {
			readonly vendor?: Vendor<Raw, Native>;
			readonly timing?: Partial<VendorTiming>;
		} = {},
	) =>
		vendorSpec(
			provider,
			context,
			{ ...traits, timing: { ...traits.timing, ...overrides.timing } },
			overrides.vendor ?? vendor(context),
		);
	const driver = defineComputeSdkDriver(provider, {
		provenance,
		// Readiness is proven inside create (the kit polls the control plane before returning).
		readiness: { startup: "create-returns-ready" },
		execution: executionOf(provider, traits, undefined),
		...(createBudget && { createBudget }),
		...(accelerator && { accelerator }),
		...(costEvidence && { costEvidence }),
		spec: (context) => specFor(context),
	});
	// DriverModules are frozen; the test seam travels beside the module, not inside it.
	return Object.freeze({ ...driver, specFor });
}
