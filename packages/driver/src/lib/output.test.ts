import { describe, expect, test } from "bun:test";
import { DriverError } from "./errors.ts";
import { capExecOutput } from "./output.ts";
import { okExec } from "./session.fixture.ts";

const withStreams = (stdout: string, stderr = "") => ({ ...okExec, stdout, stderr });

describe("capExecOutput", () => {
	test("passes the result through untouched when no cap is set", () => {
		const result = withStreams("x".repeat(1000));
		expect(capExecOutput(result, undefined)).toBe(result);
	});

	test("passes through untouched (same reference) when under the cap", () => {
		const result = withStreams("small");
		expect(capExecOutput(result, 1000)).toBe(result);
	});

	test("caps by BYTES, not UTF-16 code units, and never splits a code point", () => {
		// "😀" is 4 UTF-8 bytes but 2 UTF-16 code units. A char-based cap of 4 would keep 4 code
		// units (two emoji, 8 bytes); the byte cap keeps exactly one emoji and reports truncation.
		const capped = capExecOutput(withStreams("😀😀"), 4);
		expect(capped.stdout).toBe("😀");
		expect(Buffer.byteLength(capped.stdout, "utf8")).toBe(4);
		expect(capped.truncated).toBe(true);
	});

	test("stops before a code point that would overflow the byte budget", () => {
		// "é" is 2 bytes; a 3-byte cap fits one "é" (2 bytes) but not two (4), and must not emit a
		// half code point for the leftover byte.
		const capped = capExecOutput(withStreams("éé"), 3);
		expect(capped.stdout).toBe("é");
		expect(capped.truncated).toBe(true);
	});

	test("truncation on either stream sets the flag; the other stream is still capped", () => {
		const capped = capExecOutput({ ...okExec, stdout: "short", stderr: "x".repeat(50) }, 10);
		expect(capped.stdout).toBe("short");
		expect(capped.stderr).toHaveLength(10);
		expect(capped.truncated).toBe(true);
	});

	test.each([
		-1,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		1.5,
	])("rejects an invalid byte cap (%s) with a typed error", (cap) => {
		const error = (() => {
			try {
				capExecOutput(withStreams("x"), cap);
			} catch (caught) {
				return caught;
			}
		})();
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("invalid-exec-options");
	});

	test("accepts zero as a valid cap", () => {
		const capped = capExecOutput(withStreams("x"), 0);
		expect(capped.stdout).toBe("");
		expect(capped.truncated).toBe(true);
	});
});
