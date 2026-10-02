import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import {
	getMetric,
	METRIC_CATALOG,
	metricDefSchema,
	metricsForDimension,
	NETWORK_DNS_TARGETS,
	NETWORK_DOWNLOAD_TARGET,
	NETWORK_LATENCY_TARGETS,
	NETWORK_PROBE_METRIC_IDS,
	networkProbeMetrics,
} from "./index.ts";

const WEATHER = "external endpoint weather, not a headline, not a sandbox-stack measurement";
const COLD_DIG = "The sample is one cold dig and cache-warmed lookups are not included.";
const DOWNLOAD_UNIT =
	"decimal Mbits/sec from bytes/sec * 8 / 1e6, HTTP error bodies omitted, exit 28 kept";

const PROBE_IDS = [
	"network_https_github_com_total_ms",
	"network_https_api_github_com_total_ms",
	"network_https_raw_githubusercontent_com_total_ms",
	"network_https_registry_npmjs_org_total_ms",
	"network_https_pypi_org_total_ms",
	"network_https_files_pythonhosted_org_total_ms",
	"network_https_ghcr_io_v2_total_ms",
	"network_https_gcr_io_v2_total_ms",
	"network_https_auth_docker_io_registry_token_total_ms",
	"network_https_crates_io_total_ms",
	"network_https_index_crates_io_config_total_ms",
	"network_dns_cold_github_com_ms",
	"network_dns_cold_registry_npmjs_org_ms",
	"network_dns_cold_docker_io_ms",
	"network_dns_cold_pypi_org_ms",
	"network_dns_cold_rubygems_org_ms",
	"network_download_node_v22_23_1_linux_x64_mbits_per_sec",
] as const;

describe("network probe metrics", () => {
	it("pins the closed target tables in catalog order", () => {
		expect(NETWORK_PROBE_METRIC_IDS).toEqual([...PROBE_IDS]);
		expect(networkProbeMetrics.map((metric) => metric.id)).toEqual([...PROBE_IDS]);
		expect(NETWORK_LATENCY_TARGETS.map((target) => target.url)).toEqual([
			"https://github.com/",
			"https://api.github.com/",
			"https://raw.githubusercontent.com/",
			"https://registry.npmjs.org/",
			"https://pypi.org/",
			"https://files.pythonhosted.org/",
			"https://ghcr.io/v2/",
			"https://gcr.io/v2/",
			"https://auth.docker.io/token?service=registry.docker.io",
			"https://crates.io/",
			"https://index.crates.io/config.json",
		]);
		expect(NETWORK_DNS_TARGETS.map((target) => target.domain)).toEqual([
			"github.com",
			"registry.npmjs.org",
			"docker.io",
			"pypi.org",
			"rubygems.org",
		]);
		expect(NETWORK_DOWNLOAD_TARGET.url).toBe(
			"https://nodejs.org/dist/v22.23.1/node-v22.23.1-linux-x64.tar.gz",
		);
	});

	it("catalogues every probe as non-headline network weather and resolves it", () => {
		const latencyIds = new Set<string>(NETWORK_LATENCY_TARGETS.map((target) => target.id));
		const dnsIds = new Set<string>(NETWORK_DNS_TARGETS.map((target) => target.id));
		for (const id of NETWORK_PROBE_METRIC_IDS) {
			const metric = getMetric(id);
			if (!metric) throw new Error(`catalog is missing ${id}`);
			expect(metric.dimension).toBe("network");
			expect(metric.headline).toBe(false);
			expect(metric.pts).toBeUndefined();
			expect(metric.derived).toBeUndefined();
			expect(metric.description).toContain(WEATHER);
			expect(metricDefSchema(metric)).not.toBeInstanceOf(type.errors);
			if (latencyIds.has(id) || dnsIds.has(id)) {
				expect(metric.unit).toBe("ms");
				expect(metric.direction).toBe("LIB");
			}
		}
		const download = getMetric(NETWORK_DOWNLOAD_TARGET.id);
		expect(download?.unit).toBe("Mbits/sec");
		expect(download?.direction).toBe("HIB");
		expect(download?.description).toContain(DOWNLOAD_UNIT);
		expect(networkProbeMetrics.filter((metric) => metric.description.includes(COLD_DIG))).toEqual(
			networkProbeMetrics.filter((metric) => dnsIds.has(metric.id)),
		);
	});

	it("places the probe slice after curated PTS metrics and before harness metrics", () => {
		const ids = METRIC_CATALOG.map((metric) => metric.id);
		const start = ids.indexOf(PROBE_IDS[0]);
		expect(ids.slice(start, start + PROBE_IDS.length)).toEqual([...PROBE_IDS]);
		const before = ids[start - 1];
		expect(before).toBeDefined();
		expect(getMetric(before ?? "")?.pts).toBeDefined();
		expect(ids[start + PROBE_IDS.length]).toBe("lifecycle_spawn_ms");
	});

	it("keeps network headlines on the two WAN iperf metrics", () => {
		expect(
			metricsForDimension("network")
				.filter((metric) => metric.headline)
				.map((metric) => metric.id),
		).toEqual(["iperf_wan_direction_download", "iperf_wan_direction_upload"]);
	});
});
