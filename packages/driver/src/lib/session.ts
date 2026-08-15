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
	let primary: unknown;
	let failed = false;
	try {
		return await work(session);
	} catch (error) {
		primary = error;
		failed = true;
		throw error;
	} finally {
		try {
			await session.destroy();
		} catch (teardown) {
			if (failed) {
				throw new SuppressedError(teardown, primary, "sandbox teardown failed after a primary error");
			}
			throw teardown;
		}
	}
}
