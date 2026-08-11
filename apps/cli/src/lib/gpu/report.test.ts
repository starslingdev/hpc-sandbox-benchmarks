import { describe, expect, test } from "bun:test";
import { parseGpuArgs } from "./args.ts";
import { createGpuBenchmarkMetadata, renderGpuFleetReport } from "./report.ts";

const xml = `<?xml version="1.0"?>
<PhoronixTestSuite>
  <Generated><TestClient>phoronix-test-suite/10.8.4</TestClient></Generated>
  <Result>
    <Identifier>local/vllm-speed-bench-1.0.0</Identifier><Title>vLLM SPEED-Bench Coding</Title>
    <Description>Workload: Qwen3 Coder 30B-A3B FP8 SPEED-Bench Coding</Description><Scale>requests/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>5.5</Value><RawString>5.5</RawString></Entry></Data>
  </Result>
  <Result>
    <Identifier>local/vllm-speed-bench-1.0.0</Identifier><Title>vLLM SPEED-Bench Coding</Title>
    <Description>Workload: Qwen3 Coder 30B-A3B FP8 SPEED-Bench Coding</Description><Scale>output tokens/s</Scale><Proportion>HIB</Proportion>
    <Data><Entry><Value>865</Value><RawString>865</RawString></Entry></Data>
  </Result>
  <Result>
    <Identifier>local/vllm-speed-bench-1.0.0</Identifier><Title>vLLM SPEED-Bench Coding</Title>
    <Description>Workload: Qwen3 Coder 30B-A3B FP8 SPEED-Bench Coding</Description><Scale>failed requests</Scale><Proportion>LIB</Proportion>
    <Data><Entry><Value>0.000001</Value><RawString>0.000001</RawString></Entry></Data>
  </Result>
</PhoronixTestSuite>`;

function metadata(index: number, durationSeconds = 240) {
	return createGpuBenchmarkMetadata({
		args: parseGpuArgs([]),
		replicateIndex: index,
		baseImageId: "im-base",
		kernelSnapshotImageId: "im-kernel",
		sandboxId: `sb-${index}`,
		startedAt: new Date("2026-08-08T00:00:00.000Z"),
		finishedAt: new Date(Date.parse("2026-08-08T00:00:00.000Z") + durationSeconds * 1000),
		cudaGraphs: {
			requestedMode: "FULL_AND_PIECEWISE",
			runtimeModeObserved: true,
			eagerDisabled: true,
			captureCompleted: true,
		},
		observed: {
			gpuName: "NVIDIA RTX PRO 6000",
			gpuCount: 1,
			driverVersion: "590.1",
			gpuMemoryMiB: 97_887,
			computeCapability: "12.0",
			visibleCpus: 4,
			memoryLimitMiB: 8192,
			ptsVersion: "10.8.4",
			pythonVersion: "3.13.14",
			torchVersion: "2.11.0",
			torchaudioVersion: undefined,
			transformersVersion: "5.0.0",
			tritonVersion: "3.6.0",
			flashinferVersion: "0.6.4",
			cutlassDslVersion: "4.4.0",
			cudaVersion: "13.0",
			nvccVersion: "release 13.3",
			cudaAvailable: true,
			cudaSmoke: "512",
			vllmVersion: "0.26.0",
		},
	});
}

function replicates(count = 20, duration = 240) {
	return Array.from({ length: count }, (_, index) => ({
		index,
		metadata: metadata(index, duration),
		xml: xml
			.replace("<Value>5.5</Value>", `<Value>${(5.5 + index / 10_000).toFixed(4)}</Value>`)
			.replace("<Value>865</Value>", `<Value>${865 + index / 100}</Value>`),
	}));
}

describe("renderGpuFleetReport", () => {
	test("renders one technical fleet report with confidence charts", () => {
		const report = renderGpuFleetReport({
			replicates: replicates(),
			failures: [],
			requestedReplicates: 20,
			precisionTarget: 0.005,
		});
		expect(report.summary.primaryPrecisionPassed).toBe(true);
		expect(report.summary.durationPassed).toBe(true);
		expect(report.markdown).toContain("Precision gate passed");
		expect(report.markdown).toContain("Duration gate passed");
		expect(report.markdown).toContain("one independently allocated Modal gVisor GPU sandbox");
		expect(report.markdown).toContain("FULL_AND_PIECEWISE");
		expect(report.markdown).toContain("im-kernel");
		expect(report.assets.has("output-tokens-s-ci.svg")).toBe(true);
		expect(report.summary.metrics.find(({ scale }) => scale === "failed requests")).toMatchObject({
			median: 0.000001,
			values: Array(20).fill(0.000001),
		});
	});

	test("fails closed for incomplete fleets", () => {
		const report = renderGpuFleetReport({
			replicates: replicates(),
			failures: [{ index: 20, outputDirectory: "replicates/r20", detail: "allocation failed" }],
			requestedReplicates: 21,
			precisionTarget: 0.005,
		});
		expect(report.summary.primaryPrecisionPassed).toBe(false);
		expect(report.markdown).toContain("Precision gate did not pass");
		expect(report.markdown).toContain("allocation failed");
	});

	test("reports duration independently from precision", () => {
		const fleet = replicates();
		const last = fleet.at(-1);
		if (!last) throw new Error("fixture produced no replicates");
		fleet[19] = { ...last, metadata: metadata(19, 301) };
		const report = renderGpuFleetReport({
			replicates: fleet,
			failures: [],
			requestedReplicates: 20,
			precisionTarget: 0.005,
			durationTargetSeconds: 300,
		});
		expect(report.summary.primaryPrecisionPassed).toBe(true);
		expect(report.summary.durationPassed).toBe(false);
		expect(report.summary.slowestDurationSeconds).toBe(301);
	});

	test("rejects mixed execution cohorts and incomplete CUDA-graph evidence", () => {
		const mixed = replicates();
		const mixedReplicate = mixed[1];
		if (!mixedReplicate) throw new Error("fixture produced too few replicates");
		mixedReplicate.metadata.memoryLimitMiB++;
		expect(() =>
			renderGpuFleetReport({
				replicates: mixed,
				failures: [],
				requestedReplicates: 20,
				precisionTarget: 0.005,
			}),
		).toThrow("replicate r1 does not match the fleet configuration");

		const missingGraphs = replicates();
		for (const replicate of missingGraphs) replicate.metadata.cudaGraphs.captureCompleted = false;
		expect(() =>
			renderGpuFleetReport({
				replicates: missingGraphs,
				failures: [],
				requestedReplicates: 20,
				precisionTarget: 0.005,
			}),
		).toThrow("replicate r0 has incomplete CUDA-graph evidence");
	});
});
