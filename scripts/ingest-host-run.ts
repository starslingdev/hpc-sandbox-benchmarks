#!/usr/bin/env bun
/**
 * Host-ingest: turn this machine's flat `benchmark-results/` into a provider row in the dataset.
 *
 * For agent sandboxes that expose no remote sandbox API (Claude Code on the web, Cursor Cloud
 * Agents, ChatGPT Codex...), the suites run on the agent's OWN VM and the results are spliced into
 * the latest published Run afterwards, instead of being produced by the harness against a provider
 * SDK. This script is the provider-agnostic version of that splice — see
 * docs/agent-sandbox-benchmarking.md for the whole procedure.
 *
 * Usage:
 *   bun scripts/ingest-host-run.ts --provider <providerId> [--base <runId>] [--run-id <runId>]
 *
 * Defaults: `--base` is the newest run in data/dataset/index.json; `--run-id` is <UTC-date>0001,
 * bumped until unused. Both are overridable so a re-ingest can target an exact pair.
 *
 * Writes:
 *   data/raw/<runId>/<providerId>/<suite>/…   (staged raw tree; gitignored)
 *   data/dataset/runs/<runId>.json            (the published Run)
 *   data/dataset/index.json                   (newest-first)
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeResultsTree, writeNormalizedRun } from "@sandbox-benchmarks/results";
import type { ProviderId, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { PROVIDERS, parseRun } from "@sandbox-benchmarks/schema";

const REPO = join(import.meta.dir, "..");
const RESULTS = join(REPO, "benchmark-results");
const DATASET = join(REPO, "data/dataset");

/**
 * Suite → the `benchmark-results/` basename prefixes that belong to it. `benchmark-results/` is flat
 * (one directory per host run, not per suite), so routing is by producer: each PTS leaf writes
 * `<prefix>.xml` + `<prefix>--metadata.json` + `<prefix>.log` + `<prefix>_ms.txt` +
 * `<prefix>--forensics.tar.gz`, plus `<prefix>--skipped.json` / `--failed.json` markers, and each
 * probe leaf writes `<task-result-name>[--<suffix>].json`. Matching a prefix rather than naming
 * every artifact keeps a leaf that grows or drops a sidecar from silently falling out of the tree.
 *
 * Keys are SUITE_NAMES (packages/schema/src/suites.ts) — the normalizer derives a row's covered
 * suites from these directory names, so a typo here reads downstream as an uncovered suite.
 *
 * `manifest.ndjson` and `observed-specs.json` are deliberately unrouted: they are whole-run records.
 * observed-specs.json is copied into EVERY suite dir separately, below.
 */
const SUITE_PREFIXES: Record<string, readonly string[]> = {
	"cpu-node": ["pts_node-web-tooling", "cpu-info", "cpu-cache"],
	system: ["pts_pybench", "pts_sqlite-speedtest", "pts_git", "system-provider"],
	pgbench: ["pts_pgbench"],
	memory: ["pts_stream"],
	disk: [
		"pts_fio-rand-read",
		"pts_fio-rand-write",
		"pts_fio-seq-read",
		"pts_fio-seq-write",
		"pts_hardlink",
	],
	network: [
		"pts_iperf-tcp-p1",
		"pts_iperf-tcp-p10",
		"pts_iperf-udp-10g",
		"pts_iperf-wan-download",
		"pts_iperf-wan-upload",
		"pts_network-loopback",
		"pts_fast-cli",
		"network-download",
		"network-latency",
		"network-dns",
	],
	"realworld-mastra": ["pts_realworld-mastra"],
	"realworld-better-auth": ["pts_realworld-better-auth"],
	"realworld-openclaw": ["pts_realworld-openclaw"],
};

interface Args {
	provider: ProviderId;
	base?: string;
	runId?: string;
}

function parseArgs(argv: readonly string[]): Args {
	const get = (flag: string): string | undefined => {
		const i = argv.indexOf(flag);
		return i === -1 ? undefined : argv[i + 1];
	};
	const provider = get("--provider");
	if (provider === undefined) {
		throw new Error(
			"usage: bun scripts/ingest-host-run.ts --provider <providerId> [--base <runId>] [--run-id <runId>]",
		);
	}
	// Reject an unregistered id HERE rather than letting normalize silently produce no row for it:
	// the provider must already exist in packages/schema/src/identifiers.ts + providers.ts.
	if (!PROVIDERS.some((p) => p.id === provider)) {
		throw new Error(
			`unknown provider id "${provider}" — register it in packages/schema/src/identifiers.ts ` +
				`and providers.ts first (known: ${PROVIDERS.map((p) => p.id).join(", ")})`,
		);
	}
	return { provider: provider as ProviderId, base: get("--base"), runId: get("--run-id") };
}

interface Index {
	schemaVersion: string;
	runs: Array<{ runId: string; generatedAt: string; path: string }>;
}

const readIndex = (): Index =>
	JSON.parse(readFileSync(join(DATASET, "index.json"), "utf8")) as Index;

/**
 * Does `name` belong to `prefix`? The prefix must be followed by end-of-name or a separator the
 * leaves actually emit (`.xml`, `--metadata.json`, `_ms.txt`) — a bare `startsWith` would let
 * `pts_iperf-tcp-p1` claim `pts_iperf-tcp-p10`, and `pts_git` a future `pts_gitlab`.
 */
function claims(name: string, prefix: string): boolean {
	if (!name.startsWith(prefix)) return false;
	const next = name.charAt(prefix.length);
	return next === "" || next === "." || next === "-" || next === "_";
}

/** Copy every `benchmark-results/` file belonging to one of `prefixes` into `<suite>/`. */
function stageSuite(
	providerRoot: string,
	suite: string,
	prefixes: readonly string[],
	observedSpecs: string,
): number {
	const dest = join(providerRoot, suite);
	mkdirSync(dest, { recursive: true });
	let copied = 0;
	for (const name of readdirSync(RESULTS)) {
		if (!prefixes.some((prefix) => claims(name, prefix))) continue;
		cpSync(join(RESULTS, name), join(dest, name));
		copied += 1;
	}
	// specs.ts reads observed-specs.json per suite directory, so every staged suite needs its own copy.
	writeFileSync(join(dest, "observed-specs.json"), observedSpecs);
	return copied;
}

function updateIndex(run: Run): void {
	const index = readIndex();
	const entry = { runId: run.runId, generatedAt: run.generatedAt, path: `runs/${run.runId}.json` };
	index.runs = [entry, ...index.runs.filter((r) => r.runId !== run.runId)];
	writeFileSync(join(DATASET, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
}

/** `<UTC-date>0001`, bumped past any id already in the dataset. Numeric so it keeps the shape the
 *  LEADERBOARD's `actions/runs/<id>` provenance link expects (documentary for a host ingest). */
function nextRunId(now: Date): string {
	const day = now.toISOString().slice(0, 10).replaceAll("-", "");
	const taken = new Set(readIndex().runs.map((r) => r.runId));
	for (let n = 1; n < 10_000; n += 1) {
		const candidate = `${day}${String(n).padStart(4, "0")}`;
		if (!taken.has(candidate)) return candidate;
	}
	throw new Error(`no free run id for ${day}`);
}

function main(): void {
	const args = parseArgs(process.argv.slice(2));

	// The harness writes this in-sandbox before a suite runs (OBSERVED_SPECS_SCRIPT in
	// packages/harness/src/lib/setup.ts). On a host ingest nothing created it, so the operator runs
	// that same script by hand — refusing here is what stops a row from being published with the
	// spec fields silently absent.
	const specsPath = join(RESULTS, "observed-specs.json");
	if (!existsSync(specsPath)) {
		throw new Error(
			`missing ${specsPath}\nCapture it with the harness's own script:\n` +
				`  bun -e 'const m=await import("./packages/harness/src/lib/setup.ts");` +
				`console.log(m.OBSERVED_SPECS_SCRIPT)' > /tmp/specs.sh\n` +
				`  sed -i "s|cd \\"\\$HOME/sandbox-benchmarks\\"|cd \\"${REPO}\\"|" /tmp/specs.sh && bash /tmp/specs.sh`,
		);
	}
	const observedSpecs = readFileSync(specsPath, "utf8");

	const baseRunId = args.base ?? readIndex().runs[0]?.runId;
	if (baseRunId === undefined) throw new Error("dataset index has no runs to splice into");
	const basePath = join(DATASET, "runs", `${baseRunId}.json`);
	if (!existsSync(basePath)) throw new Error(`base run missing: ${basePath}`);
	const base = parseRun(JSON.parse(readFileSync(basePath, "utf8")));

	const runId = args.runId ?? nextRunId(new Date());
	const rawRoot = join(REPO, "data/raw", runId);
	const providerRoot = join(rawRoot, args.provider);
	mkdirSync(providerRoot, { recursive: true });

	const sha = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: REPO }).stdout.toString().trim();
	console.log(`provider=${args.provider} base=${baseRunId} runId=${runId}`);

	for (const [suite, prefixes] of Object.entries(SUITE_PREFIXES)) {
		const n = stageSuite(providerRoot, suite, prefixes, observedSpecs);
		console.log(`staged ${suite}: ${n} files`);
	}

	const shard = normalizeResultsTree({
		rawRoot,
		runId: `${runId}-shard`,
		sha,
		generatedAt: new Date().toISOString(),
	});
	const host = shard.providers.find((p) => p.providerId === args.provider);
	if (host?.validationStatus !== "validated") {
		throw new Error(
			`${args.provider} normalize failed: status=${host?.validationStatus} metrics=${host?.metrics.length ?? 0}`,
		);
	}
	console.log(
		`normalized ${args.provider}: metrics=${host.metrics.length} suites=${host.suitesCovered.join(",")}`,
	);

	const providers: ProviderRun[] = [
		...base.providers
			.filter((p) => p.providerId !== args.provider)
			// A pre-v5 base run carries no costEvidence; v5 requires the array on every row.
			.map((p) => ({ ...p, costEvidence: p.costEvidence ?? [] })),
		host,
	].sort((a, b) => a.providerId.localeCompare(b.providerId));

	const merged = parseRun({
		schemaVersion: "5",
		runId,
		sha,
		generatedAt: new Date().toISOString(),
		...(base.sourceRunUrl ? { sourceRunUrl: base.sourceRunUrl } : {}),
		targetSpec: base.targetSpec,
		providers,
	});

	const outFile = join(DATASET, "runs", `${runId}.json`);
	writeFileSync(outFile, `${JSON.stringify(merged, null, 2)}\n`);
	updateIndex(merged);
	// Scratch normalized shard, for debugging a row without re-reading the merged Run.
	writeNormalizedRun({
		rawRoot,
		runId: `${runId}-shard`,
		sha,
		outFile: join(REPO, "data/runs", `${runId}-shard.json`),
	});
	console.log(`wrote ${outFile}`);
	console.log(`index newest=${merged.runId}`);
}

main();
