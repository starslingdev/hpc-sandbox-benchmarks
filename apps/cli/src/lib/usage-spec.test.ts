import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { handleDiscovery } from "./discovery.ts";
import {
	ALL_SUITES_TOKEN,
	BENCH_LOCAL_BOOLEAN_FLAGS,
	BENCH_LOCAL_FLAGS,
	BENCH_LOCAL_VALUE_FLAGS,
	benchLocalFlagHelp,
	benchLocalMiseHeaders,
} from "./usage-spec.ts";

/** The repo root, from this file's own location (apps/cli/src/lib → four levels up). */
const ROOT = join(import.meta.dir, "..", "..", "..", "..");

describe("bench-local discovery vocabulary", () => {
	const vocabulary = {
		valueFlags: BENCH_LOCAL_VALUE_FLAGS,
		booleanFlags: BENCH_LOCAL_BOOLEAN_FLAGS,
	};

	it("splits the table by arity", () => {
		expect(BENCH_LOCAL_VALUE_FLAGS).toContain("--suites");
		expect(BENCH_LOCAL_BOOLEAN_FLAGS).toContain("--promote");
		expect(BENCH_LOCAL_BOOLEAN_FLAGS).toContain("--keep-going");
	});

	// Every flag in the table must be recognised: a boolean flag left undeclared reads as "Unknown
	// flag" and the bin refuses a perfectly valid invocation.
	it("recognises every flag the bin documents", () => {
		for (const { flag, value } of BENCH_LOCAL_FLAGS) {
			const argv = value ? [flag, "x"] : [flag];
			expect(handleDiscovery(argv, "help", vocabulary)?.ok, `${flag} was rejected`).not.toBe(false);
		}
	});

	it("still rejects a flag outside the vocabulary", () => {
		expect(handleDiscovery(["--bogus"], "help", vocabulary)?.ok).toBe(false);
	});
});

describe("benchLocalFlagHelp", () => {
	it("documents every flag, with its default", () => {
		const help = benchLocalFlagHelp();
		for (const { flag, default: value } of BENCH_LOCAL_FLAGS) {
			expect(help).toContain(flag);
			if (value !== undefined) expect(help).toContain(`(default: ${value})`);
		}
	});
});

describe("the mise task's #USAGE block", () => {
	const taskFile = join(ROOT, ".mise", "tasks", "bench-local");
	const source = readFileSync(taskFile, "utf8");

	/**
	 * The drift gate. `#USAGE mount` would have made this unnecessary by letting the task read the spec
	 * from the bin at run time, but mise 2026.8.5 drops every flag node from a mounted spec — so the
	 * headers are inline, and inline means a second copy that can go stale. A stale copy still PARSES;
	 * it just stops offering the new flag, which is exactly the kind of silent drift this repo gates
	 * elsewhere (the PTS catalog, the toolchain pins, LEADERBOARD.md).
	 */
	it("matches the generated block exactly", () => {
		const committed = source
			.split("\n")
			.filter((line) => line.startsWith("#USAGE "))
			.join("\n");
		expect(committed).toBe(benchLocalMiseHeaders());
	});

	it("declares every flag the bin accepts", () => {
		for (const { flag } of BENCH_LOCAL_FLAGS) {
			expect(source).toContain(`#USAGE flag "${flag}`);
		}
	});

	// The completion half of the drift gate: the choices come from SUITE_NAMES, so registering a tenth
	// suite changes this block and fails the gate above — it cannot leave completion offering nine.
	it("offers exactly `all` plus every registered suite as --suites choices", () => {
		const choices = /#USAGE {3}choices (.*)/.exec(source)?.[1] ?? "";
		expect([...choices.matchAll(/"([^"]+)"/g)].map((match) => match[1])).toEqual([
			ALL_SUITES_TOKEN,
			...SUITE_NAMES,
		]);
	});

	// The task must forward raw argv so the bin's own parser (and its arktype request schema) stays
	// the single edge; reconstructing a command line from mise's usage_* variables would be a second.
	it("forwards raw arguments to the bin rather than mise's usage_* variables", () => {
		expect(source).toContain('"$@"');
		expect(source).not.toContain("usage_suites");
	});

	it("points at the bin that actually exists", () => {
		expect(source).toContain("apps/cli/src/bin/bench-local.ts");
		expect(() =>
			readFileSync(join(ROOT, "apps", "cli", "src", "bin", "bench-local.ts")),
		).not.toThrow();
	});
});
