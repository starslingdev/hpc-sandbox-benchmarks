// How an adapter tells the harness that a failed create is worth waiting out.
//
// The harness otherwise infers this from the error MESSAGE (`/quota|rate.?limit|too many|capacity|429/`),
// which only works for providers that answer an over-quota create with a recognisable error. A provider
// that expresses saturation by STALLING — accepting the request and never answering — produces a timeout
// message that matches nothing, so the cell hard-fails in seconds instead of queueing. That is what took
// out every runcloud cell of matrix run 30960125032.
//
// The mark is deliberately narrower than "the create failed". Retrying issues a NEW create, so it is only
// safe once the adapter has ESTABLISHED that the previous attempt allocated nothing. An adapter that
// merely failed to find out must not mark the error: retrying an attempt that may have allocated is how
// one stranded sandbox becomes a dozen.

/** `Symbol.for` so the mark survives a duplicated module instance — the harness and the adapter package
 *  can be resolved separately, and a mark that silently stopped being visible would reintroduce the
 *  hard-fail this exists to remove. */
const RETRYABLE_CREATE = Symbol.for("sandbox-benchmarks.retryableCreate");

/**
 * Mark an error as "this failure is transient, AND nothing was allocated" — the two conditions that
 * together make re-issuing the create both useful and safe. Returns the error so a throw site can wrap
 * it inline. A non-object (a thrown string) or non-extensible object is returned untouched: there is
 * nowhere safe to carry the mark, and inventing a wrapper would lose the identity callers match on.
 */
export function markRetryableCreate<E>(error: E): E {
	if (typeof error === "object" && error !== null) {
		try {
			Object.defineProperty(error, RETRYABLE_CREATE, { value: true, enumerable: false });
		} catch {
			// Error decoration is best-effort. A frozen SDK error or hostile proxy must not replace the
			// provider's original failure with a TypeError from this helper.
		}
	}
	return error;
}

/** Whether an adapter explicitly marked this failure as safe and useful to retry. */
export function isRetryableCreateError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	try {
		return (error as Record<symbol, unknown>)[RETRYABLE_CREATE] === true;
	} catch {
		return false;
	}
}
