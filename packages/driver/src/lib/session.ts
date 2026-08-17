// Session lifecycle helpers (ADR-0007 §9): teardown must never hide the primary error.

import type { SandboxSession } from "./port.ts";

/**
 * Run work against a session, then destroy it — preserving BOTH errors when both fail.
 *
 * A bare `finally { await session.destroy() }` replaces a benchmark failure with a teardown
 * failure; here a double fault throws `SuppressedError` in the same shape `using` produces:
 * `error` is the teardown failure, `suppressed` is the primary it would otherwise have hidden.
 */
export async function withSessionTeardown<Handle, T>(
	session: SandboxSession<Handle>,
	work: (session: SandboxSession<Handle>) => Promise<T>,
): Promise<T> {
	// Run work and teardown as two linear steps (no throw-in-finally, so a teardown failure can be
	// compared against the primary and combined rather than silently masking it).
	let outcome: { ok: true; value: T } | { ok: false; error: unknown };
	try {
		outcome = { ok: true, value: await work(session) };
	} catch (error) {
		outcome = { ok: false, error };
	}
	try {
		await session.destroy();
	} catch (teardown) {
		if (!outcome.ok) {
			throw new SuppressedError(
				teardown,
				outcome.error,
				"sandbox teardown failed after a primary error",
			);
		}
		throw teardown;
	}
	if (!outcome.ok) {
		throw outcome.error;
	}
	return outcome.value;
}
