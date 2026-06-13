import { describe, expect, it } from "bun:test";
import type { RawRun } from "@sandbox-benchmarks/schema";
import { normalize } from "./index.ts";

describe("@sandbox-benchmarks/results", () => {
	it("normalizes a raw run into a run document", () => {
		const raw: RawRun = { provider: "modal", operation: "exec", durationMs: 42 };
		const doc = normalize(raw);
		expect(doc.provider).toBe("modal");
		expect(doc.operation).toBe("exec");
		expect(doc.durationMs).toBe(42);
		expect(() => new Date(doc.normalizedAt).toISOString()).not.toThrow();
	});
});
