// Catalogued samples from the network probe artifacts. The closed tables in
// `@sandbox-benchmarks/schema` own the ids. A filename or URL that is not in those tables
// contributes nothing, and so does a malformed body. This function does not throw: a throw
// inside extract drops the provider shard, including iperf.
import {
	NETWORK_DNS_TARGETS,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_TARGETS,
} from "@sandbox-benchmarks/schema";

/** One catalogued probe metric's samples from a single artifact. */
interface NetworkProbeContribution {
	metricId: string;
	samples: number[];
}

// `task_result_name` spells these from the mise task path. The join key is the filename,
// not a slug of the host.
const LATENCY_FILENAME = "network-latency.json";
const DOWNLOAD_FILENAME = "network-download--speed.json";
const DNS_FILENAME_PREFIX = "network-dns--";
const DNS_FILENAME_SUFFIX = ".json";

const DNS_METRIC_BY_DOMAIN = new Map<string, string>(
	NETWORK_DNS_TARGETS.map((target) => [target.domain, target.id]),
);

type ProbeFile =
	| { kind: "latency" }
	| { kind: "dns"; domain: string; metricId: string }
	| { kind: "download" };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dnsFile(filename: string): { domain: string; metricId: string } | undefined {
	if (!filename.startsWith(DNS_FILENAME_PREFIX) || !filename.endsWith(DNS_FILENAME_SUFFIX)) {
		return undefined;
	}
	const domain = filename.slice(DNS_FILENAME_PREFIX.length, -DNS_FILENAME_SUFFIX.length);
	const metricId = DNS_METRIC_BY_DOMAIN.get(domain);
	if (metricId === undefined) return undefined;
	return { domain, metricId };
}

function probeFile(filename: string): ProbeFile | undefined {
	if (filename === LATENCY_FILENAME) return { kind: "latency" };
	if (filename === DOWNLOAD_FILENAME) return { kind: "download" };
	const dns = dnsFile(filename);
	if (dns) return { kind: "dns", domain: dns.domain, metricId: dns.metricId };
	return undefined;
}

/** True for a latency, known-domain DNS, or pinned-download artifact. Gap markers are not. */
export function isNetworkProbeFile(filename: string): boolean {
	return probeFile(filename) !== undefined;
}

// Same gate as lib/jq/curl-phases.jq `responded`: a missing exitcode counts as success, and a
// transport failure is not a latency sample even when time_total is the timeout ceiling.
function responded(record: Record<string, unknown>): boolean {
	const exitcode = record.exitcode ?? 0;
	return exitcode === 0 && typeof record.response_code === "number" && record.response_code > 0;
}

function totalMs(record: unknown): number | undefined {
	if (!isRecord(record) || !responded(record)) return undefined;
	const seconds = record.time_total;
	if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return undefined;
	return Math.round(seconds * 1_000_000) / 1000;
}

function latencyContributions(body: unknown): NetworkProbeContribution[] {
	if (!isRecord(body) || !Array.isArray(body.endpoints)) return [];
	const endpoints = body.endpoints;
	const contributions: NetworkProbeContribution[] = [];
	for (const target of NETWORK_LATENCY_TARGETS) {
		const samples: number[] = [];
		for (const endpoint of endpoints) {
			if (!isRecord(endpoint) || endpoint.url !== target.url) continue;
			if (!Array.isArray(endpoint.curl_records)) continue;
			for (const record of endpoint.curl_records) {
				const sample = totalMs(record);
				if (sample !== undefined) samples.push(sample);
			}
		}
		if (samples.length > 0) contributions.push({ metricId: target.id, samples });
	}
	return contributions;
}

function questionName(row: Record<string, unknown>): string | undefined {
	const question = row.question;
	if (!isRecord(question) || typeof question.name !== "string") return undefined;
	const name = question.name;
	return name.endsWith(".") ? name.slice(0, -1) : name;
}

function queryTimeMs(row: Record<string, unknown>): number | undefined {
	const queryTime = row.query_time;
	if (typeof queryTime !== "number" || !Number.isInteger(queryTime) || queryTime < 0) {
		return undefined;
	}
	return queryTime;
}

function dnsRows(body: unknown): unknown[] | undefined {
	if (Array.isArray(body)) return body.length === 1 ? body : undefined;
	if (isRecord(body)) return [body];
	return undefined;
}

function dnsContribution(
	domain: string,
	metricId: string,
	body: unknown,
): NetworkProbeContribution[] {
	const rows = dnsRows(body);
	const row = rows?.[0];
	if (!isRecord(row)) return [];
	if (questionName(row) !== domain) return [];
	const sample = queryTimeMs(row);
	if (sample === undefined) return [];
	return [{ metricId, samples: [sample] }];
}

function downloadExitKept(exitcode: unknown): boolean {
	return exitcode === undefined || exitcode === null || exitcode === 0 || exitcode === 28;
}

function downloadContribution(body: unknown): NetworkProbeContribution[] {
	if (!isRecord(body)) return [];
	// An explicit url that is not the pin is an override. Leave it raw. url_effective may
	// differ after a redirect and is not a reason to drop the sample.
	if (typeof body.url === "string" && body.url !== NETWORK_DOWNLOAD_TARGET.url) return [];
	const httpCode = body.http_code;
	if (
		typeof httpCode !== "number" ||
		!Number.isFinite(httpCode) ||
		httpCode < 1 ||
		httpCode > 399
	) {
		return [];
	}
	const size = body.size_download;
	if (typeof size !== "number" || !(size > 0)) return [];
	const speed = body.speed_download;
	if (typeof speed !== "number" || !Number.isFinite(speed) || !(speed > 0)) return [];
	if (!downloadExitKept(body.exitcode)) return [];
	return [
		{
			metricId: NETWORK_DOWNLOAD_TARGET.id,
			samples: [(speed * 8) / 1_000_000],
		},
	];
}

function contributionsFor(file: ProbeFile, body: unknown): NetworkProbeContribution[] {
	switch (file.kind) {
		case "latency":
			return latencyContributions(body);
		case "dns":
			return dnsContribution(file.domain, file.metricId, body);
		case "download":
			return downloadContribution(body);
		default: {
			const _exhaustive: never = file;
			return _exhaustive;
		}
	}
}

/**
 * Catalogued samples in one probe artifact. Returns `[]` for an unknown file, a gap marker, or
 * any artifact that does not satisfy the probe's admission rules. Never returns an empty
 * `samples` array, and never throws.
 */
export function networkProbeContributions(
	filename: string,
	body: unknown,
): NetworkProbeContribution[] {
	const file = probeFile(filename);
	if (!file) return [];
	return contributionsFor(file, body);
}
