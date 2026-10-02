import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	NETWORK_DNS_TARGETS,
	NETWORK_DOWNLOAD_FILE,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_FILE,
	NETWORK_LATENCY_TARGETS,
	networkDnsFile,
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

	it("runs DNS before the latency curls from one probes task", () => {
		expect(runTasks(taskSource("probes"))).toEqual([
			"run_task benchmark:network:dns",
			"run_task benchmark:network:latency",
			"run_task benchmark:network:download",
		]);
		expect(runTasks(taskSource("suite"))).toContain("run_task benchmark:network:probes");
		expect(runTasks(taskSource("all"))).toContain("run_task benchmark:network:probes");
	});

	it("names probe files the way task_result_name names the task path", () => {
		const resultFile = (taskRelative: string, suffix?: string): string => {
			const stem = taskRelative.replaceAll("/", "-");
			return `${suffix ? `${stem}--${suffix}` : stem}.json`;
		};
		expect(NETWORK_LATENCY_FILE).toBe(resultFile("network/latency"));
		expect(NETWORK_DOWNLOAD_FILE).toBe(resultFile("network/download", "speed"));
		for (const target of NETWORK_DNS_TARGETS) {
			expect(networkDnsFile(target.domain)).toBe(resultFile("network/dns", target.domain));
		}
	});
});
