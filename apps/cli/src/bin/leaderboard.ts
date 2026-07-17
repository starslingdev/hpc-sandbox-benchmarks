#!/usr/bin/env bun
// `leaderboard` — render a published Run document into the Markdown comparison surface (one ranked
// table per dimension on its headline metric). Writes to <outFile> when given, else prints to stdout.
// Uses @actions/core for step logs, annotations, and a job summary when writing a file in CI.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as core from "@actions/core";
import { buildLeaderboard, renderLeaderboardMarkdown } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { fail, inActions, withGroup, writeJobSummary } from "../lib/actions-log.ts";
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

function logInfo(message: string): void {
	if (inActions()) core.info(message);
	else console.error(message);
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(`${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, {
			properties: { title: "leaderboard discovery" },
			exitCode: 2,
		});
	}

	const [runFile, outFile] = argv;
	if (!runFile) {
		fail("usage: leaderboard <run.json> [outFile.md] (see --help)", {
			properties: { title: "leaderboard usage" },
			exitCode: 2,
		});
	}

	const run = await withGroup(`Load Run ${runFile}`, async () => {
		const parsed = parseRun(JSON.parse(readFileSync(runFile, "utf8")));
		logInfo(`runId=${parsed.runId} providers=${parsed.providers.length} sha=${parsed.sha}`);
		return parsed;
	});

	const board = await withGroup("Build leaderboard", async () => {
		const built = buildLeaderboard(run);
		logInfo(`dimensions=${built.dimensions.length}`);
		if (inActions()) {
			core.debug(
				JSON.stringify(
					built.dimensions.map((d) => ({
						dimension: d.dimension,
						headline: d.metric.id,
						metrics: d.metrics.length,
						rows: d.rows.length,
					})),
				),
			);
		}
		return built;
	});
	const markdown = renderLeaderboardMarkdown(board);

	if (outFile) {
		mkdirSync(dirname(outFile), { recursive: true });
		writeFileSync(outFile, markdown);
		logInfo(`Wrote leaderboard → ${outFile}`);
		await writeJobSummary({
			heading: `Leaderboard ${run.runId}`,
			fields: [
				["Status", "success", "plain"],
				["Run id", run.runId, "code"],
				["Source", runFile, "code"],
				["Output", outFile, "code"],
				["Dimensions", String(board.dimensions.length), "plain"],
				["Providers", String(run.providers.length), "plain"],
			],
			annotation: {
				failed: false,
				title: `Leaderboard ${run.runId}`,
				message: `Wrote ${outFile} (${board.dimensions.length} dimension(s))`,
			},
		});
	} else {
		// stdout is the Markdown contract when no outFile is given — keep it pristine.
		process.stdout.write(markdown);
	}
}
