// Vendor authoring contracts and policy declarations (ADR-0024).

import type {
	CreateRequest,
	ExecOptions,
	ExecutionPolicy,
	ResolvedArtifact,
	SnapshotRetention,
} from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import type {
	ComputeSdkCreateRequestCoverage,
	ComputeSdkSandboxIdSchema,
} from "./lib/computesdk.ts";

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

export interface VendorTiming {
	readonly pollMs: number;
	readonly readyTimeoutMs: number;
	readonly deleteTimeoutMs: number;
	/** The interval between cleanup-confirmation reads, where it differs from `pollMs`. */
	readonly deletePollMs?: number;
	/**
	 * The least interval between two removal requests after the vendor refused one as transient (or
	 * a removal's own lookup timed out), where it differs from the cleanup-confirmation cadence.
	 * Removal is still read at that cadence in between.
	 */
	readonly removeRetryMs?: number;
	/**
	 * The bound on one control-plane read (`get`, `page`, `find`) and on a probe. A read inside a
	 * readiness or cleanup-confirmation poll that outlives it is read again at the poll's cadence
	 * until the poll's own deadline; anywhere else it fails the call.
	 */
	readonly controlTimeoutMs: number;
	/**
	 * The bound on one whole listing (the account's inventory, a recovery lookup): every page it
	 * drains shares it, so a slow vendor cannot stretch a listing page by page.
	 */
	readonly inventoryTimeoutMs: number;
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
	 * Execution passthrough. Defaults to a 60s synchronous cap over the kit's shell detach.
	 * `durable: "native-launch"` requires `data.launch`; any other policy may supply one.
	 */
	readonly execution?: ExecutionPolicy;
	readonly timing?: Partial<VendorTiming>;
	readonly recovery?: {
		readonly absenceConfirmationMs?: number;
		readonly maxAttempts?: number;
		/**
		 * `false`: an empty marker lookup cannot prove an ambiguous create absent (the vendor attaches
		 * the marker only after create, or a create can still land after every lookup). Recovery then
		 * tears down what the marker finds and otherwise keeps the attempt as a cleanup failure.
		 */
		readonly provesAbsence?: boolean;
		/**
		 * The spelling under which `control.get` resolves an attempt's marker (the create named the
		 * sandbox by it): recovery looks an ambiguous create up by that `get`, so the adapter needs
		 * no `find`.
		 */
		readonly lookup?: MarkerSpelling;
	};
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
	 * `reported`: the allocation's control-plane record reports its disk and `data.prepare` proves
	 * it there, so the kit runs no `df`.
	 */
	readonly diskProof?: DiskProof | "reported";
}

export interface DiskProof {
	/** The mount the requested capacity must land on (default `/`). */
	readonly path?: string;
	/** Capacity a formatted filesystem legitimately loses to its own metadata (default 0). */
	readonly allowanceGb?: number;
	/** The same allowance as a fraction of the requested capacity (default 0). */
	readonly allowanceRatio?: number;
}

/**
 * A suite-length sandbox lifetime (the longest suite budgets 155 minutes, plus setup and collection
 * margin), so an allocation every teardown missed still expires on its own. A create that can state
 * a vendor-side lifetime states this one.
 */
export const LEAK_EXPIRY_MS = 3 * 60 * 60_000;

/** The create-time prefix every kit-minted ownership marker carries. */
export const MARKER_PREFIX = "benchmark-";
const MINTED = new RegExp(`^${MARKER_PREFIX}[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$`);

/** Whether a vendor value is exactly a kit-minted marker (a sandbox the create named by it). */
export const isMintedMarker = (value: string): boolean => MINTED.test(value);

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
/** The marker as the kit mints it, unchanged: the default spelling. */
export const VERBATIM_MARKER: MarkerSpelling = markerSpelling(MARKER_PREFIX);

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

/**
 * The HTTP status a typed vendor error carries anywhere in its cause chain, read through `read`.
 * A status that cannot be read (a hostile getter) proves nothing.
 */
export const httpStatus =
	<E>(errorClass: abstract new (...args: never[]) => E, read: (error: E) => unknown) =>
	(error: unknown): number | undefined => {
		let status: number | undefined;
		matchesAnyCause(error, (cause) => {
			if (!(cause instanceof errorClass)) return false;
			try {
				const value = read(cause);
				if (typeof value === "number") status = value;
			} catch {
				// Keep walking the cause chain.
			}
			return status !== undefined;
		});
		return status;
	};

/** `refused` over listed HTTP statuses: each refuses before allocation; only a 429 is retryable. */
export const refusedOn =
	(status: (error: unknown) => number | undefined, statuses: readonly number[]) =>
	(error: unknown): { readonly retryable: boolean } | undefined => {
		const code = status(error);
		return code !== undefined && statuses.includes(code) ? { retryable: code === 429 } : undefined;
	};

/**
 * The REST reading of a status, for a vendor that documents no narrower one: a 4xx other than a
 * timeout (408) or conflict (409, which asserts that something already exists) refused before
 * allocating, retryable only on 429; a timeout, conflict, rate limit or 5xx is transient; a 404 is
 * the vendor's not-found.
 */
export function httpClassifiers(status: (error: unknown) => number | undefined) {
	return {
		refused: (error: unknown) => {
			const code = status(error);
			return code !== undefined && code >= 400 && code < 500 && code !== 408 && code !== 409
				? { retryable: code === 429 }
				: undefined;
		},
		transient: (error: unknown) => {
			const code = status(error);
			return code === 408 || code === 409 || code === 429 || (code !== undefined && code >= 500);
		},
		absent: (error: unknown) => status(error) === 404,
	} satisfies Pick<ControlPlane, "refused" | "transient" | "absent">;
}

export { abortableDelay } from "./lib/poll.ts";
export { DISK_PROBE, diskProbe, drainPages } from "./lib/vendor-helpers.ts";
export { bounded } from "./lib/vendor-port.ts";
