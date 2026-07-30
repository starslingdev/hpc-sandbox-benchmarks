/**
 * The figure's integrity rules, asserted on synthetic data.
 *
 * A share image is read faster and trusted more than the table it was cropped from, and it
 * travels without the page that qualified it. Everything here is about what the figure is
 * ALLOWED to assert once it is on its own.
 */
import { describe, expect, it } from "bun:test";
import type { CompositeSpec } from "../../domain/index.ts";
import { backfillNoteOf, dimensionLabels, resolveComposite } from "../../domain/index.ts";
import { FIXTURE } from "./__fixtures__/data.ts";
import type { TableView } from "./table.ts";
import { buildTableView } from "./table.ts";

function viewOf(spec: CompositeSpec, data = FIXTURE): TableView {
	return buildTableView(resolveComposite(spec, data), {
		title: spec.title,
		dimensionLabels,
		backfillNote: backfillNoteOf(data.backfill),
		run: data.run,
	});
}

const ALL: CompositeSpec = { name: "all", rows: { predicate: () => true } };

describe("rule 1 — a 'best' mark needs something to be best against", () => {
	it("marks the best cell when two providers were measured", () => {
		const view = viewOf({ name: "t", rows: { ids: ["disk_iops"] } });
		const row = view.groups[0]?.rows[0];
		// HIB: 4000 beats 1000.
		expect(row?.cells[2]?.tone).toBe("best");
		expect(row?.cells[1]?.tone).toBe("value");
	});

	it("marks nothing on a row only ONE provider measured", () => {
		// MUTANT: drop the `measured >= 2` bar in cellsFor. A single-provider row would crown
		// its only value, and the figure would claim a comparison it did not make.
		const view = viewOf({ name: "t", rows: { ids: ["disk_lonely"] } });
		const row = view.groups[0]?.rows[0];
		expect(row?.cells.some((c) => c.tone === "best")).toBe(false);
	});
});

describe("rule 2 — a gap is an explicit cell, never a blank", () => {
	it("renders a placeholder for a provider with no value", () => {
		const view = viewOf({ name: "t", rows: { ids: ["disk_lonely"] } });
		const missing = view.groups[0]?.rows[0]?.cells[2];
		expect(missing?.tone).toBe("missing");
		expect(missing?.text).toBe("–");
		// Never blank (reads as a broken render) and never zero (reads as a measurement).
		expect(missing?.text).not.toBe("");
		expect(missing?.text).not.toBe("0");
	});
});

describe("rule 3 — disclosures survive the crop", () => {
	it("keeps the off-spec dagger on the column header", () => {
		const view = viewOf(ALL);
		expect(view.columns.map((c) => c.header)).toContain("Beta †");
	});

	it("keeps the backfill marker on the backfilled cell", () => {
		const view = viewOf({ name: "t", rows: { ids: ["disk_iops"] } });
		expect(view.groups[0]?.rows[0]?.cells[2]?.text).toContain("‡");
	});

	it("explains every marker it draws, and invents none it does not", () => {
		// MUTANT: hard-code the legend instead of assembling it from the markers present.
		const withMarkers = viewOf(ALL);
		expect(withMarkers.footnote).toContain("†");
		expect(withMarkers.footnote).toContain("backfilled from run 999");

		// A composite with neither marker must not carry either explanation.
		const clean = viewOf({
			name: "t",
			providers: ["alpha"],
			rows: { ids: ["realworld-demo_total"] },
		});
		expect(clean.footnote).not.toContain("†");
		expect(clean.footnote).not.toContain("backfilled");
	});

	it("still discloses when the composite is restricted to the backfilled column", () => {
		const view = viewOf({ name: "t", providers: ["beta"], rows: { ids: ["disk_iops"] } });
		expect(view.footnote).toContain("backfilled from run 999");
	});
});

describe("layout", () => {
	it("carries nesting through so a task row is not read as an independent metric", () => {
		// MUTANT: drop `indent` from RowView. "install" would render flush with the total it
		// is a component OF, reading as a separate, faster metric.
		const view = viewOf(ALL);
		const realworld = view.groups.find((g) => g.dimension === "realworld");
		expect(realworld?.rows.find((r) => r.id === "realworld_demo_task_install")?.indent).toBe(true);
		expect(realworld?.rows.find((r) => r.id === "realworld-demo_total")?.indent).toBe(false);
	});

	it("sizes the canvas to the table, not to a long editorial title", () => {
		const short = viewOf({ name: "t", rows: { ids: ["disk_iops"] } });
		const long = viewOf({
			name: "t",
			title: "A ".repeat(90),
			rows: { ids: ["disk_iops"] },
		});
		expect(long.width).toBe(short.width);
	});

	it("solves every column wide enough for its own widest cell", () => {
		const view = viewOf(ALL);
		for (const column of view.columns) {
			expect(column.width).toBeGreaterThan(0);
			expect(column.widest.length).toBeGreaterThan(0);
		}
	});

	it("names the run it came from, so a figure cannot be captioned with another run's id", () => {
		expect(viewOf(ALL).subtitle).toContain("12345");
	});
});
