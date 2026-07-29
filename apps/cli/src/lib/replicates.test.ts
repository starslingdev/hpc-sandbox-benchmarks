import { describe, expect, it } from "bun:test";
import {
	lastFlagValue,
	parseReplicatesFlag,
	replicatePaths,
	resolveMaxConcurrency,
	runPooled,
} from "./replicates.ts";

describe("lastFlagValue", () => {
	it("reads both spellings and takes the last occurrence", () => {
		expect(lastFlagValue(["--replicates", "0,1"], "replicates")).toBe("0,1");
		expect(lastFlagValue(["--replicates=0,1"], "replicates")).toBe("0,1");
		expect(lastFlagValue(["--replicates=0", "--replicates", "9"], "replicates")).toBe("9");
	});

	it("returns undefined when the flag is absent", () => {
		expect(lastFlagValue(["e2b", "memory"], "replicates")).toBeUndefined();
	});

	// The singular and plural spellings must not consume each other's operands — a `--replicates`
	// swallowed by `--replicate` would run one sandbox where the plan asked for R.
	it("does not confuse the singular and plural spellings", () => {
		expect(lastFlagValue(["--replicates", "0,1,2"], "replicate")).toBeUndefined();
		expect(lastFlagValue(["--replicates=0,1,2"], "replicate")).toBeUndefined();
		expect(lastFlagValue(["--replicate", "3"], "replicates")).toBeUndefined();
	});

	it("throws on a dangling flag rather than defaulting", () => {
		expect(() => lastFlagValue(["--replicates"], "replicates")).toThrow(/requires an index/);
	});
});

describe("parseReplicatesFlag", () => {
	it("returns undefined when the flag is absent", () => {
		expect(parseReplicatesFlag(["e2b", "memory", "run-1"])).toBeUndefined();
	});

	it("parses the JSON array plan-replicates emits", () => {
		expect(parseReplicatesFlag(["--replicates", "[0,1,2]"])).toEqual([0, 1, 2]);
		expect(parseReplicatesFlag(["--replicates=[0]"])).toEqual([0]);
	});

	it("parses the comma-separated spelling, tolerating whitespace", () => {
		expect(parseReplicatesFlag(["--replicates", "0,1,2"])).toEqual([0, 1, 2]);
		expect(parseReplicatesFlag(["--replicates", " 0 , 1 "])).toEqual([0, 1]);
		expect(parseReplicatesFlag(["--replicates", "4"])).toEqual([4]);
	});

	it("preserves a non-contiguous axis rather than renumbering it", () => {
		expect(parseReplicatesFlag(["--replicates", "[3,7]"])).toEqual([3, 7]);
	});

	// An empty fan-out would upload no shard and read downstream as "never scheduled"; a repeated index
	// would fold two sandboxes into one replicate slot at aggregate time. Both must fail the cell.
	it("rejects an empty axis and repeated indices", () => {
		expect(() => parseReplicatesFlag(["--replicates", ""])).toThrow(/must not be blank/);
		expect(() => parseReplicatesFlag(["--replicates", "[]"])).toThrow(/at least one index/);
		expect(() => parseReplicatesFlag(["--replicates", "0,1,0"])).toThrow(/must not repeat/);
	});

	it("rejects malformed indices and non-array JSON", () => {
		expect(() => parseReplicatesFlag(["--replicates", "0,,1"])).toThrow(/non-negative integer/);
		expect(() => parseReplicatesFlag(["--replicates", "0,-1"])).toThrow(/non-negative integer/);
		expect(() => parseReplicatesFlag(["--replicates", "0,1.5"])).toThrow(/non-negative integer/);
		expect(() => parseReplicatesFlag(["--replicates", "[0,"])).toThrow(/JSON array/);
	});
});

describe("replicatePaths", () => {
	// Every shard of one run carries the same `runId` FIELD, so only the filename keeps them apart —
	// and commit-dataset.yml globs exactly this shape.
	it("gives each replicate its own raw tree and a suffixed shard file", () => {
		expect(replicatePaths("ci-1", 0)).toEqual({
			rawRoot: "data/raw/ci-1/r0",
			outFile: "data/runs/ci-1-r0.json",
		});
		expect(replicatePaths("ci-1", 11).outFile).toBe("data/runs/ci-1-r11.json");
	});
});

describe("resolveMaxConcurrency", () => {
	it("defaults to unbounded — the whole fleet at once, as R separate runners were", () => {
		expect(resolveMaxConcurrency([], {})).toBe(Number.POSITIVE_INFINITY);
		expect(resolveMaxConcurrency([], { BENCH_MAX_CONCURRENCY: "" })).toBe(Number.POSITIVE_INFINITY);
	});

	it("reads the flag and the env var, with the flag winning", () => {
		expect(resolveMaxConcurrency(["--max-concurrency", "3"], {})).toBe(3);
		expect(resolveMaxConcurrency([], { BENCH_MAX_CONCURRENCY: "2" })).toBe(2);
		expect(resolveMaxConcurrency(["--max-concurrency=4"], { BENCH_MAX_CONCURRENCY: "2" })).toBe(4);
	});

	it("rejects a non-positive or non-integer cap instead of silently serializing", () => {
		expect(() => resolveMaxConcurrency(["--max-concurrency", "0"], {})).toThrow(/positive integer/);
		expect(() => resolveMaxConcurrency([], { BENCH_MAX_CONCURRENCY: "1.5" })).toThrow(
			/positive integer/,
		);
		expect(() => resolveMaxConcurrency([], { BENCH_MAX_CONCURRENCY: "lots" })).toThrow(
			/positive integer/,
		);
	});
});

describe("runPooled", () => {
	const flush = (): Promise<void> => Bun.sleep(0);
	/** For the cases that assert scheduling, not error handling: a throw here is a test bug. */
	const throwOnError = (error: unknown): never => {
		throw error;
	};

	it("returns results in input order regardless of completion order", async () => {
		const results = await runPooled(
			[30, 10, 20],
			3,
			async (ms) => {
				await Bun.sleep(ms);
				return ms;
			},
			throwOnError,
		);
		expect(results).toEqual([30, 10, 20]);
	});

	// THE isolation guarantee. A rejecting Promise.all would unwind the pool and abandon the peers
	// mid-suite — sandboxes alive, shards unwritten, and the caller exiting before it can report.
	it("never rejects: a throwing item becomes its own failure and peers still finish", async () => {
		const finished: number[] = [];
		const results = await runPooled(
			[0, 1, 2, 3],
			4,
			async (i) => {
				if (i === 1) {
					await Bun.sleep(1);
					throw new Error("replicate 1 exploded");
				}
				await Bun.sleep(20);
				finished.push(i);
				return `ok:${i}`;
			},
			(error, _item, index) => `failed:${index}:${(error as Error).message}`,
		);
		expect(results).toEqual(["ok:0", "failed:1:replicate 1 exploded", "ok:2", "ok:3"]);
		// The peers ran to completion rather than being abandoned when their sibling threw.
		expect(finished.toSorted()).toEqual([0, 2, 3]);
	});

	it("keeps the pool draining when every item throws", async () => {
		const results = await runPooled(
			[0, 1, 2],
			2,
			async (i) => {
				throw new Error(`boom ${i}`);
			},
			(error) => (error as Error).message,
		);
		expect(results).toEqual(["boom 0", "boom 1", "boom 2"]);
	});

	/** The highest number of `fn` calls ever in flight at once, driving `count` items at `limit`. */
	const peakConcurrency = async (count: number, limit: number): Promise<number> => {
		let inFlight = 0;
		let peak = 0;
		await runPooled(
			Array.from({ length: count }, (_, i) => i),
			limit,
			async () => {
				inFlight++;
				peak = Math.max(peak, inFlight);
				await flush();
				inFlight--;
				return null;
			},
			throwOnError,
		);
		return peak;
	};

	it("never exceeds the concurrency limit", async () => {
		expect(await peakConcurrency(6, 2)).toBe(2);
	});

	it("runs everything at once when the limit is unbounded", async () => {
		expect(await peakConcurrency(4, Number.POSITIVE_INFINITY)).toBe(4);
	});

	it("returns [] for an empty item list", async () => {
		expect(await runPooled([], 4, async () => "never", throwOnError)).toEqual([]);
	});
});
