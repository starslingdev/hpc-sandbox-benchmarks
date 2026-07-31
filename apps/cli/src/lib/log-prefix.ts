/**
 * Per-replicate line prefixing for the concurrent bench-suite driver.
 *
 * One runner now drives R replicate sandboxes at once (see ./replicates.ts), and every layer below —
 * the harness's step logs, PTS output echoed back from a collected step, `@actions/core` info lines —
 * writes to one shared stdout. Without a prefix the R interleaved transcripts are unreadable, and the
 * single most common CI question ("which sandbox died?") becomes unanswerable from the log.
 *
 * The tag is carried in an {@link AsyncLocalStorage}, not passed down through the harness API, because
 * the writers are `console.log`/`process.stdout.write` calls several packages deep whose only shared
 * context is the async task they run under. Patching the streams once and reading the tag from the
 * ambient async context tags every line a replicate emits — including ones from code that knows
 * nothing about replicates — without threading a logger through the whole call graph.
 */
// `node:async_hooks` is the sole import: AsyncLocalStorage has no `Bun.*` equivalent (Bun implements
// this API natively rather than exposing its own). Everything else here is Bun-native — argument
// rendering goes through `Bun.inspect`, the inspector Bun's own console uses.
import { AsyncLocalStorage } from "node:async_hooks";

const tagStore = new AsyncLocalStorage<string>();

/** Node's stream write signature, in the two shapes callers actually use. */
type WriteFn = (
	chunk: unknown,
	encoding?: unknown,
	callback?: (err?: Error | null) => void,
) => boolean;

/**
 * Whether the stream is currently at the start of a line.
 *
 * One per stream, NOT per replicate — the bytes of R concurrent replicates land on one shared fd, so
 * "is the cursor mid-line" is a property of that fd and cannot be tracked per writer. Every writer on
 * the tagged path emits whole lines today (`StepRunner.finishStep` normalises a missing trailing
 * newline, `core.info` appends EOL, the console patch appends `\n`), so the mid-line case is an
 * anomaly rather than routine — but {@link prefixChunk} still has to survive it, because when it does
 * happen it lands on the shared cursor and would otherwise corrupt whatever writes next.
 */
interface StreamState {
	atLineStart: boolean;
}

/** Workflow commands (`::error::`, `::group::`, …) are parsed by the runner ONLY at the start of a
 *  line. Prefixing one turns an annotation into literal text, so they are never tagged. */
function isWorkflowCommand(line: string): boolean {
	return line.startsWith("::");
}

/**
 * Prefix each line START in `chunk` with `tag`, advancing `state`. A trailing newline does NOT emit a
 * dangling prefix — the next chunk's write does that — so a blank prefixed line never appears at the
 * end of the transcript.
 *
 * Two properties this has to get right, both of which an earlier line-blind version got wrong:
 *
 *  - The workflow-command check is PER LINE, not per chunk. `StepRunner.finishStep` writes a step's
 *    entire stdout in ONE call, so a chunk-level check meant a step whose first line happened to
 *    begin with `::` (an IPv6 literal like `::1`, say) lost the `[rN]` tag for its whole transcript —
 *    exactly the multi-hundred-line block an operator needs attributed when one sandbox misbehaves.
 *  - A workflow command that arrives mid-line gets a newline forced in front of it. Otherwise a
 *    partial-line write by one replicate silently welds the next replicate's `::error::` onto the end
 *    of that line, where the runner will not parse it — losing the cell's only failure annotation on
 *    precisely the runs that have one. A stray line break in already-interleaved output is a trivial
 *    price for keeping the annotation.
 */
export function prefixChunk(chunk: string, tag: string, state: StreamState): string {
	if (chunk === "") return chunk;
	const endsWithNewline = chunk.endsWith("\n");
	const body = endsWithNewline ? chunk.slice(0, -1) : chunk;
	const rendered = body.split("\n").map((line, i) => {
		// Only the first line of a chunk can be a continuation; every later one follows a newline.
		const atLineStart = i === 0 ? state.atLineStart : true;
		if (isWorkflowCommand(line)) return atLineStart ? line : `\n${line}`;
		return atLineStart ? `${tag}${line}` : line;
	});
	state.atLineStart = endsWithNewline;
	return `${rendered.join("\n")}${endsWithNewline ? "\n" : ""}`;
}

/**
 * A `write` that delegates to `original`, prefixing string chunks written inside {@link withLineTag}.
 * Exported (rather than only applied to the real streams) so the async-context wiring is testable
 * without mutating process.stdout, which every other test in the run shares.
 */
export function createTaggedWriter(original: WriteFn): WriteFn {
	const state: StreamState = { atLineStart: true };
	return (chunk, encoding, callback) => {
		// An UNTAGGED write still goes through prefixChunk, with an empty tag. Skipping it entirely
		// looks equivalent — an empty tag prefixes nothing — but it is not: prefixChunk also owns
		// `state.atLineStart` and the forced newline before a mid-line workflow command. The writes
		// that matter most here are untagged, because they happen after `runPooled` resolves and the
		// async-context tag is gone: `reportFleet`'s `core.error` annotation and `fail()`. Let a
		// replicate's last chunk end without a newline and the skip would weld the cell's ONLY failure
		// annotation onto that dangling line, where the runner never parses it — precisely the loss the
		// tagged path forces a break to avoid, arriving through the one path that had no guard.
		const tag = tagStore.getStore() ?? "";
		// Buffers pass through untouched: nothing in this CLI writes binary to stdout, and decoding one
		// to prefix it would risk corrupting a multi-byte character split across chunks.
		const rewritten = typeof chunk !== "string" ? chunk : prefixChunk(chunk, tag, state);
		return original(rewritten, encoding, callback);
	};
}

/** Wrap one stream's `write` so string chunks written inside {@link withLineTag} are prefixed. */
function patchStream(stream: NodeJS.WriteStream): void {
	const patched = createTaggedWriter(stream.write.bind(stream) as WriteFn);
	(stream as unknown as { write: WriteFn }).write = patched;
}

/**
 * Render one console argument the way the console itself would, using Bun's own inspector.
 *
 * Strings print verbatim (console never quotes a top-level string, while `Bun.inspect("a")` yields
 * `"a"` with ANSI colour); every other value goes through `Bun.inspect`, which is what Bun's console
 * uses for objects and Errors. Colours are off because a CI log is not a TTY — and because an ANSI
 * escape at the head of a line would sit in front of the `::` that {@link prefixChunk} checks for.
 *
 * Deliberately NOT `node:util.format`: this drops printf substitution (`console.log("%s", x)` renders
 * as `%s x` while a tag is active). No call site in apps/, packages/, or tooling/ uses a format
 * directive — the tagged path's real shapes are a template literal, or a message plus an Error, both
 * of which this renders identically — so the trade buys a Bun-native module with no node builtin for
 * formatting. A future printf-style call inside the fan-out would need this to grow a formatter.
 */
function renderArg(value: unknown): string {
	return typeof value === "string" ? value : Bun.inspect(value, { colors: false });
}

/**
 * Route `console.*` through the patched streams while a tag is active.
 *
 * Patching the streams alone is NOT enough: Bun's `console.log` writes to the file descriptor
 * natively rather than calling `process.stdout.write`, so a live three-replicate run showed the
 * harness's own step banners (`=== [capture observed specs] ===`, every `console.log` in
 * packages/harness) untagged while the echoed step output around them was tagged — the interleaved
 * lines that most need attribution were the ones missing it. Untagged calls delegate to the original
 * console so ordinary single-sandbox runs keep Bun's exact formatting and fast path.
 */
function patchConsole(): void {
	// Which stream each console method prints to — matching Node/Bun's own routing. The stream objects
	// are captured directly (not by name): `patchStream` replaces `write` ON the object, so a reference
	// taken here still routes through the patch regardless of install order.
	const routes = [
		["log", process.stdout],
		["info", process.stdout],
		["debug", process.stdout],
		["warn", process.stderr],
		["error", process.stderr],
	] as const;
	for (const [method, stream] of routes) {
		const original = console[method].bind(console);
		console[method] = (...args: unknown[]): void => {
			if (tagStore.getStore() === undefined) {
				// Deliberately the NATIVE console, which writes to the fd without going through the
				// patched `write` — so it does not update that stream's `atLineStart`. The known
				// consequence: were an untagged console call to land while a tagged write had left the
				// cursor mid-line, the next tagged line would be read as a continuation and lose its
				// prefix. It cannot happen as this is wired, because the pool wraps each replicate's
				// ENTIRE execution in withLineTag and AsyncLocalStorage carries that tag across every
				// await and .then — so nothing untagged runs concurrently with a tagged write. Routing
				// this branch through the patched stream instead would fix the desync at the cost of
				// Bun's native formatting (and printf substitution) on every untagged line. If a future
				// change ever emits untagged console output DURING a fan-out, revisit that trade.
				original(...args);
				return;
			}
			stream.write(`${args.map(renderArg).join(" ")}\n`);
		};
	}
}

let installed = false;

/**
 * Patch stdout/stderr (and `console.*`, which Bun does not route through them) so writes made inside
 * {@link withLineTag} are line-prefixed. Idempotent, and a no-op for code outside a tagged context —
 * so installing it is safe even on the single-replicate path, where nothing ever sets a tag.
 */
export function installLineTagging(): void {
	if (installed) return;
	installed = true;
	patchStream(process.stdout);
	patchStream(process.stderr);
	patchConsole();
}

/** Run `fn` with every line it writes prefixed by `tag` (requires {@link installLineTagging}). */
export function withLineTag<T>(tag: string, fn: () => Promise<T>): Promise<T> {
	return tagStore.run(tag, fn);
}
