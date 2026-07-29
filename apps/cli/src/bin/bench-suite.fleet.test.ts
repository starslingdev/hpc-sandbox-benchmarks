// The fan-out cell's job-summary surface at the widths the `replicas` dispatch knob allows. The
// shipped defaults are R=3/R=12, but `replicas` scales every suite at once, so the reporting has to
// stay legible (and the annotation bounded) well past that — these pin it up to R=49.
import { describe, expect, it } from "bun:test";
import type { Run } from "@sandbox-benchmarks/schema";
import type { ReplicateOutcome } from "./bench-suite.ts";
import { fleetAnnotationMessage, fleetFailureDetail, replicateSummaryRows } from "./bench-suite.ts";

const PROVIDER = "blaxel";

/** A shard Run carrying one provider slice, enough for the summary row to read. */
const runFor = (overrides: Partial<Run["providers"][number]> = {}): Run =>
	({
		providers: [
			{
				providerId: PROVIDER,
				validationStatus: "validated",
				observedSpecs: { cpuModel: "AMD EPYC" },
				specMatched: true,
				metrics: [{ metricId: "git_seconds" }, { metricId: "pybench_milliseconds" }],
				suitesCovered: ["system"],
				gaps: [],
				uncatalogued: [],
				...overrides,
			},
		],
	}) as unknown as Run;

/** N successful replicates, r0..r(N-1). */
const fleet = (count: number): ReplicateOutcome[] =>
	Array.from({ length: count }, (_, index) => ({
		index,
		outFile: `data/runs/ci-1-r${index}.json`,
		run: runFor(),
		failed: false,
	}));

describe("replicateSummaryRows at wide fan-outs", () => {
	it("emits exactly one row per replicate plus a header, up to R=49", () => {
		for (const count of [1, 5, 12, 49]) {
			const rows = replicateSummaryRows(PROVIDER, fleet(count));
			expect(rows).toHaveLength(count + 1);
			// Every row carries the full column set, so no cell silently shifts under a wide fan-out.
			expect(new Set(rows.map((row) => row.length))).toEqual(new Set([9]));
		}
	});

	it("keeps rows in replicate order and labels each shard distinctly", () => {
		const rows = replicateSummaryRows(PROVIDER, fleet(49)).slice(1);
		expect(rows[0]?.[0]).toBe("<code>r0</code>");
		expect(rows[48]?.[0]).toBe("<code>r48</code>");
		// Distinct shard paths are what prove R replicates did not collide on one file.
		expect(new Set(rows.map((row) => row[8])).size).toBe(49);
	});

	// The per-sandbox spec columns are the point of the fan-out: a replicate that landed on different
	// host hardware is the first explanation to reach for when one is an outlier.
	it("surfaces observed CPU and spec match per replicate", () => {
		const rows = replicateSummaryRows(PROVIDER, [
			{ index: 0, outFile: "a.json", run: runFor(), failed: false },
			{
				index: 1,
				outFile: "b.json",
				run: runFor({ observedSpecs: { cpuModel: "Intel Xeon" }, specMatched: false }),
				failed: false,
			},
		]).slice(1);
		expect(rows[0]?.slice(6, 8)).toEqual(["<code>AMD EPYC</code>", "true"]);
		expect(rows[1]?.slice(6, 8)).toEqual(["<code>Intel Xeon</code>", "false"]);
	});

	it("shows an em-dash rather than an empty cell when a spec probe returned nothing", () => {
		const rows = replicateSummaryRows(PROVIDER, [
			{
				index: 0,
				outFile: "a.json",
				run: runFor({ observedSpecs: {}, specMatched: undefined }),
				failed: false,
			},
		]).slice(1);
		expect(rows[0]?.slice(6, 8)).toEqual(["<code>—</code>", "—"]);
	});

	it("renders a two-digit index without confusing it for a single-digit one", () => {
		const rows = replicateSummaryRows(PROVIDER, fleet(13)).slice(1);
		expect(rows.map((row) => row[0])).toContain("<code>r12</code>");
		expect(rows.map((row) => row[0])).not.toContain("<code>r1 2</code>");
	});

	it("reports a replicate that produced no Run without blanking the row", () => {
		const rows = replicateSummaryRows(PROVIDER, [
			{ index: 0, outFile: "data/runs/ci-1-r0.json", failed: true, detail: "boom" },
		]).slice(1);
		// Em-dashes, not empty cells: "we have no Run" must stay visibly different from "zero metrics".
		expect(rows[0]).toEqual([
			"<code>r0</code>",
			"failure",
			"—",
			"—",
			"—",
			"—",
			"<code>—</code>",
			"—",
			"<code>data/runs/ci-1-r0.json</code>",
		]);
	});

	it("distinguishes a healthy replicate from a validated-but-empty one", () => {
		const rows = replicateSummaryRows(PROVIDER, [
			{ index: 0, outFile: "a.json", run: runFor(), failed: false },
			{
				index: 1,
				outFile: "b.json",
				run: runFor({ validationStatus: "pending", metrics: [] }),
				failed: false,
			},
		]).slice(1);
		expect(rows[0]?.slice(1, 4)).toEqual(["success", "validated", "2"]);
		expect(rows[1]?.slice(1, 4)).toEqual(["success", "pending", "0"]);
	});
});

describe("fleet annotation bounding", () => {
	/** N failures whose reasons are as long as a real require-gate/suite-failure message. */
	const failures = (count: number): ReplicateOutcome[] =>
		Array.from({ length: count }, (_, index) => ({
			index,
			outFile: `data/runs/ci-1-r${index}.json`,
			failed: true,
			detail: `Required provider "${PROVIDER}" produced no metrics — system failed: ${"x".repeat(200)}`,
		}));

	it("names every failure in the job-summary detail, however wide the fan-out", () => {
		const detail = fleetFailureDetail(failures(49));
		expect(detail.split("\n")).toHaveLength(49);
		expect(detail).toContain("r48:");
	});

	// GitHub truncates a long annotation, so an unbounded message would cut mid-reason and lose the
	// count — the one fact a reader needs at a glance.
	it("caps the annotation and points at the summary for the rest", () => {
		const message = fleetAnnotationMessage(failures(49), 49, 0);
		expect(message.startsWith("49/49 replicate(s) failed")).toBe(true);
		expect(message).toContain("…and 46 more (see the job summary)");
		expect(message.length).toBeLessThan(1000);
	});

	it("does not add a 'more' pointer when every failure fits", () => {
		const message = fleetAnnotationMessage(failures(2), 12, 10);
		expect(message).toContain("2/12 replicate(s) failed");
		expect(message).not.toContain("more (see the job summary)");
	});

	it("reports the validated count when nothing failed", () => {
		expect(fleetAnnotationMessage([], 49, 49)).toBe("49/49 replicate(s) validated");
	});
});
