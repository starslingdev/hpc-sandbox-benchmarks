#!/usr/bin/env bun
import { datasetImpact, renderDatasetImpact } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";

export const HELP = `dataset-impact — compare a baseline with an array of additional datasets.
usage: dataset-impact <baseline.json> <added.json> [more.json ...] --out <report.md> [--cohort-review <reason>]
Writes Markdown and a sibling .json containing every provider/metric estimate and source cell.
`;
if (import.meta.main) {
	const args = process.argv.slice(2);
	if (args.includes("--help") || args.includes("-h")) {
		console.log(HELP);
	} else {
		const outAt = args.indexOf("--out");
		const reviewAt = args.indexOf("--cohort-review");
		const output = outAt >= 0 ? args[outAt + 1] : undefined;
		const review = reviewAt >= 0 ? args[reviewAt + 1] : undefined;
		const paths = args.filter(
			(_, i) =>
				i !== outAt && i !== outAt + 1 && (reviewAt < 0 || (i !== reviewAt && i !== reviewAt + 1)),
		);
		if (
			!output?.endsWith(".md") ||
			paths.length < 2 ||
			paths.some((p) => p.startsWith("--")) ||
			(reviewAt >= 0 && !review?.trim())
		)
			throw new Error(HELP);
		const runs = await Promise.all(
			paths.map(async (path) => parseRun(await Bun.file(path).json())),
		);
		const first = runs[0];
		if (!first) throw new Error(HELP);
		const report = datasetImpact(first, runs.slice(1), { cohortReview: review });
		await Bun.write(output, renderDatasetImpact(report));
		await Bun.write(output.replace(/\.md$/, ".json"), `${JSON.stringify(report, null, 2)}\n`);
		console.log(JSON.stringify(report.summary));
	}
}
