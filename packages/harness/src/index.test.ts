import { describe, expect, it } from "bun:test";
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import { timeOperation } from "./index.ts";

// timeOperation only reads identity, never calls createCompute — a throwing stub keeps this unit
// test free of any real SDK while staying fully typed.
const config: ProviderConfig = {
	name: "e2b",
	requiredEnvVars: [],
	createCompute: () => {
		throw new Error("not exercised");
	},
};

describe("@sandbox-benchmarks/harness", () => {
	it("times an operation and emits a raw run for the provider", async () => {
		const run = await timeOperation(config, "spawn", () => {});
		expect(run.provider).toBe("e2b");
		expect(run.operation).toBe("spawn");
		expect(run.durationMs).toBeGreaterThan(0);
	});
});
