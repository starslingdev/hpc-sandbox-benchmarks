import { describe, expect, it } from "bun:test";
import { parseReplicateFlag } from "./bench-suite.ts";

describe("parseReplicateFlag", () => {
	it("returns undefined when the flag is absent", () => {
		expect(parseReplicateFlag(["daytona", "cpu-node", "run-1"])).toBeUndefined();
	});

	it("parses both the space-separated and =-joined spellings", () => {
		expect(parseReplicateFlag(["daytona", "--replicate", "3"])).toBe(3);
		expect(parseReplicateFlag(["daytona", "--replicate=0"])).toBe(0);
	});

	it("takes the last occurrence when the flag repeats", () => {
		expect(parseReplicateFlag(["--replicate", "1", "--replicate=4"])).toBe(4);
	});

	it("rejects a dangling flag, an empty operand, a negative, and a non-integer", () => {
		expect(() => parseReplicateFlag(["--replicate"])).toThrow(/requires an index/);
		// Number("")/Number("  ") coerce to 0, so a blank operand must throw, not silently stamp replicate 0.
		expect(() => parseReplicateFlag(["--replicate", ""])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate="])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "  "])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "-1"])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "1.5"])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "x"])).toThrow(/non-negative integer/);
	});
});
