// Plan which PTS profiles a host-VM synthetic warm must stage/install — derived from the suite
// registry + leaf task mining (no hard-coded profile lists). Arktype validates the plan at the edge.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SuiteName } from "@sandbox-benchmarks/schema";
import { SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { DownloadSeed } from "./suite-tasks.ts";
import { describeSuiteTasks, downloadSeedSchema, warmHintsFromScript } from "./suite-tasks.ts";

/**
 * Suites whose PTS profiles belong on the cloud host snapshot: PTS-backed synthetics, excluding
 * pgbench (heavy DB) and realworld-* (cold install/build IS the metric).
 */
export function isSyntheticHostSuite(name: string): name is SuiteName {
	if (!(name in SUITES)) return false;
	if (name === "pgbench" || name.startsWith("realworld")) return false;
	return Boolean(SUITES[name as SuiteName].setupPts);
}

export const syntheticPtsWarmPlanSchema = type({
	suites: "string[] >= 1",
	targets: "string[] >= 1",
	localProfiles: "string[]",
	vendoredProfiles: "string[]",
	seeds: downloadSeedSchema.array(),
	"streamArraySize?": "number.integer > 0",
}).onUndeclaredKey("reject");
export type SyntheticPtsWarmPlan = typeof syntheticPtsWarmPlanSchema.infer;

/** Load + validate `host-seed.json` beside a vendored/local profile (fio's Ubuntu-mirror seed). */
export function loadHostSeedJson(path: string): DownloadSeed {
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(path, "utf8"));
	} catch (err) {
		throw new Error(
			`invalid host-seed.json at ${path}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
	const parsed = downloadSeedSchema(raw);
	if (parsed instanceof type.errors) {
		throw new Error(`invalid host-seed.json at ${path}: ${parsed.summary}`);
	}
	return parsed;
}

function profileDirForTarget(root: string, target: string): string | undefined {
	if (target.startsWith("local/")) {
		return resolve(root, "packages/schema/src/pts-profiles/local", target.slice("local/".length));
	}
	if (target.startsWith("pts/")) {
		return resolve(root, "packages/schema/src/pts-profiles", target.slice("pts/".length));
	}
	return undefined;
}

function readTaskScript(root: string, relFile: string): string | undefined {
	if (!relFile) return undefined;
	try {
		return readFileSync(resolve(root, relFile), "utf8");
	} catch {
		return undefined;
	}
}

/**
 * Build the host synthetic PTS warm plan from {@link SUITES} + leaf mining.
 * Seeds prefer leaf `seed_pts_download_cache` calls; `host-seed.json` fills gaps (e.g. fio).
 */
export async function planSyntheticPtsWarm(
	root: string = process.cwd(),
): Promise<SyntheticPtsWarmPlan> {
	const suites = SUITE_NAMES.filter(isSyntheticHostSuite);
	if (suites.length === 0) {
		throw new Error("no synthetic host suites found in SUITES");
	}

	const targets = new Set<string>();
	const localProfiles = new Set<string>();
	const vendoredProfiles = new Set<string>();
	const seedsByFile = new Map<string, DownloadSeed>();
	let streamArraySize: number | undefined;

	for (const suite of suites) {
		const plan = await describeSuiteTasks(suite, root);
		for (const task of plan.tasks) {
			for (const profile of task.ptsProfile
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)) {
				targets.add(profile);
			}
			const script = readTaskScript(root, task.file);
			if (!script) continue;
			const hints = warmHintsFromScript(script);
			for (const name of hints.localProfiles) localProfiles.add(name);
			for (const name of hints.vendoredProfiles) vendoredProfiles.add(name);
			for (const seed of hints.seeds) {
				// First leaf wins; later duplicates (iperf localhost + wan) are identical.
				if (!seedsByFile.has(seed.filename)) seedsByFile.set(seed.filename, seed);
			}
			if (hints.streamArraySize !== undefined) {
				streamArraySize = hints.streamArraySize;
			}
		}
	}

	for (const target of targets) {
		if (target.startsWith("local/")) {
			localProfiles.add(target.slice("local/".length));
		}
		const dir = profileDirForTarget(root, target);
		if (!dir) continue;
		const hostSeedPath = join(dir, "host-seed.json");
		if (!existsSync(hostSeedPath)) continue;
		const seed = loadHostSeedJson(hostSeedPath);
		if (!seedsByFile.has(seed.filename)) {
			seedsByFile.set(seed.filename, seed);
		}
	}

	const raw = {
		suites: [...suites],
		targets: [...targets].sort(),
		localProfiles: [...localProfiles].sort(),
		vendoredProfiles: [...vendoredProfiles].sort(),
		seeds: [...seedsByFile.values()].sort((a, b) => a.filename.localeCompare(b.filename)),
		...(streamArraySize !== undefined ? { streamArraySize } : {}),
	};
	const out = syntheticPtsWarmPlanSchema(raw);
	if (out instanceof type.errors) {
		throw new Error(`invalid synthetic PTS warm plan: ${out.summary}`);
	}
	return out;
}
