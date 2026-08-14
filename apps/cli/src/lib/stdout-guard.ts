/**
 * Quarantine stdout so a bin whose output IS a document cannot have it corrupted by a progress log.
 *
 * `bench-local` promises that stdout carries exactly one Run JSON — that is what makes
 * `bench-local > run.json` and `| jq` work at all. But a suite run drives the whole harness, which
 * logs its step banners and results with bare `console.log`, and none of that can be threaded through
 * a sink for one caller's benefit without touching every module it lives in.
 *
 * So the stream is redirected instead, for the duration of the run, and the caller is handed back the
 * ORIGINAL writer for the one thing stdout is for.
 *
 * Both halves are required. Patching `process.stdout.write` alone is not enough: Bun's `console.log`
 * writes to the file descriptor natively rather than calling `write` — the same fact
 * `./log-prefix.ts` documents from a live incident, where a stream-only patch left every
 * `console.log` in packages/harness unaffected. Patching only `console` is likewise not enough,
 * because a direct `process.stdout.write` would still land mid-JSON.
 */

/** The stream-write signature both `process.stdout.write` overloads collapse to. */
type WriteFn = typeof process.stdout.write;

/** What {@link withStdoutQuarantined} hands back once the quarantine is lifted. */
export interface QuarantinedRun<T> {
	result: T;
	/** Write to the REAL stdout — the escape hatch for the document the bin exists to produce. */
	emit: (text: string) => void;
}

/**
 * Build a `write` that sends everything to `stderr` instead.
 *
 * Exported so the redirect itself is testable without mutating the process streams every other test
 * in the run shares — the same seam `./log-prefix.ts` exposes for the same reason.
 */
export function createStderrRedirect(stderrWrite: WriteFn): WriteFn {
	return function redirected(
		this: unknown,
		chunk: unknown,
		encoding?: unknown,
		callback?: unknown,
	): boolean {
		// Forwarded positionally rather than destructured into a fixed shape: `write` has two overloads
		// (`chunk, cb` and `chunk, encoding, cb`), and collapsing them here would drop a caller's
		// callback and hang a stream that waits on its drain.
		return (stderrWrite as (...args: unknown[]) => boolean).call(
			process.stderr,
			chunk,
			encoding,
			callback,
		);
	} as WriteFn;
}

/**
 * Run `fn` with stdout quarantined onto stderr, restoring on both the success and the throwing path.
 *
 * Deliberately NOT a global install: the quarantine is scoped to the benchmark, so `--help` and the
 * discovery listings (which resolve before it and legitimately print to stdout) are unaffected.
 */
export async function withStdoutQuarantined<T>(fn: () => Promise<T>): Promise<QuarantinedRun<T>> {
	// The property VALUES, not bound copies: restoring a bound wrapper would leave `process.stdout.write`
	// a different function than it started as, so nesting or repeating a quarantine would accumulate a
	// layer of indirection per call and never return the stream to its original state.
	const realWrite = process.stdout.write;
	const stderrWrite = process.stderr.write;
	const redirect = createStderrRedirect(stderrWrite);

	process.stdout.write = redirect;
	// `console.log`/`info`/`debug` are the stdout-bound methods; `warn`/`error` already go to stderr,
	// so leaving them alone keeps their formatting and their fast path.
	const originals = { log: console.log, info: console.info, debug: console.debug };
	// Re-routed through console.error rather than through the patched stream so Bun's own formatting
	// (inspection, spacing, multiple arguments) is preserved exactly — a redirected progress log
	// should still be readable, not a stringified approximation of itself.
	const toStderr = (...args: unknown[]): void => {
		console.error(...args);
	};
	console.log = toStderr;
	console.info = toStderr;
	console.debug = toStderr;

	try {
		const result = await fn();
		return {
			result,
			emit: (text: string) => {
				realWrite.call(process.stdout, text);
			},
		};
	} finally {
		process.stdout.write = realWrite;
		console.log = originals.log;
		console.info = originals.info;
		console.debug = originals.debug;
	}
}
