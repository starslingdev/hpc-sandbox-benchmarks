import { describe, expect, it } from "bun:test";
import { catalogSchema } from "./catalog.ts";
import {
	DIMENSIONS,
	getMetric,
	headlineMetric,
	METRIC_CATALOG,
	metricsForDimension,
} from "./index.ts";

describe("metric catalog", () => {
	it("has unique metric ids", () => {
		const ids = METRIC_CATALOG.map((metric) => metric.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("places every metric in a known dimension and gives PTS metrics a test profile", () => {
		for (const metric of METRIC_CATALOG) {
			expect(DIMENSIONS).toContain(metric.dimension);
			if (metric.pts) expect(metric.pts.test.length).toBeGreaterThan(0);
		}
	});

	it("uses snake_case slugs for every metric id", () => {
		// The id is a stability-contract key and shows up in URLs/filenames/JSON, so it must be a plain
		// lowercase snake_case slug — no uppercase, leading/trailing/doubled underscores, or punctuation.
		// A generated PTS slug or a hand-authored harness/economics id that drifts off this shape fails
		// here rather than shipping an un-greppable id.
		const slug = /^[a-z0-9]+(_[a-z0-9]+)*$/;
		for (const metric of METRIC_CATALOG) {
			expect(metric.id).toMatch(slug);
		}
	});

	it("never gives a derived metric a pts source", () => {
		// `derived` (economics) and `pts` (parsed from a PTS <Result>) are mutually exclusive provenances:
		// a derived metric is computed from pricing + measured runtime, never parsed. A derived entry that
		// also carried `pts` would make ptsResultToMetric try to route a parsed result onto it.
		for (const metric of METRIC_CATALOG) {
			if (metric.derived) expect(metric.pts).toBeUndefined();
		}
	});

	it("gives every dimension EXACTLY one headline metric", () => {
		// Both directions matter and neither is checked at load: the catalog's load check rejects a
		// SECOND headline but never a MISSING one, and headlineMetric reads the METRIC_CATALOG singleton
		// (it takes no catalog parameter), so its no-headline throw is unreachable from a crafted
		// catalog. This test IS the zero-headline guard — dropping `headline: true` from any dimension's
		// metric turns it red here rather than at runtime inside headlineMetric().
		for (const dimension of DIMENSIONS) {
			const headlines = metricsForDimension(dimension).filter((metric) => metric.headline);
			expect(headlines.length).toBe(1);
		}
	});

	it("resolves the node-web-tooling headline for cpu", () => {
		const metric = headlineMetric("cpu");
		expect(metric.id).toBe("node_web_tooling_runs_per_s");
		expect(metric.direction).toBe("HIB");
		expect(metric.pts?.test).toBe("pts/node-web-tooling");
		expect(getMetric(metric.id)).toBe(metric);
	});

	it("wires the generated PTS catalog (curated), not a hand-authored stand-in", () => {
		// Guards against a revert to a hand-authored stand-in: the pgbench 160-combination matrix only
		// exists in the generated module, and the override-supplied short label proves curation was applied.
		const pgbench = getMetric("pgbench_scaling_factor_100_clients_50_mode_read_only");
		expect(pgbench?.pts).toEqual({
			test: "pts/pgbench",
			description: "Scaling Factor: 100 - Clients: 50 - Mode: Read Only",
		});
		expect(pgbench?.label).toBe("pgbench RO (s100, 50c)");
		expect(getMetric("node_web_tooling_runs_per_s")?.headline).toBe(true);
	});

	it("resolves the PyBench headline for the system dimension (both system metrics catalogued)", () => {
		const metric = headlineMetric("system");
		expect(metric.id).toBe("pybench_milliseconds");
		expect(metric.label).toBe("PyBench"); // curated short label
		expect(metric.pts?.test).toBe("pts/pybench");
		// Single-result wildcard: no pts.description (so the byte-match gate needs no recorded composite).
		expect(metric.pts?.description).toBeUndefined();
		expect(getMetric("sqlite_speedtest_seconds")?.dimension).toBe("system");
	});

	it("resolves the STREAM Triad headline for the memory dimension (multi-result option matrix)", () => {
		const metric = headlineMetric("memory");
		expect(metric.id).toBe("stream_type_triad");
		expect(metric.label).toBe("STREAM Triad"); // curated short label
		expect(metric.unit).toBe("MB/s");
		expect(metric.direction).toBe("HIB");
		// Multi-result: the description disambiguator is the byte-match the golden gate proves.
		expect(metric.pts).toEqual({ test: "pts/stream", description: "Type: Triad" });
		expect(
			metricsForDimension("memory")
				.map((m) => m.id)
				.sort(),
		).toEqual(["stream_type_add", "stream_type_copy", "stream_type_scale", "stream_type_triad"]);
	});

	it("resolves the fio 4K random-read IOPS headline for the disk dimension", () => {
		const metric = headlineMetric("disk");
		expect(metric.id).toBe(
			"fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops",
		);
		expect(metric.label).toBe("fio rand read 4KB, O_DIRECT (IOPS)");
		expect(metric.direction).toBe("HIB");
	});

	it("resolves hardlink via a non-`pts/` (local) join key", () => {
		const metric = getMetric("hardlink_bogo_ops_per_s");
		expect(metric?.label).toBe("Hardlink throughput");
		expect(metric?.direction).toBe("HIB");
		// Repo-local profile: the join prefix is `local/`, proving the generator is source-segment-aware.
		expect(metric?.pts).toEqual({ test: "local/hardlink" });
	});

	it("returns undefined for an unknown metric id", () => {
		expect(getMetric("not_a_metric")).toBeUndefined();
	});

	it("keeps the controlled localhost iperf3 measurement as the network headline", () => {
		const metric = headlineMetric("network");
		expect(metric.id).toBe(
			"iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1",
		);
		expect(metric.label).toBe("iperf3 loopback TCP, 1 stream");
		expect(metric.direction).toBe("HIB");
		// The vendored subset's pinned axes travel in the runtime description the catalog joins on.
		expect(metric.pts).toEqual({
			test: "pts/iperf",
			description:
				"Server Address: localhost - Server Port: 5201 - Duration: 10 Seconds - Test: TCP - Parallel: 1",
		});
	});

	it("resolves the WAN iperf3 pair via the local/ join key with per-direction descriptions", () => {
		const download = getMetric("iperf_wan_direction_download");
		const upload = getMetric("iperf_wan_direction_upload");
		expect(download?.pts).toEqual({ test: "local/iperf-wan", description: "Direction: Download" });
		expect(upload?.pts).toEqual({ test: "local/iperf-wan", description: "Direction: Upload" });
		expect(download?.direction).toBe("HIB");
		expect(upload?.label).toBe("iperf3 WAN upload");
	});

	it("keeps the retired-from-suite network profiles catalogued for manual runs (sans headline)", () => {
		// fast-cli and network-loopback left the SUITE, not the repo: their profiles stay vendored and
		// manually runnable, so their metrics stay catalogued — but the network headline moved to the
		// localhost iperf3 metric above.
		const loopback = getMetric("network_loopback_seconds");
		expect(loopback?.label).toBe("Loopback TCP (10GB)");
		expect(loopback?.headline).toBe(false);
		expect(getMetric("fast_cli_internet_download_speed")?.label).toBe("fast.com download");
	});

	it("resolves fio's scale-pinned twin metrics for one description (disk dimension)", () => {
		const mbps = getMetric(
			"fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s",
		);
		const iops = getMetric(
			"fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops",
		);
		const description =
			"Type: Random Read - Engine: Linux AIO - Direct: Yes - Block Size: 4KB - Job Count: 1 - Disk Target: Default Test Directory";
		expect(mbps?.pts).toEqual({ test: "pts/fio", description, scale: "MB/s" });
		expect(iops?.pts).toEqual({ test: "pts/fio", description, scale: "IOPS" });
		expect(mbps?.unit).toBe("MB/s");
		expect(iops?.unit).toBe("IOPS");
		// Both HIB from the parser-level <ResultProportion> (fio has no profile-level <Proportion>).
		expect(mbps?.direction).toBe("HIB");
		expect(iops?.direction).toBe("HIB");
	});

	it("enumerates fio's FULL option matrix (960 scale-pinned entries)", () => {
		// 4 Type × 5 Engine × 2 Direct × 12 Block Size × 1 Job Count × 1 (virtual) Disk Target × 2 scales.
		// Only the 16 curated ids are otherwise guarded, and the drift gate compares the committed bytes
		// against a run of the SAME (possibly regressed) generator — so a synthesize.ts regression that
		// silently drops the twins for some engines would stay green everywhere. This pins the arithmetic.
		const fio = METRIC_CATALOG.filter((metric) => metric.pts?.test === "pts/fio");
		expect(fio.length).toBe(960);
	});
});

describe("catalogSchema PTS-mapping invariant", () => {
	// A valid non-PTS scaffold; each case overrides only id + pts to exercise the .narrow.
	const base = {
		dimension: "cpu",
		unit: "runs/s",
		direction: "HIB",
		headline: false,
		label: "x",
		description: "x",
	} as const;

	it("accepts a wildcard and a described entry for DIFFERENT tests", () => {
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a" } },
				{ ...base, id: "b", pts: { test: "pts/b", description: "Foo" } },
			]),
		).not.toThrow();
	});

	it("accepts multiple described entries for the same test (the multi-result matrix)", () => {
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a", description: "Compression" } },
				{ ...base, id: "b", pts: { test: "pts/a", description: "Decompression" } },
			]),
		).not.toThrow();
	});

	it("scopes the twin-description invariant PER TEST (same description, different tests)", () => {
		// The invariant keys on (test, description), not description alone. Nothing else pins that
		// scoping: every other twin case here uses one test, so re-keying the narrow by description
		// only would still pass them — and would then reject this legal catalog, where two unrelated
		// profiles happen to share a <Description> string.
		expect(() =>
			catalogSchema.assert([
				{
					...base,
					id: "a",
					unit: "MB/s",
					pts: { test: "pts/fio", description: "Task: X", scale: "MB/s" },
				},
				{ ...base, id: "b", pts: { test: "pts/other", description: "Task: X" } },
			]),
		).not.toThrow();
	});

	it("rejects an undeclared key inside the pts pin (a typo'd pin silently unpins the entry)", () => {
		// arktype keeps undeclared keys by default, so `scael` would validate, survive, and degrade the
		// entry to UNPINNED — which the matcher then resolves by description alone, i.e. arbitrarily
		// between a twin pair. onUndeclaredKey("reject") makes it a loud generator/authoring bug.
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a", description: "Foo", scael: "MB/s" } },
			]),
		).toThrow();
	});

	it("rejects two description-less wildcards for the same test", () => {
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a" } },
				{ ...base, id: "b", pts: { test: "pts/a" } },
			]),
		).toThrow();
	});

	it("rejects a wildcard coexisting with a described entry for the same test", () => {
		// This is the exact shape that would let ptsResultToMetric misattribute a non-matching
		// <Description> to the wildcard — forbidden at load so the runtime fallback is safe.
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a" } },
				{ ...base, id: "b", pts: { test: "pts/a", description: "Foo" } },
			]),
		).toThrow();
	});

	it("accepts twin descriptions disambiguated by distinct pts.scale pins (fio)", () => {
		expect(() =>
			catalogSchema.assert([
				{
					...base,
					id: "a",
					unit: "MB/s",
					pts: { test: "pts/fio", description: "Type: Random Read", scale: "MB/s" },
				},
				{
					...base,
					id: "b",
					unit: "IOPS",
					pts: { test: "pts/fio", description: "Type: Random Read", scale: "IOPS" },
				},
			]),
		).not.toThrow();
	});

	it("rejects twin descriptions when one lacks a pts.scale pin", () => {
		// The description-only matcher arm would resolve a result to the unpinned twin arbitrarily.
		expect(() =>
			catalogSchema.assert([
				{
					...base,
					id: "a",
					unit: "MB/s",
					pts: { test: "pts/fio", description: "Type: Random Read", scale: "MB/s" },
				},
				{ ...base, id: "b", pts: { test: "pts/fio", description: "Type: Random Read" } },
			]),
		).toThrow();
	});

	it("rejects twin descriptions carrying the SAME pts.scale pin", () => {
		expect(() =>
			catalogSchema.assert([
				{
					...base,
					id: "a",
					unit: "MB/s",
					pts: { test: "pts/fio", description: "Type: Random Read", scale: "MB/s" },
				},
				{
					...base,
					id: "b",
					unit: "MB/s",
					pts: { test: "pts/fio", description: "Type: Random Read", scale: "MB/s" },
				},
			]),
		).toThrow();
	});

	it("rejects a pts.scale pin on a description-less wildcard", () => {
		// The wildcard matcher arm never compares <Scale>, so the pin would be silently ignored and a
		// fio-style test posting two description-less results (MB/s + IOPS) would collapse both onto
		// this one metric — the exact cross-scale misattribution pinning exists to prevent.
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", unit: "IOPS", pts: { test: "pts/fio", scale: "IOPS" } },
			]),
		).toThrow();
	});

	it("rejects a pinned entry whose unit differs from its pts.scale (crossed pins)", () => {
		// unit and pts.scale both name the runtime <Scale> string; crossed values would rank one
		// scale's samples under the other's unit label.
		expect(() =>
			catalogSchema.assert([
				{
					...base,
					id: "a",
					unit: "MB/s",
					pts: { test: "pts/fio", description: "Type: Random Read", scale: "IOPS" },
				},
			]),
		).toThrow();
	});
});
