import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseProfile } from "../scripts/catalog/parse.ts";

const profileDir = join(import.meta.dir, "pts-profiles/local/vllm-speed-bench-1.0.0");
const testXml = readFileSync(join(profileDir, "test-definition.xml"), "utf8");
const resultsXml = readFileSync(join(profileDir, "results-definition.xml"), "utf8");
const runner = readFileSync(join(profileDir, "runner.sh"), "utf8");
const baseLabels = [
	"Successful requests:",
	"Failed requests:",
	"Benchmark duration (s):",
	"Total input tokens:",
	"Total generated tokens:",
	"Request throughput (req/s):",
	"Output token throughput (tok/s):",
	"Peak output token throughput (tok/s):",
	"Peak concurrent requests:",
	"Total token throughput (tok/s):",
];
const latencyLabels = ["TTFT", "TPOT", "ITL", "E2EL"].flatMap((metric) =>
	["Mean", "Median", "P90", "P95", "P99"].map((statistic) => `${statistic} ${metric} (ms):`),
);

function emitPtsResults(log: string) {
	const emitFunction = runner.match(
		/emit_pts_results\(\) \{[\s\S]*?\n\}\n(?=trap stop_server)/,
	)?.[0];
	if (!emitFunction) throw new Error("emit_pts_results function not found");
	return Bun.spawnSync(["bash", "-c", `log_file="$LOG_FILE"\n${emitFunction}\nemit_pts_results`], {
		env: { ...Bun.env, LOG_FILE: log },
	});
}

describe("vLLM PTS profile", () => {
	test("requests the complete serving distribution and declares 30 scalar results", () => {
		const profile = parseProfile("local", "vllm-speed-bench-1.0.0", testXml, resultsXml);
		const workload = profile.settings.find((option) => option.Identifier === "workload");
		expect(workload?.Menu?.Entry[0]?.Value).toContain(
			"--percentile-metrics ttft,tpot,itl,e2el --metric-percentiles 90,95,99",
		);
		expect(profile.parsers).toHaveLength(30);
		expect(new Set(profile.parsers.map((parser) => parser.ResultScale)).size).toBe(30);
	});

	test("leads with the predeclared primary endpoint, not a validation counter", () => {
		// Result order is the composite's order, which is the order the fleet report tabulates and
		// charts. Output-token throughput is the predeclared primary endpoint and the test's declared
		// tokens/s scale, so it has to come first; the request/token counters are validation evidence
		// and belong after the throughput and latency measurements they qualify.
		const { parsers } = parseProfile("local", "vllm-speed-bench-1.0.0", testXml, resultsXml);
		expect(parsers[0]?.ResultScale).toBe("output tokens/s");
		const scaleOrder = parsers.map((parser) => parser.ResultScale);
		for (const counter of ["successful requests", "failed requests", "input tokens"]) {
			expect(scaleOrder.indexOf(counter)).toBeGreaterThan(scaleOrder.indexOf("output tokens/s"));
		}
	});

	test("keeps every PTS result when vLLM reports zero or duplicate numeric values", () => {
		const directory = mkdtempSync(join(tmpdir(), "vllm-pts-profile-"));
		const log = join(directory, "client.log");
		writeFileSync(
			log,
			[...baseLabels, ...latencyLabels]
				.map((label) => `${label} ${label === "Failed requests:" ? "0" : "1.00"}`)
				.join("\n"),
		);

		try {
			const process = emitPtsResults(log);
			expect(process.exitCode).toBe(0);

			const ptsLines = readFileSync(log, "utf8")
				.split("\n")
				.filter((line) => line.startsWith("PTS "));
			expect(ptsLines).toHaveLength(30);
			expect(new Set(ptsLines.map((line) => line.split(" ").at(-1))).size).toBe(30);
			expect(ptsLines.find((line) => line.startsWith("PTS Failed requests:"))).toBe(
				"PTS Failed requests: 0.000001",
			);
			const emittedLabels = new Set(ptsLines.map((line) => line.replace(/ [-+0-9.eE]+$/, "")));
			const parsedLabels = new Set(
				parseProfile("local", "vllm-speed-bench-1.0.0", testXml, resultsXml).parsers.map(
					(parser) => {
						if (!parser.OutputTemplate) throw new Error("result parser has no output template");
						return parser.OutputTemplate.replace(" #_RESULT_#", "");
					},
				),
			);
			expect(emittedLabels).toEqual(parsedLabels);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	test("rejects nonnumeric native metrics instead of coercing them to zero", () => {
		const directory = mkdtempSync(join(tmpdir(), "vllm-pts-profile-"));
		const log = join(directory, "client.log");
		writeFileSync(
			log,
			[...baseLabels, ...latencyLabels]
				.map((label) => `${label} ${label === "Mean TTFT (ms):" ? "nan" : "1.00"}`)
				.join("\n"),
		);

		try {
			expect(emitPtsResults(log).exitCode).not.toBe(0);
			expect(readFileSync(log, "utf8")).not.toContain("PTS ");
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
