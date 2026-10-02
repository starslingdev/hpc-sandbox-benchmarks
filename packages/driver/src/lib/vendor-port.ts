// The vendor port as the kit calls it (ADR-0023 §1). A provider package's adapter translates; this
// states, once, the rules every adapter would otherwise hand-write around its vendor calls:
//
//   - no port call starts on an already-aborted signal;
//   - where the control plane declares `absent`, the vendor's own not-found reads as absence: `null`
//     from `get` and `settle`, `"removed"` from `remove`;
//   - where the module declares `recovery.lookup`, the marker lookup is a `get` of the marker's
//     spelling (a create name the vendor resolves) rather than a hand-written `find`.
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

/** The port `defineVendorDriver` lowers and `vendorContract` checks. */
export function kitPort<Raw, Native>(
	vendor: Vendor<Raw, Native>,
	lookup?: MarkerSpelling,
): Vendor<Raw, Native> {
	const { control, data } = vendor;
	const { absent } = control;
	/** `get`'s contract: `null` only on the vendor's own not-found. */
	const observing = (
		read: (id: string, op: Op) => Promise<VendorRecord<Raw> | null>,
	): ((id: string, op: Op) => Promise<VendorRecord<Raw> | null>) =>
		started(async (id: string, op: Op) => {
			try {
				return await read(id, op);
			} catch (error) {
				if (absent?.(error)) return null;
				throw error;
			}
		}, opSignal);
	const get = observing(control.get);
	const find: ControlPlane<Raw>["find"] = control.find
		? started(control.find, opSignal)
		: lookup &&
			(async (marker, _cursor, op): Promise<VendorPage<Raw>> => {
				const found = await get(lookup.toVendor(marker), op);
				return { records: found ? [found] : [] };
			});
	return {
		...vendor,
		control: {
			...control,
			create: started(control.create, opSignal),
			get,
			...(control.settle && { settle: observing(control.settle) }),
			remove: started(async (id: string, op: Op) => {
				try {
					return await control.remove(id, op);
				} catch (error) {
					if (absent?.(error)) return "removed" as const;
					throw error;
				}
			}, opSignal),
			page: started(control.page, opSignal),
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
