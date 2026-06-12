import { describe, expect, it } from "bun:test";
import { type CapabilityFlags, capabilities, parseRawRun } from "./index.ts";

describe("@sandbox-benchmarks/schema", () => {
  it("exposes the capability vocabulary", () => {
    expect(capabilities).toContain("exec");
    const flags: CapabilityFlags = {
      spawn: true,
      exec: true,
      filesystem: false,
      snapshot: false,
    };
    expect(flags.exec).toBe(true);
  });

  it("parses a valid raw run via arktype", () => {
    const run = parseRawRun({ provider: "e2b", operation: "spawn", durationMs: 12 });
    expect(run.provider).toBe("e2b");
  });

  it("rejects an invalid raw run", () => {
    expect(() => parseRawRun({ provider: "e2b", operation: "spawn", durationMs: -1 })).toThrow();
    // durationMs must be strictly positive — a 0ms run is a timing error, not a real result.
    expect(() => parseRawRun({ provider: "e2b", operation: "spawn", durationMs: 0 })).toThrow();
  });
});
