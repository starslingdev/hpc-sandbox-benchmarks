import { describe, expect, it } from "bun:test";
import { createStubAdapter } from "@sandbox-benchmarks/providers";
import { timeOperation } from "./index.ts";

describe("@sandbox-benchmarks/harness", () => {
  it("times an operation and emits a raw run for the adapter", async () => {
    const adapter = createStubAdapter("e2b", "E2B");
    const run = await timeOperation(adapter, "spawn", () => {});
    expect(run.provider).toBe("e2b");
    expect(run.operation).toBe("spawn");
    expect(run.durationMs).toBeGreaterThan(0);
  });
});
