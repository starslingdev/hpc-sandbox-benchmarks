import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import { buildManifest, manifestSchema } from "./manifest.ts";

// A synthetic, fully-specified pin set (matches pins.test.ts) so these tests exercise buildManifest
// independently of the real pins, which ship as TODO placeholders until filled in a later PR.
const validSample = {
	miseVersion: "2026.6.1",
	miseSha256X64: "a".repeat(64),
	miseSha256Arm64: "c".repeat(64),
	nodeVersion: "22.22.3",
	pythonVersion: "3.13.14",
	pnpmVersion: "10.34.3",
	hyperfineVersion: "1.20.0",
	warpVersion: "1.3.1",
	jcVersion: "1.25.6",
	quartoVersion: "1.9.38",
	ptsVersion: "10.8.4",
	ptsDebSha256: "b".repeat(64),
	ptsInstallTests: "pyperformance node-web-tooling",
};

describe("@sandbox-benchmarks/templates manifest", () => {
	it("builds a manifest that satisfies the schema (the pre-bake gate)", () => {
		expect(manifestSchema(buildManifest(validSample)) instanceof type.errors).toBe(false);
	});

	it("derives tool + PTS versions from the pins (single source of truth)", () => {
		const m = buildManifest(validSample);
		expect(m.tools.node).toBe(validSample.nodeVersion);
		expect(m.tools.warp).toBe(validSample.warpVersion);
		expect(m.tools.mise).toBe(validSample.miseVersion);
		expect(m.pts.version).toBe(validSample.ptsVersion);
	});

	it("normalizes install_tests to a sorted list (stable across rebuilds)", () => {
		expect(buildManifest(validSample).pts.install_tests).toEqual([
			"node-web-tooling",
			"pyperformance",
		]);
	});

	it("carries the canonical image identity", () => {
		const m = buildManifest(validSample);
		expect(m.image_name.length).toBeGreaterThan(0);
		expect(m.image_version.length).toBeGreaterThan(0);
	});
});
