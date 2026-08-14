#!/usr/bin/env bun
/**
 * Pre-install Phoronix Test Suite profiles used by the synthetic host suites so
 * `mise run benchmark:{cpu:node,disk:all,network:suite,memory:all,system:all}` spend wall time on
 * measurement, not download/compile.
 *
 * Targets / local+vendored staging / download seeds / STREAM array size are **planned** from the
 * suite registry + leaf mining (`apps/cli/src/lib/synthetic-pts-warm.ts`) — not hard-coded here.
 * Staging calls `lib/bench.sh` helpers (single implementation). Idempotent. Needs sudo for the
 * first-time PTS apt path.
 *
 * Intentionally NOT part of the Cursor Cloud startup update script — a cold warm can take many
 * minutes (git ~450 MB, fio/iperf/stream compiles). Run once when building the cloud VM snapshot:
 *
 *   SUDO=sudo bun scripts/warm-synthetic-pts.ts
 *   # or: bun run warm:synthetic-pts
 *   # debug plan only: bun scripts/warm-synthetic-pts.ts --dry-plan
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SUITES } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

import { planSyntheticPtsWarm } from "../apps/cli/src/lib/synthetic-pts-warm.ts";
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
	dryPlan: "boolean",
}).onUndeclaredKey("reject");
type WarmCli = typeof warmCliSchema.infer;

function parseCli(argv: string[]): WarmCli {
	const raw = { dryPlan: false };
	for (const arg of argv) {
		if (arg === "--dry-plan") raw.dryPlan = true;
		else if (arg === "--help" || arg === "-h") {
			console.log(`Usage: bun scripts/warm-synthetic-pts.ts [--dry-plan]
  --dry-plan   Print the inferred warm plan as JSON and exit (no PTS mutations).
Env:
  SUDO=sudo           Required for first-time PTS apt install.
  WARM_DEBUG=1        Verbose spawn logging.
  WARM_LOG_LEVEL=debug|info|warn|error`);
			process.exit(0);
		} else {
			throw new Error(`unknown argument: ${arg} (try --help)`);
		}
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

function stampPath(): string {
	return join(homedir(), ".cache/sandbox-benchmarks/synthetic-pts-warm.stamp");
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
	const plan = await planSyntheticPtsWarm(REPO_ROOT);

	if (cli.dryPlan) {
		console.log(JSON.stringify(plan, null, 2));
		return;
	}

	log.info("========================================");
	log.info("  Warm synthetic PTS profiles (host VM)");
	log.info("========================================");
	log.info(
		`plan: suites=${plan.suites.join(",")} targets=${plan.targets.length} ` +
			`local=${plan.localProfiles.length} vendored=${plan.vendoredProfiles.length} ` +
			`seeds=${plan.seeds.length}` +
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

	for (const name of plan.localProfiles) {
		await installLocalPtsProfile(REPO_ROOT, name);
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
		log.info("All planned synthetic PTS profiles already installed.");
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

	const stamp = stampPath();
	mkdirSync(dirname(stamp), { recursive: true });
	writeFileSync(
		stamp,
		`${new Date().toISOString()}\nsuites=${plan.suites.join(",")}\ntargets=${plan.targets.join(" ")}\n`,
	);
	log.info(`stamp: ${stamp}`);

	log.info("");
	log.info("Warm complete. Synthetic suite entrypoints:");
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
