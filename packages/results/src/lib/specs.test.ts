/**
 * Unit tests for specs.ts: observed-specs.json (primary) merged with the jc probe-file fallback
 * (lscpu/free/uname/df), plus the target-spec match.
 *
 * The probe-file cases load real captures under __fixtures__/probes/ (copied from a Blaxel run), so the
 * shapes mirror what the producer's `*--lscpu.json` / `*--free.json` / `*--df.json` actually carry.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { JsonReader } from "./specs.ts";
import { computeSpecMatched, readObservedSpecs } from "./specs.ts";

const probesDir = join(import.meta.dir, "__fixtures__/probes");

/** Reader over an in-memory map — undefined for any name not present (mirrors an absent file). */
function reader(files: Record<string, unknown>): JsonReader {
	return (name) => files[name];
}

/** Reader over the real fixture probe files on disk; `undefined` when the fixture is omitted/absent. */
function fixtureReader(names: readonly string[]): JsonReader {
	const present = new Set(names);
	return (name) =>
		present.has(name) ? JSON.parse(readFileSync(join(probesDir, name), "utf8")) : undefined;
}

const PROBE_FILES = [
	"cpu-info--lscpu.json",
	"memory-info--free.json",
	"system-os--uname.json",
	"disk-layout--df.json",
] as const;

describe("readObservedSpecs: observed-specs.json (harness-written, primary)", () => {
	it("carries all known numeric and string fields verbatim", () => {
		const specs = readObservedSpecs(
			reader({
				"observed-specs.json": {
					vcpus: 4,
					memoryGb: 16,
					diskGb: 20,
					hostVcpus: 48,
					hostMemoryGb: 755.1,
					cpuMhz: 2750,
					cpuModel: "AMD EPYC 9275F 24-Core Processor",
					kernel: "6.17.0-22-generic",
					os: "Debian GNU/Linux 13 (trixie)",
					virtualization: "kvm",
					user: "root",
				},
			}),
		);
		expect(specs).toEqual({
			vcpus: 4,
			memoryGb: 16,
			diskGb: 20,
			hostVcpus: 48,
			hostMemoryGb: 755.1,
			cpuMhz: 2750,
			cpuModel: "AMD EPYC 9275F 24-Core Processor",
			kernel: "6.17.0-22-generic",
			os: "Debian GNU/Linux 13 (trixie)",
			virtualization: "kvm",
			user: "root",
		});
	});

	it("drops wrong-typed, empty-string, and unknown fields", () => {
		const specs = readObservedSpecs(
			reader({
				"observed-specs.json": {
					vcpus: "4", // numeric fields must be numbers
					memoryGb: Number.NaN, // non-finite dropped
					cpuModel: "", // empty strings dropped
					kernel: 6.17, // string fields must be strings
					os: "Ubuntu 24.04.2 LTS",
					bogusField: 123, // unknown keys never pass through
				},
			}),
		);
		expect(specs).toEqual({ os: "Ubuntu 24.04.2 LTS" });
	});

	it("wins on overlap but lets the probes backfill the fields it didn't record", () => {
		// observed-specs.json owns vcpus; the free probe fills the missing memoryGb instead of being ignored.
		const specs = readObservedSpecs(
			reader({
				"observed-specs.json": { vcpus: 4 },
				"memory-info--free.json": [{ type: "Mem", total: 16 * 1024 ** 3 }],
			}),
		);
		expect(specs).toEqual({ vcpus: 4, memoryGb: 16 });
	});

	it("an array (or other non-object) observed-specs.json falls back to probes", () => {
		const specs = readObservedSpecs(
			reader({
				"observed-specs.json": [{ vcpus: 4 }],
				"system-os--uname.json": { kernel_release: "6.8.0-45-generic" },
			}),
		);
		expect(specs).toEqual({ kernel: "6.8.0-45-generic" });
	});
});

describe("readObservedSpecs: jc probe fallback (real fixtures)", () => {
	it("assembles vcpus/cpuModel/virtualization, memoryGb, kernel and diskGb from the four probes", () => {
		const specs = readObservedSpecs(fixtureReader(PROBE_FILES));
		expect(specs.vcpus).toBe(6);
		expect(specs.cpuModel).toBe("AMD EPYC");
		expect(specs.virtualization).toBe("KVM");
		expect(specs.kernel).toBe("6.8.0-45-generic");
		expect(specs.memoryGb).toBeCloseTo(15.63, 2); // 16787812352 B → GiB
		expect(specs.diskGb).toBeCloseTo(7.9, 2); // root "size" 8482560409 B → GiB
	});

	it("tolerates any subset of the probes being absent", () => {
		const specs = readObservedSpecs(fixtureReader(["cpu-info--lscpu.json"]));
		expect(specs).toEqual({ vcpus: 6, cpuModel: "AMD EPYC", virtualization: "KVM" });
	});

	it("all probes absent → empty specs (every field optional)", () => {
		expect(readObservedSpecs(reader({}))).toEqual({});
	});
});

describe("readObservedSpecs: jc probe fallback (edge shapes)", () => {
	it("lscpu without CPU(s) / with zero or non-numeric counts sets no vcpus", () => {
		for (const data of [undefined, "0", "many"]) {
			const entries = [{ field: "Model name:", data: "Intel Xeon" }];
			if (data !== undefined) entries.push({ field: "CPU(s):", data });
			const specs = readObservedSpecs(reader({ "cpu-info--lscpu.json": { lscpu: entries } }));
			expect(specs.vcpus).toBeUndefined();
			expect(specs.cpuModel).toBe("Intel Xeon");
		}
	});

	it("malformed lscpu payloads are tolerated", () => {
		expect(readObservedSpecs(reader({ "cpu-info--lscpu.json": { lscpu: "x" } }))).toEqual({});
		expect(readObservedSpecs(reader({ "cpu-info--lscpu.json": [] }))).toEqual({});
	});

	it("free without a Mem row, or non-array free, sets no memoryGb", () => {
		expect(
			readObservedSpecs(reader({ "memory-info--free.json": [{ type: "Swap", total: 9 }] })),
		).toEqual({});
		expect(
			readObservedSpecs(reader({ "memory-info--free.json": { type: "Mem", total: 9 } })),
		).toEqual({});
	});

	it("free Mem total converts bytes → GiB", () => {
		const specs = readObservedSpecs(
			reader({ "memory-info--free.json": [{ type: "Mem", total: 8322400256 }] }),
		);
		expect(specs.memoryGb).toBeCloseTo(7.75, 2);
	});

	it("df root mount: bytes 'size' wins, legacy KiB '1k_blocks' is the fallback, no root → no diskGb", () => {
		// No root mount.
		expect(
			readObservedSpecs(reader({ "disk-layout--df.json": [{ mounted_on: "/home", size: 5 }] })),
		).toEqual({});
		// Modern jc df: bytes in "size".
		expect(
			readObservedSpecs(
				reader({ "disk-layout--df.json": [{ mounted_on: "/", size: 20 * 1024 ** 3 }] }),
			).diskGb,
		).toBeCloseTo(20, 3);
		// Legacy jc df: KiB in "1k_blocks".
		expect(
			readObservedSpecs(
				reader({ "disk-layout--df.json": [{ mounted_on: "/", "1k_blocks": 10066329.6 }] }),
			).diskGb,
		).toBeCloseTo(9.6, 3);
	});

	it("uname without kernel_release sets no kernel", () => {
		expect(readObservedSpecs(reader({ "system-os--uname.json": {} }))).toEqual({});
		expect(readObservedSpecs(reader({ "system-os--uname.json": { kernel_release: "" } }))).toEqual(
			{},
		);
	});
});

describe("computeSpecMatched (target: 4 vCPU / 8 GB ±10%)", () => {
	it("undefined when vcpus or memoryGb is unobserved — no judging partial evidence", () => {
		expect(computeSpecMatched({})).toBeUndefined();
		expect(computeSpecMatched({ vcpus: 4 })).toBeUndefined();
		expect(computeSpecMatched({ memoryGb: 8 })).toBeUndefined();
		// Other fields don't substitute for the required pair.
		expect(computeSpecMatched({ hostVcpus: 4, hostMemoryGb: 8 })).toBeUndefined();
	});

	it("exact target matches", () => {
		expect(computeSpecMatched({ vcpus: 4, memoryGb: 8 })).toBe(true);
	});

	it("memory within ±10% still matches (kernels reserve some)", () => {
		expect(computeSpecMatched({ vcpus: 4, memoryGb: 7.5 })).toBe(true);
		expect(computeSpecMatched({ vcpus: 4, memoryGb: 8.5 })).toBe(true);
	});

	it("memory beyond the tolerance fails", () => {
		expect(computeSpecMatched({ vcpus: 4, memoryGb: 4 })).toBe(false);
		expect(computeSpecMatched({ vcpus: 4, memoryGb: 16 })).toBe(false);
	});

	it("vCPUs must match exactly", () => {
		expect(computeSpecMatched({ vcpus: 2, memoryGb: 8 })).toBe(false);
		expect(computeSpecMatched({ vcpus: 8, memoryGb: 8 })).toBe(false);
	});
});
