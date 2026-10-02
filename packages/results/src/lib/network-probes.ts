/**
 * The catalogued network probe artifacts (.mise/tasks/benchmark/network/{latency,dns,download}) parsed
 * into Metric samples. Each artifact has one arktype schema that validates the producer's shape AND
 * pipes it into contributions, so a record this module accepts is a measurement by construction: an
 * HTTP error body, an NXDOMAIN answer, or a download of some other payload simply fails its schema.
 *
 * A file that fails its schema contributes nothing rather than throwing. Every Metric here is declared
 * by the network suite, so the normalizer's suite-shortfall diff already reports the absence as a gap;
 * throwing would instead discard every other artifact in the provider directory.
 */
import type { NetworkDnsTarget } from "@sandbox-benchmarks/schema";
import {
	NETWORK_DNS_TARGETS,
	NETWORK_DOWNLOAD_FILE,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_FILE,
	NETWORK_LATENCY_TARGETS,
	NETWORK_PROBE_METRIC_IDS,
	networkDnsFile,
} from "@sandbox-benchmarks/schema";
import type { ArkErrors } from "arktype";
import { type } from "arktype";

/** A publishable reading: finite and non-negative (JSON can spell Infinity as `1e999`). */
const reading = type("number >= 0").narrow(Number.isFinite);

/** One catalogued Metric's samples from a probe artifact — never empty, never an unknown id. */
const contributionSchema = type({
	metricId: type.enumerated(...NETWORK_PROBE_METRIC_IDS),
	samples: [reading, "...", reading.array()],
});
const contributionsSchema = contributionSchema.array();
export type NetworkProbeContribution = typeof contributionSchema.infer;

/** curl's seconds to milliseconds at three decimals — curl-phases.jq's `ms`, so both agree exactly. */
const secondsToMs = (seconds: number): number => Math.round(seconds * 1_000_000) / 1000;

/**
 * The `%{json}` write-out fields the latency probe needs. `exitcode` is absent on curls older than
 * 7.75, so absent/null reads as 0 — the same rule as `responded` in lib/jq/curl-phases.jq, which gates
 * the task's own statistics. The pipe yields the sample, or null for a recorded non-response (kept by
 * the task as evidence, never published as a latency: its time_total is the timeout).
 */
const latencySample = type({
	"exitcode?": "number.integer | null",
	response_code: "number.integer >= 0",
	time_total: reading,
}).pipe((record) =>
	(record.exitcode ?? 0) === 0 && record.response_code > 0 ? secondsToMs(record.time_total) : null,
);

const latencyArtifact = type({
	endpoints: type({ url: "string", curl_records: latencySample.array() }).array(),
})
	.pipe(({ endpoints }) =>
		NETWORK_LATENCY_TARGETS.flatMap((target) => {
			const samples = endpoints
				.filter((endpoint) => endpoint.url === target.url)
				.flatMap((endpoint) => endpoint.curl_records)
				.filter((sample) => sample !== null);
			return samples.length > 0 ? [{ metricId: target.id, samples }] : [];
		}),
	)
	.to(contributionsSchema);

/**
 * `jc --dig` for one cold query: exactly one answer row, NOERROR, for the domain the file is named
 * after (dig spells the question fully qualified; both spellings are the same name).
 */
const dnsArtifact = (target: NetworkDnsTarget) =>
	type([
		{
			status: "'NOERROR'",
			query_time: "number.integer >= 0",
			question: { name: type.enumerated(target.domain, `${target.domain}.`) },
		},
	])
		.pipe(([answer]) => [{ metricId: target.id, samples: [answer.query_time] }])
		.to(contributionsSchema);

/**
 * curl's `%{json}` record for the pinned download. Exit 28 is `--max-time` cutting a slow transfer
 * short: the rate over the bytes that arrived is still the plateau the probe reports. A 4xx/5xx is
 * curl-successful but measures an error body, and a record for any other URL measures some other
 * payload (DOWNLOAD_URL overridden, or an artifact from before the pin) — neither is this Metric.
 */
const downloadArtifact = type({
	"url?": type.unit(NETWORK_DOWNLOAD_TARGET.url),
	"exitcode?": "0 | 28 | null",
	http_code: "100 <= number.integer < 400",
	size_download: "number > 0",
	speed_download: reading.and("number > 0"),
})
	.pipe((record) => [
		{ metricId: NETWORK_DOWNLOAD_TARGET.id, samples: [(record.speed_download * 8) / 1_000_000] },
	])
	.to(contributionsSchema);

type ProbeParser = (body: unknown) => NetworkProbeContribution[] | ArkErrors;

/** Exact artifact filename → its schema. Everything else in a provider directory is not a probe. */
const PROBE_PARSERS: ReadonlyMap<string, ProbeParser> = new Map<string, ProbeParser>([
	[NETWORK_LATENCY_FILE, latencyArtifact],
	[NETWORK_DOWNLOAD_FILE, downloadArtifact],
	...NETWORK_DNS_TARGETS.map((target): [string, ProbeParser] => [
		networkDnsFile(target.domain),
		dnsArtifact(target),
	]),
]);

export function isNetworkProbeFile(filename: string): boolean {
	return PROBE_PARSERS.has(filename);
}

export function networkProbeContributions(
	filename: string,
	body: unknown,
): NetworkProbeContribution[] {
	const parsed = PROBE_PARSERS.get(filename)?.(body);
	return parsed === undefined || parsed instanceof type.errors ? [] : parsed;
}
