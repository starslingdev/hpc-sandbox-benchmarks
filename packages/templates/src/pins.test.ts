import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import { pinsSchema } from "./lib/pins.ts";
import { e2bToml, miseToml, pins } from "./pins.ts";

// A synthetic, fully-specified pin set — exercises the schema independently of the (TODO-placeholder)
// real pins, so these tests don't break when the real pins get filled in.
const validSample = {
	miseVersion: "2026.6.1",
	miseSha256X64: "a".repeat(64),
	miseSha256Arm64: "c".repeat(64),
	nodeVersion: "22",
	pythonVersion: "3.13",
	pnpmVersion: "10",
	hyperfineVersion: "1.20.0",
	warpVersion: "1.1.4",
	jcVersion: "1.25.4",
	quartoVersion: "1.9.38",
	ptsVersion: "10.8.4",
	ptsDebSha256: "b".repeat(64),
	ptsInstallTests: "node-web-tooling pyperformance",
};

describe("@sandbox-benchmarks/templates pins", () => {
	it("accepts fully-specified pins", () => {
		expect(pinsSchema(validSample) instanceof type.errors).toBe(false);
	});

	it("rejects a non-hex sha256 (so a garbled or unfilled pin fails loudly)", () => {
		expect(pinsSchema({ ...validSample, ptsDebSha256: "nope" }) instanceof type.errors).toBe(true);
	});

	it("rejects an empty version", () => {
		expect(pinsSchema({ ...validSample, nodeVersion: "" }) instanceof type.errors).toBe(true);
	});

	it("exposes every pin key as the single source of truth", () => {
		expect(Object.keys(pins).sort()).toEqual(Object.keys(validSample).sort());
	});

	it("generates a mise.toml from the tool pins", () => {
		const toml = miseToml(validSample);
		expect(toml).toContain("[tools]");
		expect(toml).toContain('node = "22"');
		expect(toml).toContain('python = "3.13"');
	});

	it("generates an e2b manifest from the image identity and TARGET_SPEC", () => {
		const toml = e2bToml();
		expect(toml).toContain('template_name = "sandbox-benchmarks-toolchain"');
		expect(toml).toContain("cpu_count = 2");
		expect(toml).toContain("memory_mb = 8192");
	});
});
