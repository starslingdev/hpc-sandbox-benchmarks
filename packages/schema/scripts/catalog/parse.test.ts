import { describe, expect, test } from "bun:test";
import { parseProfile } from "./parse.ts";

const PROFILES = `${import.meta.dir}/../../src/pts-profiles`;

async function load(dir: string) {
	return parseProfile(
		"pts",
		dir,
		await Bun.file(`${PROFILES}/${dir}/test-definition.xml`).text(),
		await Bun.file(`${PROFILES}/${dir}/results-definition.xml`).text(),
	);
}

describe("parseProfile", () => {
	test("parses a single-metric profile (no TestSettings)", async () => {
		const p = await load("node-web-tooling-1.0.1");
		expect(p.info.Title).toBe("Node.js V8 Web Tooling Benchmark");
		expect(p.info.ResultScale).toBe("runs/s");
		expect(p.info.Proportion).toBe("HIB");
		expect(p.profile.TestType).toBe("Processor");
		expect(p.profile.ProjectURL).toBe("https://v8.github.io/web-tooling-benchmark/");
		expect(p.settings).toHaveLength(0);
		expect(p.parsers).toHaveLength(1);
	});

	test("forces repeatable nodes to arrays for an option-matrix profile", async () => {
		const p = await load("c-ray-2.0.0");
		expect(p.info.Proportion).toBe("LIB");
		expect(p.info.SubTitle).toBe("Total Time - 4K, 16 Rays Per Pixel");
		// Two <Option> axes; the first (Resolution) has a three-<Entry> menu — both kept as arrays.
		expect(p.settings.map((o) => o.DisplayName)).toEqual(["Resolution", "Rays Per Pixel"]);
		expect(p.settings[0]?.Menu.Entry.map((e) => e.Name)).toEqual(["1080p", "4K", "5K"]);
		expect(p.parsers[0]?.DivideResultBy).toBe("1000");
	});

	test("tolerates a missing results-definition.xml", async () => {
		const p = parseProfile(
			"pts",
			"x-1.0.0",
			await Bun.file(`${PROFILES}/node-web-tooling-1.0.1/test-definition.xml`).text(),
			"",
		);
		expect(p.parsers).toHaveLength(0);
	});

	test("throws with a summary on malformed test-definition.xml", () => {
		expect(() =>
			parseProfile("pts", "bad-1.0.0", "<PhoronixTestSuite></PhoronixTestSuite>", ""),
		).toThrow(/invalid bad-1.0.0\/test-definition\.xml/);
	});
});
