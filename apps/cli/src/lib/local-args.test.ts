import { describe, expect, it } from "bun:test";
import { LOCAL_DATASET_DIR } from "@sandbox-benchmarks/results";
import { SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { LocalArgsError, parseLocalArgs } from "./local-args.ts";

/** Fixed environment so a case never depends on the clock or on a real checkout. */
const env = { repoRoot: "/repo", sha: "abc1234", now: 1_700_000_000_000 };
const parse = (argv: string[]) => parseLocalArgs(argv, env);

describe("parseLocalArgs defaults", () => {
	it("runs cpu-node as `local`, one shard, with a generated runId", () => {
		const request = parse([]);
		expect(request.suites).toEqual(["cpu-node"]);
		expect(request.label).toBe("local");
		expect(request.replicates).toEqual([0]);
		expect(request.runId).toBe("local-1700000000000");
		expect(request.repoRoot).toBe("/repo");
		expect(request.sha).toBe("abc1234");
		expect(request.keepGoing).toBe(false);
		expect(request.promote).toBe(false);
		expect(request.datasetDir).toBeUndefined();
		expect(request.outFile).toBeUndefined();
	});
});

describe("parseLocalArgs --suites", () => {
	it("keeps a comma list in the order given — that is the execution order", () => {
		expect(parse(["--suites", "memory,cpu-node"]).suites).toEqual(["memory", "cpu-node"]);
	});

	it("tolerates surrounding whitespace", () => {
		expect(parse(["--suites", " memory , disk "]).suites).toEqual(["memory", "disk"]);
	});

	it("expands `all` to every registered suite", () => {
		expect(parse(["--suites", "all"]).suites).toEqual([...SUITE_NAMES]);
	});

	it("rejects an unregistered suite through the request schema", () => {
		expect(() => parse(["--suites", "gpu-vllm"])).toThrow(/invalid local run request/);
	});

	it("rejects a repeated suite, which would overwrite its own raw directory", () => {
		expect(() => parse(["--suites", "memory,memory"])).toThrow(/distinct/);
	});
});

describe("parseLocalArgs --replicates", () => {
	it("accepts the comma and the JSON-array spellings the CI fan-out uses", () => {
		expect(parse(["--replicates", "0,1,2"]).replicates).toEqual([0, 1, 2]);
		expect(parse(["--replicates", "[0,1,2]"]).replicates).toEqual([0, 1, 2]);
	});

	it("reports a malformed axis as a usage error, not a schema dump", () => {
		expect(() => parse(["--replicates", "nope"])).toThrow(LocalArgsError);
	});
});

describe("parseLocalArgs --as", () => {
	it("accepts a suffixed local label", () => {
		expect(parse(["--as", "local-thinkpad"]).label).toBe("local-thinkpad");
	});

	// The label becomes a raw-tree directory and part of a gap-marker filename.
	it("rejects a label that could escape the raw tree or name a provider", () => {
		expect(() => parse(["--as", "../e2b"])).toThrow();
		expect(() => parse(["--as", "e2b"])).toThrow();
		expect(() => parse(["--as", "my-laptop"])).toThrow();
	});
});

describe("parseLocalArgs --promote / --dataset", () => {
	it("defaults the dataset root to the results package's own constant", () => {
		expect(parse(["--promote"]).datasetDir).toBe(LOCAL_DATASET_DIR);
		expect(LOCAL_DATASET_DIR).toBe("data/local");
	});

	it("honours an explicit root", () => {
		expect(parse(["--promote", "--dataset", "/tmp/ds"]).datasetDir).toBe("/tmp/ds");
	});

	// Silently ignoring it would leave the operator believing they had published.
	it("rejects --dataset without --promote rather than ignoring it", () => {
		expect(() => parse(["--dataset", "/tmp/ds"])).toThrow(LocalArgsError);
	});

	it("carries no datasetDir when --promote is absent, so nothing can publish by accident", () => {
		expect(parse([]).datasetDir).toBeUndefined();
	});
});

describe("parseLocalArgs miscellaneous flags", () => {
	it("reads --run-id, --out and --keep-going", () => {
		const request = parse(["--run-id", "local-x1", "--out", "run.json", "--keep-going"]);
		expect(request.runId).toBe("local-x1");
		expect(request.outFile).toBe("run.json");
		expect(request.keepGoing).toBe(true);
	});

	it("rejects a runId the dataset filename contract could not hold", () => {
		expect(() => parse(["--run-id", "../etc"])).toThrow();
	});
});
