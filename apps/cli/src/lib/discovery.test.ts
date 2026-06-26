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

	it("returns the bin's help for --help / -h", () => {
		expect(handleDiscovery(["--help"], HELP)).toBe(HELP);
		expect(handleDiscovery(["-h"], HELP)).toBe(HELP);
	});

	it("returns the provider/suite listings, honoring --json", () => {
		expect(handleDiscovery(["--list-providers"], HELP)).toBe(renderProviders(false));
		expect(handleDiscovery(["--list-providers", "--json"], HELP)).toBe(renderProviders(true));
		expect(handleDiscovery(["--list-suites", "--json"], HELP)).toBe(renderSuites(true));
	});

	it("returns null when no discovery flag is present, so the bin runs its positional path", () => {
		expect(handleDiscovery([], HELP)).toBeNull();
		expect(handleDiscovery(["daytona", "cpu-node"], HELP)).toBeNull();
	});
});
