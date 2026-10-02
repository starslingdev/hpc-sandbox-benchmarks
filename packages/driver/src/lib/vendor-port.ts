// The vendor port as the kit calls it (ADR-0023 §1). A provider package's adapter translates; this
// states, once, the rules every adapter would otherwise hand-write around its vendor calls:
//
//   - no port call starts on an already-aborted signal;
//   - each control-plane read (`get`, `page`, `find`) is bounded by `controlTimeoutMs` and its
//     operation: the adapter receives the bounded signal, and the read settles at the bound even
//     where the SDK takes no signal. `create`, `settle` and `remove` may legitimately wait on the
//     vendor (a boot, a long poll, a waited delete) and stay within their own budgets;
//   - a read by id answers for that id: a record with another id (an SDK that also resolves a name)
//     is refused, never acted on. A removal that must look its sandbox up first reads it through
//     `RemoveOp.current`, under the same rule;
//   - where the control plane declares `absent`, the vendor's own not-found reads as absence: `null`
//     from `get` and `settle`, `"removed"` from `remove`;
//   - where the module declares `recovery.lookup`, the marker lookup is a `get` of the marker's
//     spelling (a create name the vendor resolves) rather than a hand-written `find`: the one find
//     whose not-found proves the name absent. A listing `find` never reads a not-found as empty.
//
// The kit lowers this port, and `vendorContract` holds every adapter to it, so both see the same port.

import type { ExecOptions } from "@sandbox-benchmarks/driver";
import type {
	ControlPlane,
	MarkerSpelling,
	Op,
	Vendor,
	VendorPage,
	VendorRecord,
} from "../vendor.ts";

/** The kit's default bound on one control-plane call. */
export const CONTROL_TIMEOUT_MS = 30_000;

/** Settle with `work`, or reject as soon as `signal` aborts whether or not the work honours it. */
export function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
	if (signal.aborted) return Promise.reject(signal.reason);
	return new Promise((resolve, reject) => {
		const abort = () => reject(signal.reason);
		signal.addEventListener("abort", abort, { once: true });
		work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
	});
}

/**
 * One vendor call bounded by `timeoutMs` and the caller's `signal`. `work` receives the bounded
 * signal to hand an SDK that honours one, and the call is raced against it for an SDK that does
 * not, so it settles at the bound either way, rejecting with the bound's reason (the caller's, or
 * a `TimeoutError`).
 */
export function bounded<T>(
	signal: AbortSignal | undefined,
	timeoutMs: number,
	work: (signal: AbortSignal) => T | Promise<T>,
): Promise<T> {
	const bound = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
	if (bound.aborted) return Promise.reject(bound.reason);
	return untilAborted(
		Promise.resolve().then(() => work(bound)),
		bound,
	);
}

/** A port call that never starts once its operation was cancelled. */
function started<A extends unknown[], T>(
	call: (...args: A) => T | Promise<T>,
	signalOf: (...args: A) => AbortSignal | undefined,
): (...args: A) => Promise<T> {
	return async (...args) => {
		signalOf(...args)?.throwIfAborted();
		return call(...args);
	};
}

const opSignal = (...args: unknown[]) => (args.at(-1) as Op).signal;
const execSignal = (_native: unknown, _command: string, options?: ExecOptions) => options?.signal;

export interface KitPortOptions {
	/** How diagnostics name the vendor. */
	readonly provider?: string;
	/** The module's `recovery.lookup`. */
	readonly lookup?: MarkerSpelling;
	/** The bound on one control-plane read (default {@link CONTROL_TIMEOUT_MS}). */
	readonly controlTimeoutMs?: number;
}

/** The control plane as the kit calls it: a removal takes a plain operation. */
export type KitControlPlane<Raw> = Omit<ControlPlane<Raw>, "remove"> & {
	remove(id: string, op: Op): Promise<"removed" | "accepted">;
};

/** A vendor as the kit calls it. */
export type KitVendor<Raw, Native> = Omit<Vendor<Raw, Native>, "control"> & {
	readonly control: KitControlPlane<Raw>;
};

/** The port `defineVendorDriver` lowers and `vendorContract` checks. */
export function kitPort<Raw, Native>(
	vendor: Vendor<Raw, Native>,
	{ provider = "vendor", lookup, controlTimeoutMs = CONTROL_TIMEOUT_MS }: KitPortOptions = {},
): KitVendor<Raw, Native> {
	const { control, data } = vendor;
	const { absent } = control;
	type Read = (id: string, op: Op) => Promise<VendorRecord<Raw> | null>;
	/** A control-plane read within `controlTimeoutMs`, handed the bounded signal. */
	const capped =
		<A extends unknown[], T>(read: (...args: [...A, Op]) => Promise<T>) =>
		(...args: [...A, Op]): Promise<T> => {
			const op = args.at(-1) as Op;
			const rest = args.slice(0, -1) as A;
			return bounded(op.signal, controlTimeoutMs, (signal) => read(...rest, { ...op, signal }));
		};
	/** `get`'s contract: `null` only on the vendor's own not-found. */
	const observing =
		(read: Read): Read =>
		async (id, op) => {
			try {
				return await read(id, op);
			} catch (error) {
				if (absent?.(error)) return null;
				throw error;
			}
		};
	/** A read by id answers for that id, or not at all. */
	const identified =
		(read: Read): Read =>
		async (id, op) => {
			const record = await read(id, op);
			if (record !== null && record.id !== id)
				throw new Error(`${provider} returned an unrelated sandbox for ${id}`);
			return record;
		};
	const lookupGet = started(observing(capped(control.get)), opSignal);
	const get = identified(lookupGet);
	const find: ControlPlane<Raw>["find"] = control.find
		? started(capped(control.find), opSignal)
		: lookup &&
			(async (marker, _cursor, op): Promise<VendorPage<Raw>> => {
				const found = await lookupGet(lookup.toVendor(marker), op);
				return { records: found ? [found] : [] };
			});
	return {
		...vendor,
		control: {
			...control,
			create: started(control.create, opSignal),
			get,
			...(control.settle && {
				settle: started(identified(observing(control.settle)), opSignal),
			}),
			remove: started(async (id: string, op: Op) => {
				try {
					return await control.remove(id, { ...op, current: () => get(id, op) });
				} catch (error) {
					if (absent?.(error)) return "removed" as const;
					throw error;
				}
			}, opSignal),
			page: started(capped(control.page), opSignal),
			...(find && { find }),
		},
		data: {
			...data,
			attach: started(data.attach, opSignal),
			...(data.prepare && { prepare: started(data.prepare, opSignal) }),
			exec: started(data.exec, execSignal),
			...(data.launch && { launch: started(data.launch, execSignal) }),
		},
	};
}
