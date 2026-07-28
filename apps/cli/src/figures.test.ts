// `figures` is the first bin with a value-taking flag AND bin-private boolean flags, so its argv
// parsing is the first that can bind a flag operand as a positional. These assertions pin that.
import { describe, expect, it } from "bun:test";
import { HELP, parseFiguresArgs } from "./bin/figures.ts";
import { handleDiscovery } from "./lib/discovery.ts";

describe("parseFiguresArgs", () => {
	it("reads the two positionals", () => {
		const args = parseFiguresArgs(["run.json", "out"]);
		expect(args.runFile).toBe("run.json");
		expect(args.outDir).toBe("out");
	});

	it("does not bind a --theme operand as the outDir", () => {
		// The bug this guards: `--theme light run.json out` binding outDir = "light".
		const args = parseFiguresArgs(["--theme", "light", "run.json", "out"]);
		expect(args.runFile).toBe("run.json");
		expect(args.outDir).toBe("out");
		expect(args.theme.name).toBe("light");
	});

	it("accepts the --theme=<v> spelling", () => {
		expect(parseFiguresArgs(["run.json", "out", "--theme=light"]).theme.name).toBe("light");
	});

	it("rejects an unknown theme rather than silently defaulting", () => {
		expect(parseFiguresArgs(["run.json", "out", "--theme", "neon"]).error).toContain(
			"unknown --theme",
		);
	});

	it("reads the boolean flags without consuming an operand", () => {
		const args = parseFiguresArgs(["run.json", "out", "--check", "--png"]);
		expect(args.check).toBe(true);
		expect(args.png).toBe(true);
		expect(args.outDir).toBe("out");
	});

	it("defaults to the dark theme", () => {
		expect(parseFiguresArgs(["run.json", "out"]).theme.name).toBe("dark");
	});
});

describe("figures discovery", () => {
	it("accepts its bin-private flags", () => {
		expect(
			handleDiscovery(["run.json", "out", "--check"], HELP, ["--theme"], ["--check", "--png"]),
		).toBeNull();
	});

	it("still rejects a genuinely unknown flag", () => {
		const result = handleDiscovery(["--bogus"], HELP, ["--theme"], ["--check", "--png"]);
		expect(result?.ok).toBe(false);
		expect(result?.text).toContain("Unknown flag: --bogus");
	});

	it("prints usage for --help", () => {
		expect(handleDiscovery(["--help"], HELP, ["--theme"], ["--check"])?.ok).toBe(true);
	});
});
