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
 * and each replicate here gets its own raw tree + shard file, so nothing is shared but the process and
 * its environment. The environment caveat is real but currently harmless: the Daytona adapter pins
 * `DAYTONA_TARGET` process-globally around each client-constructing call
 * (packages/providers/src/lib/daytona-target.ts), so concurrent replicates interleave those
 * set/restore pairs. Every replicate of a cell is the SAME provider and suite and therefore pins the
 * SAME value, so the interleaving can only leave the variable holding the value it was already going
 * to hold; a cell that mixed targets in one process would need that pin reworked first.
 */
import { WORKFLOW_TIMEOUT_MARGIN_MINUTES } from "@sandbox-benchmarks/schema";

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
 *
 * SAFE integer, not merely integer, for the same reason. `Number.isInteger` is true of `1e21` (whose
 * shard file would be the nonsense `<runId>-r1e+21.json`) and of everything above 2^53, where
 * DISTINCT operands stop being distinct numbers — `"9007199254740993"` and `"9007199254740992"` both
 * parse to 9007199254740992, so two sandboxes would claim one replicate slot through a pair of
 * indices that do not look repeated at all. Nothing legitimate is excluded: the axis is `[0..R-1]`.
 */
export function parseReplicateIndex(raw: string, what = "--replicate"): number {
	const index = Number(raw);
	if (raw.trim() === "" || !Number.isSafeInteger(index) || index < 0) {
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
	const flag = lastFlagValue(argv, "max-concurrency", "a positive integer argument");
	// A blank FLAG is an operator typo and throws, matching how `--replicates ""` is treated; a blank
	// ENV is the normal CI value and means unbounded. The distinction has to be made here, before the
	// `??` below, because `""` is not nullish: `--max-concurrency=` would otherwise both pick the
	// widest possible fan-out AND mask a BENCH_MAX_CONCURRENCY someone set deliberately — silently
	// choosing "all R at once" from an operand that says nothing at all.
	if (flag !== undefined && flag.trim() === "") {
		throw new Error(
			'--max-concurrency must not be blank; pass a positive integer, or omit the flag entirely for an unbounded fan-out (got "")',
		);
	}
	const raw = flag ?? env.BENCH_MAX_CONCURRENCY;
	if (raw === undefined || raw.trim() === "") return Number.POSITIVE_INFINITY;
	const limit = Number(raw);
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error(`max concurrency must be a positive integer; got "${raw}"`);
	}
	return limit;
}

/**
 * The cell's wall-clock budget in minutes — the `timeout-minutes` of the job driving this fan-out,
 * handed down as `BENCH_CELL_BUDGET_MINUTES`. Absent/blank means "no budget", which is the honest
 * answer for a local run: nothing cancels it, so there is nothing to check against. CI is the only
 * caller that sets it (bench-suite.yml, kept in lockstep with the job's literal `timeout-minutes` by
 * the workflow gate), so the guard below is inert exactly where it would be meaningless.
 */
export function resolveCellBudgetMinutes(
	env: Record<string, string | undefined> = process.env,
): number | undefined {
	const raw = env.BENCH_CELL_BUDGET_MINUTES;
	if (raw === undefined || raw.trim() === "") return undefined;
	const minutes = Number(raw);
	if (!Number.isInteger(minutes) || minutes < 1) {
		throw new Error(`BENCH_CELL_BUDGET_MINUTES must be a positive integer; got "${raw}"`);
	}
	return minutes;
}

/**
 * How long the RUNNER hosting this cell will stay alive, in minutes, handed down as
 * `BENCH_RUNNER_LIFETIME_MINUTES`. Absent/blank means "the runner outlives the job budget", which is
 * true of GitHub-hosted runners and of any local run — so the guard below is inert everywhere except
 * the one place it matters.
 *
 * Set only by the workflows that route a provider onto an EPHEMERAL self-hosted label. Those runners
 * are reaped on their own schedule, which `timeout-minutes` cannot express: the job is not cancelled,
 * it stops existing, leaving the cell stuck `in_progress` with no logs and no artifact.
 */
export function resolveRunnerLifetimeMinutes(
	env: Record<string, string | undefined> = process.env,
): number | undefined {
	const raw = env.BENCH_RUNNER_LIFETIME_MINUTES;
	if (raw === undefined || raw.trim() === "") return undefined;
	const minutes = Number(raw);
	if (!Number.isInteger(minutes) || minutes < 1) {
		throw new Error(`BENCH_RUNNER_LIFETIME_MINUTES must be a positive integer; got "${raw}"`);
	}
	return minutes;
}

/**
 * Why this suite cannot fit the host runner's lifetime, or `undefined` when it can.
 *
 * Distinct from {@link fleetBudgetError}, which checks the fan-out against the JOB budget: this checks
 * the single-replicate worst case against how long the MACHINE lives. A job budget is enforced by
 * GitHub and produces a cancelled job with logs; an ephemeral runner's reaper produces nothing at all
 * — the cell hangs `in_progress`, never reaches its upload step, and every replicate is lost with no
 * record of why. Refusing at dispatch turns that silence into one explanatory failure.
 *
 * Worst-case for the same reason `fleetBudgetError` is: `timeoutMinutes` is what a replicate is
 * ALLOWED to take, and the host margin covers checkout, teardown, normalization and upload, which the
 * reaper does not wait for either.
 */
export function runnerLifetimeError(opts: {
	suite: string;
	suiteTimeoutMinutes: number;
	runnerLifetimeMinutes: number;
}): string | undefined {
	const { suite, suiteTimeoutMinutes, runnerLifetimeMinutes } = opts;
	const worstCase = suiteTimeoutMinutes + WORKFLOW_TIMEOUT_MARGIN_MINUTES;
	if (worstCase <= runnerLifetimeMinutes) return undefined;
	return (
		`Suite "${suite}" budgets ${suiteTimeoutMinutes} minutes + ${WORKFLOW_TIMEOUT_MARGIN_MINUTES} ` +
		`minutes of host margin = up to ${worstCase} minutes, past the ${runnerLifetimeMinutes}-minute ` +
		`lifetime of the ephemeral runner this cell was routed to. That runner is reaped while the step ` +
		`is still healthy, leaving the cell stuck in_progress with no logs and no artifact, so this is ` +
		`rejected before any sandbox is created: dispatch this provider on a shorter suite, or route it ` +
		`to a runner that outlives ${worstCase} minutes.`
	);
}

/** How many SERIAL waves a fan-out of `replicates` runs in under `maxConcurrency` in flight. */
export function fleetWaves(replicates: number, maxConcurrency: number): number {
	// `min` before the divide keeps an unbounded (Infinity) cap out of the arithmetic: a cap at or
	// above R is one wave, which is the uncapped case and the only one this whole guard lets through.
	return Math.ceil(replicates / Math.min(maxConcurrency, replicates));
}

/**
 * Why the requested fan-out cannot fit the cell's job budget, or `undefined` when it can.
 *
 * A concurrency cap is not free: it makes the cell run `ceil(R / cap)` SERIAL waves, so the cell's
 * wall clock stops being "the slowest replicate" and becomes "waves × the suite's own budget". That
 * product is checked against the ONE job budget all R replicates share, because exceeding it is not a
 * degraded run — the job is cancelled mid-flight and every shard of the cell is lost at once, which is
 * precisely the whole-cell blast radius that driving R replicates from one runner introduced. At the
 * shipped realworld defaults (R=12, a 90-minute suite, a 180-minute job) any cap below 6 is already in
 * that state, so this is a reachable operator mistake and not a theoretical one.
 *
 * Deliberately worst-case: a suite's `timeoutMinutes` is the budget a replicate is ALLOWED to take, and
 * a guard that assumed replicates finish early would pass configurations that die whenever they don't.
 * Refusing up front costs a dispatch; discovering it costs three hours of runner time and the cell.
 *
 * The sandbox time is charged per wave, but {@link WORKFLOW_TIMEOUT_MARGIN_MINUTES} is charged ONCE:
 * the checkout, teardown, normalization and upload it covers happen per JOB, not per wave. Counting
 * it is what keeps this guard consistent with the workflow timeout gate rather than one notch looser
 * than it — omitting it accepts a fan-out landing on EXACTLY the budget (R=12 capped at 6 is 2 x 90 =
 * 180 against a 180-minute job), which has no room left for the host work and is cancelled with all
 * R shards lost. That is the failure this function exists to refuse, so it must not be its own
 * boundary case.
 *
 * Uncapped fan-outs can never trip this: they are one wave, so the comparison reduces to "the suite
 * budget plus the margin fits the job budget", which the workflow timeout gate
 * (`checkWorkflowTimeouts`) already guarantees using this same constant.
 */
export function fleetBudgetError(opts: {
	replicates: number;
	maxConcurrency: number;
	suite: string;
	suiteTimeoutMinutes: number;
	budgetMinutes: number;
}): string | undefined {
	const { replicates, maxConcurrency, suite, suiteTimeoutMinutes, budgetMinutes } = opts;
	const waves = fleetWaves(replicates, maxConcurrency);
	const worstCase = waves * suiteTimeoutMinutes + WORKFLOW_TIMEOUT_MARGIN_MINUTES;
	if (worstCase <= budgetMinutes) return undefined;

	// The smallest cap that WOULD fit, so the message ends in a number the operator can act on rather
	// than in "try a bigger one". `maxWaves` is how many suite budgets the job budget holds once the
	// host margin is set aside; at 0 the suite cannot fit the job at all and no cap saves it, so
	// recommend dropping the cap entirely and let the (separate) timeout gate own that mismatch.
	const maxWaves = Math.floor(
		(budgetMinutes - WORKFLOW_TIMEOUT_MARGIN_MINUTES) / suiteTimeoutMinutes,
	);
	const remedy =
		maxWaves >= 1
			? `raise --max-concurrency to at least ${Math.ceil(replicates / maxWaves)} (or leave it blank for all ${replicates} at once)`
			: `leave --max-concurrency blank — suite "${suite}" alone does not fit the ${budgetMinutes}-minute job budget`;
	return (
		`--max-concurrency ${maxConcurrency} splits ${replicates} replicates of suite "${suite}" into ` +
		`${waves} serial waves × ${suiteTimeoutMinutes} minutes + ${WORKFLOW_TIMEOUT_MARGIN_MINUTES} ` +
		`minutes of host margin = up to ${worstCase} minutes, past the cell's ${budgetMinutes}-minute ` +
		`job budget. The job would be cancelled mid-fan-out and ALL ${replicates} shards lost, so this ` +
		`is rejected before any sandbox is created: ${remedy}.`
	);
}

/**
 * Run `fn` over every item with at most `limit` in flight, resolving to the results IN INPUT ORDER.
 * A throw from `fn` can never reject this: it is handed to `onError`, whose return value takes that
 * slot. (The one rejection left is a throw from `onError` itself — a caller bug, and one that is still
 * raised only after every item has been drained, so it cannot strand a peer either.)
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
	// A throw from `onError` ITSELF is a caller bug — but letting it propagate out of the catch below
	// would reject this worker, and with it `Promise.all`, stranding the peers still mid-suite: the
	// exact failure the required `onError` exists to make impossible, re-entered through the converter.
	// So it is held here, every remaining item is still drained, and the bug is surfaced afterwards
	// once nothing is in flight.
	let converterError: { error: unknown } | undefined;
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
					try {
						results[index] = onError(error, item, index);
					} catch (thrown) {
						// First one wins; later converters fail for the same reason and the first is the
						// one with the untruncated context. This slot stays a hole, which is sound only
						// because the throw below stops any caller from reading the array at all.
						converterError ??= { error: thrown };
					}
				}
			}
		}),
	);
	if (converterError) {
		throw new Error(
			`onError threw while converting a failed item, so the results are incomplete: ${
				converterError.error instanceof Error
					? (converterError.error.stack ?? converterError.error.message)
					: String(converterError.error)
			}`,
		);
	}
	return results;
}
