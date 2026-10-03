// Vendor control and data planes shared by provider adapters (ADR-0024).

import type {
	CreateRequest,
	ExecOptions,
	ResolvedArtifact,
	SnapshotRetention,
} from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";

/**
 * A provider-neutral reading of one control-plane record. `failed` still owns resources and is
 * deleted; `gone` is removal evidence (cleanup confirmation), never inferred from a delete request.
 */
export type Phase = "pending" | "ready" | "failed" | "deleting" | "gone";

/**
 * Every port call receives a signal. `create`, `attach` and `prepare` carry the create attempt's
 * signal (the harness owns that budget); every other call's signal also aborts when the kit's own
 * bound for it expires: `controlTimeoutMs` for each control-plane read (`get`, `page`, `find`) and
 * for a probe, the readiness or delete budget for every call inside that poll, `inventoryTimeoutMs`
 * for every page of one listing, and `snapshotTimeoutMs` for a snapshot. The kit stops waiting at
 * that bound even if the adapter ignores the signal, and rejects a response that arrives after it,
 * so an adapter states no per-call bound of its own on those calls. A read a readiness or
 * cleanup-confirmation poll abandons at `controlTimeoutMs` is simply read again while the poll's
 * deadline remains; when the poll ends, the signal of a read still in flight aborts with it.
 */
export interface Op {
	readonly signal: AbortSignal;
}

/**
 * A removal's operation. `current` is the kit's own `get` of the id being removed (bounded,
 * identity-checked, the vendor's not-found read as `null`), for a vendor that deletes through a
 * handle it must look up first. A lookup that outlives `controlTimeoutMs` fails the removal the way
 * a transient refusal does: the kit asks again within the delete budget.
 */
export interface RemoveOp<Raw = unknown> extends Op {
	current(): Promise<VendorRecord<Raw> | null>;
}

/** One control-plane record, parsed by the adapter (Tier 2) into provider-neutral facts. */
export interface VendorRecord<Raw = unknown> {
	readonly id: string;
	readonly phase: Phase;
	/** The create-time ownership marker the vendor echoes back (shared accounts). */
	readonly marker?: string;
	/**
	 * Holds no compute (a stopped sandbox). An owned one is still a leftover the kit tears down; a
	 * foreign one is not capacity the benchmark competes with, so inventory does not count it.
	 */
	readonly stopped?: boolean;
	/** The vendor's own account of a `failed` phase (its last error), carried into a boot failure. */
	readonly detail?: string;
	/**
	 * A boot failure the vendor's host gave up on (a per-sandbox build that corrupts under load): a
	 * fresh create lands elsewhere, so the failed create is retryable once the kit has torn it down.
	 */
	readonly retryCreate?: boolean;
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
	/**
	 * `null` only on the vendor's own not-found; every other failure throws. The kit refuses a
	 * record with another id (an SDK whose read also resolves a name).
	 */
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
	remove(id: string, op: RemoveOp<Raw>): Promise<"removed" | "accepted">;
	/**
	 * The vendor's own not-found. Declared, the kit reads such an error from `get` or `settle` as
	 * `null` and from `remove` as `"removed"`, so the adapter states the rule once instead of in
	 * every call. A vendor whose not-found is narrower (one endpoint's, not an auth or parent
	 * resource's) states exactly that rule here.
	 */
	absent?(error: unknown): boolean;
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
	 * A transient failure (a gateway, rate or conflict error that is not proof of refusal). A create
	 * the harness may retry once the kit has proven nothing remains allocated; independent of
	 * `refused`, it is still reconciled. A removal the kit asks again at a later read, no sooner than
	 * `removeRetryMs`, while the delete budget remains.
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

/**
 * Whether a ready allocation honours the request: `unsupported` refuses its shape. An honoured
 * allocation may carry the boot artifact the vendor's control plane reports (the reported
 * artifact), which must agree with the request before the session is returned.
 */
export type Verification =
	| { readonly status: "honored"; readonly reportedArtifact?: ResolvedArtifact }
	| { readonly status: "unsupported"; readonly detail: string };

export interface DataPlane<Raw, Native> {
	/**
	 * Bind the create's record to a native handle, before readiness. The vendor has returned an id
	 * by then, so a throw (a failed rename that would have made the allocation findable) is torn
	 * down, and its cleanup retained, by that id.
	 */
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
	/**
	 * Resolves only on genuine background acceptance. Required by `durable: "native-launch"`; under
	 * `shell-detach` it may run the kit's `detachedShellCommand` with a bound the plain exec lacks.
	 */
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

/**
 * A suite-length sandbox lifetime (the longest suite budgets 155 minutes, plus setup and collection
 * margin), so an allocation every teardown missed still expires on its own. A create that can state
 * a vendor-side lifetime states this one.
 */
export const LEAK_EXPIRY_MS = 3 * 60 * 60_000;

/** The create-time prefix every kit-minted ownership marker carries. */
export const MARKER_PREFIX = "benchmark-";

/** A cause-chain classifier over typed vendor errors, shared by every SDK adapter. */
export const instanceOfAny =
	(...classes: ReadonlyArray<abstract new (...args: never[]) => unknown>) =>
	(error: unknown): boolean =>
		matchesAnyCause(error, (cause) => classes.some((errorClass) => cause instanceof errorClass));
