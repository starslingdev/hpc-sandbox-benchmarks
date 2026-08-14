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
	benchLocalUsageSpec,
	USAGE_SPEC_FLAG,
} from "./usage-spec.ts";

/** The repo root, from this file's own location (apps/cli/src/lib → four levels up). */
const ROOT = join(import.meta.dir, "..", "..", "..", "..");

describe("benchLocalUsageSpec", () => {
	const spec = benchLocalUsageSpec();

	it("names the command mise mounts it for", () => {
		expect(spec).toContain('name "bench-local"');
		expect(spec).toContain('bin "bench-local"');
	});

	// THE drift gate that makes mounting safe. The alternative — declaring the flags inline in the mise
	// task with `#USAGE flag` headers — would be a second copy in bash that still PARSES when stale; it
	// would just quietly stop offering the new suite. Deriving the choices from SUITE_NAMES means
	// registering a tenth suite cannot leave completion offering nine.
	it("offers exactly `all` plus every registered suite as --suites choices", () => {
		const choices = /choices (.*)/.exec(spec)?.[1] ?? "";
		const offered = [...choices.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
		expect(offered).toEqual([ALL_SUITES_TOKEN, ...SUITE_NAMES]);
	});

	it("declares every flag the bin accepts", () => {
		for (const { flag } of BENCH_LOCAL_FLAGS) {
			expect(spec).toContain(`flag "${flag}`);
		}
	});

	it("emits each flag's default so mise reports the same one as --help", () => {
		for (const { flag, default: value } of BENCH_LOCAL_FLAGS) {
			if (value === undefined) continue;
			expect(spec).toContain(`default="${value}"`);
			expect(benchLocalFlagHelp()).toContain(`${flag}`);
		}
	});

	it("escapes quotes so the spec stays parseable KDL", () => {
		// The --suites help text contains a quoted "all"; an unescaped quote would end the string early.
		expect(spec).toContain('\\"all\\"');
		expect(spec.split("\n").filter((line) => line.startsWith("flag ")).length).toBeGreaterThan(0);
	});

	// mise runs the mount command outside the task's own process, including while a shell is asking
	// for completions, so it must be cheap and side-effect-free.
	it("is pure and repeatable", () => {
		expect(benchLocalUsageSpec()).toBe(spec);
	});
});

describe("bench-local discovery vocabulary", () => {
	const vocabulary = {
		valueFlags: BENCH_LOCAL_VALUE_FLAGS,
		booleanFlags: BENCH_LOCAL_BOOLEAN_FLAGS,
		extras: { [USAGE_SPEC_FLAG]: benchLocalUsageSpec },
	};

	it("splits the table by arity, and keeps --usage-spec out of the boolean set", () => {
		expect(BENCH_LOCAL_VALUE_FLAGS).toContain("--suites");
		expect(BENCH_LOCAL_BOOLEAN_FLAGS).toContain("--promote");
		expect(BENCH_LOCAL_BOOLEAN_FLAGS).toContain("--keep-going");
		expect(BENCH_LOCAL_BOOLEAN_FLAGS).not.toContain(USAGE_SPEC_FLAG);
	});

	// Every flag in the table must be recognised: a boolean flag left undeclared reads as "Unknown
	// flag" and the bin refuses a perfectly valid invocation.
	it("recognises every flag the bin documents", () => {
		for (const { flag, value } of BENCH_LOCAL_FLAGS) {
			const argv = value ? [flag, "x"] : [flag];
			const result = handleDiscovery(argv, "help", vocabulary);
			expect(result?.ok, `${flag} was rejected`).not.toBe(false);
		}
	});

	it("dispatches --usage-spec as an action rather than falling through to a run", () => {
		const result = handleDiscovery([USAGE_SPEC_FLAG], "help", vocabulary);
		expect(result?.ok).toBe(true);
		expect(result?.text).toContain('name "bench-local"');
	});

	it("still rejects a flag outside the vocabulary", () => {
		expect(handleDiscovery(["--bogus"], "help", vocabulary)?.ok).toBe(false);
	});

	it("keeps --help winning over the spec action", () => {
		expect(handleDiscovery(["--help", USAGE_SPEC_FLAG], "help", vocabulary)?.text).toBe("help");
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
