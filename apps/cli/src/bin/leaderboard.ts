#!/usr/bin/env bun
// `leaderboard` — render a published Run document into the Markdown comparison surface (one ranked
// table per dimension on its headline metric). Writes to <outFile> when given, else prints to stdout.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildLeaderboard, renderLeaderboardMarkdown } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { handleDiscovery } from "../lib/discovery.ts";

/** Agent-facing usage. The Run document names the providers/suites it covers, so the registry
 *  listings are offered only as cross-CLI-consistent discovery, not the primary input. */
export const HELP = `leaderboard — render a published Run document into the Markdown comparison surface.

usage: leaderboard <run.json> [outFile.md]
       leaderboard [--help] [--list-providers] [--list-suites] [--json]

  <run.json>         Path to a normalized Run document (required).
  [outFile.md]       Write the Markdown here; omit to print to stdout.
  --list-providers   List the registered providers.
  --list-suites      List the registered suites.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

examples:
  leaderboard data/runs/local-1.json                 # print the table to stdout
  leaderboard data/runs/local-1.json LEADERBOARD.md  # write the comparison surface to a file

Next: produce a Run with  bench-suite <provider> <suite> <runId>`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		console.log(discovery);
		process.exit(0);
	}

	const [runFile, outFile] = argv;
	if (!runFile) {
		console.error("usage: leaderboard <run.json> [outFile.md] (see --help)");
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
