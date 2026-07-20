import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate, ECONOMICS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import { buildLeaderboard, renderLeaderboardMarkdown } from "./leaderboard.ts";

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

/** A metric merged from replicate sandboxes: pooled samples + the per-replicate breakdown the R>1
 *  inference reads (as the aggregate produces). */
function replicatedMetric(metricId: string, replicateSamples: number[][]): MetricResult {
	const samples = replicateSamples.flat();
	return {
		metricId,
		samples,
		aggregates: aggregate(samples),
		replicates: replicateSamples.map((s, index) => ({ index, samples: s })),
	};
}

function provider(
	providerId: string,
	metrics: MetricResult[],
	gaps: ProviderRun["gaps"] = [],
	suitesCovered: ProviderRun["suitesCovered"] = [],
): ProviderRun {
	return {
		providerId,
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		observedSpecs: {},
		metrics,
		suitesCovered,
		gaps,
		uncatalogued: [],
	};
}

function run(providers: ProviderRun[]): Run {
	return {
		schemaVersion: "2",
		runId: "run-1",
		sha: "abc123",
		generatedAt: "2026-06-20T00:00:00.000Z",
		targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
		providers,
	};
}

describe("provider isolation roster", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";
	const withDetected = (providerId: string, detectedIsolation: string): ProviderRun => ({
		...provider(providerId, [metric(HEADLINE, [10])]),
		observedSpecs: { detectedIsolation },
	});

	it("pairs each provider's declared isolation with the probe's detected class", () => {
		const board = buildLeaderboard(
			run([withDetected("daytona-vm", "vm"), withDetected("modal-gvisor", "unknown")]),
		);
		expect(board.roster).toEqual([
			{
				providerId: "daytona-vm",
				displayName: "Daytona (VM)",
				declaredIsolation: "microVM (Linux VM)",
				detectedIsolation: "vm",
				mismatch: false,
			},
			{
				providerId: "modal-gvisor",
				displayName: "Modal (gVisor)",
				declaredIsolation: "gVisor container",
				detectedIsolation: "unknown",
				mismatch: false,
			},
		]);
	});

	it("flags a mismatch only for the reliably-distinguishable gVisor↔VM contradiction", () => {
		const board = buildLeaderboard(
			run([
				// declared gVisor, detected a real VM hypervisor → the one contradiction the probe can tell
				// apart reliably (/proc/version gVisor token vs systemd-detect-virt --vm)
				withDetected("modal-gvisor", "vm"),
				// declared microVM, detected "container" → the cgroup-quota heuristic also fires for a
				// microVM, so "container" can't contradict the declaration; never a mismatch
				withDetected("daytona-vm", "container"),
			]),
		);
		expect(board.roster.map((r) => r.mismatch)).toEqual([true, false]);
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain("## Providers in this run");
		expect(md).toContain("| Modal (gVisor) | gVisor container | vm ⚠ |");
		expect(md).toContain("Isolation mismatch");
	});

	it("renders an em-dash and no mismatch banner when no isolation was detected", () => {
		const board = buildLeaderboard(run([provider("daytona-vm", [metric(HEADLINE, [10])])]));
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain("| Daytona (VM) | microVM (Linux VM) | — |");
		expect(md).not.toContain("Isolation mismatch");
	});
});

describe("buildLeaderboard", () => {
	it("ranks the cpu headline HIB (highest first) and includes only providers with the metric", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]),
				provider("e2b", [metric("node_web_tooling_runs_per_s", [12])]),
				provider("modal-gvisor", []), // no metric → excluded from the row set
			]),
		);
		const cpu = board.dimensions.find((d) => d.dimension === "cpu");
		expect(cpu?.metric.id).toBe("node_web_tooling_runs_per_s");
		// HIB: e2b (12) outranks daytona (10); modal absent.
		expect(cpu?.rows.map((r) => [r.rank, r.providerId, r.value])).toEqual([
			[1, "e2b", 12],
			[2, "daytona-vm", 10],
		]);
	});

	it("ranks an economics (LIB) dimension cheapest-first and uses display names", () => {
		const board = buildLeaderboard(
			run([
				provider("modal-gvisor", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.37])]),
				provider("e2b", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.23])]),
			]),
		);
		const econ = board.dimensions.find((d) => d.dimension === "economics");
		// LIB: cheapest first.
		expect(econ?.rows.map((r) => r.providerId)).toEqual(["e2b", "modal-gvisor"]);
		expect(econ?.rows[0]?.displayName).toBe("E2B"); // resolved from the provider registry
	});

	it("omits dimensions with no emitted value and renders Markdown tables", () => {
		const board = buildLeaderboard(
			run([provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])])]),
		);
		// Only cpu is populated; disk/memory/etc. are absent.
		expect(board.dimensions.map((d) => d.dimension)).toEqual(["cpu"]);
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain("## cpu");
		expect(md).toContain("Node.js web tooling");
		expect(md).toContain("higher is better");
		expect(md).toMatch(/\| 1 \| Daytona \(VM\) \| 10 \|/);
	});

	it("orders equal headline values deterministically by providerId and shares their rank", () => {
		// Input order is modal-then-daytona; equal values must reorder to alphabetical providerId AND
		// share a rank — an exact tie is not a ranking win for whoever sorts first.
		const board = buildLeaderboard(
			run([
				provider("modal-gvisor", [metric("node_web_tooling_runs_per_s", [10])]),
				provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]),
			]),
		);
		const cpu = board.dimensions.find((d) => d.dimension === "cpu");
		expect(cpu?.rows.map((r) => r.providerId)).toEqual(["daytona-vm", "modal-gvisor"]);
		expect(cpu?.rows.map((r) => r.rank)).toEqual([1, 1]);
	});

	it("renders a placeholder when nothing is ranked", () => {
		const md = renderLeaderboardMarkdown(buildLeaderboard(run([provider("daytona-vm", [])])));
		expect(md).toContain("No ranked metrics yet");
	});

	it("ranks every emitted catalogued Metric, including non-headlines", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [
					metric("node_web_tooling_runs_per_s", [10]),
					metric("sqlite_speedtest_seconds", [20]),
				]),
				provider("modal-gvisor", [metric("sqlite_speedtest_seconds", [15])]),
			]),
		);
		expect(board.dimensions.map(({ dimension }) => dimension)).toEqual(["cpu", "system"]);
		expect(
			board.dimensions.flatMap(({ metrics }) => metrics.map(({ metric }) => metric.id)),
		).toEqual(["node_web_tooling_runs_per_s", "sqlite_speedtest_seconds"]);
		expect(
			board.dimensions.flatMap(({ metrics }) => metrics.flatMap(({ rows }) => rows)),
		).toHaveLength(3);

		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain("**3 metric records**");
		expect(md).toContain("**3 retained trial observations**");
		expect(md).toContain("**2 metrics**");
		expect(md).toContain("### Node.js web tooling _(headline)_");
		expect(md).toContain("### SQLite Speedtest");
	});

	it("uses the Run's target and warns when observed specs are not comparable", () => {
		const blaxel = {
			...provider("blaxel", [metric("node_web_tooling_runs_per_s", [10])]),
			specMatched: false,
			// Blaxel's real observed shape: memory=8192 pins the 8 GiB RAM target and a mounted volume the
			// 40 GiB disk, but CPU is coupled to RAM so it lands at 4 vCPU (2x the 2-vCPU target) — enough
			// to keep specMatched false and fire the comparability warning below.
			observedSpecs: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		};
		const board = buildLeaderboard(run([blaxel]));
		expect(board.targetSpec).toEqual({ vcpus: 2, memoryGb: 8, diskGb: 20 });
		expect(board.comparabilityCaveats).toHaveLength(1);

		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain(
			"Requested target for every provider: **2 vCPU · 8 GiB RAM · 20 GB disk**",
		);
		expect(md).toContain(
			"**Comparability warning:** Blaxel's observed compute did not match the requested CPU/RAM target",
		);
		expect(md).toContain("**4 vCPU · 8 GiB RAM · 40 GB disk**");
		expect(md).not.toContain("Same pinned target");
	});
});

describe("buildLeaderboard statistical ranking", () => {
	// Real Samples from a live `memory` smoke run: modal's noisy gVisor STREAM Copy trials vs daytona's.
	const MODAL_COPY = [10127, 34120, 9719, 59952, 29815];
	const DAYTONA_COPY = [66500, 66510, 66495, 66505, 66502];
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("attaches a bootstrapped interval that is wider for the noisier provider", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, DAYTONA_COPY)]),
				provider("modal-gvisor", [metric(HEADLINE, MODAL_COPY)]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		const daytona = rows.find((r) => r.providerId === "daytona-vm");
		const modal = rows.find((r) => r.providerId === "modal-gvisor");

		expect(daytona?.interval.level).toBe(0.95);
		expect(daytona?.interval.resamples).toBeGreaterThan(0);
		expect(daytona?.n).toBe(5);
		// The interval must expose modal's instability rather than hide it behind a median.
		const width = (r?: (typeof rows)[number]) => (r ? r.interval.hi - r.interval.lo : 0);
		expect(width(modal)).toBeGreaterThan(width(daytona));
	});

	it("is deterministic: the same Run yields byte-identical markdown", () => {
		const build = () =>
			renderLeaderboardMarkdown(
				buildLeaderboard(
					run([
						provider("daytona-vm", [metric(HEADLINE, DAYTONA_COPY)]),
						provider("modal-gvisor", [metric(HEADLINE, MODAL_COPY)]),
					]),
				),
			);
		expect(build()).toBe(build());
	});

	it("separates providers whose distributions genuinely differ", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, DAYTONA_COPY)]),
				provider("modal-gvisor", [metric(HEADLINE, MODAL_COPY)]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.providerId])).toEqual([
			[1, "daytona-vm"],
			[2, "modal-gvisor"],
		]);
		const modal = rows[1];
		expect(modal?.verdict).toBe("separated");
		expect(modal?.tiedWithAbove).toBeNull();
		expect(modal?.pVsPrevious?.mannWhitney).toBeLessThan(0.05);
		expect(modal?.pVsPrevious?.ks).toBeLessThan(0.05);
	});

	it("SHARES a rank when the difference is environmental noise, not a faster provider", () => {
		// Overlapping distributions: e2b's median edges daytona's, but the samples interleave. Ranking on
		// p50 alone would crown e2b; the U test refuses to.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 12, 11, 13, 9])]),
				provider("e2b", [metric(HEADLINE, [11, 12, 10, 14, 13])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		// e2b sorts first on the median, but cannot be separated → both hold rank 1, on the test's verdict.
		expect(rows.map((r) => r.rank)).toEqual([1, 1]);
		expect(rows[1]?.verdict).toBe("tied");
		expect(rows[1]?.tiedWithAbove).toBe("statistical");
		expect(rows[1]?.pVsPrevious?.mannWhitney).toBeGreaterThan(0.05);
		// Takeaway must not claim a sole provider when the top cohort is a statistical tie.
		expect(renderLeaderboardMarkdown(board)).toContain("share the top on this metric");
		expect(renderLeaderboardMarkdown(board)).not.toContain("is the only ranked provider");
	});

	it("leaves a single-Sample Metric untested and ranked on its exact value", () => {
		// `usd_per_hour` is a published price, not a trial: one Sample, no distribution to test. Ranking
		// must NOT collapse every provider into a tie just because n=1 can never reach significance.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.2])]),
				provider("modal-gvisor", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.providerId])).toEqual([
			[1, "modal-gvisor"],
			[2, "daytona-vm"],
		]);
		expect(rows[1]?.verdict).toBe("untested");
		expect(rows[1]?.pVsPrevious).toBeNull();
		expect(rows[0]?.interval.resamples).toBe(0);
	});

	it("SHARES a rank between single-Sample Metrics with exactly equal values", () => {
		// Two providers publishing the same price are a genuine tie: they must share a rank rather
		// than being split by the providerId sort tie-break alone.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
				provider("modal-gvisor", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => r.rank)).toEqual([1, 1]);
	});

	it("names EVERY co-leader when three or more providers share the top rank", () => {
		// A three-way tie at rank 1: the takeaway must list all three, not silently drop the third.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
				provider("e2b", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
				provider("modal-gvisor", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => r.rank)).toEqual([1, 1, 1]);
		const md = renderLeaderboardMarkdown(board);
		// All three display names appear in the "share the top" takeaway, joined as a list.
		expect(md).toMatch(/[^,|]+, [^,|]+ and [^,|]+ share the top on this metric/);
		for (const name of ["Daytona (VM)", "E2B", "Modal (gVisor)"]) expect(md).toContain(name);
	});
});

describe("buildLeaderboard with replicate sandboxes (R>1)", () => {
	const HEADLINE = "node_web_tooling_runs_per_s"; // HIB

	it("uses the hierarchical bootstrap interval and pools every replicate's samples into n", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [
					replicatedMetric(HEADLINE, [
						[10, 11],
						[40, 41],
						[70, 71],
					]),
				]),
			]),
		);
		const row = board.dimensions[0]?.metrics[0]?.rows[0];
		// A real (not point) interval was drawn, and it brackets the pooled median; n is R×k = 6.
		expect(row?.interval.resamples).toBeGreaterThan(0);
		expect(row?.interval.lo).toBeLessThanOrEqual(row?.value ?? 0);
		expect(row?.interval.hi).toBeGreaterThanOrEqual(row?.value ?? 0);
		expect(row?.n).toBe(6);
	});

	it("reports R=3 as UNDERPOWERED even when the replicate sandboxes never overlap", () => {
		// Three sandboxes per side, perfectly separated: the exact cluster test (Mann-Whitney U on the
		// per-sandbox medians) floors at 2/C(6,3) = 0.1, above α, so it CANNOT be declared separated. The
		// honest verdict is underpowered — ranked on the value, never a false "separated" or a false "tied".
		// (The old difference-CI rule read power off within-sandbox spread and would have over-claimed it.)
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [replicatedMetric(HEADLINE, [[100], [101], [102]])]),
				provider("modal-gvisor", [replicatedMetric(HEADLINE, [[1], [2], [3]])]),
			]),
		);
		const rows = board.dimensions[0]?.metrics[0]?.rows ?? [];
		expect(rows.map((r) => r.rank)).toEqual([1, 2]);
		expect(rows[1]?.verdict).toBe("underpowered");
		expect(rows[1]?.tiedWithAbove).toBeNull();
	});

	it("separates providers at R=5 whose replicate sandboxes never overlap", () => {
		// Five non-overlapping sandboxes per side clear the floor (2/C(10,5) ≈ 0.008 < α), so the exact
		// cluster test can — and here does — declare a real separation. R, not k, is the dial that buys it.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [replicatedMetric(HEADLINE, [[100], [101], [102], [103], [104]])]),
				provider("modal-gvisor", [replicatedMetric(HEADLINE, [[1], [2], [3], [4], [5]])]),
			]),
		);
		const rows = board.dimensions[0]?.metrics[0]?.rows ?? [];
		expect(rows.map((r) => r.rank)).toEqual([1, 2]);
		expect(rows[1]?.verdict).toBe("separated");
		// Mann-Whitney/KS are still reported as descriptive columns even though they no longer decide.
		expect(rows[1]?.pVsPrevious).not.toBeNull();
	});

	it("reports a mixed-R pair (one provider replicated, one not) as underpowered", () => {
		// A single-sandbox provider brings no between-sandbox replication, so a mixed pair floors at
		// 2/C(R+1, 1) — 0.33 at R=3 — and can never separate. The R=1 side enters the exact cluster test as
		// one cluster, and the pair is reported underpowered, never a false separation off pooled samples.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [replicatedMetric(HEADLINE, [[100], [101], [102]])]),
				provider("modal-gvisor", [metric(HEADLINE, [1, 2, 3])]),
			]),
		);
		const rows = board.dimensions[0]?.metrics[0]?.rows ?? [];
		expect(rows.map((r) => r.rank)).toEqual([1, 2]);
		expect(rows[1]?.verdict).toBe("underpowered");
	});

	it("ties adjacent providers at R=5 whose replicate spreads overlap (a statistical tie, not underpowered)", () => {
		// R=5 clears the floor (the test COULD separate), but the five sandboxes interleave, so the exact
		// cluster test does not — a genuine statistical tie, distinct from the underpowered R=3 case above.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [replicatedMetric(HEADLINE, [[10], [30], [50], [70], [90]])]),
				provider("modal-gvisor", [replicatedMetric(HEADLINE, [[20], [40], [60], [80], [100]])]),
			]),
		);
		const rows = board.dimensions[0]?.metrics[0]?.rows ?? [];
		expect(rows[1]?.verdict).toBe("tied");
		expect(rows[1]?.rank).toBe(rows[0]?.rank);
		expect(rows[1]?.tiedWithAbove).toBe("statistical");
	});
});

describe("renderLeaderboardMarkdown statistics", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("renders a bootstrap interval, n and a Note for a statistical tie", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona-vm", [metric(HEADLINE, [10, 12, 11, 13, 9])]),
					provider("e2b", [metric(HEADLINE, [11, 12, 10, 14, 13])]),
				]),
			),
		);
		expect(md).toContain("95% bootstrap interval");
		expect(md).toContain("| Note |");
		expect(md).toContain("| tied |");
		// The reader must be told what a shared rank means, not left to infer it.
		expect(md).toContain("statistically indistinguishable");
		expect(md).toContain("Mann-Whitney");
		expect(md).toContain("unadjusted, exploratory per-comparison p-values");
	});

	it("surfaces the KS p-value in the details section, not only on the row object", () => {
		// Regression: `ks` was computed and stored on every LeaderboardRow, documented as the way to spot
		// a bimodal provider, and then never rendered — so no reader of LEADERBOARD.md could ever see it.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 12, 11, 13, 9])]),
				provider("e2b", [metric(HEADLINE, [11, 12, 10, 14, 13])]),
			]),
		);
		const md = renderLeaderboardMarkdown(board);

		expect(md).toContain("p (KS)");
		expect(md).toContain("Kolmogorov-Smirnov");

		expect(board.dimensions[0]?.rows[1]?.pVsPrevious).not.toBeNull();

		// Main ranking table stays slim (Note column because of the tie); KS lives in the details table.
		const mainRows = md.split("\n").filter((l) => /^\| \d+ \| (Daytona \(VM\)|E2B) \|/.test(l));
		expect(mainRows).toHaveLength(2);
		for (const row of mainRows) {
			expect(row.split("|").filter((c) => c.trim() !== "").length).toBe(6);
		}

		const detailRows = md
			.split("\n")
			.filter((l) => /^\| cpu \| Node\.js web tooling \| (Daytona \(VM\)|E2B) \|/.test(l));
		expect(detailRows).toHaveLength(2);
		const [first, second] = detailRows as [string, string];
		expect(first).toContain("| — |");
		const secondKs = second.trimEnd().split("|").at(-2)?.trim() as string;
		expect(secondKs).not.toBe("—");
		expect(secondKs).toMatch(/^(<0\.001|\d+(\.\d+)?(e[+-]?\d+)?)$/);
	});

	it("renders a point value with no interval for a single-Sample Metric", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(run([provider("daytona-vm", [metric(HEADLINE, [10])])])),
		);
		// n=1 → em-dash for the bootstrap interval; no Note column when nothing needs calling out.
		expect(md).toMatch(/\| 1 \| Daytona \(VM\) \| 10 \| — \| 1 \|\n/);
	});

	it("never prints a p-value as a misleading 0", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona-vm", [metric(HEADLINE, [1, 2, 3, 4, 5, 6, 7, 8])]),
					provider("modal-gvisor", [metric(HEADLINE, [90, 91, 92, 93, 94, 95, 96, 97])]),
				]),
			),
		);
		expect(md).toContain("<0.001");
	});
});

describe("underpowered comparisons", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("does not claim a tie when the sample sizes make the test structurally powerless", () => {
		// 3 v 3, completely separated and 2x apart: Mann-Whitney's best attainable p (0.1) is already above
		// α, so the old code grouped these at rank 1 — reporting the trial count as a finding about the
		// providers. Rank on value, return the `underpowered` verdict, and say so in the cell.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [19.63, 19.72, 19.96])]),
				provider("modal-gvisor", [metric(HEADLINE, [9.79, 9.52, 9.59])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.displayName, r.rank, r.verdict, r.tiedWithAbove])).toEqual([
			["Daytona (VM)", 1, null, null],
			["Modal (gVisor)", 2, "underpowered", null],
		]);
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain("n too small");
		expect(md).not.toMatch(/\| tied \|/);
		expect(md).not.toContain("(tied)");
	});

	it("quotes each underpowered row's own floor, not one recomputed from its sample sizes", () => {
		// A 4-v-3 comparison is still underpowered, but floors at 2/C(7,4) ≈ 0.057, not 3 v 3's 0.1. The
		// footer must quote the shape the table actually contains, or it explains a number no row has.
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona-vm", [metric(HEADLINE, [19.6, 19.7, 19.9, 20.1])]),
					provider("modal-gvisor", [metric(HEADLINE, [9.5, 9.6, 9.8])]),
				]),
			),
		);
		expect(md).toContain("(here 4 v 3 floors at p ≈ 0.057)");
		expect(md).not.toContain("0.1)");
	});

	it("omits the n-too-small explanation entirely when no comparison was underpowered", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona-vm", [metric(HEADLINE, [10, 11, 12, 13, 14])]),
					provider("modal-gvisor", [metric(HEADLINE, [1, 2, 3, 4, 5])]),
				]),
			),
		);
		expect(md).not.toContain("n too small");
		expect(md).not.toContain("floors at p");
	});

	it("SHARES a rank between underpowered rows whose medians are exactly equal — on the VALUE, not a tie", () => {
		// Ranking on the value cannot split rows that HAVE the same value: an underpowered comparison must
		// not let the providerId sort tie-break decide who is faster. But the shared rank is the equality
		// speaking, not the test — so the row records WHY it shares it, and the cell says so. The footer
		// used to flatly assert underpowered rows are "not claimed to be tied" while this branch quietly
		// gave them the same rank; now the two agree because the basis is a field, not a footnote.
		const board = buildLeaderboard(
			run([
				provider("modal-gvisor", [metric(HEADLINE, [9, 10, 11])]),
				provider("daytona-vm", [metric(HEADLINE, [8, 10, 12])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.providerId, r.value, r.rank])).toEqual([
			["daytona-vm", 10, 1],
			["modal-gvisor", 10, 1],
		]);
		expect(rows[1]?.verdict).toBe("underpowered");
		expect(rows[1]?.tiedWithAbove).toBe("identical-value");
		const md = renderLeaderboardMarkdown(board);
		// The cell distinguishes the two reasons the rank is shared; it never reads as a statistical tie.
		expect(md).toContain("n too small, equal medians");
		expect(md).not.toMatch(/\| tied \|/);
		expect(md).not.toContain("(tied)");
	});

	it("marks a shared rank between untested (n<2) rows with equal values as equal, not tied", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.2])]),
				provider("modal-gvisor", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.2])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.verdict, r.tiedWithAbove])).toEqual([
			[1, null, null],
			[1, "untested", "identical-value"],
		]);
		expect(renderLeaderboardMarkdown(board)).toContain("equal values");
	});

	it("names every co-leader when three or more providers share the top rank", () => {
		// Three providers at identical prices share rank 1; the takeaway must list all three, not just two.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
				provider("e2b", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
				provider("modal-gvisor", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => r.rank)).toEqual([1, 1, 1]);
		const md = renderLeaderboardMarkdown(board);
		// Match the common phrasing across branches (the takeaway says "…this headline" here and
		// "…this metric" once the per-metric renderer lands) so this test survives the flow up-stack.
		expect(md).toMatch(/[^,|]+, [^,|]+ and [^,|]+ share the top on this/);
		for (const name of ["Daytona (VM)", "E2B", "Modal (gVisor)"]) expect(md).toContain(name);
	});

	it("never marks a row `tied` unless the test could have separated it", () => {
		// The invariant behind the whole fix: `tied` is a verdict, and a verdict requires the power to have
		// reached the opposite one. An underpowered comparison may share a rank, but never on that basis.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [19.63, 19.72, 19.96])]),
				provider("modal-gvisor", [metric(HEADLINE, [9.79, 9.52, 9.59])]),
				provider("e2b", [metric(HEADLINE, [9.79, 9.52, 9.59])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		for (const row of rows) {
			if (row.verdict === "underpowered") expect(row.tiedWithAbove).not.toBe("statistical");
			if (row.tiedWithAbove === "statistical") expect(row.verdict).toBe("tied");
		}
	});

	it("still groups a genuine statistical tie when the test HAD the power to separate", () => {
		// 8 v 8 near-identical samples: the test could have separated them (its floor is well under α) and
		// did not, so this is a real tie and the rows must share a rank — the underpowered guard must not
		// swallow the tie case it sits next to.
		const near = [10, 10.1, 9.9, 10.2, 9.8, 10.05, 9.95, 10.15];
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, near)]),
				provider("modal-gvisor", [
					metric(
						HEADLINE,
						near.map((v) => v - 0.01),
					),
				]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.verdict, r.tiedWithAbove])).toEqual([
			[1, null, null],
			[1, "tied", "statistical"],
		]);
		expect(renderLeaderboardMarkdown(board)).toContain("| tied |");
	});

	it("does not let the tie-corrected approximation crown a provider the exact test cannot separate", () => {
		// The reported bug, end to end: mannWhitneyU([1,1,1],[2,2,2]) returned p = 0.047 under the normal
		// approximation — below α, and below the 0.081 that was claimed as the 3-v-3 floor. Had the guard
		// not (accidentally) blocked it first, that p would have SEPARATED these two providers on evidence
		// the permutation null cannot produce. Exactly: p = 0.1, and 3 v 3 stays untestable.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [2, 2, 2])]),
				provider("modal-gvisor", [metric(HEADLINE, [1, 1, 1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows[1]?.pVsPrevious?.mannWhitney).toBeCloseTo(0.1, 12);
		expect(rows[1]?.pVsPrevious?.floor).toBeCloseTo(0.1, 12);
		expect(rows[1]?.verdict).toBe("underpowered");
		expect(rows[1]?.verdict).not.toBe("separated");
	});
});

describe("coverage gaps", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";
	const diskSkip = (needed: number): ProviderRun["gaps"][number] => ({
		scope: "suite",
		id: "realworld-mastra",
		outcome: "skipped",
		reason: `Insufficient disk: 16.7 GiB free, suite needs ${needed} GiB`,
	});

	it("collects each skip, flags disk gaps, and orders disk-first then by provider/suite", () => {
		const board = buildLeaderboard(
			run([
				// daytona covers both exercised suites, so its only absence is the one e2b records — no
				// derived `missing` gap enters the ordering under test.
				provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["cpu-node", "realworld-mastra"]),
				provider(
					"e2b",
					[],
					[
						{
							scope: "suite",
							id: "cpu-node",
							outcome: "skipped",
							reason: "Missing credentials: E2B_API_KEY",
						},
						diskSkip(30),
					],
				),
			]),
		);
		expect(board.coverageGaps).toEqual([
			// disk gap first, marked disk:true, carrying the verbatim free-vs-needed reason
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "realworld-mastra",
				outcome: "skipped",
				reason: "Insufficient disk: 16.7 GiB free, suite needs 30 GiB",
				disk: true,
			},
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "cpu-node",
				outcome: "skipped",
				reason: "Missing credentials: E2B_API_KEY",
				disk: false,
			},
		]);
	});

	it("renders a Coverage gaps section that marks disk gaps ❌ and reads as a failure, not a tie", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["realworld-mastra"]),
					provider("e2b", [], [diskSkip(30)]),
				]),
			),
		);
		expect(md).toContain("## Coverage gaps");
		expect(md).toContain("failing to cover");
		// The disk row is marked and carries the free-vs-needed detail.
		expect(md).toContain(
			"| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 16.7 GiB free, suite needs 30 GiB |",
		);
		// The disk explanation (platform-fixed providers can't close the gap) only appears with a disk gap.
		expect(md).toContain("could not supply the disk the suite needs");
	});

	it("renders coverage gaps even when no dimension ranked (all-skipped run)", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(run([provider("e2b", [], [diskSkip(30)])])),
		);
		expect(md).toContain("_No ranked metrics yet");
		expect(md).toContain("## Coverage gaps");
		expect(md).toContain("realworld-mastra");
	});

	it("omits the section and the disk note entirely when nothing was skipped", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(run([provider("daytona-vm", [metric(HEADLINE, [10, 11])])])),
		);
		expect(md).not.toContain("## Coverage gaps");
		expect(md).not.toContain("❌");
	});

	it("escapes pipes and newlines in the verbatim gap reason so the table stays intact", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider(
						"e2b",
						[],
						[
							{
								scope: "suite",
								id: "cpu-node",
								outcome: "failed",
								reason: "exit 1 | killed\nsee step log",
							},
						],
					),
				]),
			),
		);
		expect(md).toContain("| E2B | cpu-node | **failed** | exit 1 \\| killed see step log |");
	});
});

describe("coverage gaps: the holes nobody recorded", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("derives a `missing` gap for a suite that ran elsewhere but never reported here", () => {
		// The case the whole derivation exists for, and the one that was previously invisible: e2b produced
		// no result AND left no marker, so it appears in no ranked table (no value) and in no recorded gap
		// (no marker). Without deriving it, a provider that contributed nothing to the run reads as absent
		// from the comparison rather than as failing to cover it.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["cpu-node", "disk"]),
				provider("e2b", []),
			]),
		);
		expect(board.coverageGaps).toEqual([
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "cpu-node",
				outcome: "missing",
				reason: "No result and no marker — the suite never reported for this provider.",
				disk: false,
			},
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "disk",
				outcome: "missing",
				reason: "No result and no marker — the suite never reported for this provider.",
				disk: false,
			},
		]);
	});

	it("never accuses a provider of missing a suite this run never exercised anywhere", () => {
		// The denominator is the run's OWN evidence, not the suite registry. A run that only ever ran
		// cpu-node has not "failed to cover" the other five suites, and reporting five phantom holes per
		// provider would bury the real ones in noise the reader has to learn to ignore.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
				provider("e2b", [metric(HEADLINE, [12, 13])], [], ["cpu-node"]),
			]),
		);
		expect(board.coverageGaps).toEqual([]);
	});

	it("does not derive a gap for a suite the provider actually covered", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
				provider("e2b", [metric(HEADLINE, [12, 13])], [], ["cpu-node", "disk"]),
			]),
		);
		// daytona is missing `disk` (e2b ran it), but NOT `cpu-node`, which it covered.
		expect(board.coverageGaps.map((g) => `${g.providerId}/${g.id}/${g.outcome}`)).toEqual([
			"daytona-vm/disk/missing",
		]);
	});

	it("does not derive a `missing` gap on top of a recorded one — a marker accounts for the suite", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
				provider(
					"e2b",
					[],
					[{ scope: "suite", id: "cpu-node", outcome: "failed", reason: "PTS died" }],
				),
			]),
		);
		// One row, not two: the failure marker already explains cpu-node's absence on e2b.
		expect(board.coverageGaps).toHaveLength(1);
		expect(board.coverageGaps[0]).toMatchObject({ id: "cpu-node", outcome: "failed" });
	});

	it("never flags a FAILED gap as a ❌ disk gap, however its error message begins", () => {
		// ❌ disk means "the provider cannot host this workload at all" — a precondition checked BEFORE the
		// suite ran. A failure's reason is an error message, and one that happens to start with the same
		// words is the workload running out of space mid-flight: a different fact, and not a structural one.
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["realworld-mastra"]),
				provider(
					"e2b",
					[],
					[
						{
							scope: "suite",
							id: "realworld-mastra",
							outcome: "failed",
							reason: "Insufficient disk space while extracting node_modules",
						},
					],
				),
			]),
		);
		expect(board.coverageGaps[0]).toMatchObject({ outcome: "failed", disk: false });
		const md = renderLeaderboardMarkdown(board);
		expect(md).not.toContain("❌");
		expect(md).toContain("| E2B | realworld-mastra | **failed** |");
	});

	it("renders an operation-scoped gap as a lifecycle op, not as a suite", () => {
		const board = buildLeaderboard(
			run([
				provider(
					"daytona-vm",
					[metric(HEADLINE, [10, 11])],
					[
						{
							scope: "operation",
							id: "lifecycle_snapshot_ms",
							outcome: "skipped",
							reason: "provider SDK exposes no snapshot operation",
						},
					],
					["cpu-node"],
				),
			]),
		);
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain(
			"| Daytona (VM) | lifecycle_snapshot_ms _(lifecycle op)_ | **skipped** | provider SDK exposes no snapshot operation |",
		);
		// An operation is not a suite, so it must never enter the missing-suite denominator.
		expect(board.coverageGaps.every((g) => g.outcome !== "missing")).toBe(true);
	});

	it("explains only the outcomes the table actually contains", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
					provider("e2b", []),
				]),
			),
		);
		expect(md).toContain("**missing** — nothing was reported at all");
		// No skip and no failure in this run, so neither legend is emitted: the section never explains a
		// category the reader cannot see.
		expect(md).not.toContain("**skipped** — a precondition said no");
		expect(md).not.toContain("**failed** — the benchmark was attempted and broke");
	});

	it("orders disk skips first, then failures, then the unexplained absences", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona-vm", [metric(HEADLINE, [10, 11])], [], ["cpu-node", "disk", "pgbench"]),
				provider(
					"e2b",
					[],
					[
						{ scope: "suite", id: "cpu-node", outcome: "failed", reason: "PTS died" },
						{
							scope: "suite",
							id: "disk",
							outcome: "skipped",
							reason: "Insufficient disk: 1 GiB free, suite needs 20 GiB",
						},
					],
				),
			]),
		);
		expect(board.coverageGaps.map((g) => `${g.id}/${g.outcome}`)).toEqual([
			"disk/skipped", // ❌ disk leads: a structural absence
			"cpu-node/failed", // then what broke
			"pgbench/missing", // then what never said anything at all
		]);
	});
});
