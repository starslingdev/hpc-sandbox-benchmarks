// Drift gate: the network probe tasks name the same targets as the closed catalog tables, in
// the same order. Bash isn't importable, so this reads the task source. A producer that
// slugified a host, or pointed a metric at a different URL, would publish samples under the
// wrong id.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	NETWORK_DNS_TARGETS,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_TARGETS,
} from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();

function taskSource(name: string): string {
	return readFileSync(join(root, ".mise/tasks/benchmark/network", name), "utf8");
}

function endpointUrls(source: string): string[] {
	const block = source.match(/ENDPOINTS=\(([\s\S]*?)\n\)/);
	if (!block?.[1]) return [];
	const stripped = block[1].replace(/#[^\n]*/g, "");
	return [...stripped.matchAll(/"([^"]*)"/g)].map((match) => match[1] ?? "");
}

function dnsDomains(source: string): string[] {
	const match = source.match(/^for domain in (.+); do$/m);
	if (!match?.[1]) return [];
	return match[1].trim().split(/\s+/);
}

function downloadUrl(source: string): string | undefined {
	const match = source.match(/^DOWNLOAD_URL="\$\{DOWNLOAD_URL:-([^}]+)\}"$/m);
	return match?.[1];
}

function runTasks(source: string): string[] {
	return [...source.matchAll(/^run_task \S+/gm)].map((match) => match[0]);
}

describe("network probe tasks match the catalog target tables", () => {
	it("lists the latency ENDPOINTS urls in catalog order", () => {
		expect(endpointUrls(taskSource("latency"))).toEqual(
			NETWORK_LATENCY_TARGETS.map((target) => target.url),
		);
	});

	it("lists the DNS domains in catalog order", () => {
		expect(dnsDomains(taskSource("dns"))).toEqual(
			NETWORK_DNS_TARGETS.map((target) => target.domain),
		);
	});

	it("pins the download default URL to the catalog URL", () => {
		expect(downloadUrl(taskSource("download"))).toBe(NETWORK_DOWNLOAD_TARGET.url);
	});

	it("runs DNS before the latency curls", () => {
		expect(runTasks(taskSource("suite"))).toEqual([
			"run_task benchmark:network:pts:iperf-localhost",
			"run_task benchmark:network:pts:iperf-wan",
			"run_task benchmark:network:dns",
			"run_task benchmark:network:latency",
			"run_task benchmark:network:download",
		]);
		expect(runTasks(taskSource("all"))).toEqual([
			"run_task benchmark:network:pts:loopback",
			"run_task benchmark:network:pts:fast-cli",
			"run_task benchmark:network:dns",
			"run_task benchmark:network:latency",
			"run_task benchmark:network:download",
		]);
	});
});
