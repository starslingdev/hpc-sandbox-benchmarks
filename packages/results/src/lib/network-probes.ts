import {
	NETWORK_DNS_TARGETS,
	NETWORK_DOWNLOAD_FILE,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_FILE,
	NETWORK_LATENCY_TARGETS,
	networkDnsFile,
} from "@sandbox-benchmarks/schema";

interface NetworkProbeContribution {
	metricId: string;
	samples: [number, ...number[]];
}

type ProbeFile =
	| { kind: "latency" }
	| { kind: "dns"; domain: string; metricId: string }
	| { kind: "download" };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dnsFile(filename: string): { domain: string; metricId: string } | undefined {
	for (const target of NETWORK_DNS_TARGETS) {
		if (filename === networkDnsFile(target.domain)) {
			return { domain: target.domain, metricId: target.id };
		}
	}
	return undefined;
}

function probeFile(filename: string): ProbeFile | undefined {
	if (filename === NETWORK_LATENCY_FILE) return { kind: "latency" };
	if (filename === NETWORK_DOWNLOAD_FILE) return { kind: "download" };
	const dns = dnsFile(filename);
	if (dns) return { kind: "dns", domain: dns.domain, metricId: dns.metricId };
	return undefined;
}

export function isNetworkProbeFile(filename: string): boolean {
	return probeFile(filename) !== undefined;
}

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
		const admitted = admit(samples);
		if (admitted) contributions.push({ metricId: target.id, samples: admitted });
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

function admit(samples: number[]): [number, ...number[]] | undefined {
	const [first, ...rest] = samples;
	if (first === undefined) return undefined;
	return [first, ...rest];
}

function dnsContribution(
	domain: string,
	metricId: string,
	body: unknown,
): NetworkProbeContribution[] {
	const rows = dnsRows(body);
	const row = rows?.[0];
	if (!isRecord(row)) return [];
	if (row.status !== "NOERROR") return [];
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

export function networkProbeContributions(
	filename: string,
	body: unknown,
): NetworkProbeContribution[] {
	const file = probeFile(filename);
	if (!file) return [];
	return contributionsFor(file, body);
}
