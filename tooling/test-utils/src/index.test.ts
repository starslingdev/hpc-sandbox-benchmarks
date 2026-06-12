import { describe, expect, it } from "bun:test";
import type { CapabilityFlags } from "@sandbox-benchmarks/schema";
import { createProviderConformanceSuite } from "./index.ts";

describe("@repo/test-utils", () => {
  it("scopes a conformance suite to the capabilities the adapter claims", () => {
    const flags: CapabilityFlags = { spawn: true, exec: true, filesystem: false, snapshot: false };
    const suite = createProviderConformanceSuite({ id: "e2b" }, flags);
    expect(suite.name).toBe("conformance: e2b");
    expect(suite.covers.sort()).toEqual(["exec", "spawn"]);
    expect(() => suite.run()).not.toThrow();
  });
});
