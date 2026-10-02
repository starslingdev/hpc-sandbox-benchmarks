// Drift gate: the network probe tasks' DEFAULT targets must be exactly the catalogued ones, in catalog
// order. packages/schema/src/network-probe-metrics.ts is the source of truth; the normalizer matches
// the latency artifact by exact url, the DNS artifacts by domain-derived filename, and the download
// record by url — so a default edited on one side only would silently stop publishing that Metric.
//
// Like the other gates here, it reads the tasks as text: bash isn't importable.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	NETWORK_DNS_TARGETS,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_TARGETS,
} from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const TASKS = join(findRepoRoot(), ".mise/tasks/benchmark/network");
const task = (name: string): string => readFileSync(join(TASKS, name), "utf8");

/** The `#USAGE flag "--<name> <…>" … default="<value>"` default for one flag. */
function usageDefault(source: string, flag: string): string | undefined {
	const line = source.split("\n").find((l) => l.startsWith(`#USAGE flag "--${flag} `));
	return line?.match(/ default="([^"]*)"/)?.[1];
}

describe("network probe tasks default to the catalogued targets", () => {
	it("latency probes every catalogued url, in order", () => {
		const block = task("latency").match(/^ENDPOINTS=\(\n([\s\S]*?)\n\)$/m)?.[1] ?? "";
		const urls = [...block.matchAll(/^\t"([^"]+)"$/gm)].map((m) => m[1]);
		expect(urls).toEqual(NETWORK_LATENCY_TARGETS.map((target) => target.url));
	});

	it("latency takes 30 fresh samples per endpoint by default", () => {
		expect(usageDefault(task("latency"), "samples")).toBe("30");
	});

	it("dns resolves every catalogued domain, in order", () => {
		const list = task("dns").match(/^DOMAINS=\(([^)]*)\)$/m)?.[1] ?? "";
		expect(list.split(" ")).toEqual(NETWORK_DNS_TARGETS.map((target) => target.domain));
	});

	it("download fetches the catalogued payload", () => {
		expect(usageDefault(task("download"), "url")).toBe(NETWORK_DOWNLOAD_TARGET.url);
	});
});
