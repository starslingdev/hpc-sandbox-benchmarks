import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	ECONOMICS_METRIC_IDS,
	getProvider,
	harnessGapMarkerJson,
	hourlyCostAtTargetSpec,
} from "@sandbox-benchmarks/schema";
import { normalizeProviderDir } from "./normalize-tree.ts";

// A composite carrying a catalogued node-web-tooling result plus an uncatalogued synthetic result.
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
    <Identifier>pts/not-in-catalog-1.0.0</Identifier>
    <Title>Not In Catalog</Title>
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
		providerDir = join(root, "daytona-vm");
		mkdirSync(providerDir);
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("keeps one copy and does NOT pool samples across files (no inflated n)", () => {
		// Both files carry the same node-web-tooling + straggler — the exact TEST_RESULTS_NAME-reuse
		// contamination seen in real PTS output. Pooling would give n=6 and a fabricated stddev.
		writeFileSync(join(providerDir, "pts_compress_zstd.xml"), composite("10.5:10.6:10.4"));
		writeFileSync(join(providerDir, "pts_node-web-tooling.xml"), composite("10.5:10.6:10.4"));

		const run = normalizeProviderDir(root, "daytona-vm");
		const matches = run.metrics.filter((m) => m.metricId === "node_web_tooling_runs_per_s");
		// The leaked metric is kept exactly once (other catalogued metrics — e.g. derived economics — may
		// also be present; this asserts the de-dup, not the total count).
		expect(matches).toHaveLength(1);
		const metric = matches[0];
		expect(metric?.samples).toEqual([10.5, 10.6, 10.4]);
		expect(metric?.aggregates.n).toBe(3);
		// The uncatalogued straggler is collapsed to a single entry too.
		expect(run.uncatalogued.filter((u) => u.id.startsWith("pts/not-in-catalog"))).toHaveLength(1);
	});

	it("warns loudly when the duplicate's samples diverge (real contamination, not a rewrite)", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			writeFileSync(join(providerDir, "pts_compress_zstd.xml"), composite("10.5:10.6:10.4"));
			writeFileSync(join(providerDir, "pts_node-web-tooling.xml"), composite("99.9:99.8"));
			normalizeProviderDir(root, "daytona-vm");
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
		providerDir = join(root, "daytona-vm");
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

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.validationStatus).toBe("validated");
		const metric = run.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		// sourceFile is prefixed with the suite so a number stays traceable to the suite that wrote it.
		expect(metric?.sourceFile).toBe("cpu-node/pts_node-web-tooling.xml");
		// The synthetic result is still an inert straggler, also suite-tagged.
		expect(run.uncatalogued.map((u) => u.sourceFile)).toEqual([
			"cpu-node/pts_node-web-tooling.xml",
		]);
		// observed-specs.json is read from the suite subdirectory (per-sandbox), not just the provider dir.
		expect(run.observedSpecs.vcpus).toBe(4);
	});

	it("retains suite-tagged mise and PTS host records in the normalized provider", () => {
		const suiteDir = join(providerDir, "system");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "system-provider.json"),
			JSON.stringify({ asn: "AS64500", manufacturer: "Amazon EC2" }),
		);
		writeFileSync(
			join(suiteDir, "pts_git--metadata.json"),
			JSON.stringify({ systems: { sandbox: { hardware: { Processor: "AMD EPYC" } } } }),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.observedSpecs).toMatchObject({
			egressAsn: "AS64500",
			manufacturer: "Amazon EC2",
		});
		expect(run.hostMetadata?.map(({ source, sourceFile }) => ({ source, sourceFile }))).toEqual([
			{
				source: "phoronix/result-file-to-json",
				sourceFile: "system/pts_git--metadata.json",
			},
			{ source: "mise/system-provider", sourceFile: "system/system-provider.json" },
		]);
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

		const run = normalizeProviderDir(root, "daytona-vm");
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
				provider: "daytona-vm",
				suite: "cpu-node",
				outcome: "failed",
				reason: "PTS produced no pts_*.xml",
			}),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
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

		const run = normalizeProviderDir(root, "daytona-vm");
		const usdPerHour = run.metrics.find((m) => m.metricId === ECONOMICS_METRIC_IDS.usdPerHour);
		expect(usdPerHour?.samples).toEqual([
			hourlyCostAtTargetSpec(getProvider("daytona-vm")) ?? Number.NaN,
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

		const run = normalizeProviderDir(root, "daytona-vm");
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
		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.validationStatus).toBe("pending");
		expect(run.metrics).toEqual([]);
	});

	it("ignores (with a warning) a subdirectory that is not a registered suite", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			const bogusDir = join(providerDir, "not-a-suite");
			mkdirSync(bogusDir);
			writeFileSync(join(bogusDir, "pts_node-web-tooling.xml"), composite("16.1:16.3:16.0"));

			const run = normalizeProviderDir(root, "daytona-vm");
			// The unknown subdir is skipped, so nothing is attributed and the provider stays pending.
			expect(run.metrics).toEqual([]);
			expect(run.validationStatus).toBe("pending");
			expect(warn.mock.calls.flat().join("\n")).toMatch(/not a registered suite/);
		} finally {
			warn.mockRestore();
		}
	});
});

// A STREAM composite whose per-type Results can be individually valued or empty — the shape a
// partially-failed memory suite writes (each Result maps to one stream_type_* metric).
function streamComposite(entries: Array<[type: string, value: string]>): string {
	const results = entries
		.map(
			([type, value]) => `  <Result>
    <Identifier>pts/stream-1.3.4</Identifier>
    <Title>Stream</Title>
    <Description>Type: ${type}</Description>
    <Scale>MB/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>${value}</Value></Entry></Data>
  </Result>`,
		)
		.join("\n");
	return `<?xml version="1.0"?>\n<PhoronixTestSuite>\n${results}\n</PhoronixTestSuite>`;
}

// The catalogued twin-pair base for fio seq-read 1MB O_DIRECT (suffixes _mb_per_s/_iops complete it).
const SEQ_READ_DIRECT_YES =
	"fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory";

// A fio composite for that scenario: twin Results share one <Description> and differ only in
// <Scale> — the caller passes whichever twins PTS actually wrote (its duplicate-value dedup drops
// a twin ENTIRELY when the numeric values collide, so a one-entry composite is the real artifact).
function fioSeqReadComposite(entries: Array<[scale: string, value: string]>): string {
	const description =
		"Type: Sequential Read - Engine: Linux AIO - Direct: Yes - Block Size: 1MB - Job Count: 1 - Disk Target: Default Test Directory";
	const results = entries
		.map(
			([scale, value]) => `  <Result>
    <Identifier>pts/fio-2.1.0</Identifier>
    <Title>Flexible IO Tester</Title>
    <Description>${description}</Description>
    <Scale>${scale}</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>${value}</Value></Entry></Data>
  </Result>`,
		)
		.join("\n");
	return `<?xml version="1.0"?>\n<PhoronixTestSuite>\n${results}\n</PhoronixTestSuite>`;
}

// An all-trials-failed node-web-tooling composite: the Result is present but carries no value.
// An all-trials-failed pybench composite (system suite's second leaf in the leaf-dedupe tests).
const emptyPybenchComposite = `<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>pts/pybench-1.1.3</Identifier>
    <Title>PyBench</Title>
    <Scale>Milliseconds</Scale><Proportion>LIB</Proportion>
    <Data><Entry><Value></Value><RawString></RawString></Entry></Data>
  </Result>
</PhoronixTestSuite>`;

const emptyNodeComposite = `<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>pts/node-web-tooling-1.0.1</Identifier>
    <Title>Node.js V8 Web Tooling Benchmark</Title>
    <Scale>runs/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value></Value><RawString></RawString></Entry></Data>
  </Result>
</PhoronixTestSuite>`;

describe("normalizeProviderDir suite-shortfall gaps and leaf-marker folding", () => {
	let root: string;
	let providerDir: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "norm-shortfall-"));
		providerDir = join(root, "daytona-vm");
		mkdirSync(providerDir);
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("folds a leaf-named bash marker into its suite's gap id", () => {
		// resultGapSchema's vocabulary: a suite-scoped gap's id IS the suite name. A bash fail_result
		// marker carries the LEAF name, which — unfolded — would enter the leaderboard's missing-suite
		// denominator as a bogus 'suite' and accuse every healthy provider of missing it. The fold keeps
		// the leaf identity in the reason. The surviving hardlink metric keeps disk covered (keep+warn).
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_fio-rand-read--failed.json"),
			'{"outcome":"failed","benchmark":"pts_fio-rand-read","reason":"PTS batch-run of pts/fio-2.1.0 completed but every trial errored (composite carries no values)"}\n',
		);
		writeFileSync(
			join(suiteDir, "pts_hardlink.xml"),
			`<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>local/hardlink-1.0.0</Identifier>
    <Title>Hardlink Throughput</Title>
    <Scale>bogo ops/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>2.46</Value><RawString>2.39:2.53</RawString></Entry></Data>
  </Result>
</PhoronixTestSuite>`,
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "disk",
				outcome: "failed",
				reason:
					"pts_fio-rand-read: PTS batch-run of pts/fio-2.1.0 completed but every trial errored (composite carries no values)",
			},
		]);
		expect(run.suitesCovered).toEqual(["disk"]);
		expect(run.validationStatus).toBe("validated");
	});

	it("TOTAL LOSS: an all-empty catalogued composite becomes ONE suite/failed shortfall gap", () => {
		// PTS exits 0 on this shape, so without the shortfall the suite would be a green job with no
		// metric and no gap — the exact silence that made pgbench vanish from three published runs.
		const suiteDir = join(providerDir, "cpu-node");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_node-web-tooling.xml"), emptyNodeComposite);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "cpu-node",
				outcome: "failed",
				reason:
					"PTS ran but every trial failed for 1 of 1 declared metrics: node_web_tooling_runs_per_s (cpu-node/pts_node-web-tooling.xml) — attempted, no value recorded",
			},
		]);
		expect(run.suitesCovered).toEqual([]);
		expect(run.validationStatus).toBe("pending");
	});

	it("MARKER DEDUPE: a harness whole-suite failed marker is not doubled by a shortfall gap", () => {
		const suiteDir = join(providerDir, "cpu-node");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_node-web-tooling.xml"), emptyNodeComposite);
		writeFileSync(
			join(suiteDir, "sandbox-daytona-vm-cpu-node--failed.json"),
			harnessGapMarkerJson("daytona-vm", "cpu-node", "failed", "PTS produced no result"),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		// Exactly ONE cpu-node gap — the marker's reason wins; the shortfall stays suppressed.
		expect(run.gaps).toEqual([
			{ scope: "suite", id: "cpu-node", outcome: "failed", reason: "PTS produced no result" },
		]);
	});

	it("FLAT MARKER DEDUPE: a legacy harness failure still mutes the suite shortfall", () => {
		const suiteDir = join(providerDir, "cpu-node");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_node-web-tooling.xml"), emptyNodeComposite);
		// Mixed-layout replay: the composite was already nested, but the harness marker still landed at
		// provider root. Its registered suite id is enough to retain whole-suite suppression.
		writeFileSync(
			join(providerDir, "sandbox-daytona-vm-cpu-node--failed.json"),
			harnessGapMarkerJson("daytona-vm", "cpu-node", "failed", "legacy flat failure"),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{ scope: "suite", id: "cpu-node", outcome: "failed", reason: "legacy flat failure" },
		]);
	});

	it("LEAF-SCOPED DEDUPE: a folded leaf failure mutes only its own leaf, not a sibling's loss", () => {
		// system has two leaves here: git's failure is recorded by its own folded marker, while
		// pybench was attempted-and-empty with NO marker. The git marker must not swallow pybench's
		// loss — the shortfall gap still surfaces, naming only the sibling's metric.
		const suiteDir = join(providerDir, "system");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_git--failed.json"),
			'{"outcome":"failed","benchmark":"pts_git","reason":"PTS batch-run of pts/git completed but every trial errored (composite carries no values)"}\n',
		);
		writeFileSync(join(suiteDir, "pts_pybench.xml"), emptyPybenchComposite);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "system",
				outcome: "failed",
				reason:
					"pts_git: PTS batch-run of pts/git completed but every trial errored (composite carries no values)",
			},
			{
				scope: "suite",
				id: "system",
				outcome: "failed",
				reason:
					"PTS ran but every trial failed for 1 of 3 declared metrics: pybench_milliseconds (system/pts_pybench.xml) — attempted, no value recorded",
			},
		]);
	});

	it("LEAF-SCOPED DEDUPE: a folded leaf failure IS its own leaf's record — no doubled shortfall", () => {
		// The bash guard writes the marker AND leaves the empty composite behind; the marker already
		// names this leaf's loss, so a shortfall repeating the same leaf's metric would double-count.
		const suiteDir = join(providerDir, "system");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_pybench--failed.json"),
			'{"outcome":"failed","benchmark":"pts_pybench","reason":"PTS batch-run of pts/pybench completed but every trial errored (composite carries no values)"}\n',
		);
		writeFileSync(join(suiteDir, "pts_pybench.xml"), emptyPybenchComposite);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "system",
				outcome: "failed",
				reason:
					"pts_pybench: PTS batch-run of pts/pybench completed but every trial errored (composite carries no values)",
			},
		]);
	});

	it("CONTAMINATION: a marker cannot mute a different test merely because its Result leaked into that filename", () => {
		const suiteDir = join(providerDir, "system");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_git--failed.json"),
			'{"outcome":"failed","benchmark":"pts_git","reason":"git failed"}\n',
		);
		// PTS contamination can copy PyBench's Result under Git's result name. The metric's catalogued
		// pts/pybench identity — not this misleading filename — decides which marker owns the loss.
		writeFileSync(join(suiteDir, "pts_git.xml"), emptyPybenchComposite);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{ scope: "suite", id: "system", outcome: "failed", reason: "pts_git: git failed" },
			{
				scope: "suite",
				id: "system",
				outcome: "failed",
				reason:
					"PTS ran but every trial failed for 1 of 3 declared metrics: pybench_milliseconds (system/pts_git.xml) — attempted, no value recorded",
			},
		]);
	});

	it("FLAT LEAF FOLD: a legacy pts_git marker maps to system instead of fabricating a suite", () => {
		writeFileSync(
			join(providerDir, "pts_git--failed.json"),
			'{"outcome":"failed","benchmark":"pts_git","reason":"legacy git failure"}\n',
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "system",
				outcome: "failed",
				reason: "pts_git: legacy git failure",
			},
		]);
	});

	it("FLAT RESCUE: a metric the legacy flat layout produced is never claimed as a shortfall", () => {
		// Mixed layout: the suite copy of pybench is empty but a legacy flat file carries the value.
		// The dataset publishes that value, so a shortfall gap claiming it 'produced no value' would
		// contradict the published metric — the flat contribution mutes the entry.
		const suiteDir = join(providerDir, "system");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_pybench.xml"), emptyPybenchComposite);
		writeFileSync(
			join(providerDir, "pts_pybench.xml"),
			`<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>pts/pybench-1.1.3</Identifier>
    <Title>PyBench</Title>
    <Scale>Milliseconds</Scale><Proportion>LIB</Proportion>
    <Data><Entry><Value>475</Value><RawString>474:476</RawString></Entry></Data>
  </Result>
</PhoronixTestSuite>`,
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([]);
		expect(run.metrics.map((m) => m.metricId)).toContain("pybench_milliseconds");
	});

	it("PARTIAL SHORTFALL: a suite stays covered AND gapped when only some declared metrics report", () => {
		// keep+warn: the metrics that did succeed keep ranking (memory is covered via Copy/Scale) while
		// the attempted-and-lost Add/Triad are named in a recorded gap instead of silently vanishing.
		const suiteDir = join(providerDir, "memory");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_stream.xml"),
			streamComposite([
				["Copy", "66500"],
				["Scale", "45000"],
				["Add", ""],
				["Triad", ""],
			]),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.suitesCovered).toEqual(["memory"]);
		expect(run.metrics.map((m) => m.metricId)).toContain("stream_type_copy");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "memory",
				outcome: "failed",
				reason:
					"PTS ran but every trial failed for 2 of 4 declared metrics: stream_type_add (memory/pts_stream.xml), stream_type_triad (memory/pts_stream.xml) — attempted, no value recorded",
			},
		]);
	});

	it("LEGIT ABSENCE: declared-but-unattempted metrics never gap (no Result element, no evidence)", () => {
		// The disk O_DIRECT-variant rule and PTS's duplicate-value drop: a declared metric whose
		// <Result> is absent entirely was never attempted here — an expectation-based diff would
		// fabricate a gap for it, so the detection is evidence-based only.
		const suiteDir = join(providerDir, "memory");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_stream.xml"),
			streamComposite([
				["Copy", "66500"],
				["Scale", "45000"],
			]),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.suitesCovered).toEqual(["memory"]);
		expect(run.gaps).toEqual([]);
	});

	it("LEAF MARKER + SHORTFALL COEXIST: a leaf SKIP never hides a different leaf's attempted loss", () => {
		// One leaf was deliberately skipped (folded to the suite id, leaf kept in the reason) while a
		// DIFFERENT declared metric was attempted and lost — both facts must survive: a skip is not a
		// failure, so it must not suppress the shortfall the way a failed marker does.
		const suiteDir = join(providerDir, "system");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_git--skipped.json"),
			'{"schema_version":"1.0","benchmark":"pts_git","skipped":true,"skip_reason":"PTS unavailable"}\n',
		);
		writeFileSync(
			join(suiteDir, "pts_pybench.xml"),
			`<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>pts/pybench-1.1.3</Identifier>
    <Title>PyBench</Title>
    <Scale>Milliseconds</Scale><Proportion>LIB</Proportion>
    <Data><Entry><Value></Value></Entry></Data>
  </Result>
</PhoronixTestSuite>`,
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{ scope: "suite", id: "system", outcome: "skipped", reason: "pts_git: PTS unavailable" },
			{
				scope: "suite",
				id: "system",
				outcome: "failed",
				reason:
					"PTS ran but every trial failed for 1 of 3 declared metrics: pybench_milliseconds (system/pts_pybench.xml) — attempted, no value recorded",
			},
		]);
	});

	it("DROPPED TWIN: one fio twin present, its pair absent ENTIRELY -> gap naming the dropped twin", () => {
		// PTS's result-parser drops a <Result> whose numeric values duplicate an earlier result's —
		// with 1MB blocks MB/s == IOPS, so the MB/s twin is ABSENT (not empty) and attemptedEmpty
		// never sees it. The surviving IOPS twin is the evidence the scenario ran (keep+warn: it
		// stays ranked, disk stays covered, the loss is named).
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_fio-seq-read.xml"), fioSeqReadComposite([["IOPS", "11650"]]));

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.suitesCovered).toEqual(["disk"]);
		expect(run.metrics.map((m) => m.metricId)).toContain(`${SEQ_READ_DIRECT_YES}_iops`);
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "disk",
				outcome: "failed",
				reason: `PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued <Result> was never written): ${SEQ_READ_DIRECT_YES}_mb_per_s (twin survived in disk/pts_fio-seq-read.xml)`,
			},
		]);
	});

	it("BOTH TWINS PRESENT: rounding-distinct MB/s and IOPS both survive -> no twin gap", () => {
		// The counter-case from the same real run: modal-vm seq-read posted 1731 vs 1729 — equality
		// is a per-run coin flip, and a full pair must never gap.
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_fio-seq-read.xml"),
			fioSeqReadComposite([
				["MB/s", "1731"],
				["IOPS", "1729"],
			]),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		const ids = run.metrics.map((m) => m.metricId);
		expect(ids).toContain(`${SEQ_READ_DIRECT_YES}_mb_per_s`);
		expect(ids).toContain(`${SEQ_READ_DIRECT_YES}_iops`);
		expect(run.gaps).toEqual([]);
	});

	it("UNMAPPED SIBLING: a written Result that misses the catalog is not called a dropped twin", () => {
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_fio-seq-read.xml"),
			fioSeqReadComposite([
				["IOPS", "11650"],
				["Megabytes/s", "11650"],
			]),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.metrics.map((m) => m.metricId)).toContain(`${SEQ_READ_DIRECT_YES}_iops`);
		expect(run.uncatalogued).toHaveLength(1);
		expect(run.gaps).toEqual([]);
	});

	it("FLAT RESCUE: a legacy flat measurement suppresses a suite-local twin candidate", () => {
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_fio-seq-read.xml"), fioSeqReadComposite([["IOPS", "11650"]]));
		writeFileSync(
			join(providerDir, "pts_fio-seq-read.xml"),
			fioSeqReadComposite([["MB/s", "11650"]]),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		const ids = run.metrics.map((m) => m.metricId);
		expect(ids).toContain(`${SEQ_READ_DIRECT_YES}_mb_per_s`);
		expect(ids).toContain(`${SEQ_READ_DIRECT_YES}_iops`);
		expect(run.gaps).toEqual([]);
	});

	it("BOTH TWINS ABSENT: an un-probed scenario stays gap-free (the probe-subset rule)", () => {
		// disk covered via hardlink alone; every fio pair has BOTH members absent — the direct_no
		// variants are legitimately never probed, and a pair with no survivor carries no evidence.
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_hardlink.xml"),
			`<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>local/hardlink-1.0.0</Identifier>
    <Title>Hardlink Throughput</Title>
    <Scale>bogo ops/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>2.62</Value></Entry></Data>
  </Result>
</PhoronixTestSuite>`,
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.suitesCovered).toEqual(["disk"]);
		expect(run.gaps).toEqual([]);
	});

	it("4KB SIBLING ABSENT: no twin gap — MB/s and IOPS cannot collide at 4KB", () => {
		// PTS's duplicate-value drop needs numeric equality, which only 1MB blocks produce (1 op ==
		// 1 MB). A missing 4KB sibling is some other pathology; labeling it "duplicate-value dedup"
		// would publish a false explanation, so 4KB pairs are excluded from twin detection.
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_fio-rand-read.xml"),
			`<?xml version="1.0"?>
<PhoronixTestSuite>
  <Result>
    <Identifier>pts/fio-2.1.0</Identifier>
    <Title>Flexible IO Tester</Title>
    <Description>Type: Random Read - Engine: Linux AIO - Direct: Yes - Block Size: 4KB - Job Count: 1 - Disk Target: Default Test Directory</Description>
    <Scale>IOPS</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>11650</Value></Entry></Data>
  </Result>
</PhoronixTestSuite>`,
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.suitesCovered).toEqual(["disk"]);
		expect(run.gaps).toEqual([]);
	});

	it("TWIN GAP SUPPRESSED: an existing suite-scope failed gap wins over the twin gap (no doubling)", () => {
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_fio-seq-read.xml"), fioSeqReadComposite([["IOPS", "11650"]]));
		writeFileSync(
			join(suiteDir, "sandbox-daytona-vm-disk--failed.json"),
			harnessGapMarkerJson("daytona-vm", "disk", "failed", "fio timed out mid-suite"),
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{ scope: "suite", id: "disk", outcome: "failed", reason: "fio timed out mid-suite" },
		]);
	});

	it("DIFFERENT LEAF FAILURE: its folded marker coexists with a seq-read twin loss", () => {
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_fio-seq-read.xml"), fioSeqReadComposite([["IOPS", "11650"]]));
		writeFileSync(
			join(suiteDir, "pts_fio-rand-read--failed.json"),
			'{"outcome":"failed","benchmark":"pts_fio-rand-read","reason":"random read failed"}\n',
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "disk",
				outcome: "failed",
				reason: "pts_fio-rand-read: random read failed",
			},
			{
				scope: "suite",
				id: "disk",
				outcome: "failed",
				reason: `PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued <Result> was never written): ${SEQ_READ_DIRECT_YES}_mb_per_s (twin survived in disk/pts_fio-seq-read.xml)`,
			},
		]);
	});

	it("CONTAMINATED FILENAME: a rand-read marker cannot hide a seq-read twin loss", () => {
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		// PTS can leak a Result under another leaf's result name. The seq-read metric identity must win
		// over this rand-read filename when deciding whether the rand-read marker owns the loss.
		writeFileSync(
			join(suiteDir, "pts_fio-rand-read.xml"),
			fioSeqReadComposite([["IOPS", "11650"]]),
		);
		writeFileSync(
			join(suiteDir, "pts_fio-rand-read--failed.json"),
			'{"outcome":"failed","benchmark":"pts_fio-rand-read","reason":"random read failed"}\n',
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "disk",
				outcome: "failed",
				reason: "pts_fio-rand-read: random read failed",
			},
			{
				scope: "suite",
				id: "disk",
				outcome: "failed",
				reason: `PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued <Result> was never written): ${SEQ_READ_DIRECT_YES}_mb_per_s (twin survived in disk/pts_fio-rand-read.xml)`,
			},
		]);
	});

	it("SAME LEAF FAILURE: its folded marker suppresses the duplicate twin-loss gap", () => {
		const suiteDir = join(providerDir, "disk");
		mkdirSync(suiteDir);
		writeFileSync(join(suiteDir, "pts_fio-seq-read.xml"), fioSeqReadComposite([["IOPS", "11650"]]));
		writeFileSync(
			join(suiteDir, "pts_fio-seq-read--failed.json"),
			'{"outcome":"failed","benchmark":"pts_fio-seq-read","reason":"sequential read failed"}\n',
		);

		const run = normalizeProviderDir(root, "daytona-vm");
		expect(run.gaps).toEqual([
			{
				scope: "suite",
				id: "disk",
				outcome: "failed",
				reason: "pts_fio-seq-read: sequential read failed",
			},
		]);
	});

	it("emits byte-identical shortfall reasons across normalize runs (the aggregate dedupe key)", () => {
		// The aggregate folds replicate shards' gaps by (scope, id, outcome, reason) — a timestamp or
		// unstable ordering in the reason would stack one gap per replicate instead of one per suite.
		const suiteDir = join(providerDir, "memory");
		mkdirSync(suiteDir);
		writeFileSync(
			join(suiteDir, "pts_stream.xml"),
			streamComposite([
				["Triad", ""],
				["Add", ""],
			]),
		);

		const first = normalizeProviderDir(root, "daytona-vm");
		const second = normalizeProviderDir(root, "daytona-vm");
		expect(first.gaps).toEqual(second.gaps);
		expect(first.gaps[0]?.reason).toBe(
			"PTS ran but every trial failed for 2 of 4 declared metrics: stream_type_add (memory/pts_stream.xml), stream_type_triad (memory/pts_stream.xml) — attempted, no value recorded",
		);
	});
});
