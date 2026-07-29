/**
 * Replicate fan-out for a single (provider, suite) cell: flag parsing, per-replicate shard paths, and
 * the bounded-concurrency pool that drives R sandboxes from ONE process.
 *
 * The between-machine axis used to be a GitHub Actions matrix axis — one runner per
 * (provider, suite, replicate) — but a bench runner spends essentially all of its wall time *waiting*
 * on a sandbox (create → poll a detached step → poll again), so R runners idled in lockstep while R
 * sandboxes did the work. The runner-minutes bill scaled with R for no throughput gain: at the shipped
 * defaults (6 providers × 9 suites, R=3 synthetic / R=12 realworld) that is 324 runners doing the work
 * of 54. Driving all R replicates from one runner keeps the sandbox fan-out identical — the same R
 * sandboxes are created concurrently against the same provider account, so provider load and wall
 * clock are unchanged — and collapses the runner axis.
 *
 * Host-side concurrency was already safe: the harness names every temp archive/staging dir with a
 * `randomUUID` precisely so concurrent collects can't collide (packages/harness/src/lib/collect.ts),
 * and each replicate here gets its own raw tree + shard file, so nothing is shared but the process.
 */

/** Per-replicate shard paths inside the `data/` tree the cell uploads as one artifact. */
export interface ReplicatePaths {
	/** Raw results root for this replicate — `data/raw/<runId>/r<idx>`, normalized on its own. */
	rawRoot: string;
	/** Shard Run document — `data/runs/<runId>-r<idx>.json`. */
	outFile: string;
}

/**
 * Where replicate `index` of `runId` writes. The `-r<idx>` FILE suffix (not a per-replicate directory)
 * is what keeps R shards distinct inside ONE artifact: every replicate's Run carries the same
 * `runId` field, so they would otherwise all be `data/runs/<runId>.json`. commit-dataset.yml globs
 * `runs/<runId>-r*.json` alongside the legacy `runs/<runId>.json`, so both layouts aggregate.
 */
export function replicatePaths(runId: string, index: number): ReplicatePaths {
	return {
		rawRoot: `data/raw/${runId}/r${index}`,
		outFile: `data/runs/${runId}-r${index}.json`,
	};
}

/**
 * The last value given for `--<flag> <value>` / `--<flag>=<value>` in `argv`, or undefined when absent.
 * A dangling space-separated flag throws (`operand` names what was expected) — a missing operand must
 * fail the cell, never silently fall back to a default that changes what gets benchmarked.
 *
 * Prefix collisions are not possible between the singular and plural spellings: `--replicates` is not
 * equal to `--replicate`, and `"--replicates=0,1".startsWith("--replicate=")` is false (the 's' sits
 * where the '=' must be), so each flag only ever consumes its own operand.
 */
export function lastFlagValue(
	argv: readonly string[],
	flag: string,
	operand = "an index argument",
): string | undefined {
	const prefix = `--${flag}=`;
	let raw: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === `--${flag}`) {
			raw = argv[i + 1];
			if (raw === undefined) throw new Error(`--${flag} requires ${operand}`);
		} else if (arg?.startsWith(prefix)) {
			raw = arg.slice(prefix.length);
		}
	}
	return raw;
}

/**
 * A replicate index: a non-negative integer. Blank operands are rejected explicitly because
 * `Number("")`/`Number("  ")` both coerce to 0 — which would silently collide two sandboxes into
 * replicate slot 0 at aggregate time, exactly the corruption this validation exists to prevent.
 */
export function parseReplicateIndex(raw: string, what = "--replicate"): number {
	const index = Number(raw);
	if (raw.trim() === "" || !Number.isInteger(index) || index < 0) {
		throw new Error(`${what} must be a non-negative integer; got "${raw}"`);
	}
	return index;
}

/**
 * Parse `--replicates` into the replicate index list this runner drives, or `undefined` when absent
 * (the single-shard path). Accepts the JSON array the plan emits (`[0,1,2]` — passed straight through
 * from `plan-replicates`' per-suite map, so the workflow never reshapes it) and the comma-separated
 * spelling (`0,1,2`) for hand-typed local runs.
 *
 * An empty list throws rather than benchmarking nothing: a cell that silently ran zero sandboxes would
 * upload no shard and read downstream as "this provider was never scheduled". Duplicates throw too —
 * two shards claiming one replicate index would fold into a single slot in the aggregate, quietly
 * discarding a sandbox's worth of data.
 */
export function parseReplicatesFlag(argv: readonly string[]): number[] | undefined {
	const raw = lastFlagValue(argv, "replicates");
	if (raw === undefined) return undefined;
	const trimmed = raw.trim();
	if (trimmed === "") throw new Error('--replicates must not be blank; got ""');

	const tokens = trimmed.startsWith("[")
		? parseJsonReplicateTokens(trimmed)
		: trimmed.split(",").map((token) => token.trim());

	const indices = tokens.map((token) => parseReplicateIndex(token, "--replicates"));
	if (indices.length === 0) {
		throw new Error(`--replicates must list at least one index; got "${raw}"`);
	}
	const repeated = indices.find((index, i) => indices.indexOf(index) !== i);
	if (repeated !== undefined) {
		throw new Error(`--replicates must not repeat an index; got "${raw}" (${repeated} twice)`);
	}
	return indices;
}

/** The elements of a JSON `--replicates` array as raw tokens, so one validator handles both spellings. */
function parseJsonReplicateTokens(raw: string): string[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		// Left undefined so the array check below reports it. Malformed JSON (`[0,`) and well-formed
		// non-array JSON (`5`, `{}`) are ONE operator mistake — a mistyped flag — and deserve one
		// message; `JSON.parse`'s byte offset adds nothing when the whole operand is echoed anyway.
	}
	if (!Array.isArray(parsed)) {
		throw new Error(`--replicates must be a JSON array or a comma-separated list; got "${raw}"`);
	}
	return parsed.map((value) => String(value));
}

/**
 * How many replicate sandboxes may be in flight at once — `--max-concurrency <n>` or
 * `BENCH_MAX_CONCURRENCY`, defaulting to unbounded (all R at once, matching what R separate runners
 * did). The knob exists for a provider whose account quota makes a wide fan-out spend its create-retry
 * budget queueing instead of benchmarking. CI reaches it through the env var only — bench-suite.yml
 * puts the dispatch input in `BENCH_MAX_CONCURRENCY` and never passes the flag — so `argv` winning is
 * for the operator debugging by hand, whose typed flag should beat an exported value they forgot about.
 * A non-positive or non-integer value throws — a typo must fail the cell, not silently serialize (or
 * unbound) the fan-out.
 */
export function resolveMaxConcurrency(
	argv: readonly string[],
	env: Record<string, string | undefined> = process.env,
): number {
	const raw =
		lastFlagValue(argv, "max-concurrency", "a positive integer argument") ??
		env.BENCH_MAX_CONCURRENCY;
	if (raw === undefined || raw.trim() === "") return Number.POSITIVE_INFINITY;
	const limit = Number(raw);
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error(`max concurrency must be a positive integer; got "${raw}"`);
	}
	return limit;
}

/**
 * Run `fn` over every item with at most `limit` in flight, resolving to the results IN INPUT ORDER.
 * NEVER rejects: a throw from `fn` is handed to `onError`, whose return value takes that slot.
 *
 * `onError` is REQUIRED, not optional, and that is the whole point. An earlier version documented
 * "`fn` must be total" and relied on the caller honouring it — which is not a guarantee, it is a
 * hope. When it was violated the failure was maximally bad: `Promise.all` rejects on the first
 * throw, the awaiting caller unwinds, and the R-1 peers still mid-flight are abandoned with their
 * sandboxes alive and their shards unwritten — while the process exits BEFORE reporting, so nothing
 * says what was lost. Downstream, `aggregate` accepts any non-empty shard set, so the run would
 * publish quietly as a smaller experiment than the one dispatched. Making the failure path a typed
 * parameter means a caller cannot forget it: the compiler asks what a failed item looks like.
 *
 * The old per-replicate matrix cells got this isolation from `fail-fast: false`; this is the
 * in-process equivalent, and it must hold for the same reason.
 */
export async function runPooled<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
	onError: (error: unknown, item: T, index: number) => R,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	// The `max(1, …)` floor is the guard, not an optimisation: a `limit` below 1 reaching a generic pool
	// would otherwise spawn zero workers and resolve immediately with a hole-filled array — silent data
	// loss — rather than doing the work. (An empty `items` still costs one worker, which exits at once.)
	const workers = Math.max(1, Math.min(items.length, limit));
	await Promise.all(
		Array.from({ length: workers }, async () => {
			for (;;) {
				const index = next++;
				if (index >= items.length) return;
				// Indexed inside the bounds check, so an item that is itself `undefined` (never the case
				// for a replicate index, but the pool is generic) can't be read as "the queue is empty".
				const item = items[index] as T;
				try {
					results[index] = await fn(item, index);
				} catch (error) {
					results[index] = onError(error, item, index);
				}
			}
		}),
	);
	return results;
}
