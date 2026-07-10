import { describe, expect, it } from "bun:test";
import type { DirectProvider, ProviderAdapter, ProviderConfig } from "./index.ts";
import { readProviderEnv } from "./index.ts";

// Compile-time re-export check: the three adapter-contract types must be importable from the
// package root (the boundary tests forbid reaching into lib/), or every provider package and the
// aggregator lose their shared vocabulary. A value-level use keeps biome from flagging the imports.
type _Adapter = ProviderAdapter;
type _Config = ProviderConfig;
type _Provider = DirectProvider;

describe("readProviderEnv", () => {
	it("returns declared keys that are set and omits unset ones", () => {
		const env = readProviderEnv(["FOO_KEY", "BAR_KEY"] as const, {
			FOO_KEY: "abc",
			UNRELATED: "zzz",
		});
		expect(env.FOO_KEY).toBe("abc");
		expect(env.BAR_KEY).toBeUndefined();
	});

	it("forwards only declared keys (process.env carries hundreds of unrelated ones)", () => {
		const env = readProviderEnv(["FOO_KEY"] as const, { FOO_KEY: "abc", SECRET: "leak" });
		expect(Object.keys(env)).toEqual(["FOO_KEY"]);
	});

	it("rejects an explicitly-set but empty value as a misconfiguration", () => {
		expect(() => readProviderEnv(["FOO_KEY"] as const, { FOO_KEY: "" })).toThrow(
			/Invalid configuration.*FOO_KEY/s,
		);
	});

	it("reads process.env by default", () => {
		// bun sets this for every test run, so the default source is observable without mutation.
		const env = readProviderEnv(["NODE_ENV", "DEFINITELY_UNSET_BENCH_KEY"] as const);
		expect(typeof env.NODE_ENV).toBe("string");
		expect(env.DEFINITELY_UNSET_BENCH_KEY).toBeUndefined();
	});
});
