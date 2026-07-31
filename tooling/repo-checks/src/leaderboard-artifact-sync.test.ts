// Invariant: the committed LEADERBOARD.md is exactly what the current renderer produces from the Run
// it names. The file is generated ("do not edit by hand") but nothing re-generated it in CI, so a
// change to `renderLeaderboardMarkdown` or to the ranking silently left the published comparison
// surface stale — showing readers an old table while the code computed a new one. This gate closes
// that gap the same way workflow-registry-sync does: re-derive the truth and diff.
//
// This is only sound because the leaderboard is deterministic: the bootstrap is seeded from stable
// Run/Metric/provider identity (see schema/analysis.ts `seededRng`), and `generatedAt` is read from the
// Run document rather than the clock. A Math.random() bootstrap would make this gate flake on every run.
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	buildLeaderboard,
	DATASET_RUNS_DIR,
	LEADERBOARD_DIMENSION_ORDER,
	REPO_URL,
	renderLeaderboardMarkdown,
	SYNTHETIC_DIMENSIONS,
} from "@sandbox-benchmarks/results";
import type { MetricDef, Run } from "@sandbox-benchmarks/schema";
import {
	canSeparate,
	DEFAULT_ALPHA,
	DIMENSIONS,
	getMetric,
	getProvider,
	kolmogorovSmirnov,
	mannWhitneyU,
	parseRun,
} from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const ROOT = findRepoRoot();
const ARTIFACT = join(ROOT, "LEADERBOARD.md");
/** The Run the artifact is rendered from must be the COMMITTED dataset (`data/dataset/runs/`), which
 *  `promote` writes. `data/runs/` is a gitignored raw scratch tree: it exists on a dev machine, is
 *  absent in CI, and can hold a stale/partial Run — rendering from it once silently dropped the whole
 *  `economics` dimension from this file. */
const runFile = (runId: string) => join(ROOT, ...DATASET_RUNS_DIR.split("/"), `${runId}.json`);
const regenCmd = (runId: string) =>
	`bun apps/cli/src/bin/leaderboard.ts ${DATASET_RUNS_DIR}/${runId}.json LEADERBOARD.md`;

/** Independent R-7 percentile implementation for auditing the persisted Aggregates and displayed p50. */
function auditPercentile(samples: readonly number[], p: number): number {
	const sorted = [...samples].sort((a, b) => a - b);
	const h = (sorted.length - 1) * p;
	const lo = Math.floor(h);
	const hi = Math.ceil(h);
	const a = sorted[lo] as number;
	const b = sorted[hi] as number;
	return a + (h - lo) * (b - a);
}

/** Conventional two-pass aggregates: intentionally separate from schema.aggregate's Welford path. */
function auditAggregates(samples: readonly number[]) {
	const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
	const squared = samples.reduce((sum, sample) => sum + (sample - mean) ** 2, 0);
	return {
		p50: auditPercentile(samples, 0.5),
		p95: auditPercentile(samples, 0.95),
		mean,
		stdev: Math.sqrt(samples.length > 1 ? squared / (samples.length - 1) : 0),
		min: Math.min(...samples),
		max: Math.max(...samples),
		n: samples.length,
	};
}

/** Independent implementation of the documented FNV-like seed + mulberry32 generator. */
function auditRng(seed: string): () => number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	let state = hash >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
}

/** Independently reproduce the specified seeded 10k percentile bootstrap of the median. */
function auditMedianInterval(
	samples: readonly number[],
	seed: string,
): { lo: number; hi: number } | null {
	if (samples.length === 1) return null;
	const rng = auditRng(seed);
	const medians = new Array<number>(10_000);
	for (let iteration = 0; iteration < medians.length; iteration++) {
		const draw = Array.from(
			{ length: samples.length },
			() => samples[Math.floor(rng() * samples.length)] as number,
		);
		medians[iteration] = auditPercentile(draw, 0.5);
	}
	const tail = (1 - 0.95) / 2;
	return {
		lo: auditPercentile(medians, tail),
		hi: auditPercentile(medians, 1 - tail),
	};
}

/**
 * Independently reproduce the seeded 10k HIERARCHICAL median bootstrap the renderer uses once a Metric
 * carries a replicate breakdown (≥2 sandboxes): each resample draws R replicates WITH REPLACEMENT, then
 * within each drawn replicate draws its own Samples with replacement, pools the lot, and takes the median.
 * Mirrors schema/analysis.ts `hierarchicalBootstrapMedianInterval` — including the single shared RNG's
 * exact draw order (replicate index, then that replicate's sample indices, R times) — so the reproduced
 * bounds are byte-identical to the committed table rather than merely statistically close.
 */
function auditHierarchicalMedianInterval(
	replicates: readonly (readonly number[])[],
	seed: string,
): { lo: number; hi: number } | null {
	// The pooled union is what the displayed median ranks on; a single pooled Sample has no spread, so the
	// renderer degenerates to a point interval (rendered "—"), matching auditMedianInterval's n=1 return.
	if (replicates.reduce((sum, replicate) => sum + replicate.length, 0) === 1) return null;
	const rng = auditRng(seed);
	const R = replicates.length;
	const medians = new Array<number>(10_000);
	for (let iteration = 0; iteration < medians.length; iteration++) {
		const pool: number[] = [];
		for (let r = 0; r < R; r++) {
			const chosen = replicates[Math.floor(rng() * R)] as readonly number[];
			for (let i = 0; i < chosen.length; i++)
				pool.push(chosen[Math.floor(rng() * chosen.length)] as number);
		}
		medians[iteration] = auditPercentile(pool, 0.5);
	}
	const tail = (1 - 0.95) / 2;
	return {
		lo: auditPercentile(medians, tail),
		hi: auditPercentile(medians, 1 - tail),
	};
}

function formatValue(value: number): string {
	return Number.isInteger(value)
		? String(value)
		: Number.parseFloat(value.toPrecision(4)).toString();
}

function formatPValue(value: number): string {
	return value < 0.001 ? "<0.001" : value.toPrecision(2);
}

interface AuditRow {
	providerId: string;
	displayName: string;
	value: number;
	rank: number;
	interval: string;
	n: number;
	note: string;
	p: string;
	ks: string;
}

/** Derive one table directly from raw Samples, without calling buildLeaderboard. */
function auditRows(run: Run, metric: MetricDef): AuditRow[] {
	const candidates = run.providers.flatMap((provider) => {
		const result = provider.metrics.find(({ metricId }) => metricId === metric.id);
		if (!result) return [];
		const value = auditPercentile(result.samples, 0.5);
		// Mirror the renderer's branch: once a Metric merged ≥2 replicate sandboxes it takes the
		// hierarchical bootstrap (between-sandbox variance), else the ordinary percentile bootstrap.
		const seed = `${run.runId}:${metric.id}:${provider.providerId}`;
		const replicates = result.replicates?.map((replicate) => replicate.samples);
		const interval = replicates
			? auditHierarchicalMedianInterval(replicates, seed)
			: auditMedianInterval(result.samples, seed);
		return [
			{
				providerId: provider.providerId,
				displayName: getProvider(provider.providerId)?.displayName ?? provider.providerId,
				result,
				value,
				interval: interval ? `${formatValue(interval.lo)} – ${formatValue(interval.hi)}` : "—",
			},
		];
	});
	candidates.sort((a, b) =>
		a.value !== b.value
			? metric.direction === "HIB"
				? b.value - a.value
				: a.value - b.value
			: a.providerId.localeCompare(b.providerId, "en"),
	);

	const rows: AuditRow[] = [];
	for (const [index, candidate] of candidates.entries()) {
		const previousCandidate = candidates[index - 1];
		const previousRow = rows[index - 1];
		if (!previousCandidate || !previousRow) {
			rows.push({
				...candidate,
				rank: 1,
				n: candidate.result.samples.length,
				note: "",
				p: "—",
				ks: "—",
			});
			continue;
		}

		const identical = candidate.value === previousCandidate.value;
		let rank = index + 1;
		let note = "";
		let p = "—";
		let ks = "—";
		if (previousCandidate.result.samples.length < 2 || candidate.result.samples.length < 2) {
			if (identical) {
				rank = previousRow.rank;
				note = "equal values";
			}
		} else {
			const mw = mannWhitneyU(previousCandidate.result.samples, candidate.result.samples);
			const shape = kolmogorovSmirnov(previousCandidate.result.samples, candidate.result.samples);
			// The pooled Mann-Whitney above stays the descriptive `p vs. above` / `p (KS)` columns. The
			// VERDICT (note + shared rank), however, follows the renderer: once EITHER side carries a
			// replicate breakdown, the decider is the cluster-level rank permutation — Mann-Whitney U on
			// each side's per-sandbox medians, whole sandboxes the exchangeable unit — mirroring
			// bootstrapMedianDifferenceInterval. A side without replicates enters as one cluster of its
			// pooled Samples, so a mixed-R pair is judged the same honest way. No RNG: the verdict is the
			// exact cluster permutation, never the bootstrapped difference interval.
			const previousReplicates = previousCandidate.result.replicates?.map((r) => r.samples);
			const candidateReplicates = candidate.result.replicates?.map((r) => r.samples);
			if (previousReplicates || candidateReplicates) {
				const cluster = mannWhitneyU(
					(previousReplicates ?? [previousCandidate.result.samples]).map((c) =>
						auditPercentile(c, 0.5),
					),
					(candidateReplicates ?? [candidate.result.samples]).map((c) => auditPercentile(c, 0.5)),
				);
				// The between-sandbox floor already meets α (2/C(6,3)=0.1 at R=3) → underpowered, never a
				// tie; else the cluster test's own p decides separation.
				if (cluster.minAttainablePValue >= DEFAULT_ALPHA) {
					note = identical ? "n too small, equal medians" : "n too small";
					if (identical) rank = previousRow.rank;
				} else if (cluster.pValue >= DEFAULT_ALPHA) {
					rank = previousRow.rank;
					note = "tied";
				}
			} else if (!canSeparate(mw)) {
				note = identical ? "n too small, equal medians" : "n too small";
				if (identical) rank = previousRow.rank;
			} else if (mw.pValue >= DEFAULT_ALPHA) {
				rank = previousRow.rank;
				note = "tied";
			}
			p = `${formatPValue(mw.pValue)}${note ? ` (${note})` : ""}`;
			ks = formatPValue(shape.pValue);
		}

		rows.push({
			...candidate,
			rank,
			n: candidate.result.samples.length,
			note,
			p: p === "—" && note ? `— (${note})` : p,
			ks,
		});
	}
	return rows;
}

interface MarkdownMetricRow {
	rank: string;
	provider: string;
	value: string;
	interval: string;
	n: string;
	note: string;
}

/** Read the generated Markdown as an independent consumer would, rather than trusting its builder. */
function parseMetricTables(markdown: string, emitted: Map<string, MetricDef>) {
	const rows = new Map<string, MarkdownMetricRow[]>();
	const pairwise = new Map<string, { p: string; ks: string }>();
	let dimension: string | undefined;
	let metric: MetricDef | undefined;
	let inPairwise = false;

	for (const line of markdown.split("\n")) {
		if (line.startsWith("## ")) {
			const heading = line.slice(3);
			dimension = (DIMENSIONS as readonly string[]).includes(heading) ? heading : undefined;
			metric = undefined;
			inPairwise = false;
			continue;
		}
		if (line === "### Pairwise tests (vs. row above)") {
			metric = undefined;
			inPairwise = true;
			continue;
		}
		if (line.startsWith("### ") && dimension) {
			const label = line.slice(4).replace(/ _\(headline\)_$/, "");
			metric = emitted.get(`${dimension}\0${label}`);
			if (!metric) throw new Error(`Markdown names unknown emitted Metric ${dimension}/${label}`);
			continue;
		}

		if (metric && /^\| \d+ \|/.test(line)) {
			const cells = line
				.slice(1, -1)
				.split("|")
				.map((cell) => cell.trim());
			const [rank, provider, value, interval, n, rawNote] = cells;
			const note = rawNote === "—" || rawNote === undefined ? "" : rawNote;
			const key = metric.id;
			const metricRows = rows.get(key) ?? [];
			metricRows.push({
				rank: rank as string,
				provider: provider as string,
				value: value as string,
				interval: interval as string,
				n: n as string,
				note,
			});
			rows.set(key, metricRows);
			continue;
		}

		// Derive the leading-dimension pattern from DIMENSIONS (already the source of truth above) so a new
		// dimension can't silently stop pairwise rows from parsing — which would surface as a baffling
		// count mismatch instead of "unknown dimension".
		if (
			inPairwise &&
			new RegExp(`^\\| (?:${(DIMENSIONS as readonly string[]).join("|")}) \\|`).test(line)
		) {
			const [pairDimension, label, provider, p, ks] = line
				.slice(1, -1)
				.split("|")
				.map((cell) => cell.trim());
			const pairMetric = emitted.get(`${pairDimension}\0${label}`);
			if (!pairMetric)
				throw new Error(`Pairwise table names unknown Metric ${pairDimension}/${label}`);
			pairwise.set(`${pairMetric.id}\0${provider}`, { p: p as string, ks: ks as string });
		}
	}
	return { rows, pairwise };
}

/**
 * The Run id the committed artifact was generated from, read out of the header's DATASET link
 * (`[…](data/dataset/runs/<id>.json)`). Parsed rather than hardcoded so regenerating the leaderboard
 * from a newer Run doesn't require editing this gate too.
 *
 * The dataset link is the right anchor rather than the `Run` identifier beside it: the identifier is
 * now rendered as one Actions link per component, so a COMPOSITE id (`<runA>+<runB>`) appears there
 * only in pieces, while the dataset link always carries the whole id — it has to, since it names the
 * file on disk. `+` is percent-encoded in the link target, so decode before returning the id.
 */
function runIdOf(markdown: string): string {
	const match = markdown.match(new RegExp(`\\(${DATASET_RUNS_DIR}/([^)]+)\\.json\\)`));
	if (!match?.[1]) {
		throw new Error(
			`LEADERBOARD.md has no ${DATASET_RUNS_DIR}/<id>.json link in its header — cannot locate its source Run`,
		);
	}
	return decodeURIComponent(match[1]);
}

/**
 * Load the Run the committed artifact names. Called INSIDE each test, never at module scope: a throw
 * during module initialisation aborts the whole file before Bun collects any test, so a missing source
 * Run would take the determinism test below down with it — silencing the check precisely in the
 * scenario it exists to catch (an artifact rendered from the gitignored `data/runs/`).
 */
function loadCommittedRun(): {
	committed: string;
	runId: string;
	run: ReturnType<typeof parseRun>;
} {
	const committed = readFileSync(ARTIFACT, "utf8");
	const runId = runIdOf(committed);
	const source = runFile(runId);
	try {
		return { committed, runId, run: parseRun(JSON.parse(readFileSync(source, "utf8"))) };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			// A named Run that isn't in the committed dataset means the artifact was rendered from the
			// gitignored raw tree — say so, rather than failing later with a bare ENOENT. try/catch
			// rather than an existsSync pre-check, so there is no TOCTOU gap.
			throw new Error(
				`LEADERBOARD.md names Run "${runId}", but ${source} is not committed. The artifact must be ` +
					`rendered from the published dataset (data/dataset/runs/), not the gitignored data/runs/.`,
			);
		}
		throw error;
	}
}

// This gate renders the WHOLE committed board — up to twice, for the determinism check — and both the
// renderer and this file's independent audit run a seeded 10 000-resample bootstrap per provider/Metric.
// That is legitimately slow and scales with the dataset: the replicate fan-out took one run from ~400 to
// ~2 500 retained observations, and the hierarchical bootstrap pools R sandboxes per resample. Bun's 5 s
// default would time these out on the committed data (and worse on a loaded CI runner) even though nothing
// is wrong, so give the file a generous ceiling — high enough to absorb further dataset growth, still low
// enough to catch a genuine non-terminating bootstrap.
setDefaultTimeout(120_000);

describe("LEADERBOARD.md publishes auditable provenance", () => {
	// The header's identifiers are the reader's only route from a number back to the thing that produced
	// it. A stale or malformed link is invisible in a rendered page — it just goes nowhere — so assert
	// each one resolves to the artifact it claims, against the SOURCE Run rather than the header's own
	// text (which is what a broken renderer would get wrong in the first place).
	it("links the run id to its workflow run, the sha to its commit, and names the dataset file it rendered", () => {
		const { committed, runId, run } = loadCommittedRun();
		// A composite id (`<runA>+<runB>`) names no single workflow run, so each component links separately.
		for (const component of run.runId.split("+")) {
			expect(committed, `run ${component} workflow link`).toContain(
				`[\`${component}\`](${REPO_URL}/actions/runs/${component})`,
			);
		}
		expect(committed).toContain(`[\`${run.sha}\`](${REPO_URL}/commit/${run.sha})`);

		const dataset = `${DATASET_RUNS_DIR}/${runId}.json`;
		expect(committed).toContain(`[\`${dataset}\`](${dataset.replace(/\+/g, "%2B")})`);
		// …and the file that link points at is the one this artifact was actually rendered from.
		expect(readFileSync(runFile(runId), "utf8").length).toBeGreaterThan(0);
	});
});

describe("LEADERBOARD.md leads with the real-world workflows", () => {
	// The layout is the board's editorial claim: synthetic scores say what the hardware CAN do, the
	// realworld suites say what a developer waits on. A renderer change that quietly buried `realworld`
	// below five synthetic sections, or left one expanded, would invert that claim while every number on
	// the page stayed correct — so the ORDER and the collapse are gated, not just the tables.
	/**
	 * The dimension sections alone — everything before the trailing Coverage gaps and statistics blocks,
	 * which carry `<details>` of their own. Without this cut those would be attributed to whichever
	 * dimension renders last, so the collapse assertion below would pass or fail on section order.
	 */
	const dimensionBody = (markdown: string): string => {
		const ends = [
			"\n## Coverage gaps\n",
			"\n<details>\n<summary>How rankings are decided</summary>",
		]
			.map((marker) => markdown.indexOf(marker))
			.filter((index) => index >= 0);
		return ends.length > 0 ? markdown.slice(0, Math.min(...ends)) : markdown;
	};

	const dimensionHeadings = (markdown: string): string[] =>
		markdown
			.split("\n")
			.filter((line) => line.startsWith("## "))
			.map((line) => line.slice(3))
			.filter((heading) => (LEADERBOARD_DIMENSION_ORDER as readonly string[]).includes(heading));

	it("orders the dimension sections realworld-first, then by catalog order", () => {
		const { committed } = loadCommittedRun();
		const rendered = dimensionHeadings(committed);
		expect(rendered.length).toBeGreaterThan(0);
		expect(rendered[0]).toBe("realworld");
		// Data-driven: only the dimensions this run emitted appear, but in the declared relative order.
		expect(rendered).toEqual(
			LEADERBOARD_DIMENSION_ORDER.filter((dimension) => rendered.includes(dimension)),
		);
	});

	it("collapses every synthetic dimension and leaves every other one expanded", () => {
		const { committed } = loadCommittedRun();
		// Read each `## <dimension>` section's body and ask whether it opens a disclosure block. Parsed
		// from the committed text, not from the renderer's intent, so this catches an unclosed <details>
		// swallowing the section after it just as readily as a missing one.
		const sections = new Map<string, string[]>();
		let current: string | undefined;
		for (const line of dimensionBody(committed).split("\n")) {
			if (line.startsWith("## ")) {
				const heading = line.slice(3);
				current = (LEADERBOARD_DIMENSION_ORDER as readonly string[]).includes(heading)
					? heading
					: undefined;
				if (current) sections.set(current, []);
				continue;
			}
			if (current) sections.get(current)?.push(line);
		}
		expect(sections.size).toBeGreaterThan(0);

		for (const [dimension, body] of sections) {
			const synthetic = SYNTHETIC_DIMENSIONS.has(dimension as never);
			const opens = body.filter((line) => line === "<details>").length;
			const closes = body.filter((line) => line === "</details>").length;
			expect(opens, `${dimension} <details> count`).toBe(synthetic ? 1 : 0);
			expect(closes, `${dimension} </details> count`).toBe(synthetic ? 1 : 0);
			if (synthetic) {
				// The heading itself stays OUTSIDE the collapse (it is above this body), and the summary
				// names what is hidden — a shut section must still disclose that the axis was measured.
				expect(
					body.some((line) => line.startsWith("<summary>")),
					`${dimension} summary`,
				).toBe(true);
				expect(body.indexOf("<details>")).toBeLessThan(
					body.findIndex((line) => line.startsWith("### ")),
				);
			}
		}
	});
});

describe("LEADERBOARD.md stays in sync with the renderer", () => {
	it("stores internally consistent Aggregates for every raw Sample distribution", () => {
		const { run } = loadCommittedRun();
		for (const provider of run.providers) {
			for (const result of provider.metrics) {
				const audited = auditAggregates(result.samples);
				const context = `${provider.providerId}/${result.metricId}`;
				expect(result.aggregates.n, `${context} n`).toBe(audited.n);
				for (const field of ["p50", "p95", "mean", "stdev", "min", "max"] as const) {
					const actual = result.aggregates[field];
					const expected = audited[field];
					const tolerance = 1e-12 * Math.max(1, Math.abs(expected));
					expect(Math.abs(actual - expected), `${context} ${field}`).toBeLessThanOrEqual(tolerance);
				}
			}
		}
	});

	it("is byte-identical to a fresh render of the Run it names", () => {
		const { committed, runId, run } = loadCommittedRun();
		const rendered = renderLeaderboardMarkdown(buildLeaderboard(run));
		if (committed !== rendered) {
			// Name the remedy in the failure, rather than leaving whoever hits this to work it out.
			throw new Error(
				`LEADERBOARD.md is stale — the renderer no longer produces the committed file.\n` +
					`Regenerate it:\n  ${regenCmd(runId)}`,
			);
		}
		expect(committed).toBe(rendered);
	});

	it("renders the same bytes twice, so this gate can't flake on an unseeded bootstrap", () => {
		// Loads independently of the test above: each resolves the Run itself, so one failing reports
		// its own diagnosis instead of aborting the file and taking the other down with it.
		const { run } = loadCommittedRun();
		expect(renderLeaderboardMarkdown(buildLeaderboard(run))).toBe(
			renderLeaderboardMarkdown(buildLeaderboard(run)),
		);
	});

	it("renders one row for every provider/Metric record in the source Run", () => {
		const { run } = loadCommittedRun();
		const board = buildLeaderboard(run);
		const expected = run.providers
			.flatMap((provider) =>
				provider.metrics
					// Retired metrics linger in already-published Runs but are uncatalogued now, so the
					// renderer drops them — the audit compares against the catalogued set it actually renders.
					.filter((metric) => getMetric(metric.metricId) !== undefined)
					.map((metric) => `${provider.providerId}/${metric.metricId}`),
			)
			.sort();
		const rendered = board.dimensions
			.flatMap(({ metrics }) =>
				metrics.flatMap(({ metric, rows }) => rows.map((row) => `${row.providerId}/${metric.id}`)),
			)
			.sort();

		expect(rendered).toEqual(expected);
	});

	it("renders every value, interval, rank, n, note, and pairwise p-value from raw Samples", () => {
		const { committed, run } = loadCommittedRun();
		const metrics = new Map<string, MetricDef>();
		const emittedByHeading = new Map<string, MetricDef>();
		for (const provider of run.providers) {
			for (const result of provider.metrics) {
				const metric = getMetric(result.metricId);
				// A retired metric lingers in an already-published Run but is uncatalogued now; the renderer
				// drops it, so the audit skips it rather than treating the historical data as drift.
				if (!metric) continue;
				metrics.set(metric.id, metric);
				const heading = `${metric.dimension}\0${metric.label}`;
				const collision = emittedByHeading.get(heading);
				if (collision && collision.id !== metric.id) {
					throw new Error(
						`Emitted Metrics ${collision.id} and ${metric.id} share a Markdown heading`,
					);
				}
				emittedByHeading.set(heading, metric);
			}
		}

		// The header counts only RENDERED (catalogued) records; retired metrics still on an already-
		// published Run are dropped by the renderer, so the audit counts the catalogued set too.
		const isCatalogued = (result: { metricId: string }): boolean =>
			getMetric(result.metricId) !== undefined;
		const metricRecordCount = run.providers.reduce(
			(sum, provider) => sum + provider.metrics.filter(isCatalogued).length,
			0,
		);
		const providerCount = run.providers.filter((provider) =>
			provider.metrics.some(isCatalogued),
		).length;
		const observationCount = run.providers.reduce(
			(sum, provider) =>
				sum +
				provider.metrics
					.filter(isCatalogued)
					.reduce((providerSum, result) => providerSum + result.samples.length, 0),
			0,
		);
		expect(committed).toContain(`**${metricRecordCount} metric records**`);
		expect(committed).toContain(`**${observationCount} retained trial observations**`);
		expect(committed).toContain(`**${metrics.size} metrics**`);
		expect(committed).toContain(`**${providerCount} providers**`);
		const target = [
			`${formatValue(run.targetSpec.vcpus)} vCPU`,
			`${formatValue(run.targetSpec.memoryGb)} GiB RAM`,
			run.targetSpec.diskGb === undefined
				? undefined
				: `${formatValue(run.targetSpec.diskGb)} GB disk`,
		]
			.filter((part): part is string => part !== undefined)
			.join(" · ");
		expect(committed).toContain(`Requested target for every provider: **${target}**`);
		expect(committed).not.toContain("Same pinned target");
		for (const provider of run.providers.filter(({ specMatched }) => specMatched === false)) {
			const name = getProvider(provider.providerId)?.displayName ?? provider.providerId;
			expect(committed).toContain(
				`**Comparability warning:** ${name}'s observed compute did not match the requested CPU/RAM target`,
			);
		}

		const parsed = parseMetricTables(committed, emittedByHeading);
		expect(parsed.rows.size).toBe(metrics.size);
		// The `### Pairwise tests` section is only emitted when some metric has ≥2 providers both with
		// n ≥ 2. When it is emitted, every record must appear; when a run legitimately has none (e.g. all
		// single-provider or n=1 metrics), `pairwise.size` is 0 and this must not read as a stale artifact.
		if (parsed.pairwise.size > 0) {
			expect(parsed.pairwise.size).toBe(metricRecordCount);
		}

		for (const metric of metrics.values()) {
			const audited = auditRows(run, metric);
			const expectedRows: MarkdownMetricRow[] = audited.map((row) => ({
				rank: String(row.rank),
				provider: row.displayName,
				value: formatValue(row.value),
				interval: row.interval,
				n: String(row.n),
				note: row.note,
			}));
			expect(parsed.rows.get(metric.id), metric.id).toEqual(expectedRows);

			for (const row of audited) {
				expect(
					parsed.pairwise.get(`${metric.id}\0${row.displayName}`),
					`${metric.id}/${row.providerId} pairwise`,
				).toEqual({ p: row.p, ks: row.ks });
			}
		}
	});
});
