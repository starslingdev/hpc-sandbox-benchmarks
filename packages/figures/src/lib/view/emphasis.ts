/**
 * The integrity rules — the only place a figure decides how loudly to state something.
 *
 * These are separated from the view assembly deliberately. The Markdown surface is engineered to
 * avoid claiming more than the statistics support: it declines to print a ratio when the leader's
 * margin is under 5%, says "share the top" rather than naming a winner when rank 1 is a cohort, and
 * labels a comparison the trial count could never have decided as `n too small` rather than as a
 * tie. A figure is read faster and trusted more than a table, so a figure that looks more confident
 * than the table above it is a worse regression than no figure at all.
 *
 * Everything here is a pure function of the ranked rows, so the rules can be read — and tested —
 * without a fixture, a renderer, or a font.
 */
import type { LeaderboardRow } from "@sandbox-benchmarks/results";

/**
 * How a row is emphasised. One discriminant rather than three booleans, so the illegal combinations
 * (a crowned row that was never measured, say) cannot be represented.
 *
 *  - `lead`      — rank 1, and the statistics support saying so.
 *  - `separated` — this row's rank is established against the row above (`verdict === "separated"`).
 *  - `muted`     — ranked, but the comparison to the row above is tied, underpowered or untested.
 *  - `gap`       — the provider produced no value for this metric.
 */
export type RowEmphasis = "lead" | "separated" | "muted" | "gap";

/**
 * RULE: a crown requires a UNIQUE rank 1 AND a runner-up the test actually separated.
 *
 * On the committed board every non-leading row is `underpowered` — the test could not have separated
 * them at any effect size — so nothing is crowned, matching the prose. A highlight here would name a
 * winner over a rival the statistics cannot distinguish it from.
 */
export function leaderIsEstablished(rows: readonly LeaderboardRow[]): boolean {
	const [first, second] = rows;
	if (!first || !second) return false; // a sole provider leads nothing
	if (second.rank === first.rank) return false; // shared rank 1: a cohort, not a winner
	return second.verdict === "separated";
}

/** Emphasis for a ranked row, given whether the board's leader earned its crown. */
export function emphasisOf(row: LeaderboardRow, leaderEstablished: boolean): RowEmphasis {
	if (leaderEstablished && row.rank === 1) return "lead";
	return row.verdict === "separated" ? "separated" : "muted";
}

/**
 * RULE: a shared rank is marked, so the column cannot read as a strict ordering.
 *
 * `tiedWithAbove` is non-null exactly when the row shares the rank above it — whether because the
 * test could not separate them or because the values are identical. Both deserve the marker; the
 * NOTE column says which.
 */
export function rankLabel(row: LeaderboardRow): string {
	return row.tiedWithAbove !== null ? `=${row.rank}` : String(row.rank);
}
