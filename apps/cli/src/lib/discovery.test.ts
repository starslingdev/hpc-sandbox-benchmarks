import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import {
	handleDiscovery,
	hasFlag,
	providerListing,
	renderProviders,
	renderSuites,
	suiteListing,
} from "./discovery.ts";

describe("hasFlag", () => {
	it("matches any of the supplied flag spellings, and ignores unrelated args", () => {
		expect(hasFlag(["a", "--help"], "--help", "-h")).toBe(true);
		expect(hasFlag(["-h"], "--help", "-h")).toBe(true);
		expect(hasFlag(["daytona", "cpu-node"], "--help", "-h")).toBe(false);
	});
});

describe("provider/suite listings", () => {
	it("advertise exactly the registered providers and suites (single source of truth)", () => {
		expect(providerListing().map((p) => p.id)).toEqual(PROVIDERS.map((m) => m.id));
		expect(suiteListing().map((s) => s.name)).toEqual([...SUITE_NAMES]);
	});
});

describe("renderProviders / renderSuites", () => {
	it("emit parseable JSON under --json that round-trips to the registry ids", () => {
		const providers = JSON.parse(renderProviders(true)) as Array<{ id: string }>;
		expect(providers.map((p) => p.id)).toEqual(PROVIDERS.map((m) => m.id));

		const suites = JSON.parse(renderSuites(true)) as Array<{ name: string }>;
		expect(suites.map((s) => s.name)).toEqual([...SUITE_NAMES]);
	});

	it("emit one human line per row by default, naming every registered id", () => {
		const providerLines = renderProviders(false).split("\n");
		expect(providerLines.length).toBe(PROVIDERS.length);
		for (const meta of PROVIDERS) expect(renderProviders(false)).toContain(meta.id);

		const suiteLines = renderSuites(false).split("\n");
		expect(suiteLines.length).toBe(SUITE_NAMES.length);
		for (const name of SUITE_NAMES) expect(renderSuites(false)).toContain(name);
	});
});

describe("handleDiscovery", () => {
	const HELP = "USAGE TEXT";

	it("returns the bin's help for --help / -h, as an ok result", () => {
		expect(handleDiscovery(["--help"], HELP)).toEqual({ text: HELP, ok: true });
		expect(handleDiscovery(["-h"], HELP)).toEqual({ text: HELP, ok: true });
	});

	it("returns the provider/suite listings, honoring --json", () => {
		expect(handleDiscovery(["--list-providers"], HELP)).toEqual({
			text: renderProviders(false),
			ok: true,
		});
		expect(handleDiscovery(["--list-providers", "--json"], HELP)).toEqual({
			text: renderProviders(true),
			ok: true,
		});
		expect(handleDiscovery(["--list-suites", "--json"], HELP)).toEqual({
			text: renderSuites(true),
			ok: true,
		});
	});

	it("flags an unrecognized flag as a not-ok result (caller exits non-zero, not exit 0)", () => {
		const res = handleDiscovery(["--bogus"], HELP);
		expect(res?.ok).toBe(false);
		expect(res?.text).toContain("Unknown flag: --bogus");
	});

	it("rejects an unknown flag even when paired with a valid action (never silently dropped)", () => {
		// A bogus flag alongside --list-providers must not be swallowed by the action dispatch.
		const providers = handleDiscovery(["--list-providers", "--bogus"], HELP);
		expect(providers?.ok).toBe(false);
		expect(providers?.text).toContain("Unknown flag: --bogus");

		const suites = handleDiscovery(["--list-suites", "--json", "--nope"], HELP);
		expect(suites?.ok).toBe(false);
		expect(suites?.text).toContain("Unknown flag: --nope");
	});

	it("accepts a bin's declared value flag in both the space and equals spellings", () => {
		// bench-suite declares `--require`; it must fall through to the bin's own parsing, not error.
		expect(handleDiscovery(["e2b", "memory", "--require", "e2b"], HELP, ["--require"])).toBeNull();
		expect(handleDiscovery(["e2b", "memory", "--require=e2b"], HELP, ["--require"])).toBeNull();
	});

	it("keeps the flag set closed for bins that don't declare the value flag", () => {
		// The closed set must not grow a union of every bin's private vocabulary.
		const res = handleDiscovery(["--require", "e2b"], HELP);
		expect(res?.ok).toBe(false);
		expect(res?.text).toContain("Unknown flag: --require");
	});

	it("still rejects an undeclared flag alongside a declared value flag", () => {
		const res = handleDiscovery(["--require=e2b", "--bogus"], HELP, ["--require"]);
		expect(res?.ok).toBe(false);
		expect(res?.text).toContain("Unknown flag: --bogus");
	});

	it("lets --help win over an unknown flag, as a safe escape hatch", () => {
		expect(handleDiscovery(["--help", "--bogus"], HELP)).toEqual({ text: HELP, ok: true });
	});

	it("returns null when no discovery flag is present, so the bin runs its positional path", () => {
		expect(handleDiscovery([], HELP)).toBeNull();
		expect(handleDiscovery(["daytona", "cpu-node"], HELP)).toBeNull();
	});
});
