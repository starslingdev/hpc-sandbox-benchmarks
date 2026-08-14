#!/usr/bin/env bun
/**
 * Pre-install Phoronix Test Suite profiles for selected benchmark suites so suite runs spend wall
 * time on measurement, not download/compile.
 *
 * Suite selection (arktype-validated presets or concrete names):
 *
 *   bun scripts/warm-pts.ts                         # default: synthetic
 *   bun scripts/warm-pts.ts --suite synthetic
 *   bun scripts/warm-pts.ts --suite all
 *   bun scripts/warm-pts.ts --suite realworld
 *   bun scripts/warm-pts.ts --suite network
 *   bun scripts/warm-pts.ts -s disk -s memory
 *   bun scripts/warm-pts.ts network                 # positional suite/preset also works
 *   bun scripts/warm-pts.ts --dry-plan --suite all
 *   bun scripts/warm-pts.ts --list-suites
 *
 * Targets / local+vendored staging / download seeds / STREAM array size are **planned** from the
 * suite registry + leaf mining (`apps/cli/src/lib/pts-warm.ts`). Staging calls `lib/bench.sh`
 * helpers. Idempotent. Needs sudo for the first-time PTS apt path.
 *
 * Intentionally NOT part of the Cursor Cloud startup update script — a cold warm can take many
 * minutes (git ~450 MB, fio/iperf/stream/pgbench/realworld compiles).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SUITES } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

import { formatWarmSuiteCatalog, planPtsWarm } from "../apps/cli/src/lib/pts-warm.ts";
import {
	batchInstall,
	ensurePts,
	installLocalPtsProfile,
	installVendoredPtsProfile,
	listInstalledTests,
	seedPtsDownloadCache,
	spawnCmd,
} from "./lib/warm-pts/bench.ts";
import { log } from "./lib/warm-pts/log.ts";
import { streamCflagsOverride } from "./lib/warm-pts/stream-flags.ts";

const REPO_ROOT = `${import.meta.dir}/..`;

/** CLI flags — arktype is the SoT at the argv edge. */
const warmCliSchema = type({
	/** Preset and/or suite-name tokens; empty → planner defaults to `synthetic`. */
	suites: "string[]",
	dryPlan: "boolean",
	listSuites: "boolean",
}).onUndeclaredKey("reject");
type WarmCli = typeof warmCliSchema.infer;

function printHelp(): void {
	console.log(`Usage: bun scripts/warm-pts.ts [options] [suite|preset ...]

Select which PTS-backed suites to warm (default: synthetic).

Options:
  --suite, -s <token>   Preset (all|synthetic|realworld) or suite name; repeatable
  --dry-plan            Print the inferred warm plan as JSON and exit
  --list-suites         Print presets + registered suites and exit
  --help, -h            Show this help

Env:
  SUDO=sudo             Required for first-time PTS apt install
  WARM_DEBUG=1          Verbose spawn logging
  WARM_LOG_LEVEL=debug|info|warn|error

Examples:
  bun scripts/warm-pts.ts --suite synthetic
  bun scripts/warm-pts.ts --suite all
  bun scripts/warm-pts.ts --suite network
  bun scripts/warm-pts.ts -s disk -s memory --dry-plan
`);
}

function parseCli(argv: string[]): WarmCli {
	const raw: { suites: string[]; dryPlan: boolean; listSuites: boolean } = {
		suites: [],
		dryPlan: false,
		listSuites: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] ?? "";
		if (arg === "--dry-plan") {
			raw.dryPlan = true;
			continue;
		}
		if (arg === "--list-suites") {
			raw.listSuites = true;
			continue;
		}
		if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		}
		if (arg === "--suite" || arg === "-s") {
			const value = argv[++i];
			if (!value || value.startsWith("-")) {
				throw new Error(`${arg} requires a preset or suite name`);
			}
			raw.suites.push(value);
			continue;
		}
		if (arg.startsWith("--suite=")) {
			const value = arg.slice("--suite=".length);
			if (!value) throw new Error("--suite= requires a preset or suite name");
			raw.suites.push(value);
			continue;
		}
		if (arg.startsWith("-")) {
			throw new Error(`unknown argument: ${arg} (try --help)`);
		}
		// Positional preset/suite token.
		raw.suites.push(arg);
	}
	const parsed = warmCliSchema(raw);
	if (parsed instanceof type.errors) {
		throw new Error(`invalid CLI: ${parsed.summary}`);
	}
	return parsed;
}

function have(bin: string): boolean {
	return Bun.which(bin) !== null;
}

function stampPath(selection: readonly string[]): string {
	const key = selection.join("+").replaceAll(/[^a-z0-9._+-]+/gi, "_") || "synthetic";
	return join(homedir(), ".cache/sandbox-benchmarks", `pts-warm-${key}.stamp`);
}

/**
 * Discard an incomplete/failed install tree before retrying batch-install. INSTALL_FAILED tombstones
 * confuse PTS retries; mirror the leaf path of removing the install root entry.
 */
async function discardInstallTree(root: string, target: string): Promise<void> {
	const slash = target.indexOf("/");
	if (slash <= 0) return;
	const ns = target.slice(0, slash);
	const name = target.slice(slash + 1);
	if (!/^[a-z0-9][a-z0-9._-]*$/i.test(ns) || !/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
		throw new Error(`refusing to discard unsafe install target: ${target}`);
	}
	const script = [
		`cd ${JSON.stringify(root)}`,
		`export REPO_ROOT=${JSON.stringify(root)}`,
		"source lib/bench.sh",
		"pts_init",
		`rm -rf "$(pts_install_root)/${ns}/${name}"`,
	].join(" && ");
	await spawnCmd(["bash", "-c", script], { cwd: root });
}

async function main(): Promise<void> {
	const cli = parseCli(process.argv.slice(2));
	if (cli.listSuites) {
		console.log(formatWarmSuiteCatalog());
		return;
	}

	const plan = await planPtsWarm(REPO_ROOT, { suites: cli.suites });

	if (cli.dryPlan) {
		console.log(JSON.stringify(plan, null, 2));
		return;
	}

	if (plan.targets.length === 0) {
		throw new Error(
			`warm plan for selection [${plan.selection.join(", ")}] has no PTS targets — check suite leaves`,
		);
	}

	log.info("========================================");
	log.info("  Warm PTS profiles (host VM)");
	log.info("========================================");
	log.info(
		`selection=${plan.selection.join(",")} suites=${plan.suites.join(",")} ` +
			`targets=${plan.targets.length} local=${plan.localInstalls.length} ` +
			`vendored=${plan.vendoredProfiles.length} seeds=${plan.seeds.length}` +
			(plan.streamArraySize !== undefined ? ` streamArraySize=${plan.streamArraySize}` : ""),
	);
	log.debug(JSON.stringify(plan));

	await ensurePts(REPO_ROOT);

	// Tools ensure_pts is supposed to install; fail loud if the apt path was skipped.
	const requiredBins = ["stress-ng", "nc", "jq", "php"] as const;
	const missing = requiredBins.filter((b) => !have(b));
	if (missing.length > 0) {
		throw new Error(
			`missing required tools: ${missing.join(" ")} — ensure_pts should have installed these; re-run with SUDO=sudo`,
		);
	}

	for (const seed of plan.seeds) {
		log.info(`seed download-cache: ${seed.filename}`);
		await seedPtsDownloadCache(REPO_ROOT, seed.filename, seed.sha256, seed.urls);
	}

	for (const install of plan.localInstalls) {
		if (install.overlays.length > 0) {
			log.info(`local profile ${install.name} overlays=${install.overlays.join(",")}`);
		}
		await installLocalPtsProfile(REPO_ROOT, install.name, install.overlays);
	}

	let installed = await listInstalledTests(REPO_ROOT);
	for (const name of plan.vendoredProfiles) {
		const id = `pts/${name}`;
		if (installed.has(id)) {
			log.info(`already installed: ${id} (skip vendored restage)`);
		} else {
			await installVendoredPtsProfile(REPO_ROOT, name);
		}
	}

	const env: Record<string, string> = {};
	if (plan.streamArraySize !== undefined) {
		env.CFLAGS_OVERRIDE = streamCflagsOverride(plan.streamArraySize);
		log.info(`CFLAGS_OVERRIDE=${env.CFLAGS_OVERRIDE}`);
	}

	installed = await listInstalledTests(REPO_ROOT);
	const toInstall: string[] = [];
	for (const t of plan.targets) {
		if (installed.has(t)) {
			log.info(`already installed: ${t}`);
			continue;
		}
		await discardInstallTree(REPO_ROOT, t);
		toInstall.push(t);
	}

	if (toInstall.length === 0) {
		log.info("All planned PTS profiles already installed.");
	} else {
		await batchInstall(REPO_ROOT, toInstall, env);
	}

	installed = await listInstalledTests(REPO_ROOT);
	const failed: string[] = [];
	for (const t of plan.targets) {
		if (installed.has(t)) {
			log.info(`OK  ${t}`);
		} else {
			log.error(`MISSING  ${t}`);
			failed.push(t);
		}
	}
	if (failed.length > 0) {
		throw new Error(`warm incomplete — missing: ${failed.join(" ")}`);
	}

	const stamp = stampPath(plan.selection);
	mkdirSync(dirname(stamp), { recursive: true });
	writeFileSync(
		stamp,
		`${new Date().toISOString()}\nselection=${plan.selection.join(",")}\nsuites=${plan.suites.join(",")}\ntargets=${plan.targets.join(" ")}\n`,
	);
	log.info(`stamp: ${stamp}`);

	log.info("");
	log.info("Warm complete. Suite entrypoints:");
	for (const suite of plan.suites) {
		const entry = SUITES[suite as keyof typeof SUITES];
		if (!entry) continue;
		for (const command of entry.commands) {
			log.info(`  ${command}`);
		}
	}
	log.info("");
	await spawnCmd(["phoronix-test-suite", "list-installed-tests"], {
		cwd: REPO_ROOT,
		inherit: true,
	});
}

if (import.meta.main) {
	try {
		await main();
	} catch (err) {
		log.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	}
}
