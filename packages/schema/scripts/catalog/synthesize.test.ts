import { describe, expect, spyOn, test } from "bun:test";
import { generateProfile } from "./generate.ts";
import type { PtsProfile } from "./parse.ts";
import { parseProfile } from "./parse.ts";
import { cartesian, synthesizeResults } from "./synthesize.ts";

const PROFILES = `${import.meta.dir}/../../src/pts-profiles`;

async function load(dir: string): Promise<PtsProfile> {
	return parseProfile(
		"pts",
		dir,
		await Bun.file(`${PROFILES}/${dir}/test-definition.xml`).text(),
		await Bun.file(`${PROFILES}/${dir}/results-definition.xml`).text(),
	);
}

/** Just the predicted descriptions, for the (majority of) cases where scale plays no role. */
function descriptions(profile: PtsProfile): (string | undefined)[] {
	return synthesizeResults(profile).map((s) => s.description);
}

// Build a profile from just the option/parser shape the synthesis reads (other fields are unused here).
function profile(settings: PtsProfile["settings"], parsers: PtsProfile["parsers"]): PtsProfile {
	return {
		repo: "pts",
		dir: "synthetic-1.0.0",
		info: { Title: "T", Description: "d", ResultScale: "ms", Proportion: "HIB" },
		profile: { TestType: "Processor" },
		settings,
		parsers,
	};
}

const option = (
	DisplayName: string,
	entries: [string, string][],
): PtsProfile["settings"][number] => ({
	DisplayName,
	Menu: { Entry: entries.map(([Name, Value]) => ({ Name, Value })) },
});

describe("cartesian", () => {
	test("no groups -> one empty combination", () => {
		expect(cartesian([])).toEqual([[]]);
	});

	test("preserves source order, first group varying fastest", () => {
		expect(cartesian([["a", "b", "c"], ["x"]])).toEqual([
			["a", "x"],
			["b", "x"],
			["c", "x"],
		]);
	});
});

describe("synthesizeResults", () => {
	test("single-metric profile (no options) -> one wildcard", async () => {
		expect(descriptions(await load("node-web-tooling-1.0.1"))).toEqual([undefined]);
	});

	test("c-ray option matrix -> one byte-exact description per resolution", async () => {
		expect(descriptions(await load("c-ray-2.0.0"))).toEqual([
			"Resolution: 1080p - Rays Per Pixel: 16",
			"Resolution: 4K - Rays Per Pixel: 16",
			"Resolution: 5K - Rays Per Pixel: 16",
		]);
	});

	test("AppendToArgumentsDescription: two parsers -> two metrics from one combination", () => {
		const p = profile(
			[option("Compression Level", [["3, Long Mode", "3"]])],
			[
				{ AppendToArgumentsDescription: "Compression Speed" },
				{ AppendToArgumentsDescription: "Decompression Speed" },
			],
		);
		expect(descriptions(p)).toEqual([
			"Compression Level: 3, Long Mode - Compression Speed",
			"Compression Level: 3, Long Mode - Decompression Speed",
		]);
	});

	test("ArgumentsDescription replaces the base (no options)", () => {
		const p = profile(
			[],
			[
				{ ArgumentsDescription: "Test: Compression Rating" },
				{ ArgumentsDescription: "Test: Decompression Rating" },
			],
		);
		expect(descriptions(p)).toEqual(["Test: Compression Rating", "Test: Decompression Rating"]);
	});

	test("MatchToTestArguments selects the parser only for matching combinations", () => {
		const p = profile(
			[
				option("Test", [
					["bcrypt", "--format=bcrypt"],
					["MD5", "--format=md5"],
				]),
			],
			[
				{ MatchToTestArguments: "bcrypt", AppendToArgumentsDescription: "Real Crypt" },
				{ MatchToTestArguments: "md5", AppendToArgumentsDescription: "Fast Hash" },
			],
		);
		expect(descriptions(p)).toEqual(["Test: bcrypt - Real Crypt", "Test: MD5 - Fast Hash"]);
	});

	test("deduplicates identical descriptions", () => {
		const p = profile([], [{}, {}]);
		expect(descriptions(p)).toEqual([undefined]);
	});

	test("same description on two scales -> two metrics carrying their parser scale (fio)", () => {
		// fio's shape: multiple parsers, no description modifiers, per-parser <ResultScale> — one run
		// posts both a bandwidth and an IOPS <Result> under the SAME description.
		const p = profile(
			[option("Type", [["Random Read", "randread"]])],
			[
				{ ResultScale: "MB/s", ResultProportion: "HIB" },
				{ ResultScale: "MB/s", ResultProportion: "HIB" }, // extraction variant, same scale -> dedup
				{ ResultScale: "IOPS", ResultProportion: "HIB" },
			],
		);
		expect(synthesizeResults(p)).toEqual([
			{ description: "Type: Random Read", scale: "MB/s", proportion: "HIB" },
			{ description: "Type: Random Read", scale: "IOPS", proportion: "HIB" },
		]);
	});

	test("menu-less auto-disk-mount-points -> the deterministic Default Test Directory entry", () => {
		const p = profile(
			[
				option("Type", [["Random Read", "randread"]]),
				{ DisplayName: "Disk Target", Identifier: "auto-disk-mount-points" },
			],
			[{}],
		);
		expect(descriptions(p)).toEqual(["Type: Random Read - Disk Target: Default Test Directory"]);
	});

	test("throws on a menu-less option with no known runtime default", () => {
		const p = profile([{ DisplayName: "Video Mode", Identifier: "auto-video-modes" }], [{}]);
		expect(() => synthesizeResults(p)).toThrow(/no known runtime default/);
	});

	test("throws when an option has no <Entry> values (would silently drop the profile)", () => {
		const p = profile([option("Empty", [])], [{}]);
		expect(() => synthesizeResults(p)).toThrow(/has no <Entry> values/);
	});

	test("warns instead of silently dropping a combination no parser matches", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			// The lone parser is scoped to "sha512" but the only entry value is "--format=bcrypt" — a
			// MatchToTestArguments typo. The combination matches nothing and yields no metric.
			const p = profile(
				[option("Test", [["bcrypt", "--format=bcrypt"]])],
				[{ MatchToTestArguments: "sha512", AppendToArgumentsDescription: "X" }],
			);
			expect(synthesizeResults(p)).toEqual([]);
			expect(warn).toHaveBeenCalledTimes(1);
		} finally {
			warn.mockRestore();
		}
	});
});

describe("generateProfile with synthesis", () => {
	test("c-ray -> three schema-valid metrics with distinct ids and pts.description", async () => {
		const defs = generateProfile(await load("c-ray-2.0.0"));
		expect(defs.map((d) => d.id)).toEqual([
			"c_ray_resolution_1080p_rays_per_pixel_16",
			"c_ray_resolution_4k_rays_per_pixel_16",
			"c_ray_resolution_5k_rays_per_pixel_16",
		]);
		expect(defs.map((d) => d.pts?.description)).toEqual([
			"Resolution: 1080p - Rays Per Pixel: 16",
			"Resolution: 4K - Rays Per Pixel: 16",
			"Resolution: 5K - Rays Per Pixel: 16",
		]);
		expect(new Set(defs.map((d) => d.unit))).toEqual(new Set(["Seconds"])); // post-transform unit
		// Unambiguous descriptions carry no pts.scale pin.
		expect(defs.every((d) => d.pts?.scale === undefined)).toBe(true);
	});

	test("scale-ambiguous descriptions -> scale-suffixed ids, pts.scale pins, per-parser units", () => {
		const p: PtsProfile = {
			repo: "pts",
			dir: "fio-like-1.0.0",
			// No profile-level ResultScale/Proportion — fio's shape; both come from the parsers.
			info: { Title: "Flexible IO Tester", Description: "d" },
			profile: { TestType: "Disk" },
			settings: [option("Type", [["Random Read", "randread"]])],
			parsers: [
				{ ResultScale: "MB/s", ResultProportion: "HIB" },
				{ ResultScale: "IOPS", ResultProportion: "HIB" },
			],
		};
		const defs = generateProfile(p);
		expect(defs.map((d) => d.id)).toEqual([
			"fio_like_type_random_read_mb_per_s",
			"fio_like_type_random_read_iops",
		]);
		expect(defs.map((d) => d.unit)).toEqual(["MB/s", "IOPS"]);
		expect(defs.map((d) => d.pts)).toEqual([
			{ test: "pts/fio-like", description: "Type: Random Read", scale: "MB/s" },
			{ test: "pts/fio-like", description: "Type: Random Read", scale: "IOPS" },
		]);
		expect(defs.map((d) => d.direction)).toEqual(["HIB", "HIB"]);
	});

	test("throws when neither the profile nor the parser declares a scale", () => {
		const p: PtsProfile = {
			repo: "pts",
			dir: "unitless-1.0.0",
			info: { Title: "T", Description: "d", Proportion: "HIB" },
			profile: { TestType: "Disk" },
			settings: [],
			parsers: [{}],
		};
		expect(() => generateProfile(p)).toThrow(/no <ResultScale>/);
	});

	test("throws on multiple scales under the description-less wildcard", () => {
		const p: PtsProfile = {
			repo: "pts",
			dir: "twin-wildcard-1.0.0",
			info: { Title: "T", Description: "d", Proportion: "HIB" },
			profile: { TestType: "Disk" },
			settings: [],
			parsers: [{ ResultScale: "MB/s" }, { ResultScale: "IOPS" }],
		};
		expect(() => generateProfile(p)).toThrow(/description-less wildcard/);
	});
});
