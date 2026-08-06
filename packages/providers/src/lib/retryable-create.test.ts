import { describe, expect, it } from "bun:test";
import { isRetryableCreateError, markRetryableCreate } from "./retryable-create.ts";

describe("retryable-create mark", () => {
	it("marks and detects an error", () => {
		const error = new Error("no slot right now");
		expect(isRetryableCreateError(error)).toBe(false);
		expect(markRetryableCreate(error)).toBe(error);
		expect(isRetryableCreateError(error)).toBe(true);
	});

	it("treats an unmarked error, and every non-error value, as not retryable", () => {
		expect(isRetryableCreateError(new Error("invalid image"))).toBe(false);
		expect(isRetryableCreateError("quota exceeded")).toBe(false);
		expect(isRetryableCreateError(null)).toBe(false);
		expect(isRetryableCreateError(undefined)).toBe(false);
	});

	it("returns a non-object untouched rather than wrapping it", () => {
		// Wrapping would lose the identity callers match on; there is simply nothing to carry the mark.
		expect(markRetryableCreate("plain string")).toBe("plain string");
		expect(isRetryableCreateError(markRetryableCreate("plain string"))).toBe(false);
	});

	it("keeps the mark non-enumerable so object spread cannot copy it", () => {
		const error = markRetryableCreate(new Error("no slot"));
		const mark = Symbol.for("sandbox-benchmarks.retryableCreate");
		expect(Object.getOwnPropertyDescriptor(error, mark)?.enumerable).toBe(false);
		expect(Object.getOwnPropertySymbols({ ...error })).not.toContain(mark);
	});

	it("preserves a frozen error when it cannot carry the mark", () => {
		const error = Object.freeze(new Error("no slot"));
		expect(markRetryableCreate(error)).toBe(error);
		expect(isRetryableCreateError(error)).toBe(false);
	});
});
