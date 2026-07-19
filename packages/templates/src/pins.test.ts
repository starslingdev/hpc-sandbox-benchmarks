import { describe, expect, it } from "bun:test";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { pinsSchema } from "./lib/pins.ts";
import { e2bToml, miseToml, pins, validatedPins } from "./pins.ts";

// A synthetic, fully-specified pin set — exercises the schema independently of the real pins, so
// these schema-level tests stay stable across future pin updates.
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

	it("rejects the __TODO__ placeholder so an unfilled version pin fails loudly", () => {
		expect(pinsSchema({ ...validSample, nodeVersion: "__TODO__" }) instanceof type.errors).toBe(
			true,
		);
	});

	it("rejects a whitespace-only version (no non-whitespace content)", () => {
		expect(pinsSchema({ ...validSample, nodeVersion: "   " }) instanceof type.errors).toBe(true);
	});

	it("rejects a __TODO__ padded with surrounding whitespace", () => {
		expect(pinsSchema({ ...validSample, nodeVersion: "  __TODO__  " }) instanceof type.errors).toBe(
			true,
		);
	});

	it("exposes every pin key as the single source of truth", () => {
		expect(Object.keys(pins).sort()).toEqual(Object.keys(validSample).sort());
	});

	it("ships real, valid pins (no unfilled/garbled placeholder survives)", () => {
		// validatedPins() throws if any real pin fails the schema — this guards against a future
		// edit leaving a TODO/typo'd value, which would otherwise only surface at docker build time.
		expect(() => validatedPins()).not.toThrow();
	});

	it("generates a mise.toml from the tool pins", () => {
		const toml = miseToml(validSample);
		expect(toml).toContain("[tools]");
		expect(toml).toContain('node = "22"');
		expect(toml).toContain('python = "3.13"');
	});

	it("generates an e2b manifest with the version-scoped template name and TARGET_SPEC", () => {
		const toml = e2bToml();
		expect(toml).toContain(`template_name = "${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}"`);
		expect(toml).toContain("cpu_count = 4");
		expect(toml).toContain("memory_mb = 8192");
	});

	it("accepts a custom template name (the bake passes the candidate name)", () => {
		const candidate = `${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}-candidate`;
		expect(e2bToml(candidate)).toContain(`template_name = "${candidate}"`);
	});
});
