/**
 * Consistency gate for the realworld PTS profiles (ENG-135/136/137/138): each profile's `Task` Option
 * (test-definition.xml) and its `target.env` sibling are two hand-authored, unrelated-by-construction
 * files that must stay in lockstep -- lib/pts/realworld/realworld-runner.sh looks up `TASK_CMD_<value>` for
 * whichever Option Value PTS invokes it with, so a Value with no matching key would fail at runtime
 * with no compile-time signal. Checked here instead: every Entry's Value has exactly one
 * `TASK_CMD_<value>` key, and vice versa (no orphaned key). Also cross-checks target.env's PIN_SHA
 * against test-definition.xml's <AppVersion>, which the plan pins to the same commit for provenance
 * (MetricResult.appVersion at extraction, ENG-70) -- the two drifting would silently mislabel results.
 */

import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProfile } from "../scripts/catalog/parse.ts";

const LOCAL_PROFILES_DIR = join(import.meta.dir, "pts-profiles/local");

function realworldProfileDirs(): string[] {
	return readdirSync(LOCAL_PROFILES_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name.startsWith("realworld-"))
		.map((entry) => entry.name)
		.sort();
}

/** Minimal `KEY="value"` / `KEY=value` line parser -- just enough to read target.env in tests. */
function parseEnvFile(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
		const key = match?.[1];
		if (!key) continue;
		out[key] = (match?.[2] ?? "").replace(/^"(.*)"$/, "$1");
	}
	return out;
}

describe("realworld profiles: Task Option <-> target.env consistency", () => {
	const dirs = realworldProfileDirs();

	it("finds at least one realworld profile (the gate isn't silently vacuous)", () => {
		expect(dirs.length).toBeGreaterThan(0);
	});

	for (const dir of dirs) {
		describe(dir, () => {
			const base = join(LOCAL_PROFILES_DIR, dir);
			const testXml = readFileSync(join(base, "test-definition.xml"), "utf8");
			const resultsXml = readFileSync(join(base, "results-definition.xml"), "utf8");
			const profile = parseProfile("local", dir, testXml, resultsXml);
			const env = parseEnvFile(readFileSync(join(base, "target.env"), "utf8"));

			it("declares a single Task option with no duplicate Values", () => {
				const taskOptions = profile.settings.filter((option) => option.DisplayName === "Task");
				expect(taskOptions).toHaveLength(1);
				const values = taskOptions[0]?.Menu?.Entry.map((entry) => entry.Value) ?? [];
				expect(values.length).toBeGreaterThan(0);
				expect(new Set(values).size).toBe(values.length);
			});

			it("has a TASK_CMD_<value> key for every Task Entry Value, and no orphaned key", () => {
				const values = new Set(
					profile.settings
						.find((option) => option.DisplayName === "Task")
						// `<Value>` is optional in the schema (iperf's TCP entry); realworld Task entries always
						// carry one, and a missing value maps to "" here so the key-set equality still fails loudly.
						?.Menu?.Entry.map((e) => e.Value ?? "") ?? [],
				);
				const taskCmdKeys = new Set(
					Object.keys(env)
						.filter((key) => key.startsWith("TASK_CMD_"))
						.map((key) => key.slice("TASK_CMD_".length)),
				);
				expect(taskCmdKeys).toEqual(values);
			});

			it("stays data-only: no per-profile install.sh (the shared lib/pts/realworld/ copy is overlaid)", () => {
				expect(existsSync(join(base, "install.sh"))).toBe(false);
			});

			it("anchors every TASK_PREP_<value> to a declared Task Value (no orphaned prep)", () => {
				// TASK_PREP_<value> runs unmeasured before the timed TASK_CMD_<value> (realworld-runner.sh);
				// a prep keyed to a renamed/removed Value would silently stop running.
				const values = new Set(
					profile.settings
						.find((option) => option.DisplayName === "Task")
						// `<Value>` is optional in the schema (iperf's TCP entry); realworld Task entries always
						// carry one, and a missing value maps to "" here so the key-set equality still fails loudly.
						?.Menu?.Entry.map((e) => e.Value ?? "") ?? [],
				);
				const prepKeys = Object.keys(env)
					.filter((key) => key.startsWith("TASK_PREP_"))
					.map((key) => key.slice("TASK_PREP_".length));
				for (const key of prepKeys) {
					expect(values).toContain(key);
				}
			});

			it("declares REPO_URL, PIN_SHA and NODE_VERSION", () => {
				expect(env.REPO_URL).toBeTruthy();
				expect(env.PIN_SHA).toMatch(/^[0-9a-f]{40}$/);
				expect(env.NODE_VERSION).toBeTruthy();
			});

			it("pins the same commit in target.env's PIN_SHA and test-definition.xml's <AppVersion>", () => {
				const appVersion = testXml.match(/<AppVersion>([^<]*)<\/AppVersion>/)?.[1];
				expect(appVersion).toBe(env.PIN_SHA);
			});
		});
	}
});
