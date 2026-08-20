// Plan which PTS profiles a host warm must stage/install — derived from the suite registry + leaf
// mining (no hard-coded profile lists). Callers select suites via presets (`all` / `synthetic` /
// `realworld`) or concrete suite names. Arktype validates selection tokens and the plan at the edge.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SuiteName } from "@sandbox-benchmarks/schema";
import { SUITE_NAMES, SUITES, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { DownloadSeed } from "./suite-tasks.ts";
import {
	describeSuiteTasks,
	downloadSeedSchema,
	realworldOverlaysFromBenchSh,
	warmHintsFromScript,
} from "./suite-tasks.ts";

/** Presets expand to one or more registered PTS-backed suites. */
export const warmSuitePresetSchema = type("'all' | 'synthetic' | 'realworld'");
export type WarmSuitePreset = typeof warmSuitePresetSchema.infer;

/** One CLI/selection token: a preset or a concrete suite name. */
export const warmSuiteTokenSchema = warmSuitePresetSchema.or(suiteNameSchema);
export type WarmSuiteToken = typeof warmSuiteTokenSchema.infer;

/** Kind of a PTS-backed suite for preset expansion. Non-PTS suites return null. */
export type SuiteWarmKind = "synthetic" | "realworld";

export function suiteWarmKind(name: string): SuiteWarmKind | null {
	if (!(name in SUITES)) return null;
	const suite = SUITES[name as SuiteName];
	if (!suite.setupPts) return null;
	return name.startsWith("realworld") ? "realworld" : "synthetic";
}

/** True when the suite is PTS-backed and not a realworld cold-install suite. */
export function isSyntheticSuite(name: string): boolean {
	return suiteWarmKind(name) === "synthetic";
}

/** @deprecated Use {@link isSyntheticSuite} — kept for older call sites. */
export const isSyntheticHostSuite = isSyntheticSuite;

/**
 * Expand selection tokens into a stable, de-duplicated suite list (registry order).
 * Empty input defaults to `synthetic`. Unknown tokens fail at the arktype edge.
 */
export function resolveWarmSuites(tokens: readonly string[] = []): SuiteName[] {
	const effective = tokens.length > 0 ? tokens : (["synthetic"] satisfies WarmSuiteToken[]);
	const selected = new Set<SuiteName>();

	for (const raw of effective) {
		const token = warmSuiteTokenSchema(raw);
		if (token instanceof type.errors) {
			throw new Error(
				`invalid warm suite token ${JSON.stringify(raw)}: ${token.summary} ` +
					`(presets: all|synthetic|realworld; suites: ${SUITE_NAMES.join(", ")})`,
			);
		}
		if (token === "all") {
			for (const name of SUITE_NAMES) {
				if (suiteWarmKind(name)) selected.add(name);
			}
			continue;
		}
		if (token === "synthetic") {
			for (const name of SUITE_NAMES) {
				if (suiteWarmKind(name) === "synthetic") selected.add(name);
			}
			continue;
		}
		if (token === "realworld") {
			for (const name of SUITE_NAMES) {
				if (suiteWarmKind(name) === "realworld") selected.add(name);
			}
			continue;
		}
		// Concrete suite name — must be PTS-backed (already filtered by suiteWarmKind via setupPts).
		if (!suiteWarmKind(token)) {
			throw new Error(`suite ${JSON.stringify(token)} is not PTS-backed (setupPts)`);
		}
		selected.add(token);
	}

	const suites = SUITE_NAMES.filter((name) => selected.has(name));
	if (suites.length === 0) {
		throw new Error("warm suite selection resolved to an empty set");
	}
	return suites;
}

export const localProfileInstallSchema = type({
	name: "string >= 1",
	/** Repo-relative overlay files copied into the staged profile (realworld runner/install). */
	overlays: "string[]",
}).onUndeclaredKey("reject");
export type LocalProfileInstall = typeof localProfileInstallSchema.infer;

export const ptsWarmPlanSchema = type({
	/** Original selection tokens (presets and/or suite names) after defaulting. */
	selection: "string[] >= 1",
	suites: "string[] >= 1",
	targets: "string[]",
	localInstalls: localProfileInstallSchema.array(),
	vendoredProfiles: "string[]",
	seeds: downloadSeedSchema.array(),
	"streamArraySize?": "number.integer > 0",
}).onUndeclaredKey("reject");
export type PtsWarmPlan = typeof ptsWarmPlanSchema.infer;

/** @deprecated Use {@link ptsWarmPlanSchema}. */
export const syntheticPtsWarmPlanSchema = ptsWarmPlanSchema;
/** @deprecated Use {@link PtsWarmPlan}. */
export type SyntheticPtsWarmPlan = PtsWarmPlan;

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

export type PlanPtsWarmOptions = {
	/** Preset and/or suite-name tokens; empty → `synthetic`. */
	suites?: readonly string[];
};

/**
 * Build a PTS warm plan for the selected suites from {@link SUITES} + leaf mining.
 * Seeds prefer leaf `seed_pts_download_cache` calls; `host-seed.json` fills gaps (e.g. fio).
 */
export async function planPtsWarm(
	root: string = process.cwd(),
	options: PlanPtsWarmOptions = {},
): Promise<PtsWarmPlan> {
	const selection =
		options.suites && options.suites.length > 0 ? [...options.suites] : (["synthetic"] as string[]);
	const suites = resolveWarmSuites(selection);

	const targets = new Set<string>();
	const localNames = new Set<string>();
	const vendoredProfiles = new Set<string>();
	const seedsByFile = new Map<string, DownloadSeed>();
	let streamArraySize: number | undefined;

	let realworldOverlays: string[] = [];
	try {
		const benchSh = readFileSync(resolve(root, "lib/bench.sh"), "utf8");
		realworldOverlays = realworldOverlaysFromBenchSh(benchSh);
	} catch {
		// Overlays are optional enrichment; realworld warm without them will fail batch-install loudly.
	}

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
			for (const name of hints.localProfiles) localNames.add(name);
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
			localNames.add(target.slice("local/".length));
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

	const localInstalls: LocalProfileInstall[] = [...localNames].sort().map((name) => ({
		name,
		overlays: name.startsWith("realworld-") ? [...realworldOverlays] : [],
	}));

	const raw = {
		selection,
		suites: [...suites],
		targets: [...targets].sort(),
		localInstalls,
		vendoredProfiles: [...vendoredProfiles].sort(),
		seeds: [...seedsByFile.values()].sort((a, b) => a.filename.localeCompare(b.filename)),
		...(streamArraySize !== undefined ? { streamArraySize } : {}),
	};
	const out = ptsWarmPlanSchema(raw);
	if (out instanceof type.errors) {
		throw new Error(`invalid PTS warm plan: ${out.summary}`);
	}
	return out;
}

/** @deprecated Use {@link planPtsWarm} with `{ suites: ["synthetic"] }` (the default). */
export async function planSyntheticPtsWarm(root: string = process.cwd()): Promise<PtsWarmPlan> {
	return planPtsWarm(root, { suites: ["synthetic"] });
}

/** Human-readable catalog for `--list-suites`. */
export function formatWarmSuiteCatalog(): string {
	const lines = [
		"Presets:",
		"  all         every PTS-backed suite (synthetic + realworld)",
		"  synthetic   non-realworld PTS suites (includes pgbench)",
		"  realworld   realworld-* PTS suites",
		"",
		"Suites:",
	];
	for (const name of SUITE_NAMES) {
		const kind = suiteWarmKind(name);
		const mark = kind ?? "skip (no setupPts)";
		const commands = SUITES[name].commands.join("; ");
		lines.push(`  ${name.padEnd(24)} ${mark.padEnd(10)} ${commands}`);
	}
	return lines.join("\n");
}
