#!/usr/bin/env bun
// `compare-figures` — draw two committed runs' realworld suites side by side.
//
// A leaderboard chart says who is fastest now. It cannot show that everything got faster since
// last month when the order did not change: two renders of the same suite look alike with
// different numbers on them. This puts both runs in one chart — each environment as a pair of
// bars, the older run's faded above the newer run's, each chipped with its month, the change
// printed beside the newer total — one chart per realworld suite both runs chart.
//
// Usage: compare-figures <runA.json> <runB.json> <out-directory>
//   The runs may be given in either order; the older by generatedAt is the reference. The files
//   are named `<suite>-<olderId>-vs-<newerId>.webp` under the output directory, which is NOT
//   docs/figures/: that directory is the leaderboard's, gated to exactly what LEADERBOARD.md
//   links, and a comparison is a deliberate, dated artifact rather than a published surface.
import { join } from "node:path";
import { screenshotHtml } from "@sandbox-benchmarks/figures/screenshot";
import { FIGURE_DEVICE_SCALE, renderComparisonFigureHtml } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { fail, logInfo, withGroup } from "../lib/actions-log.ts";

if (import.meta.main) {
	const [fileA, fileB, outDir] = process.argv.slice(2);
	if (!fileA || !fileB || !outDir) {
		fail("usage: compare-figures <runA.json> <runB.json> <out-directory>", {
			properties: { title: "compare-figures usage" },
			exitCode: 2,
		});
	}
	const [a, b] = await withGroup("Load runs", async () => {
		const loaded = [parseRun(await Bun.file(fileA).json()), parseRun(await Bun.file(fileB).json())];
		for (const run of loaded) logInfo(`runId=${run.runId} generatedAt=${run.generatedAt}`);
		return loaded as [ReturnType<typeof parseRun>, ReturnType<typeof parseRun>];
	});
	const { older, newer, figures } = renderComparisonFigureHtml(a, b);
	logInfo(`comparing ${older.label} (run ${older.id}) → ${newer.label} (run ${newer.id})`);
	if (figures.length === 0) {
		fail("no realworld suite is chartable in both runs; nothing to compare", {
			properties: { title: "compare-figures" },
		});
	}
	await withGroup("Render comparison figures", async () => {
		for (const figure of figures) {
			const shoot = () =>
				screenshotHtml(figure.html, {
					width: figure.width,
					deviceScaleFactor: FIGURE_DEVICE_SCALE,
				});
			// Rasterised twice and compared, as the leaderboard's charts are: a mismatch means
			// something nondeterministic leaked into the document.
			const webp = await shoot();
			if (!Bun.deepEquals(webp, await shoot())) {
				throw new Error(`${figure.file}: two renders of the same HTML differ`);
			}
			await Bun.write(join(outDir, figure.file), webp);
			logInfo(
				`${figure.suiteId}: ${figure.charted.older} → ${figure.charted.newer} environments` +
					`${figure.incomplete > 0 ? ` (+${figure.incomplete} in neither run)` : ""} → ${join(outDir, figure.file)}`,
			);
		}
	});
}
