#!/usr/bin/env bun
// `figures` — render a published Run document into the figure set that LEADERBOARD.md embeds: one
// SVG per dimension, on that dimension's headline metric, plus a manifest tying them to the run.
//
// Deliberately a SEPARATE bin from `leaderboard`: that bin's bare stdout is a Markdown contract.
// This one writes a directory. `--check` renders into memory and diffs against what is on disk,
// which is the same code path CI runs, so "stale figures" fails the same way locally and in CI.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import type { FigureManifest, Theme } from "@sandbox-benchmarks/figures";
import { dark, light, planReport, renderBoardFigures, toPng } from "@sandbox-benchmarks/figures";
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

const THEMES: Record<string, Theme> = { dark, light };

/** Flags that consume a separate operand — one source of truth for the discovery filter and the
 *  positional scan below, so they cannot enumerate different sets. */
const VALUE_FLAGS = ["--theme"];
/** Bin-private boolean flags, declared so the shared discovery layer's closed set stays closed. */
const BOOLEAN_FLAGS = ["--check", "--png"];

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
	const theme = THEMES[themeName];
	return {
		runFile: positionals[0],
		outDir: positionals[1],
		theme: theme ?? dark,
		check: argv.includes("--check"),
		png: argv.includes("--png"),
		error: theme
			? undefined
			: `unknown --theme ${JSON.stringify(themeName)} (expected dark or light)`,
	};
}

async function sha256(bytes: Uint8Array | string): Promise<string> {
	const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
	const digest = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
	const runFile = args.runFile as string;
	const outDir = args.outDir as string;

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

	const fonts = await Promise.all(
		["DejaVuSansMono.ttf", "DejaVuSansMono-Bold.ttf"].map(async (file) => ({
			file,
			sha256: await sha256(
				new Uint8Array(
					await Bun.file(
						join(
							import.meta.dir,
							"..",
							"..",
							"..",
							"..",
							"packages",
							"figures",
							"assets",
							"fonts",
							file,
						),
					).arrayBuffer(),
				),
			),
		})),
	);

	const manifest: FigureManifest = {
		runId: plan.runId,
		sha: plan.sha,
		generatedAt: plan.generatedAt,
		fonts,
		files: await Promise.all(
			figures.map(async (f) => ({
				path: f.plan.fileName,
				dimension: f.plan.dimension,
				metricId: f.plan.metricId,
				bytes: new TextEncoder().encode(f.svg).length,
				sha256: await sha256(f.svg),
			})),
		),
	};
	const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

	if (args.check) {
		// Set equality first: a per-file diff proves every file that SHOULD exist is right, and says
		// nothing about an orphan left behind when a dimension stopped being emitted.
		const expected = new Set([...figures.map((f) => f.plan.fileName), "manifest.json"]);
		let onDisk: string[] = [];
		try {
			onDisk = readdirSync(outDir).filter((f) => f.endsWith(".svg") || f === "manifest.json");
		} catch {
			fail(`figures --check: ${outDir} does not exist. Regenerate: figures ${runFile} ${outDir}`, {
				properties: { title: "figures stale" },
				exitCode: 1,
			});
		}
		const stale: string[] = [];
		for (const orphan of onDisk.filter((f) => !expected.has(f))) {
			stale.push(`${orphan}: on disk but not in the plan (orphaned figure)`);
		}
		for (const f of figures) {
			const path = join(outDir, f.plan.fileName);
			const actual = (() => {
				try {
					return readFileSync(path, "utf8");
				} catch {
					return null;
				}
			})();
			if (actual === null) stale.push(`${f.plan.fileName}: missing`);
			else if (actual !== f.svg)
				stale.push(`${f.plan.fileName}: differs from the current renderer`);
		}
		const committedManifest = (() => {
			try {
				return readFileSync(join(outDir, "manifest.json"), "utf8");
			} catch {
				return null;
			}
		})();
		if (committedManifest !== manifestJson) stale.push("manifest.json: differs");

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
	for (const f of figures) {
		writeFileSync(join(outDir, f.plan.fileName), f.svg);
		if (args.png) {
			writeFileSync(
				join(outDir, f.plan.fileName.replace(/\.svg$/, ".png")),
				await toPng(f.svg, { width: f.view.width * 2 }),
			);
		}
	}
	writeFileSync(join(outDir, "manifest.json"), manifestJson);
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
