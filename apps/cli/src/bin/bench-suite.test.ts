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

	it("rejects a dangling flag, a negative, and a non-integer", () => {
		expect(() => parseReplicateFlag(["--replicate"])).toThrow(/requires an index/);
		expect(() => parseReplicateFlag(["--replicate", "-1"])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "1.5"])).toThrow(/non-negative integer/);
		expect(() => parseReplicateFlag(["--replicate", "x"])).toThrow(/non-negative integer/);
	});
});
