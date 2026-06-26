#!/usr/bin/env bun
// `leaderboard` — render a published Run document into the Markdown comparison surface (one ranked
// table per dimension on its headline metric). Writes to <outFile> when given, else prints to stdout.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildLeaderboard, renderLeaderboardMarkdown } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";

if (import.meta.main) {
	const [runFile, outFile] = process.argv.slice(2);
	if (!runFile) {
		console.error("usage: leaderboard <run.json> [outFile.md]");
		process.exit(1);
	}
	const run = parseRun(JSON.parse(readFileSync(runFile, "utf8")));
	const markdown = renderLeaderboardMarkdown(buildLeaderboard(run));

	if (outFile) {
		mkdirSync(dirname(outFile), { recursive: true });
		writeFileSync(outFile, markdown);
		console.error(`Wrote leaderboard → ${outFile}`);
	} else {
		process.stdout.write(markdown);
	}
}
