// Readiness, cleanup evidence, inventory and ambiguous-create recovery share one lifecycle.
import type { ProviderId } from "@sandbox-benchmarks/driver";
import { DriverError, isDriverError, pollUntilReady } from "@sandbox-benchmarks/driver";
import type { Op, Vendor, VendorRecord, VendorTiming, VendorTraits } from "../vendor.ts";
import { MARKER_PREFIX, VERBATIM_MARKER } from "../vendor.ts";
import { budget, DEFAULT_TIMING, drainPages, executionOf } from "./vendor-helpers.ts";
import { ControlReadTimeout, kitPort, untilAborted } from "./vendor-port.ts";

export function vendorLifecycle<Raw, Native>(
	provider: ProviderId,
	traits: VendorTraits,
	vendor: Vendor<Raw, Native>,
) {
	const timing: VendorTiming = { ...DEFAULT_TIMING, ...traits.timing };
	const { control, data, snapshots } = kitPort(vendor, {
		provider,
		...(traits.recovery?.lookup && { lookup: traits.recovery.lookup }),
		controlTimeoutMs: timing.controlTimeoutMs,
	});
	const { files, launch } = data;
	const { refused, transient } = control;
	const spelling = traits.markerSpelling ?? VERBATIM_MARKER;
	const dedicated = traits.account === "dedicated";
	const provesAbsence = traits.recovery?.provesAbsence ?? false;
	// Markers of attempts whose allocation may exist although no lookup can show it yet.
	const unresolved = new Set<string>();
	if (dedicated && !control.find)
		throw new Error(`${provider}: a dedicated account recovers by replay and needs control.find`);
	if (vendor.control.find && traits.recovery?.lookup)
		throw new Error(`${provider}: recovery looks a marker up by control.find or by get, not both`);
	if (traits.diskProof === "reported" && !data.prepare)
		throw new Error(`${provider}: a reported disk proof is proven by data.prepare`);
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

	/** One control-plane call outside a poll, bounded by `controlTimeoutMs`. */
	async function call<T>(
		label: string,
		outer: AbortSignal | undefined,
		work: (o: Op) => Promise<T>,
		timeoutMs = timing.controlTimeoutMs,
	): Promise<T> {
		const deadline = Date.now() + timeoutMs;
		const o = op(budget(timeoutMs, outer));
		const expired = () => !outer?.aborted && (o.signal.aborted || Date.now() >= deadline);
		try {
			const result = await untilAborted(
				Promise.resolve().then(() => {
					o.signal.throwIfAborted();
					return work(o);
				}),
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
	 * Poll within one bounded budget. Every port call shares the bounded signal, which aborts when
	 * the poll ends however it ends, so a read still in flight at the deadline (an SDK that ignores
	 * its signal) is cancelled rather than left running; an expiry (rather than the caller's own
	 * cancellation) becomes `expired()`.
	 */
	async function within<T>(
		deadlineMs: number,
		outer: AbortSignal | undefined,
		poll: (o: Op) => Promise<T | null>,
		expired: () => unknown,
		intervalMs = timing.pollMs,
	): Promise<T> {
		const ended = new AbortController();
		const o = op(AbortSignal.any([budget(deadlineMs, outer), ended.signal]));
		try {
			return await pollUntilReady({
				provider,
				deadlineMs,
				intervalMs,
				signal: o.signal,
				poll: () => poll(o),
			});
		} catch (error) {
			const timedOut =
				o.signal.aborted || (isDriverError(error) && error.code === "readiness-timeout");
			if (outer?.aborted || !timedOut) throw error;
			throw expired();
		} finally {
			ended.abort(new Error(`${provider} poll ended`));
		}
	}

	/**
	 * One whole listing within `inventoryTimeoutMs`: every page shares that budget and the caller's
	 * signal (each page is still bounded on its own by `controlTimeoutMs`), and a page in flight when
	 * the budget ends is cancelled with it.
	 */
	async function listing<T>(
		label: string,
		outer: AbortSignal | undefined,
		drain: (signal: AbortSignal) => Promise<T>,
	): Promise<T> {
		const timeoutMs = timing.inventoryTimeoutMs;
		const deadline = Date.now() + timeoutMs;
		const ended = new AbortController();
		const signal = AbortSignal.any([budget(timeoutMs, outer), ended.signal]);
		const expired = () => new Error(`${provider} ${label} did not complete within ${timeoutMs}ms`);
		try {
			signal.throwIfAborted();
			const result = await untilAborted(drain(signal), signal);
			// The last page can answer after the budget but before the timer callback gets a turn.
			if (Date.now() >= deadline) throw expired();
			return result;
		} catch (error) {
			if (!outer?.aborted && (signal.aborted || Date.now() >= deadline)) throw expired();
			throw error;
		} finally {
			ended.abort(new Error(`${provider} ${label} ended`));
		}
	}

	const pageCap = { ...(traits.pageCap !== undefined && { pageCap: traits.pageCap }) };

	async function liveRecords(outer?: AbortSignal): Promise<VendorRecord<Raw>[]> {
		const records = await listing("listing", outer, (signal) =>
			drainPages(
				provider,
				(cursor) => call("listing page", signal, (o) => control.page(cursor, o)),
				op(signal),
				pageCap,
			),
		);
		return records.filter((record) => !isGone(record));
	}

	/**
	 * One read of a poll: `undefined` when the read outlived `controlTimeoutMs`, so the poll reads
	 * again at its cadence until its own deadline, as it would wait out a slow boot. Every other
	 * failure, and the caller's cancellation, still ends the poll.
	 */
	async function reread(
		read: (id: string, o: Op) => Promise<VendorRecord<Raw> | null>,
		id: string,
		o: Op,
	): Promise<VendorRecord<Raw> | null | undefined> {
		try {
			return await read(id, o);
		} catch (error) {
			if (error instanceof ControlReadTimeout) return undefined;
			throw error;
		}
	}

	// Ids this kit has observed gone (or proven removed): a held session is never deleted again.
	const observedGone = new Set<string>();

	/**
	 * Cleanup confirmation: request removal, then observe removal; an acknowledged delete is not
	 * removal. `observe-first` (destroy-by-id, recovery: no proof the allocation is live) looks
	 * before it deletes and never sends a delete to a record already observed gone. `remove-first`
	 * (a session the kit created and holds) requests removal straight away. A transient refusal of
	 * the request, or a removal whose own lookup (`RemoveOp.current`) outlived `controlTimeoutMs`, is
	 * asked again at a later read, no sooner than `removeRetryMs` after the last request, while the
	 * delete budget remains. Resolves whether this teardown requested the removal (false: the
	 * sandbox was already gone or going).
	 */
	async function destroy(
		id: string,
		signal?: AbortSignal,
		order: "observe-first" | "remove-first" = "observe-first",
	): Promise<boolean> {
		const retryMs = timing.removeRetryMs ?? timing.deletePollMs ?? timing.pollMs;
		let requested = false;
		let accepted = false;
		let lastRequest = Number.NEGATIVE_INFINITY;
		// The last transient refusal: if the budget ends on it, it is the diagnostic, not the timeout.
		let refusal: { readonly error: unknown } | undefined;
		const request = async (o: Op) => {
			requested = true;
			lastRequest = Date.now();
			try {
				const outcome = await control.remove(id, o);
				accepted = true;
				refusal = undefined;
				return outcome === "removed" ? true : null;
			} catch (error) {
				if (!(error instanceof ControlReadTimeout) && !transient?.(error)) throw error;
				refusal = { error };
				return null;
			}
		};
		await within(
			timing.deleteTimeoutMs,
			signal,
			async (o) => {
				const first = order === "remove-first" && !requested;
				if (first && (await request(o))) return true;
				const record = await reread(control.get, id, o);
				if (record === undefined) return null;
				if (isGone(record)) return true;
				const due = Date.now() - lastRequest >= retryMs;
				if (!first && !accepted && due && record?.phase !== "deleting") return request(o);
				return null;
			},
			() =>
				refusal
					? refusal.error
					: new Error(
							`${provider} sandbox ${id} was not observed removed within ${timing.deleteTimeoutMs}ms`,
						),
			timing.deletePollMs,
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
				const current = await reread(observe, record.id, o);
				if (current === undefined) return null;
				if (isGone(current)) observedGone.add(record.id);
				if (current === null) throw new Error(`${provider} sandbox disappeared before readiness`);
				if (current.phase === "ready") return current;
				// A boot the vendor's host gave up on is marked retryable; the bridge honours the mark
				// only once teardown has proven nothing remains allocated.
				if (current.phase !== "pending")
					throw new DriverError(
						"create-failed",
						`${provider} sandbox entered ${current.phase} before readiness${current.detail ? `: ${current.detail}` : ""}`,
						{ provider, ...(current.retryCreate && { retryable: true }) },
					);
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
			? await listing("recovery lookup", signal, (bound) =>
					drainPages(
						provider,
						(cursor) => call("recovery lookup", bound, (o) => lookup(marker, cursor, o)),
						op(bound),
						{
							...pageCap,
							// A lookup may be a loose filter; the kit, not each adapter, refuses to tear down
							// anything the marker does not attribute to this attempt. A dedicated account's
							// replay may omit the marker, but never carries a different one.
							inspect: (page) => {
								for (const record of page)
									if (record.marker !== marker && !(dedicated && record.marker === undefined))
										throw new Error(`${provider} recovery returned an unrelated sandbox`);
							},
						},
					),
				)
			: (await liveRecords(signal)).filter((record) => record.marker === marker);
		return records.filter((record) => !isGone(record)).map((record) => vendorId.assert(record.id));
	}

	/** Teardown of a session the kit created and holds: its allocation is known to exist. */
	const release = (id: string, signal?: AbortSignal) =>
		destroy(id, signal, observedGone.has(id) ? "observe-first" : "remove-first");

	// Create is only the vendor call: once it returns an id, every later step (attach, readiness,
	// admission, preparation, the disk proof) runs on the bridge's post-create path, which tears the
	// allocation down by that id and, if teardown fails, retains a cleanup that retries by id.
	return {
		timing,
		control,
		data,
		snapshots,
		files,
		launch,
		refused,
		transient,
		spelling,
		provesAbsence,
		unresolved,
		op,
		isGone,
		owned,
		call,
		liveRecords,
		awaitReady,
		recoveryIds,
		destroy,
		release,
	};
}
