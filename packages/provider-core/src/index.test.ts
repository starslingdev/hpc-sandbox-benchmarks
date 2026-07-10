import { describe, expect, it } from "bun:test";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import type { DirectProvider, ProviderAdapter, ProviderConfig } from "./index.ts";
import {
	CANDIDATE_SUFFIX,
	readProviderEnv,
	toolchainImage,
	toolchainImageCandidate,
	toolchainImageVersion,
} from "./index.ts";

// Compile-time re-export check: the three adapter-contract types must be importable from the
// package root (the boundary tests forbid reaching into lib/), or every provider package and the
// aggregator lose their shared vocabulary. A value-level use keeps biome from flagging the imports.
type _Adapter = ProviderAdapter;
type _Config = ProviderConfig;
type _Provider = DirectProvider;

describe("toolchain image identity", () => {
	it("derives the immutable version ref from the schema's toolchain identity", () => {
		expect(toolchainImageVersion).toBe(
			`ghcr.io/starslingdev/${TOOLCHAIN_IMAGE_NAME}:${TOOLCHAIN_VERSION}`,
		);
	});

	it("derives the candidate ref via the shared candidate convention", () => {
		expect(toolchainImageCandidate).toBe(`${toolchainImageVersion}${CANDIDATE_SUFFIX}`);
	});

	it("boots the BENCH_TOOLCHAIN_IMAGE override when set, else the public version", () => {
		expect(toolchainImage).toBe(process.env.BENCH_TOOLCHAIN_IMAGE ?? toolchainImageVersion);
	});
});

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
