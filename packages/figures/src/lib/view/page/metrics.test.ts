import { describe, expect, it } from "bun:test";
import type { SandboxBenchmarkData } from "../../../domain/index.ts";
import { dimensionLabels } from "../../../domain/index.ts";
import { FIXTURE } from "../__fixtures__/data.ts";
import type { Block, StackBlock, TextBlock } from "./blocks.ts";
import { buildCoverageFigure } from "./coverage.ts";
import { buildMetricsFigure } from "./metrics.ts";

/**
 * The page figures' integrity rules, on the SYNTHETIC fixture.
 *
 * Why not the committed run: it has `backfill: null`, no excluded providers and no row
 * with a single measured value, so every assertion below would pass against it no matter
 * what the code did. That is not a hypothetical — a dropped-disclosure bug survived review
 * on this branch precisely because the test that should have caught it was reading the
 * live artifact. The fixture carries a backfilled cell, an off-spec provider, a
 * one-measurement row and a missing cell ON PURPOSE.
 *
 * These are assertions about what the FIGURE IS ALLOWED TO CLAIM, not about how it looks.
 * How it looks is measured against the browser crops by
 * `pnpm sandbox-benchmarks:figure-diff`, which is the only place a pixel belongs.
 */

const data = FIXTURE as SandboxBenchmarkData;

/** Every string the figure will draw, in tree order. */
function textsOf(block: Block): string[] {
	if (block.kind === "text") return [block.text];
	return block.children.flatMap(textsOf);
}

/** Every text run, so a test can assert on colour and size as well as content. */
function runsOf(block: Block): TextBlock[] {
	if (block.kind === "text") return [block];
	return block.children.flatMap(runsOf);
}

describe("all-metrics figure", () => {
	const figure = buildMetricsFigure(data);
	const texts = textsOf(figure.root);

	it("is named for the page anchor it reproduces", () => {
		// The name is what pairs a figure with its crop in figure-diff. A figure named
		// anything else is a figure nothing is ever compared against.
		expect(figure.anchor).toBe("all-metrics");
	});

	it("marks nothing best on a row only ONE provider measured", () => {
		// The fixture's `solo_metric` has a value for alpha and nothing for beta. Marking it
		// would claim a comparison the run never made — the reader sees a winner where there
		// was only one entrant.
		const solo = data.dimensionGroups
			.flatMap((g) => g.rows)
			.filter((r) => Object.values(r.values).filter((v) => v !== null).length === 1);
		expect(
			solo.length,
			"fixture must contain a one-measurement row or this is vacuous",
		).toBeGreaterThan(0);

		// Exactly as many `best` markers as there are rows with >= 2 measured values.
		const comparable = data.dimensionGroups
			.flatMap((g) => g.rows)
			.filter((r) => Object.values(r.values).filter((v) => v !== null).length >= 2);
		expect(texts.filter((t) => t === "best")).toHaveLength(comparable.length);
	});

	it("renders a gap as an explicit placeholder, never blank and never zero", () => {
		// A blank cell reads as a broken render and a zero reads as a measurement. Both are
		// worse than saying "no value".
		const missing = data.dimensionGroups
			.flatMap((g) => g.rows)
			.flatMap((r) => data.providers.map((p) => r.values[p.id]))
			.filter((v) => v === null || v === undefined).length;
		expect(missing, "fixture must contain a missing cell or this is vacuous").toBeGreaterThan(0);
		expect(texts.filter((t) => t === "–").length).toBeGreaterThanOrEqual(missing);
		expect(texts).not.toContain("");
	});

	it("keeps the off-spec dagger on the provider that earned it, and only that one", () => {
		const offSpec = data.providers.filter((p) => !p.specMatched);
		expect(offSpec.length, "fixture must contain an off-spec provider").toBeGreaterThan(0);
		for (const p of offSpec) expect(texts).toContain(`${p.name} †`);
		for (const p of data.providers.filter((x) => x.specMatched)) expect(texts).toContain(p.name);
	});

	it("carries the backfill legend whenever it draws a backfill marker", () => {
		// The rule that matters once the table is cropped out of the page that explained it:
		// a marker with no legend is worse than no marker at all.
		const hasMarker = texts.includes("‡");
		expect(hasMarker, "fixture must contain a backfilled cell or this is vacuous").toBe(true);
		// Narrowed rather than defaulted. A `?? ""` fallback would make the second clause
		// ALWAYS true (every string includes ""), quietly turning this into a one-sided
		// assertion the moment a fixture stopped disclosing a backfill.
		const { backfill } = data;
		expect(backfill, "fixture must disclose a backfill or this is vacuous").not.toBeNull();
		expect(texts.some((t) => t.includes("backfill") || t.includes(backfill?.runId ?? ""))).toBe(
			true,
		);
	});

	it("never draws a marker the run did not produce", () => {
		const clean = { ...data, backfill: null } as SandboxBenchmarkData;
		const cleanTexts = textsOf(buildMetricsFigure(clean).root);
		// No backfill on the run means no legend inviting the reader to look for one.
		expect(cleanTexts.some((t) => t.toLowerCase().includes("backfill"))).toBe(false);
	});

	it("draws every dimension band the data groups by", () => {
		// `|| t.length > 0` used to sit on the end of this, which made it true for any
		// non-empty text anywhere in the figure — the band half asserted nothing at all.
		for (const group of data.dimensionGroups) {
			// Uppercased here because satori has no `text-transform`: the band's TextStyle
			// carries `uppercase: true` and `textBlock` applies it to the drawn string, so
			// the figure's text IS the uppercase form.
			const label = (dimensionLabels[group.dimension] ?? group.dimension).toUpperCase();
			expect(texts, `no band heading for the ${group.dimension} group`).toContain(label);
		}
		// One band row per group, and the figure has as many rows as header + bands + metrics.
		const rows = (figure.root as StackBlock).children[0] as StackBlock;
		const metricRows = data.dimensionGroups.reduce((n, g) => n + g.rows.length, 0);
		expect(rows.children).toHaveLength(1 + data.dimensionGroups.length + metricRows);
	});

	it("gives every text run a compensated letter spacing, never NaN", () => {
		// A NaN letter-spacing does not throw in satori: it lays the whole line out at
		// position zero, and the figure renders successfully with its text piled at the edge.
		for (const run of runsOf(figure.root)) {
			expect(Number.isFinite(run.letterSpacing), `NaN spacing on ${JSON.stringify(run.text)}`).toBe(
				true,
			);
			expect(Number.isFinite(run.measuredWidth)).toBe(true);
		}
	});
});

describe("coverage figure", () => {
	it("discloses providers that were attempted but never validated", () => {
		const withExcluded = {
			...data,
			excludedProviders: [{ id: "gamma", name: "Gamma", validationStatus: "pending", metrics: 0 }],
		} as unknown as SandboxBenchmarkData;
		const texts = textsOf(buildCoverageFigure(withExcluded).root);
		expect(texts.some((t) => t.includes("Gamma"))).toBe(true);
		// The sentence that makes the absence legible, not just the name.
		expect(texts.some((t) => t.includes("not in the tables above"))).toBe(true);
	});

	it("omits the disclosure line when the run excluded nobody", () => {
		const texts = textsOf(
			buildCoverageFigure({ ...data, excludedProviders: [] } as SandboxBenchmarkData).root,
		);
		expect(texts.some((t) => t.includes("not in the tables above"))).toBe(false);
	});

	it("refuses to render a gap naming a provider with no column", () => {
		// Silently dropping it would remove a disclosed failure from a figure whose only job
		// is disclosure.
		const bad = {
			...data,
			coverageGaps: [{ provider: "nobody", suite: "s", outcome: "failed", reason: "r" }],
		} as unknown as SandboxBenchmarkData;
		expect(() => buildCoverageFigure(bad)).toThrow(/unknown provider nobody/);
	});
});
