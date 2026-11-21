// The catalogued network probes: which endpoints the curl/dig probes under
// .mise/tasks/benchmark/network measure, and the Metric each one publishes. arktype-first like the
// rest of the Catalog — every target table is validated at import, and the target and Metric types are
// inferred from the schemas below rather than written out a second time.
import type { Traversal } from "arktype";
import { type } from "arktype";
import type { MetricDef } from "./metrics.ts";
import { metricDefSchema } from "./metrics.ts";

const WEATHER = "external endpoint weather, not a headline, not a sandbox-stack measurement";

/** A registrable DNS name as the dns task passes it to dig: lowercase labels, no trailing dot. */
const domainSchema = type(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);

/**
 * Narrow a target table to unique ids AND unique keys (url / domain). A repeated key would publish one
 * measurement under two Metrics; a repeated id would silently merge two endpoints into one Metric.
 */
function uniqueTargets<key extends string>(key: key) {
	return (targets: readonly ({ id: string } & Record<key, string>)[], ctx: Traversal) => {
		const ids = new Set<string>();
		const keys = new Set<string>();
		for (const target of targets) {
			if (ids.has(target.id)) return ctx.reject({ expected: `unique ids (repeated ${target.id})` });
			if (keys.has(target[key])) {
				return ctx.reject({ expected: `unique ${key}s (repeated ${target[key]})` });
			}
			ids.add(target.id);
			keys.add(target[key]);
		}
		return true;
	};
}

/**
 * One HTTPS latency target. `url` is the exact curl endpoint the latency task records — and the key
 * its `network-latency.json` endpoints are matched on, so it must be byte-identical to the task's list.
 */
export const networkLatencyTargetSchema = type({
	id: /^network_https_[a-z0-9_]+_total_ms$/,
	url: "string.url",
	label: "string >= 1",
}).onUndeclaredKey("reject");
export type NetworkLatencyTarget = typeof networkLatencyTargetSchema.infer;

export const NETWORK_HTTPS_PHASES = [
	{ phase: "dns", label: "DNS", detail: "DNS lookup, curl time_namelookup" },
	{ phase: "tcp", label: "TCP", detail: "TCP handshake after DNS" },
	{
		phase: "tls",
		label: "TLS",
		detail: "TLS handshake after TCP, omitted when curl has no appconnect milestone",
	},
	{
		phase: "pretransfer",
		label: "pre-transfer",
		detail: "Client setup after the connection is ready and before the request is on the wire",
	},
	{ phase: "server", label: "server", detail: "Time to first byte after the request is sent" },
	{ phase: "body", label: "body", detail: "Body transfer after the first byte" },
] as const;
export type NetworkHttpsPhase = (typeof NETWORK_HTTPS_PHASES)[number]["phase"];

/** `network_https_<host>_total_ms` → `network_https_<host>_<phase>_ms`. */
export function networkHttpsPhaseMetricId(totalMetricId: string, phase: NetworkHttpsPhase): string {
	return `${totalMetricId.slice(0, -"_total_ms".length)}_${phase}_ms`;
}

/** One cold-DNS target: the dns task resolves a fresh random name under `domain` for this Metric. */
export const networkDnsTargetSchema = type({
	id: /^network_dns_cold_[a-z0-9_]+_ms$/,
	domain: domainSchema,
	label: "string >= 1",
}).onUndeclaredKey("reject");
export type NetworkDnsTarget = typeof networkDnsTargetSchema.infer;

/** The pinned download payload. `url` is the download task's default and the record's `url`. */
export const networkDownloadTargetSchema = type({
	id: /^network_download_[a-z0-9_]+_mbits_per_sec$/,
	url: "string.url",
	label: "string >= 1",
}).onUndeclaredKey("reject");
export type NetworkDownloadTarget = typeof networkDownloadTargetSchema.infer;

/** HTTPS latency targets, in catalog order (the order the latency task probes them). */
export const NETWORK_LATENCY_TARGETS: readonly NetworkLatencyTarget[] = networkLatencyTargetSchema
	.array()
	.narrow(uniqueTargets("url"))
	.assert([
		{
			id: "network_https_github_com_total_ms",
			url: "https://github.com/",
			label: "github.com HTTPS",
		},
		{
			id: "network_https_api_github_com_total_ms",
			url: "https://api.github.com/",
			label: "api.github.com HTTPS",
		},
		{
			id: "network_https_raw_githubusercontent_com_total_ms",
			url: "https://raw.githubusercontent.com/",
			label: "raw.githubusercontent.com HTTPS",
		},
		{
			id: "network_https_registry_npmjs_org_total_ms",
			url: "https://registry.npmjs.org/",
			label: "registry.npmjs.org HTTPS",
		},
		{
			id: "network_https_pypi_org_total_ms",
			url: "https://pypi.org/",
			label: "pypi.org HTTPS",
		},
		{
			id: "network_https_files_pythonhosted_org_total_ms",
			url: "https://files.pythonhosted.org/",
			label: "files.pythonhosted.org HTTPS",
		},
		{
			id: "network_https_ghcr_io_v2_total_ms",
			url: "https://ghcr.io/v2/",
			label: "ghcr.io/v2 HTTPS",
		},
		{
			id: "network_https_gcr_io_v2_total_ms",
			url: "https://gcr.io/v2/",
			label: "gcr.io/v2 HTTPS",
		},
		{
			id: "network_https_auth_docker_io_registry_token_total_ms",
			url: "https://auth.docker.io/token?service=registry.docker.io",
			label: "auth.docker.io token HTTPS",
		},
		{
			id: "network_https_crates_io_total_ms",
			url: "https://crates.io/",
			label: "crates.io HTTPS",
		},
		{
			id: "network_https_index_crates_io_config_total_ms",
			url: "https://index.crates.io/config.json",
			label: "index.crates.io config HTTPS",
		},
	]);

/** Cold DNS targets, in catalog order (the order the dns task resolves them). */
export const NETWORK_DNS_TARGETS: readonly NetworkDnsTarget[] = networkDnsTargetSchema
	.array()
	.narrow(uniqueTargets("domain"))
	.assert([
		{ id: "network_dns_cold_github_com_ms", domain: "github.com", label: "github.com cold DNS" },
		{
			id: "network_dns_cold_registry_npmjs_org_ms",
			domain: "registry.npmjs.org",
			label: "registry.npmjs.org cold DNS",
		},
		{ id: "network_dns_cold_docker_io_ms", domain: "docker.io", label: "docker.io cold DNS" },
		{ id: "network_dns_cold_pypi_org_ms", domain: "pypi.org", label: "pypi.org cold DNS" },
		{
			id: "network_dns_cold_rubygems_org_ms",
			domain: "rubygems.org",
			label: "rubygems.org cold DNS",
		},
	]);

export const NETWORK_DOWNLOAD_TARGET: NetworkDownloadTarget = networkDownloadTargetSchema.assert({
	id: "network_download_node_v22_23_1_linux_x64_mbits_per_sec",
	url: "https://nodejs.org/dist/v22.23.1/node-v22.23.1-linux-x64.tar.gz",
	label: "Node 22 download",
});

/** Every probe Metric is a non-headline network Metric; only the unit, direction and prose vary. */
const probeMetric = (
	def: Pick<MetricDef, "id" | "unit" | "direction" | "label" | "description">,
): MetricDef => metricDefSchema.assert({ ...def, dimension: "network", headline: false });

export const networkProbeMetrics: readonly MetricDef[] = [
	...NETWORK_LATENCY_TARGETS.flatMap((target) => [
		probeMetric({
			id: target.id,
			unit: "ms",
			direction: "LIB",
			label: target.label,
			description: `HTTPS total time to ${target.url}. This is ${WEATHER}.`,
		}),
		...NETWORK_HTTPS_PHASES.map((phase) =>
			probeMetric({
				id: networkHttpsPhaseMetricId(target.id, phase.phase),
				unit: "ms",
				direction: "LIB",
				label: `${target.label} ${phase.label}`,
				description: `${phase.detail} for ${target.url}. Same responding samples as the HTTPS total. This is ${WEATHER}.`,
			}),
		),
	]),
	...NETWORK_DNS_TARGETS.map((target) =>
		probeMetric({
			id: target.id,
			unit: "ms",
			direction: "LIB",
			label: target.label,
			description: [
				`Cache-miss DNS lookup in ${target.domain}: one dig of a fresh random name under it,`,
				"which no resolver can have cached, so the resolver must ask the zone's authoritative",
				"servers (whose delegation is warm). NXDOMAIN and wildcard answers both count;",
				"dig reports whole ms, so 0 means under 1 ms.",
				`This is ${WEATHER}.`,
			].join(" "),
		}),
	),
	probeMetric({
		id: NETWORK_DOWNLOAD_TARGET.id,
		unit: "Mbits/sec",
		direction: "HIB",
		label: NETWORK_DOWNLOAD_TARGET.label,
		description: [
			`Sustained download of ${NETWORK_DOWNLOAD_TARGET.url}.`,
			"decimal Mbits/sec from bytes/sec * 8 / 1e6, HTTP error bodies omitted, exit 28 kept.",
			`This is ${WEATHER}.`,
		].join(" "),
	}),
];

export const NETWORK_PROBE_METRIC_IDS: readonly string[] = networkProbeMetrics.map(
	(metric) => metric.id,
);
