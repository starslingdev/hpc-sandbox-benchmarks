// How `check:new-provider` judges the scaffolded tree's `bun run test`: an error outside any test is
// never excused, and each failing test is run again alone in both trees before it is attributed.

import { describe, expect, test } from "bun:test";
import { judgeTestRun } from "./new-provider-e2e.ts";

/** One `bun run test` line per entry, as `bun --filter` prefixes them. */
const output = (...lines: string[]) => lines.join("\n");
const FAILING =
	"@sandbox-benchmarks/driver test: (fail) launchDetached > surfaces a failure [12.00ms]";
const TIMED_OUT = "@sandbox-benchmarks/schema test: (fail) new-provider > regenerates [5001.00ms]";
const BROKEN = "@sandbox-benchmarks/acme test: (fail) a session runs [3.00ms]";

describe("judgeTestRun", () => {
	test("reports an error outside any test even when every failing test is the environment's", () => {
		const verdict = judgeTestRun(
			output(
				FAILING,
				"@sandbox-benchmarks/driver test:  1 fail",
				"@sandbox-benchmarks/harness test: # Unhandled error between tests",
				"@sandbox-benchmarks/harness test:  1 error",
			),
			() => false,
		);
		expect(verdict.errors).toEqual(["@sandbox-benchmarks/harness"]);
		expect(verdict.environment).toEqual([
			"@sandbox-benchmarks/driver > launchDetached > surfaces a failure",
		]);
		expect(verdict.own).toEqual([]);
	});

	test("runs each failing test alone in both trees before attributing it", () => {
		const runs: string[] = [];
		const verdict = judgeTestRun(output(FAILING, TIMED_OUT, BROKEN), (tree, failure) => {
			runs.push(`${tree}: ${failure}`);
			// The schema test timed out only under the whole run's load; the scaffold broke acme's;
			// the driver's fails alone everywhere.
			if (failure.includes("regenerates")) return tree === "scaffolded";
			return failure.includes("acme") && tree === "unmodified";
		});
		expect(verdict).toEqual({
			errors: [],
			own: ["@sandbox-benchmarks/acme > a session runs"],
			underLoad: ["@sandbox-benchmarks/schema > new-provider > regenerates"],
			environment: ["@sandbox-benchmarks/driver > launchDetached > surfaces a failure"],
		});
		// A test that passes alone in the scaffolded tree is never checked against the other tree.
		expect(runs).not.toContain(
			"unmodified: @sandbox-benchmarks/schema > new-provider > regenerates",
		);
	});
});
