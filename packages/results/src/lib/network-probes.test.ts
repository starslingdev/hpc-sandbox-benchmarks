import { describe, expect, it } from "bun:test";
import {
	NETWORK_DOWNLOAD_FILE,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_FILE,
	networkDnsColdFile,
} from "@sandbox-benchmarks/schema";
import { isNetworkProbeFile, networkProbeContributions } from "./network-probes.ts";

const curl = (overrides: Record<string, unknown> = {}) => ({
	exitcode: 0,
	response_code: 200,
	time_total: 0.0425,
	...overrides,
});

const latency = (records: unknown[], url = "https://github.com/") => ({
	endpoints: [{ url, curl_records: records }],
});

describe("isNetworkProbeFile", () => {
	it("matches exactly the catalogued artifact names", () => {
		expect(isNetworkProbeFile(NETWORK_LATENCY_FILE)).toBe(true);
		expect(isNetworkProbeFile(NETWORK_DOWNLOAD_FILE)).toBe(true);
		expect(isNetworkProbeFile(networkDnsColdFile("github.com"))).toBe(true);
		expect(isNetworkProbeFile(networkDnsColdFile("example.com"))).toBe(false);
		// The plain lookup is resolver provenance — usually a cache hit, never a cold Metric.
		expect(isNetworkProbeFile("network-dns--github.com.json")).toBe(false);
		expect(isNetworkProbeFile("network-latency--skipped.json")).toBe(false);
	});
});

describe("latency artifact", () => {
	it("publishes responding samples in ms and drops recorded non-responses", () => {
		const body = latency([
			curl(),
			curl({ exitcode: 28, response_code: 0, time_total: 20 }),
			// curl < 7.75 writes no exitcode; the response code alone classifies the sample.
			{ response_code: 401, time_total: 0.1 },
		]);
		expect(networkProbeContributions(NETWORK_LATENCY_FILE, body)).toEqual([
			{ metricId: "network_https_github_com_total_ms", samples: [42.5, 100] },
		]);
	});

	it("publishes nothing for an endpoint that never responded or is not catalogued", () => {
		const silent = latency([curl({ exitcode: 6, response_code: 0 })]);
		expect(networkProbeContributions(NETWORK_LATENCY_FILE, silent)).toEqual([]);
		const custom = latency([curl()], "https://example.com/");
		expect(networkProbeContributions(NETWORK_LATENCY_FILE, custom)).toEqual([]);
	});

	it("rejects a malformed artifact rather than guessing", () => {
		const negative = latency([curl({ time_total: -1 })]);
		expect(networkProbeContributions(NETWORK_LATENCY_FILE, negative)).toEqual([]);
		expect(networkProbeContributions(NETWORK_LATENCY_FILE, { endpoints: "x" })).toEqual([]);
	});
});

describe("dns cache-miss artifact", () => {
	const file = networkDnsColdFile("github.com");
	const nonce = "sbx-0123456789abcdef.github.com.";
	const answer = (overrides: Record<string, unknown> = {}) => ({
		status: "NXDOMAIN",
		query_time: 14,
		question: { name: nonce, class: "IN", type: "A" },
		...overrides,
	});

	it.each([
		["an NXDOMAIN answer", answer()],
		["a wildcard NOERROR answer", answer({ status: "NOERROR" })],
		["a name without the trailing dot", answer({ question: { name: nonce.slice(0, -1) } })],
	])("publishes the one query time for %s", (_, row) => {
		expect(networkProbeContributions(file, [row])).toEqual([
			{ metricId: "network_dns_cold_github_com_ms", samples: [14] },
		]);
	});

	it("keeps a sub-millisecond answer as 0 ms", () => {
		expect(networkProbeContributions(file, [answer({ query_time: 0 })])).toEqual([
			{ metricId: "network_dns_cold_github_com_ms", samples: [0] },
		]);
	});

	it.each([
		["the domain itself (cacheable)", [answer({ question: { name: "github.com." } })]],
		[
			"a random name under another domain",
			[answer({ question: { name: "sbx-0123456789abcdef.gitlab.com." } })],
		],
		[
			"a name whose label is not the single-use shape",
			[answer({ question: { name: "www.github.com." } })],
		],
		["a suffix lookalike", [answer({ question: { name: "sbx-0123456789abcdef.notgithub.com." } })]],
		["SERVFAIL", [answer({ status: "SERVFAIL" })]],
		["more than one answer", [answer(), answer()]],
		["a non-integer query time", [answer({ query_time: 1.5 })]],
		["a bare object", answer()],
	])("rejects %s", (_, body) => {
		expect(networkProbeContributions(file, body)).toEqual([]);
	});
});

describe("download artifact", () => {
	const record = (overrides: Record<string, unknown> = {}) => ({
		url: NETWORK_DOWNLOAD_TARGET.url,
		http_code: 200,
		size_download: 54_000_000,
		speed_download: 12_500_000,
		exitcode: 0,
		...overrides,
	});

	it("keeps a --max-time cut (exit 28) as a valid plateau rate", () => {
		expect(networkProbeContributions(NETWORK_DOWNLOAD_FILE, record({ exitcode: 28 }))).toEqual([
			{ metricId: NETWORK_DOWNLOAD_TARGET.id, samples: [100] },
		]);
	});

	it.each([
		["an HTTP error body", record({ http_code: 403 })],
		["a transport failure", record({ exitcode: 7 })],
		["another payload", record({ url: "https://example.com/big.bin" })],
		["an empty transfer", record({ size_download: 0 })],
		["an infinite rate", record({ speed_download: Number.POSITIVE_INFINITY })],
	])("rejects %s", (_, body) => {
		expect(networkProbeContributions(NETWORK_DOWNLOAD_FILE, body)).toEqual([]);
	});
});
