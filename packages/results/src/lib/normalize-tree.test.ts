import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	ECONOMICS_METRIC_IDS,
	getProvider,
	hourlyCostAtTargetSpec,
} from "@sandbox-benchmarks/schema";
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
		const matches = run.metrics.filter((m) => m.metricId === "node_web_tooling_runs_per_s");
		// The leaked metric is kept exactly once (other catalogued metrics — e.g. derived economics — may
		// also be present; this asserts the de-dup, not the total count).
		expect(matches).toHaveLength(1);
		const metric = matches[0];
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

describe("normalizeProviderDir reads the suite-tagged layout", () => {
	let root: string;
	let providerDir: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "norm-tagged-"));
		providerDir = join(root, "daytona");
		mkdirSync(providerDir);
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("attributes a suite subdirectory's metric and stamps its provenance with the suite", () => {
		const suiteDir = join(providerDir, "cpu-node");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_node-web-tooling.xml"), composite("16.1:16.3:16.0"));
		writeFileSync(join(suiteDir, "observed-specs.json"), JSON.stringify({ vcpus: 4, memoryGb: 8 }));

		const run = normalizeProviderDir(root, "daytona");
		expect(run.validationStatus).toBe("validated");
		const metric = run.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		// sourceFile is prefixed with the suite so a number stays traceable to the suite that wrote it.
		expect(metric?.sourceFile).toBe("cpu-node/pts_node-web-tooling.xml");
		// The git result is still an inert straggler, also suite-tagged.
		expect(run.uncatalogued.map((u) => u.sourceFile)).toEqual([
			"cpu-node/pts_node-web-tooling.xml",
		]);
		// observed-specs.json is read from the suite subdirectory (per-sandbox), not just the provider dir.
		expect(run.observedSpecs.vcpus).toBe(4);
	});

	it("records suitesCovered from the metrics a suite produced, not from the directory existing", () => {
		// The positive record of coverage has to mean "this suite produced a number here". A suite dir that
		// exists but yielded nothing (the run died mid-suite, every <Result> empty) is a HOLE, and crediting
		// the directory would launder it into coverage — hiding exactly the case the gaps exist to surface.
		const covered = join(providerDir, "cpu-node");
		mkdirSync(covered);
		writeFileSync(join(covered, "pts_node-web-tooling.xml"), composite("16.1:16.3:16.0"));
		const barren = join(providerDir, "memory");
		mkdirSync(barren);
		writeFileSync(join(barren, "observed-specs.json"), JSON.stringify({ vcpus: 4 }));

		const run = normalizeProviderDir(root, "daytona");
		expect(run.suitesCovered).toEqual(["cpu-node"]);
		// `memory` produced neither a metric nor a marker, so it is accounted for nowhere on this provider
		// — the Run cannot describe it, and buildLeaderboard derives it as `missing` across the whole run.
		expect(run.gaps).toEqual([]);
	});

	it("reads a suite's failure marker as a FAILED gap, not a skip", () => {
		const suiteDir = join(providerDir, "cpu-node");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "sandbox-daytona-cpu-node--failed.json"),
			JSON.stringify({
				provider: "daytona",
				suite: "cpu-node",
				outcome: "failed",
				reason: "PTS produced no pts_*.xml",
			}),
		);

		const run = normalizeProviderDir(root, "daytona");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "cpu-node",
				outcome: "failed",
				reason: "PTS produced no pts_*.xml",
			},
		]);
		// It produced no metric, so it is not coverage — a crash is not a result.
		expect(run.suitesCovered).toEqual([]);
		expect(run.validationStatus).toBe("pending");
	});

	it("appends derived economics ($/hr) to a validated provider", () => {
		const suiteDir = join(providerDir, "cpu-node");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_node-web-tooling.xml"), composite("16.1:16.3:16.0"));

		const run = normalizeProviderDir(root, "daytona");
		const usdPerHour = run.metrics.find((m) => m.metricId === ECONOMICS_METRIC_IDS.usdPerHour);
		expect(usdPerHour?.samples).toEqual([
			hourlyCostAtTargetSpec(getProvider("daytona")) ?? Number.NaN,
		]);
		// No lifecycle timings in a PTS-only run, so no per-lifecycle cost.
		expect(run.metrics.some((m) => m.metricId === ECONOMICS_METRIC_IDS.usdPerLifecycle)).toBe(
			false,
		);
	});

	it("maps the composite <System> to host specs while the probe owns the effective specs", () => {
		const suiteDir = join(providerDir, "cpu-node");
		mkdirSync(suiteDir);
		// A composite that discloses a 48-thread host through <System>, plus a node-web-tooling result.
		writeFileSync(
			join(suiteDir, "pts_node-web-tooling.xml"),
			`<?xml version="1.0"?>
<PhoronixTestSuite>
  <System>
    <Identifier>sandbox</Identifier>
    <Hardware>Processor: AMD EPYC 9R14 96-Core Processor (48 Cores), Memory: 4 x 16 GB</Hardware>
    <Software>OS: Ubuntu 24.04, Kernel: 6.8.0-1014-aws (x86_64)</Software>
    <User>root</User>
  </System>
  <Result>
    <Identifier>pts/node-web-tooling-1.0.1</Identifier>
    <Title>Node.js V8 Web Tooling Benchmark</Title>
    <Scale>runs/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>10.5</Value><RawString>10.5:10.6</RawString></Entry></Data>
  </Result>
</PhoronixTestSuite>`,
		);
		// The in-sandbox probe reports the EFFECTIVE 2-vCPU cgroup quota.
		writeFileSync(join(suiteDir, "observed-specs.json"), JSON.stringify({ vcpus: 2, memoryGb: 8 }));

		const run = normalizeProviderDir(root, "daytona");
		// Host disclosure from <System> lands on the host side…
		expect(run.observedSpecs.hostVcpus).toBe(48);
		expect(run.observedSpecs.hostMemoryGb).toBe(64);
		expect(run.observedSpecs.cpuModel).toBe("AMD EPYC 9R14 96-Core Processor");
		expect(run.observedSpecs.cpuMicroarch).toBe("Zen 4 (Genoa)");
		expect(run.observedSpecs.os).toBe("Ubuntu 24.04");
		// …while the probe still owns the effective fields (the host count never masquerades as effective).
		expect(run.observedSpecs.vcpus).toBe(2);
		expect(run.observedSpecs.memoryGb).toBe(8);
	});

	it("does NOT attach economics to a pending provider (no measured metrics)", () => {
		// Empty provider dir → pending; economics must not promote it or appear.
		const run = normalizeProviderDir(root, "daytona");
		expect(run.validationStatus).toBe("pending");
		expect(run.metrics).toEqual([]);
	});

	it("ignores (with a warning) a subdirectory that is not a registered suite", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			const bogusDir = join(providerDir, "not-a-suite");
			mkdirSync(bogusDir);
			writeFileSync(join(bogusDir, "pts_node-web-tooling.xml"), composite("16.1:16.3:16.0"));

			const run = normalizeProviderDir(root, "daytona");
			// The unknown subdir is skipped, so nothing is attributed and the provider stays pending.
			expect(run.metrics).toEqual([]);
			expect(run.validationStatus).toBe("pending");
			expect(warn.mock.calls.flat().join("\n")).toMatch(/not a registered suite/);
		} finally {
			warn.mockRestore();
		}
	});
});
