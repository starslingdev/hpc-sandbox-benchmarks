import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { formatDuration, HELP, parseReplicateFlag, runtimeUserSummary } from "./bench-suite.ts";

/** The ids `runSuite` actually matches on: it compares against the schema-joined adapter names
 *  EXACTLY, so `LEGACY_PROVIDER_ALIASES` ("daytona", "modal") does not rescue a copied example.
 *  Widened to `string[]` because the values under test are parsed out of the help text — the whole
 *  point is to check an arbitrary string against the registry, which the literal union forbids. */
const providerIds: string[] = PROVIDERS.map((p) => p.id);
const suiteNames: string[] = [...SUITE_NAMES];

describe("HELP", () => {
	// The usage block is copy-paste surface: an operator (or an agent) runs an example verbatim. Every
	// id it names must therefore be one the registry actually resolves. It drifted once already — the
	// examples said "daytona"/"modal" while the registry had only `daytona-vm`, `daytona-container`,
	// `modal-gvisor`, and `modal-vm`, so a copied line failed as an unknown provider. Pin the example
	// lines against the registries rather than against a hardcoded list, so adding or renaming an id
	// keeps this honest.
	// Scoped to the `examples:` block: the prose headline and the `usage:` synopsis also begin with the
	// binary name, but they carry placeholders ("[provider]"), not runnable ids.
	const exampleArgs = HELP.slice(HELP.indexOf("\nexamples:"))
		.split("\n")
		.filter((line) => line.trim().startsWith("bench-suite "))
		.map((line) =>
			line
				.trim()
				.replace(/\s+#.*$/, "")
				.split(/\s+/)
				.slice(1),
		)
		.map((args) => args.filter((arg) => !arg.startsWith("-")));

	it("names only registered providers and suites in its examples", () => {
		expect(exampleArgs.length).toBeGreaterThan(0);
		for (const args of exampleArgs) {
			const [provider, suite] = args;
			// A leading positional is always a provider id; the second, when present, is a suite. Later
			// positionals are runIds and flag operands, which are free-form.
			if (provider !== undefined) expect(providerIds).toContain(provider);
			if (suite !== undefined) expect(suiteNames).toContain(suite);
		}
	});

	// The documented default has to be the one the code actually takes, or `--help` teaches a provider
	// that never runs.
	it("documents the default provider the code falls back to", () => {
		expect(HELP).toContain("(default: daytona-vm)");
		expect(providerIds).toContain("daytona-vm");
	});
});

describe("parseReplicateFlag", () => {
	it("returns undefined when the flag is absent", () => {
		expect(parseReplicateFlag(["daytona", "cpu-node", "run-1"])).toBeUndefined();
	});

	it("parses both the space-separated and =-joined spellings", () => {
		expect(parseReplicateFlag(["daytona", "--replicate", "3"])).toBe(3);
		expect(parseReplicateFlag(["daytona", "--replicate=0"])).toBe(0);
	});

	it("takes the last occurrence when the flag repeats", () => {
		expect(parseReplicateFlag(["--replicate", "1", "--replicate=4"])).toBe(4);
	});

	it("rejects a dangling flag, an empty operand, a negative, and a non-integer", () => {
		expect(() => parseReplicateFlag(["--replicate"])).toThrow(/requires an index/);
		// Number("")/Number("  ") coerce to 0, so a blank operand must throw, not silently stamp replicate 0.
		expect(() => parseReplicateFlag(["--replicate", ""])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate="])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "  "])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "-1"])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "1.5"])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "x"])).toThrow(/non-negative integer/);
	});
});

describe("formatDuration", () => {
	// The unit switch matters: a cell's budget is quoted in minutes, so a straggler has to be
	// comparable to it at a glance, while a fast replicate should not read as "0m".
	it("keeps sub-minute elapsed in seconds", () => {
		expect(formatDuration(0)).toBe("0s");
		expect(formatDuration(1_499)).toBe("1s");
		expect(formatDuration(59_400)).toBe("59s");
	});

	it("switches to minutes and zero-pads the seconds", () => {
		expect(formatDuration(60_000)).toBe("1m00s");
		expect(formatDuration(74_000)).toBe("1m14s");
		expect(formatDuration(8 * 60_000 + 37_000)).toBe("8m37s");
	});

	// 59.6s rounds to 60 seconds, which must not render as "0m60s".
	it("carries a rounded-up 60th second into the minute", () => {
		expect(formatDuration(59_600)).toBe("1m00s");
	});
});

describe("runtimeUserSummary", () => {
	it("keeps root quiet and marks any other observed identity as unexpected", () => {
		expect(runtimeUserSummary("root")).toBe("root");
		expect(runtimeUserSummary("user")).toBe("⚠ user (expected root)");
		expect(runtimeUserSummary(undefined)).toBe("—");
	});
});
