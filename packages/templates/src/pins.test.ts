import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { pinsSchema, ptsInstallGroups } from "./lib/pins.ts";
import {
	e2bToml,
	miseToml,
	pins,
	ptsInstallGroupArg,
	toolchainBuildArgs,
	VERCEL_VCR_REPOSITORY,
	validatedPins,
	validatedPtsInstallGroups,
} from "./pins.ts";

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
	it("versions the VCR mirror with the shared toolchain", () => {
		expect(VERCEL_VCR_REPOSITORY).toBe(`${TOOLCHAIN_IMAGE_NAME}-vercel`);
	});

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

// The PTS profiles are baked one layer per group so no compressed layer exceeds a provider
// registry's per-layer cap (Vercel Container Registry 500 MB; see the layer-budget comment in
// images/base/Dockerfile). Grouping is packaging, not a pin — these gate it against the two things
// it must never diverge from: the ptsInstallTests pin it partitions, and the Dockerfile RUNs that
// consume it. Both failure modes are silent and expensive live (a profile in no layer means a
// sandbox re-installs it — pgbench is a full postgres source build — inside every cell's budget).
describe("@sandbox-benchmarks/templates PTS layer groups", () => {
	const baked = pins.ptsInstallTests.split(/\s+/).filter(Boolean);
	const dockerfile = readFileSync(join(import.meta.dir, "../images/base/Dockerfile"), "utf8");

	it("partitions ptsInstallTests exactly — nothing dropped, invented, or duplicated", () => {
		const grouped = Object.values(ptsInstallGroups).flatMap((group) =>
			group.split(/\s+/).filter(Boolean),
		);
		expect(grouped.slice().sort()).toEqual(baked.slice().sort());
		expect(new Set(grouped).size).toBe(grouped.length);
		expect(() => validatedPtsInstallGroups()).not.toThrow();
	});

	it("keeps every group non-empty (an empty group is a RUN that bakes nothing)", () => {
		for (const [name, group] of Object.entries(ptsInstallGroups)) {
			expect(group.split(/\s+/).filter(Boolean).length, `group ${name}`).toBeGreaterThan(0);
		}
	});

	it("emits one PTS_INSTALL_GROUP_* build arg per group, plus the whole set for verification", () => {
		const args = toolchainBuildArgs();
		for (const [name, group] of Object.entries(ptsInstallGroups)) {
			expect(args[ptsInstallGroupArg(name)]).toBe(group);
		}
		expect(args.PTS_INSTALL_TESTS).toBe(pins.ptsInstallTests);
	});

	it("wires every group to a Dockerfile ARG and an install RUN", () => {
		// A group added here without a matching RUN would drop its benchmarks from the image with no
		// other signal until 99-manifest.sh fails deep into a bake (or, worse, a provider re-installs
		// the profile at benchmark time). Cheap text gate, same posture as the repo's other drift gates.
		for (const name of Object.keys(ptsInstallGroups)) {
			const arg = ptsInstallGroupArg(name);
			expect(dockerfile, `ARG ${arg}`).toContain(`ARG ${arg}\n`);
			expect(dockerfile, `RUN using ${arg}`).toContain(`PTS_INSTALL_TESTS="\${${arg}}"`);
		}
	});

	it("declares no PTS_INSTALL_GROUP_* ARG the pins do not define", () => {
		// The reverse/orphan direction: a group renamed in pins.ts leaves a stale ARG here that resolves
		// to the empty string, and `25-pts-profiles.sh` would fail on its `: "${PTS_INSTALL_TESTS:?}"`
		// with no hint that the cause is a rename.
		const declared = [...dockerfile.matchAll(/^ARG (PTS_INSTALL_GROUP_\w+)$/gm)].map(
			(match) => match[1] as string,
		);
		expect(declared.slice().sort()).toEqual(
			Object.keys(ptsInstallGroups).map(ptsInstallGroupArg).sort(),
		);
	});
});
