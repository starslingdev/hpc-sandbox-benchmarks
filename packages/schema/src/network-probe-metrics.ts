// Hand-authored network-probe Metrics. The closed tables below own the ids. The results parser
// matches a target by exact URL or filename domain and does not slugify hostnames. No `pts` field:
// samples come from the curl and dig artifacts, and none of these headline the network dimension.
import type { MetricDef } from "./metrics.ts";

const MS = "ms";
const MBITS_PER_SEC = "Mbits/sec";
const LIB = "LIB";
const HIB = "HIB";
const WEATHER = "external endpoint weather, not a headline, not a sandbox-stack measurement";

/**
 * HTTPS latency targets, in catalog order. `url` is the exact curl endpoint the latency task
 * records. The id is not derived from the host.
 */
export const NETWORK_LATENCY_TARGETS = [
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
] as const;

/**
 * Cold DNS targets, in catalog order. `domain` is the exact name in `network-dns--<domain>.json`
 * and the jc question name (trailing dot stripped).
 */
export const NETWORK_DNS_TARGETS = [
	{ id: "network_dns_cold_github_com_ms", domain: "github.com", label: "github.com DNS" },
	{
		id: "network_dns_cold_registry_npmjs_org_ms",
		domain: "registry.npmjs.org",
		label: "registry.npmjs.org DNS",
	},
	{ id: "network_dns_cold_docker_io_ms", domain: "docker.io", label: "docker.io DNS" },
	{ id: "network_dns_cold_pypi_org_ms", domain: "pypi.org", label: "pypi.org DNS" },
	{
		id: "network_dns_cold_rubygems_org_ms",
		domain: "rubygems.org",
		label: "rubygems.org DNS",
	},
] as const;

/** The one pinned download. An override URL stays raw and is not a sample of this metric. */
export const NETWORK_DOWNLOAD_TARGET = {
	id: "network_download_node_v22_23_1_linux_x64_mbits_per_sec",
	url: "https://nodejs.org/dist/v22.23.1/node-v22.23.1-linux-x64.tar.gz",
	label: "Node 22 download",
} as const;

/** Catalog ids for the probe slice, latency then DNS then download. */
export const NETWORK_PROBE_METRIC_IDS: readonly string[] = [
	...NETWORK_LATENCY_TARGETS.map((target) => target.id),
	...NETWORK_DNS_TARGETS.map((target) => target.id),
	NETWORK_DOWNLOAD_TARGET.id,
];

const latencyMetrics: MetricDef[] = NETWORK_LATENCY_TARGETS.map((target) => ({
	id: target.id,
	dimension: "network",
	unit: MS,
	direction: LIB,
	headline: false,
	label: target.label,
	description: `HTTPS total time to ${target.url}. This is ${WEATHER}.`,
}));

const dnsMetrics: MetricDef[] = NETWORK_DNS_TARGETS.map((target) => ({
	id: target.id,
	dimension: "network",
	unit: MS,
	direction: LIB,
	headline: false,
	label: target.label,
	description: [
		`Cold DNS lookup of ${target.domain}.`,
		"The sample is one cold dig and cache-warmed lookups are not included.",
		`This is ${WEATHER}.`,
	].join(" "),
}));

const downloadMetric: MetricDef = {
	id: NETWORK_DOWNLOAD_TARGET.id,
	dimension: "network",
	unit: MBITS_PER_SEC,
	direction: HIB,
	headline: false,
	label: NETWORK_DOWNLOAD_TARGET.label,
	description: [
		`Sustained download of ${NETWORK_DOWNLOAD_TARGET.url}.`,
		"decimal Mbits/sec from bytes/sec * 8 / 1e6, HTTP error bodies omitted, exit 28 kept.",
		`This is ${WEATHER}.`,
	].join(" "),
};

/** The non-PTS network-probe Catalog slice, in {@link NETWORK_PROBE_METRIC_IDS} order. */
export const networkProbeMetrics: MetricDef[] = [...latencyMetrics, ...dnsMetrics, downloadMetric];
