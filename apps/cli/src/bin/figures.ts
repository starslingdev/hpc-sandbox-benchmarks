#!/usr/bin/env bun
// `figures` — render a published Run document into the figure set that LEADERBOARD.md embeds: one
// SVG per dimension, on that dimension's headline metric, plus a manifest tying them to the run.
//
// Deliberately a SEPARATE bin from `leaderboard`: that bin's bare stdout is a Markdown contract.
// This one writes a directory. `--check` renders into memory and diffs against what is on disk,
// which is the same code path CI runs, so "stale figures" fails the same way locally and in CI.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import type { FigureManifest, Theme } from "@sandbox-benchmarks/figures";
import {
	diffFigureDir,
	fontDigests,
	MANIFEST_FILE,
	planReport,
	renderBoardFigures,
	sha256Hex,
	themes,
	toPng,
} from "@sandbox-benchmarks/figures";
import { buildLeaderboard } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { fail, inActions, logInfo, withGroup, writeJobSummary } from "../lib/actions-log.ts";
import { handleDiscovery } from "../lib/discovery.ts";

export const HELP = `figures — render a published Run document into the leaderboard figure set.

usage: figures <run.json> <outDir> [--theme dark|light] [--check] [--png]
       figures [--help] [--list-providers] [--list-suites] [--json]

  <run.json>         Path to a normalized Run document (required).
  <outDir>           Directory to write the figures + manifest.json into (required).
  --theme <name>     dark (default) or light.
  --check            Render and compare against <outDir> without writing. Exits 1 when stale.
  --png              Also write a PNG beside each SVG (not committed; for previews and summaries).
  --list-providers   List the registered providers.
  --list-suites      List the registered suites.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

examples:
  figures data/dataset/runs/30019301067.json docs/leaderboard
  figures data/dataset/runs/30019301067.json docs/leaderboard --check
  figures data/dataset/runs/30019301067.json /tmp/preview --png    # look at one without touching the repo

Next: embed them with  leaderboard <run.json> LEADERBOARD.md`;

/** Flags that consume a separate operand — one source of truth for the discovery filter and the
 *  positional scan below, so they cannot enumerate different sets. Exported so the tests assert
 *  against the real vocabulary rather than a retyped copy (a copy had already dropped `--png`). */
export const VALUE_FLAGS = ["--theme"];
/** Bin-private boolean flags, declared so the shared discovery layer's closed set stays closed. */
export const BOOLEAN_FLAGS = ["--check", "--png"];

export interface FiguresArgs {
	runFile: string | undefined;
	outDir: string | undefined;
	theme: Theme;
	check: boolean;
	png: boolean;
	error?: string;
}

/** Exported for tests: argv is `string[]` at the boundary, so narrow it once, here. */
export function parseFiguresArgs(argv: readonly string[]): FiguresArgs {
	const positionals: string[] = [];
	let themeName = "dark";
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		if (VALUE_FLAGS.includes(arg)) {
			// Consume the operand too, or `--theme light` leaves `light` to be read as the outDir.
			themeName = argv[i + 1] ?? "";
			i++;
			continue;
		}
		if (arg.startsWith("--theme=")) {
			themeName = arg.slice("--theme=".length);
			continue;
		}
		if (arg.startsWith("-")) continue;
		positionals.push(arg);
	}
	const theme: Theme | undefined = themes[themeName as keyof typeof themes];
	return {
		runFile: positionals[0],
		outDir: positionals[1],
		theme: theme ?? themes.dark,
		check: argv.includes("--check"),
		png: argv.includes("--png"),
		// Enumerate from the registry, so a theme added to the package is immediately selectable here.
		error: theme
			? undefined
			: `unknown --theme ${JSON.stringify(themeName)} (expected ${Object.keys(themes).join(" or ")})`,
	};
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP, VALUE_FLAGS, BOOLEAN_FLAGS);
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(`${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, { properties: { title: "figures discovery" }, exitCode: 2 });
	}

	const args = parseFiguresArgs(argv);
	if (args.error) {
		fail(args.error, { properties: { title: "figures usage" }, exitCode: 2 });
	}
	if (!args.runFile || !args.outDir) {
		fail("usage: figures <run.json> <outDir> [--theme dark|light] [--check] [--png] (see --help)", {
			properties: { title: "figures usage" },
			exitCode: 2,
		});
	}
	const { runFile, outDir } = args;

	const run = await withGroup(`Load Run ${runFile}`, async () => {
		const parsed = parseRun(JSON.parse(readFileSync(runFile, "utf8")));
		logInfo(`runId=${parsed.runId} providers=${parsed.providers.length} sha=${parsed.sha}`);
		return parsed;
	});

	const board = buildLeaderboard(run);
	const { plan, figures } = await withGroup("Render figures", async () => {
		const rendered = await renderBoardFigures(board, { theme: args.theme });
		logInfo(`figures=${rendered.figures.length} theme=${args.theme.name}`);
		return rendered;
	});

	// From the package that owns the faces — never a second copy of the list, or the manifest would
	// keep describing the old set after a face changed and the gate would pass while being wrong.
	const fonts = await fontDigests();

	const manifest: FigureManifest = {
		runId: plan.runId,
		sha: plan.sha,
		generatedAt: plan.generatedAt,
		fonts,
		files: await Promise.all(
			figures.map(async (f) => ({ path: f.plan.fileName, sha256: await sha256Hex(f.svg) })),
		),
	};
	const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

	// One expected-content map drives both the write path and the check path, so `--check` can never
	// disagree with what a subsequent write would produce.
	const expected = new Map<string, string>([
		...figures.map((f) => [f.plan.fileName, f.svg] as const),
		[MANIFEST_FILE, manifestJson],
	]);

	if (args.check) {
		// Same comparison the CI gate runs — see @sandbox-benchmarks/figures' figure-dir module.
		let stale: string[];
		try {
			stale = diffFigureDir(outDir, expected);
		} catch {
			fail(`figures --check: ${outDir} does not exist. Regenerate: figures ${runFile} ${outDir}`, {
				properties: { title: "figures stale" },
				exitCode: 1,
			});
		}
		if (stale.length > 0) {
			fail(
				`figures are stale:\n  ${stale.join("\n  ")}\nRegenerate: bun apps/cli/src/bin/figures.ts ${runFile} ${outDir}`,
				{ properties: { title: "figures stale" }, exitCode: 1 },
			);
		}
		logInfo(`figures in ${outDir} are up to date (${figures.length} figures)`);
		process.exit(0);
	}

	mkdirSync(outDir, { recursive: true });
	for (const [name, content] of expected) writeFileSync(join(outDir, name), content);
	if (args.png) {
		// Previews only — PNG is never committed (CI and the publish job run on different runners, so
		// its bytes cannot be gated honestly).
		for (const f of figures) {
			writeFileSync(
				join(outDir, f.plan.fileName.replace(/\.svg$/, ".png")),
				await toPng(f.svg, { width: f.view.width * 2 }),
			);
		}
	}
	logInfo(`Wrote ${figures.length} figures → ${outDir}`);

	if (inActions()) {
		core.debug(JSON.stringify(planReport(board)));
	}
	await writeJobSummary({
		heading: `Figures ${run.runId}`,
		fields: [
			["Status", "success", "plain"],
			["Run id", run.runId, "code"],
			["Source", runFile, "code"],
			["Output", outDir, "code"],
			["Figures", String(figures.length), "plain"],
			["Theme", args.theme.name, "plain"],
		],
		annotation: {
			failed: false,
			title: `Figures ${run.runId}`,
			message: `Wrote ${figures.length} figure(s) to ${outDir}`,
		},
	});
}
