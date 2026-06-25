// Drift gate for the provider × suite orchestrator: the workflow graph in bench-matrix.yml /
// bench-suite.yml must stay in sync with the registries it fans out over. GitHub Actions can't generate
// top-level jobs from data, so every SUITES entry needs a hand-written suite job — this test fails if one
// is missing (a suite the planner would emit but no job runs), and if the planner's credential env block
// drifts from the suite runner's (a provider the planner keeps that then skips, or vice versa).
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";

const workflowsDir = join(import.meta.dir, "..", "..", "..", ".github", "workflows");
const orchestrator = readFileSync(join(workflowsDir, "bench-matrix.yml"), "utf8");
const reusable = readFileSync(join(workflowsDir, "bench-suite.yml"), "utf8");

/** The provider-credential env keys (DAYTONA_/E2B_/MODAL_) a workflow file references. */
function credEnvKeys(workflow: string): Set<string> {
	const keys = new Set<string>();
	for (const m of workflow.matchAll(
		/^\s+(DAYTONA_[A-Z0-9_]*|E2B_[A-Z0-9_]*|MODAL_[A-Z0-9_]*):/gm,
	)) {
		const key = m[1];
		if (key) keys.add(key);
	}
	return keys;
}

describe("bench-matrix orchestrator ↔ registries", () => {
	it("wires one suite job per SUITES entry through the reusable workflow", () => {
		for (const suite of SUITE_NAMES) {
			// A job that fans this suite over the planned providers...
			expect(orchestrator).toContain(`suite: ${suite}`);
			// ...gated on the planner's padded suite token (expressions can't split strings)...
			expect(orchestrator).toContain(`',${suite},'`);
			// ...and awaited by package-raw so its results land in the curated tree (job name == suite).
			const needs = orchestrator.match(/package-raw:[\s\S]*?needs:\s*\[([^\]]*)\]/);
			expect(needs?.[1]).toContain(suite);
		}
		// Every suite job calls the one reusable lane.
		expect(orchestrator).toContain("uses: ./.github/workflows/bench-suite.yml");
	});

	it("keeps the planner's credential env block in sync with the suite runner's", () => {
		// The setup job reads credential PRESENCE; the bench job consumes them. If they drift, the
		// planner could keep a provider that then skips at run time (or drop one that could have run).
		expect(credEnvKeys(orchestrator)).toEqual(credEnvKeys(reusable));

		// Every registry provider's required credentials must appear in BOTH blocks (catches a provider
		// added to the schema but not threaded into the workflows).
		for (const provider of PROVIDERS) {
			for (const envVar of provider.requiredEnvVars) {
				expect(orchestrator).toContain(envVar);
				expect(reusable).toContain(envVar);
			}
		}
	});
});

describe("reusable bench-suite lane", () => {
	it("matrixes over the planned providers and produces raw subtrees", () => {
		// Fans over the credentialed provider list the planner emitted (the `${{ }}` wrapper is split
		// across substrings so Biome doesn't read the literal GitHub Actions expression as a JS template).
		expect(reusable).toContain("fromJSON(inputs.providers)");
		// Raw-only: package-raw normalizes the merged tree, not each cell.
		expect(reusable).toContain("--raw-only");
		// Uploads under the raw-files artifact-name contract package-raw parses back:
		// benchmark-results-<inputs.suite>-sandbox-<matrix.provider>.
		expect(reusable).toContain("name: benchmark-results-");
		expect(reusable).toContain("-sandbox-");
		expect(reusable).toContain("inputs.suite");
		expect(reusable).toContain("matrix.provider");
	});
});
