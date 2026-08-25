// Kit-owned readiness (ADR-0008 §4: readiness is a declared strategy where "the kit owns the loop
// once" — hand-rolled deadline arithmetic "is the code easiest to get wrong"). A create-then-poll
// driver supplies only its poll/select closures; the deadline, the interval, the sleep-clamping,
// and the typed `readiness-timeout` error live here, so every such driver gets them identically.

import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import { DriverError } from "./errors.ts";

export interface ReadinessStrategy<T> {
	readonly provider: ProviderId;
	/** One readiness probe; returns the ready result, or null to keep polling. */
	poll(): Promise<T | null>;
	readonly deadlineMs: number;
	readonly intervalMs: number;
	readonly signal?: AbortSignal;
}

function abortReason(signal: AbortSignal): unknown {
	return signal.reason ?? new Error("Readiness polling aborted");
}

function subscribeToAbort(signal: AbortSignal | undefined, listener: () => void): () => void {
	if (signal === undefined) return () => {};
	signal.addEventListener("abort", listener, { once: true });
	if (signal.aborted) {
		signal.removeEventListener("abort", listener);
		listener();
		return () => {};
	}
	return () => signal.removeEventListener("abort", listener);
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) return Promise.reject(abortReason(signal));
	return new Promise((resolve, reject) => {
		let unsubscribe = () => {};
		const timer = setTimeout(done, ms);
		function done(): void {
			unsubscribe();
			resolve();
		}
		function aborted(): void {
			clearTimeout(timer);
			unsubscribe();
			if (signal !== undefined) reject(abortReason(signal));
		}
		unsubscribe = subscribeToAbort(signal, aborted);
	});
}

function timeoutError(strategy: ReadinessStrategy<unknown>): DriverError {
	return new DriverError(
		"readiness-timeout",
		`${strategy.provider} sandbox not ready within ${strategy.deadlineMs}ms`,
		{ provider: strategy.provider },
	);
}

async function pollBefore<T>(strategy: ReadinessStrategy<T>, deadline: number): Promise<T | null> {
	if (strategy.signal?.aborted) throw abortReason(strategy.signal);
	const remaining = deadline - Date.now();
	if (remaining <= 0) throw timeoutError(strategy);

	let timeout: ReturnType<typeof setTimeout> | undefined;
	let unsubscribeAbort = () => {};
	try {
		const attempts: Array<Promise<T | null>> = [];
		if (strategy.signal !== undefined)
			attempts.push(
				new Promise<never>((_resolve, reject) => {
					unsubscribeAbort = subscribeToAbort(strategy.signal, () =>
						reject(abortReason(strategy.signal as AbortSignal)),
					);
				}),
			);
		// Subscribe before invoking provider code: a synchronous poll implementation may abort.
		attempts.push(
			Promise.resolve().then(() => strategy.poll()),
			new Promise<never>((_resolve, reject) => {
				timeout = setTimeout(() => reject(timeoutError(strategy)), remaining);
			}),
		);
		const ready = await Promise.race(attempts);
		// A probe can resolve after its budget but before the timer callback gets a turn.
		if (Date.now() >= deadline) throw timeoutError(strategy);
		return ready;
	} finally {
		if (timeout !== undefined) clearTimeout(timeout);
		unsubscribeAbort();
	}
}

/**
 * Poll until `poll()` returns non-null or the deadline passes. Sleeps are clamped to the remaining
 * budget, and the deadline is checked BEFORE each probe — so a timed-out create never spawns one
 * extra wasted probe, and the failure is reported on time rather than up to `intervalMs` late.
 */
export async function pollUntilReady<T>(strategy: ReadinessStrategy<T>): Promise<T> {
	const deadline = Date.now() + strategy.deadlineMs;
	for (;;) {
		const ready = await pollBefore(strategy, deadline);
		if (ready !== null) {
			return ready;
		}
		const remaining = deadline - Date.now();
		if (remaining <= 0) throw timeoutError(strategy);
		await abortableDelay(Math.min(strategy.intervalMs, remaining), strategy.signal);
	}
}
