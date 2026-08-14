#!/usr/bin/env bun
/**
 * Stage host `benchmark-results/` into a raw tree for `cursor-cloud-agent`, normalize, then splice
 * that provider row into a copy of the latest published Run so the leaderboard can rank it.
 *
 * Usage:
 *   bun scripts/ingest-cursor-cloud-agent.ts [baseRunId]
 *
 * Writes:
 *   data/raw/<compositeRunId>/cursor-cloud-agent/<suite>/…
 *   data/dataset/runs/<compositeRunId>.json
 *   data/dataset/index.json (newest-first)
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	normalizeResultsTree,
	writeNormalizedRun,
} from "@sandbox-benchmarks/results";
import { parseRun, type ProviderRun, type Run } from "@sandbox-benchmarks/schema";

const REPO = join(import.meta.dir, "..");
const RESULTS = join(REPO, "benchmark-results");
const DATASET = join(REPO, "data/dataset");

const BASE_RUN_ID = process.argv[2] ?? "31066359914";
// Numeric id: LEADERBOARD provenance requires a workflow-run link form (`actions/runs/<id>`).
// This is a host-ingest splice (not a GitHub Actions run); the link is documentary, not clickable-live.
const COMPOSITE_RUN_ID = process.env.INGEST_RUN_ID ?? "202608140001";
const SHA =
	process.env.INGEST_SHA ??
	Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: REPO }).stdout.toString().trim();
const CPU_MODEL = "Intel(R) Xeon(R) Platinum 8559C";

/** Suite → globs / exact names to copy from benchmark-results/. */
const SUITE_FILES: Record<string, readonly string[]> = {
	"cpu-node": [
		"pts_node-web-tooling.xml",
		"pts_node-web-tooling--metadata.json",
		"pts_node-web-tooling.log",
		"pts_node-web-tooling_ms.txt",
		"pts_node-web-tooling--forensics.tar.gz",
		"cpu-info--lscpu.json",
	],
	disk: [
		"pts_fio-rand-read.xml",
		"pts_fio-rand-read--metadata.json",
		"pts_fio-rand-read.log",
		"pts_fio-rand-read_ms.txt",
		"pts_fio-rand-read--forensics.tar.gz",
		"pts_fio-rand-write.xml",
		"pts_fio-rand-write--metadata.json",
		"pts_fio-rand-write.log",
		"pts_fio-rand-write_ms.txt",
		"pts_fio-rand-write--forensics.tar.gz",
		"pts_fio-seq-read.xml",
		"pts_fio-seq-read--metadata.json",
		"pts_fio-seq-read.log",
		"pts_fio-seq-read_ms.txt",
		"pts_fio-seq-read--forensics.tar.gz",
		"pts_fio-seq-write.xml",
		"pts_fio-seq-write--metadata.json",
		"pts_fio-seq-write.log",
		"pts_fio-seq-write_ms.txt",
		"pts_fio-seq-write--forensics.tar.gz",
		"pts_hardlink.xml",
		"pts_hardlink--metadata.json",
		"pts_hardlink.log",
		"pts_hardlink_ms.txt",
		"pts_hardlink--forensics.tar.gz",
	],
	network: [
		"pts_iperf-tcp-p1.xml",
		"pts_iperf-tcp-p1--metadata.json",
		"pts_iperf-tcp-p1.log",
		"pts_iperf-tcp-p1_ms.txt",
		"pts_iperf-tcp-p1--forensics.tar.gz",
		"pts_iperf-tcp-p10.xml",
		"pts_iperf-tcp-p10--metadata.json",
		"pts_iperf-tcp-p10.log",
		"pts_iperf-tcp-p10_ms.txt",
		"pts_iperf-tcp-p10--forensics.tar.gz",
		"pts_iperf-udp-10g.xml",
		"pts_iperf-udp-10g--metadata.json",
		"pts_iperf-udp-10g.log",
		"pts_iperf-udp-10g_ms.txt",
		"pts_iperf-udp-10g--forensics.tar.gz",
		"pts_iperf-wan-download.xml",
		"pts_iperf-wan-download--metadata.json",
		"pts_iperf-wan-download.log",
		"pts_iperf-wan-download_ms.txt",
		"pts_iperf-wan-download--forensics.tar.gz",
		"pts_iperf-wan-upload.xml",
		"pts_iperf-wan-upload--metadata.json",
		"pts_iperf-wan-upload.log",
		"pts_iperf-wan-upload_ms.txt",
		"pts_iperf-wan-upload--forensics.tar.gz",
		"network-download--speed.json",
		"network-latency.json",
	],
	system: [
		"pts_pybench.xml",
		"pts_pybench--metadata.json",
		"pts_pybench.log",
		"pts_pybench_ms.txt",
		"pts_pybench--forensics.tar.gz",
		"pts_sqlite-speedtest.xml",
		"pts_sqlite-speedtest--metadata.json",
		"pts_sqlite-speedtest.log",
		"pts_sqlite-speedtest_ms.txt",
		"pts_sqlite-speedtest--forensics.tar.gz",
		"pts_git.xml",
		"pts_git--metadata.json",
		"pts_git.log",
		"pts_git_ms.txt",
		"pts_git--forensics.tar.gz",
		"system-provider.json",
	],
};

const observedSpecs = {
	cpuModel: CPU_MODEL,
	vcpus: 4,
	memoryGb: 16,
	diskGb: 252,
	hostVcpus: 4,
	hostMemoryGb: 16,
	os: "Ubuntu 24.04",
	kernel: "6.12.94+",
	virtualization: "kvm",
	detectedIsolation: "firecracker+oci",
};

function stageSuite(providerRoot: string, suite: string, files: readonly string[]): number {
	const dest = join(providerRoot, suite);
	mkdirSync(dest, { recursive: true });
	let copied = 0;
	for (const name of files) {
		const src = join(RESULTS, name);
		if (!existsSync(src)) continue;
		cpSync(src, join(dest, name));
		copied += 1;
	}
	writeFileSync(join(dest, "observed-specs.json"), `${JSON.stringify(observedSpecs, null, 2)}\n`);
	return copied;
}

function updateIndex(run: Run): void {
	const indexPath = join(DATASET, "index.json");
	const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
		schemaVersion: string;
		runs: Array<{ runId: string; generatedAt: string; path: string }>;
	};
	const entry = {
		runId: run.runId,
		generatedAt: run.generatedAt,
		path: `runs/${run.runId}.json`,
	};
	index.runs = [entry, ...index.runs.filter((r) => r.runId !== run.runId)];
	writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

function main(): void {
	const basePath = join(DATASET, "runs", `${BASE_RUN_ID}.json`);
	if (!existsSync(basePath)) {
		throw new Error(`base run missing: ${basePath}`);
	}
	const base = parseRun(JSON.parse(readFileSync(basePath, "utf8")));
	const compositeRunId = COMPOSITE_RUN_ID;
	const rawRoot = join(REPO, "data/raw", compositeRunId);
	const providerRoot = join(rawRoot, "cursor-cloud-agent");
	mkdirSync(providerRoot, { recursive: true });

	for (const [suite, files] of Object.entries(SUITE_FILES)) {
		const n = stageSuite(providerRoot, suite, files);
		console.log(`staged ${suite}: ${n} files (+ observed-specs.json)`);
	}

	const shard = normalizeResultsTree({
		rawRoot,
		runId: `${compositeRunId}-shard`,
		sha: SHA,
		generatedAt: new Date().toISOString(),
	});
	const host = shard.providers.find((p) => p.providerId === "cursor-cloud-agent");
	if (!host || host.validationStatus !== "validated") {
		throw new Error(
			`cursor-cloud-agent normalize failed: status=${host?.validationStatus} metrics=${host?.metrics.length ?? 0}`,
		);
	}
	console.log(
		`normalized cursor-cloud-agent: metrics=${host.metrics.length} suites=${host.suitesCovered.join(",")}`,
	);
	console.log(`observedSpecs.cpuModel=${host.observedSpecs.cpuModel}`);

	const providers: ProviderRun[] = [
		...base.providers
			.filter((p) => p.providerId !== "cursor-cloud-agent")
			.map((p) => ({
				...p,
				// Base published run is still v4; v5 requires an explicit costEvidence array.
				costEvidence: p.costEvidence ?? [],
			})),
		host,
	].sort((a, b) => a.providerId.localeCompare(b.providerId));

	const merged = parseRun({
		schemaVersion: "5",
		runId: compositeRunId,
		sha: SHA,
		generatedAt: new Date().toISOString(),
		...(base.sourceRunUrl ? { sourceRunUrl: base.sourceRunUrl } : {}),
		targetSpec: base.targetSpec,
		providers,
	});

	const outFile = join(DATASET, "runs", `${compositeRunId}.json`);
	writeFileSync(outFile, `${JSON.stringify(merged, null, 2)}\n`);
	updateIndex(merged);
	// Also keep a scratch normalized shard for debugging.
	writeNormalizedRun({
		rawRoot,
		runId: `${compositeRunId}-shard`,
		sha: SHA,
		outFile: join(REPO, "data/runs", `${compositeRunId}-shard.json`),
	});
	console.log(`wrote ${outFile}`);
	console.log(`index newest=${merged.runId}`);
}

main();
