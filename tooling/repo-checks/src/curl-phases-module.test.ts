// Drift gate: the network probes must compute their phase timings by INCLUDING lib/jq/curl-phases.jq,
// never by carrying their own copy. That module is the one part of the producer where a divergent
// copy yields different NUMBERS from the same bytes rather than differently worded prose, and the
// numbers are what the artifacts publish. Its arithmetic is tested in
// packages/results/src/lib/curl-phases.test.ts; what this file guards is that the task actually runs
// the tested code.
//
// Like the other gates here, it reads the task as text: bash isn't importable. That makes it a proxy
// — a probe re-inlining the arithmetic under some other definition name would slip through — but it
// catches the realistic regression, which is a copy pasted back under the name it already had.
//
// It lives in repo-checks rather than beside the arithmetic tests because it is a structural
// invariant about the repo's layout, and because those tests skip themselves when jq is absent: a
// source-drift gate has no reason to depend on jq being installed, and would silently stop running.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();
const MODULE_CONSUMERS = [".mise/tasks/benchmark/network/latency"] as const;
/** Every definition the module owns — asserted present there, and absent from every consumer. */
const DEFINITIONS = ["def ms:", "def r3:", "def responded:", "def phases:", "def stats:"] as const;

describe("curl-phases.jq is the single home for the probes' phase arithmetic", () => {
	it("ships the module the consumers include", () => {
		const module = readFileSync(join(root, "lib/jq/curl-phases.jq"), "utf8");
		for (const definition of DEFINITIONS) {
			expect(module).toContain(definition);
		}
	});

	for (const task of MODULE_CONSUMERS) {
		it(`${task} loads the module`, () => {
			expect(readFileSync(join(root, task), "utf8")).toContain('include "curl-phases"');
		});

		it(`${task} defines no phase arithmetic of its own`, () => {
			const source = readFileSync(join(root, task), "utf8");
			for (const definition of DEFINITIONS) {
				expect(source).not.toContain(definition);
			}
		});
	}
});
