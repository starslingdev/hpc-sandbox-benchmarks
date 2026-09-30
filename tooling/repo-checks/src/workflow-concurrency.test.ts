import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { quotaDomain } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { checkConcurrencyQueues } from "./lib/workflow-concurrency.ts";
import { findRepoRoot } from "./lib/workspace.ts";

test("queue compatibility rejects invalid values and pending-work cancellation", () => {
	for (const value of ["one", "true", "100", `'\${{ inputs.queue }}'`]) {
		expect(() =>
			checkConcurrencyQueues(
				`jobs: {}\nconcurrency:\n  group: account\n  cancel-in-progress: false\n  queue: ${value}`,
			),
		).toThrow();
	}
	expect(() =>
		checkConcurrencyQueues(
			"jobs: {}\nconcurrency:\n  group: account\n  queue: max\n  cancel-in-progress: true",
		),
	).toThrow();
	expect(() =>
		checkConcurrencyQueues(
			"jobs: {}\nconcurrency:\n  group: account\n  queue: max\n  cancel-in-progress: false",
		),
	).not.toThrow();
});

test("all current allocating workflows share account queues across variants and lanes", () => {
	const schema = type({ jobs: { "[string]": { "concurrency?": "unknown" } } });
	const queueSchema = type({ group: "string", queue: "'max'", "cancel-in-progress": "false" });
	const jobQueue = (file: string, job: string) => {
		const source = readFileSync(join(findRepoRoot(), ".github/workflows", file), "utf8");
		checkConcurrencyQueues(source);
		return queueSchema.assert(schema.assert(Bun.YAML.parse(source)).jobs[job]?.concurrency);
	};
	// CPU batches bind the frozen domain directly; the bake lane resolves the same registry domains.
	const bench = jobQueue("bench-suite.yml", "bench").group;
	expect(bench).toBe(`benchmark-account-\${{ inputs.account }}`);
	for (const job of ["release", "namespace"])
		expect(jobQueue("provider-release-worker.yml", job).group).toBe(bench);
	expect(jobQueue("bench-suite.yml", "namespace").group).toBe(bench);
	// The GPU lane is Modal-only and names the account directly: the registry's domain, not a literal
	// that could survive a rename.
	for (const job of ["prepare-assets", "prepare-kernels", "benchmark"])
		expect(jobQueue("bench-gpu-worker.yml", job).group).toBe(
			`benchmark-account-${quotaDomain("modal-gvisor")}`,
		);
});
