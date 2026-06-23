import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeProviderDir } from "./normalize-tree.ts";

// A composite carrying a catalogued node-web-tooling result plus an uncatalogued pts/git result.
// `samples` lets a second file diverge so we can prove the contamination-vs-benign distinction.
function composite(samples: string): string {
	return `<?xml version="1.0"?>
<PhoronixTestSuite>
  <Generated><TestClient>pts/10.8.4</TestClient></Generated>
  <Result>
    <Identifier>pts/node-web-tooling-1.0.1</Identifier>
    <Title>Node.js V8 Web Tooling Benchmark</Title>
    <Scale>runs/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>10.5</Value><RawString>${samples}</RawString></Entry></Data>
  </Result>
  <Result>
    <Identifier>pts/git-1.1.0</Identifier>
    <Title>Git</Title>
    <Scale>Seconds</Scale><Proportion>LIB</Proportion>
    <Data><Entry><Value>54.27</Value></Entry></Data>
  </Result>
</PhoronixTestSuite>`;
}

describe("normalizeProviderDir de-dupes a metric leaked into two composites", () => {
	// normalizeProviderDir joins rawRoot/providerId, so results live in a provider subdirectory.
	let root: string;
	let providerDir: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "norm-dedupe-"));
		providerDir = join(root, "daytona");
		mkdirSync(providerDir);
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("keeps one copy and does NOT pool samples across files (no inflated n)", () => {
		// Both files carry the same node-web-tooling + git result — the exact TEST_RESULTS_NAME-reuse
		// contamination seen in real PTS output. Pooling would give n=6 and a fabricated stddev.
		writeFileSync(join(providerDir, "pts_compress_zstd.xml"), composite("10.5:10.6:10.4"));
		writeFileSync(join(providerDir, "pts_node-web-tooling.xml"), composite("10.5:10.6:10.4"));

		const run = normalizeProviderDir(root, "daytona");
		const metric = run.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		expect(run.metrics).toHaveLength(1);
		expect(metric?.samples).toEqual([10.5, 10.6, 10.4]);
		expect(metric?.aggregates.n).toBe(3);
		// The uncatalogued git straggler is collapsed to a single entry too.
		expect(run.uncatalogued.filter((u) => u.id.startsWith("pts/git"))).toHaveLength(1);
	});

	it("warns loudly when the duplicate's samples diverge (real contamination, not a rewrite)", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			writeFileSync(join(providerDir, "pts_compress_zstd.xml"), composite("10.5:10.6:10.4"));
			writeFileSync(join(providerDir, "pts_node-web-tooling.xml"), composite("99.9:99.8"));
			normalizeProviderDir(root, "daytona");
			expect(warn.mock.calls.flat().join("\n")).toMatch(/DIFFERENT samples/);
		} finally {
			warn.mockRestore();
		}
	});
});
