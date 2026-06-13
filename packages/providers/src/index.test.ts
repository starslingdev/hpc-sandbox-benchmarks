import { describe, expect, it } from "bun:test";
import { createStubAdapter, providerRuntimeReady } from "./index.ts";

describe("@sandbox-benchmarks/providers", () => {
	it("builds a stub adapter with an all-false capability set", () => {
		const adapter = createStubAdapter("e2b", "E2B");
		expect(adapter.descriptor.id).toBe("e2b");
		expect(adapter.descriptor.capabilities.exec).toBe(false);
	});

	it("resolves the computesdk runtime through the catalog", () => {
		expect(providerRuntimeReady).toBe(true);
	});
});
