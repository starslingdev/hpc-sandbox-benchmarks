/**
 * Carry a {@link GapCause} on the Error that caused it, so the classification survives the throw.
 *
 * The harness knows exactly what went wrong at the point it throws — which step, which budget, which
 * exit code — but that knowledge reaches the dataset through a marker written several frames up, and an
 * Error carries nothing but a message. Downstream then re-derived the fact by matching prose. Making the
 * cause part of the error's TYPE lets the marker writer record what the thrower actually knew.
 *
 * A class rather than a side-channel property on arbitrary errors: every failure classified here is one
 * the harness constructs itself ({@link StepRunner}'s timeout, lost-sandbox and non-zero-exit paths), so
 * there is no pass-through case to accommodate. An error arriving from a provider SDK is simply
 * unclassified, and {@link gapCauseOf} says so — which is the honest answer rather than a label invented
 * for it.
 */
import type { GapCause } from "@sandbox-benchmarks/schema";

/** An error the harness raised with its failure already classified. */
export class GapError extends Error {
	readonly gapCause: GapCause;

	constructor(message: string, gapCause: GapCause) {
		super(message);
		this.name = "GapError";
		this.gapCause = gapCause;
	}
}

/**
 * The classification an error was thrown with, or undefined when it carries none.
 *
 * Undefined is the honest answer for an unclassified failure and must stay one: a caller that cannot
 * read a cause records a gap without one, rather than guessing a kind from the message. Guessing would
 * reintroduce prose-parsing at the exact boundary this exists to remove it from.
 */
export function gapCauseOf(error: unknown): GapCause | undefined {
	return error instanceof GapError ? error.gapCause : undefined;
}
