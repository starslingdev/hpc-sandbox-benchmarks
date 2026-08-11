import { parsePtsComposite, resultSamples } from "@sandbox-benchmarks/results";
import { clusterMedianInterval } from "@sandbox-benchmarks/schema";
import type { GpuArgs } from "./args.ts";
import { GPU_BENCHMARK } from "./config.ts";
import type { CudaGraphEvidence } from "./cuda-graphs.ts";
import { cudaGraphEvidencePassed } from "./cuda-graphs.ts";

type ObservedGpu = Awaited<ReturnType<typeof import("./modal.ts").observeGpuSandbox>>;

export function createGpuBenchmarkMetadata(options: {
	args: GpuArgs;
	replicateIndex: number;
	baseImageId: string;
	kernelSnapshotImageId: string;
	sandboxId: string;
	startedAt: Date;
	finishedAt: Date;
	cudaGraphs: CudaGraphEvidence;
	observed: ObservedGpu;
}) {
	const { args } = options;
	return {
		replicateIndex: options.replicateIndex,
		profile: GPU_BENCHMARK.profile.id,
		workloadMode: args.mode,
		cudaToolkitImage: GPU_BENCHMARK.software.cudaImage,
		baseImageId: options.baseImageId,
		kernelSnapshotImageId: options.kernelSnapshotImageId,
		pythonRequested: GPU_BENCHMARK.software.python,
		vllmRequested: GPU_BENCHMARK.software.vllm,
		gpuRequested: args.gpu,
		cpuRequested: args.cpuRequested,
		cpuLimit: args.cpuLimit,
		memoryRequestedMiB: args.memoryRequestedMiB,
		memoryLimitMiB: args.memoryLimitMiB,
		modelVolume: args.modelVolume,
		kernelSnapshotRegistryVolume: args.kernelSnapshotRegistryVolume,
		flashinferAutotune: args.flashinferAutotune,
		sandboxId: options.sandboxId,
		startedAt: options.startedAt.toISOString(),
		finishedAt: options.finishedAt.toISOString(),
		durationSeconds: (options.finishedAt.getTime() - options.startedAt.getTime()) / 1000,
		clientTimeoutMinutes: args.clientTimeoutMinutes,
		cudaGraphs: options.cudaGraphs,
		observed: options.observed,
	};
}

export type GpuBenchmarkMetadata = ReturnType<typeof createGpuBenchmarkMetadata>;

export interface GpuFleetReplicate {
	index: number;
	xml: string;
	metadata: GpuBenchmarkMetadata;
}

export interface GpuFleetFailure {
	index: number;
	outputDirectory: string;
	detail: string;
}

interface MetricRow {
	scenario: string;
	scale: string;
	direction: "HIB" | "LIB" | "";
	samples: number[];
}

export interface GpuFleetMetric {
	scenario: string;
	scale: string;
	direction: "HIB" | "LIB" | "";
	median: number;
	lo: number;
	hi: number;
	relativeHalfWidth: number;
	values: number[];
}

const escapeXml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
const escapeTable = (value: string): string => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const optional = (value: string | number | undefined, suffix = ""): string =>
	value === undefined || value === "" ? "not reported" : `${value}${suffix}`;
const concise = (value: number): string =>
	Math.abs(value) >= 1000
		? value.toLocaleString("en-US", { maximumFractionDigits: 1 })
		: value.toFixed(3).replace(/\.?0+$/, "");
const median = (values: readonly number[]): number => {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0);
};
const slug = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "") || "metric";

function rowsOf(xml: string): MetricRow[] {
	return parsePtsComposite(xml).PhoronixTestSuite.Result.map((result) => ({
		scenario: (
			result.Description?.trim() ||
			result.Arguments?.trim() ||
			result.Title.trim()
		).replace(/^(?:Test|Workload):\s*/i, ""),
		scale: result.Scale?.trim() ?? "",
		direction: result.Proportion ?? "",
		samples: resultSamples(result),
	}));
}

const metricKey = (row: Pick<MetricRow, "scenario" | "scale" | "direction">): string =>
	`${row.scenario}\u0000${row.scale}\u0000${row.direction}`;

const lifecycleMetadataKeys = new Set([
	"replicateIndex",
	"sandboxId",
	"startedAt",
	"finishedAt",
	"durationSeconds",
]);

function cohortKey(metadata: GpuBenchmarkMetadata): string {
	return JSON.stringify(
		Object.fromEntries(Object.entries(metadata).filter(([key]) => !lifecycleMetadataKeys.has(key))),
	);
}

function confidenceChart(metric: GpuFleetMetric): string {
	const width = 920;
	const left = 80;
	const right = 40;
	const values = [...metric.values, metric.lo, metric.hi];
	let min = Math.min(...values);
	let max = Math.max(...values);
	if (min === max) {
		const padding = Math.max(Math.abs(min) * 0.05, 1);
		min -= padding;
		max += padding;
	}
	const x = (value: number) => left + ((value - min) / (max - min)) * (width - left - right);
	const dots = metric.values
		.map(
			(value, index) =>
				`<circle cx="${x(value).toFixed(1)}" cy="${78 + (index % 3) * 16}" r="4" fill="#38bdf8" opacity="0.75"/>`,
		)
		.join("\n");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="224" viewBox="0 0 ${width} 224">
<style>.title{font:600 20px system-ui;fill:#f8fafc}.subtitle,.value{font:14px system-ui;fill:#cbd5e1}.value{font-weight:600}</style>
<rect width="100%" height="100%" rx="16" fill="#0f172a"/>
<text x="24" y="34" class="title">${escapeXml(metric.scale)} — 95% cluster interval</text>
<text x="24" y="56" class="subtitle">${metric.values.length} independent Modal GPU sandboxes</text>
<line x1="${left}" y1="142" x2="${width - right}" y2="142" stroke="#334155" stroke-width="2"/>
${dots}
<line x1="${x(metric.lo).toFixed(1)}" y1="142" x2="${x(metric.hi).toFixed(1)}" y2="142" stroke="#a78bfa" stroke-width="10" stroke-linecap="round"/>
<circle cx="${x(metric.median).toFixed(1)}" cy="142" r="8" fill="#f8fafc" stroke="#a78bfa" stroke-width="3"/>
<text x="${left}" y="178" text-anchor="start" class="value">lo ${escapeXml(concise(metric.lo))}</text>
<text x="${x(metric.median).toFixed(1)}" y="178" text-anchor="middle" class="value">median ${escapeXml(concise(metric.median))}</text>
<text x="${width - right}" y="178" text-anchor="end" class="value">hi ${escapeXml(concise(metric.hi))}</text>
<text x="24" y="211" class="subtitle">Relative half-width ${(metric.relativeHalfWidth * 100).toFixed(3)}%</text>
</svg>
`;
}

export function renderGpuFleetReport(options: {
	replicates: readonly GpuFleetReplicate[];
	failures: readonly GpuFleetFailure[];
	requestedReplicates: number;
	precisionTarget: number;
	durationTargetSeconds?: number;
	minimumReplicates?: number;
}) {
	const first = options.replicates[0];
	if (!first) throw new Error("a GPU fleet report requires at least one completed replicate");
	const expectedCohort = cohortKey(first.metadata);
	for (const replicate of options.replicates) {
		if (cohortKey(replicate.metadata) !== expectedCohort) {
			throw new Error(`replicate r${replicate.index} does not match the fleet configuration`);
		}
		if (!cudaGraphEvidencePassed(replicate.metadata.cudaGraphs)) {
			throw new Error(`replicate r${replicate.index} has incomplete CUDA-graph evidence`);
		}
	}
	const minimumReplicates = options.minimumReplicates ?? GPU_BENCHMARK.defaults.minimumReplicates;
	const durationTargetSeconds =
		options.durationTargetSeconds ?? GPU_BENCHMARK.defaults.maxReplicateDurationSeconds;
	const rowsByReplicate = options.replicates.map((replicate) => ({
		...replicate,
		rows: rowsOf(replicate.xml),
	}));
	const exemplars = new Map<string, MetricRow>();
	for (const { rows } of rowsByReplicate) {
		for (const row of rows) {
			if (row.samples.length > 0) exemplars.set(metricKey(row), row);
		}
	}
	const metrics = [...exemplars].map(([key, exemplar]): GpuFleetMetric => {
		const samples = rowsByReplicate.map(({ index, rows }) => {
			const row = rows.find((candidate) => metricKey(candidate) === key);
			if (!row?.samples.length) {
				throw new Error(`replicate r${index} emitted no numeric ${exemplar.scale} measurement`);
			}
			return row.samples;
		});
		const interval = clusterMedianInterval(samples, {
			level: 0.95,
			resamples: 10_000,
			seed: `gpu-fleet:${key}`,
		});
		return {
			scenario: exemplar.scenario,
			scale: exemplar.scale,
			direction: exemplar.direction,
			median: interval.median,
			lo: interval.lo,
			hi: interval.hi,
			relativeHalfWidth:
				interval.median === 0
					? Number.POSITIVE_INFINITY
					: (interval.hi - interval.lo) / (2 * Math.abs(interval.median)),
			values: samples.map(median),
		};
	});
	const primary = metrics.find((metric) => metric.scale === "output tokens/s");
	const complete =
		options.failures.length === 0 && options.replicates.length === options.requestedReplicates;
	const primaryPrecisionPassed = Boolean(
		primary &&
			complete &&
			options.replicates.length >= minimumReplicates &&
			primary.relativeHalfWidth <= options.precisionTarget,
	);
	const durations = options.replicates.map(({ metadata }) => metadata.durationSeconds);
	const durationPassed =
		complete && durations.every((duration) => duration <= durationTargetSeconds);
	const summary = {
		schemaVersion: "1.0" as const,
		requestedReplicates: options.requestedReplicates,
		completedReplicates: options.replicates.length,
		failedReplicates: options.failures.length,
		confidenceLevel: 0.95 as const,
		resamples: 10_000 as const,
		minimumReplicates,
		precisionTarget: options.precisionTarget,
		primaryScale: "output tokens/s" as const,
		primaryPrecisionPassed,
		durationTargetSeconds,
		durationPassed,
		medianDurationSeconds: median(durations),
		fastestDurationSeconds: Math.min(...durations),
		slowestDurationSeconds: Math.max(...durations),
		metrics,
	};
	const assets = new Map(
		metrics.map((metric) => [`${slug(metric.scale)}-ci.svg`, confidenceChart(metric)]),
	);
	const metricRows = metrics
		.map(
			(metric) =>
				`| ${escapeTable(metric.scale)} | ${concise(metric.median)} | ${concise(metric.lo)}–${concise(metric.hi)} | ${(metric.relativeHalfWidth * 100).toFixed(3)}% | ${metric.scale === summary.primaryScale ? (primaryPrecisionPassed ? "pass" : "**fail**") : "descriptive"} |`,
		)
		.join("\n");
	const replicateRows = rowsByReplicate
		.map(({ index, metadata }, position) => {
			const outputTokens = primary?.values[position];
			return `| r${index} | \`${metadata.sandboxId}\` | ${outputTokens === undefined ? "—" : concise(outputTokens)} | ${(metadata.durationSeconds / 60).toFixed(2)} min | verified |`;
		})
		.join("\n");
	const failureRows = options.failures
		.map(
			(failure) =>
				`| r${failure.index} | ${escapeTable(failure.detail)} | \`${escapeTable(failure.outputDirectory)}\` |`,
		)
		.join("\n");
	const charts = metrics
		.map(
			(metric) =>
				`### ${escapeTable(metric.scale)}\n\n![${escapeTable(metric.scale)} 95% cluster interval](assets/${slug(metric.scale)}-ci.svg)`,
		)
		.join("\n\n");
	const metadata = first.metadata;
	const observed = metadata.observed;
	return {
		assets,
		summary,
		markdown: `# Modal ${escapeTable(metadata.gpuRequested)} vLLM benchmark

${primaryPrecisionPassed ? "**Precision gate passed.**" : "**Precision gate did not pass.**"} ${durationPassed ? "**Duration gate passed.**" : "**Duration gate did not pass.**"} ${options.replicates.length}/${options.requestedReplicates} independent ephemeral sandboxes completed the revision-pinned **${GPU_BENCHMARK.workload.label}** workload. The output-token-throughput interval must have a 95% relative half-width no greater than **${(options.precisionTarget * 100).toFixed(2)}%**. Every allocation must complete creation through artifact collection within **${durationTargetSeconds} seconds**; observed median/fastest/slowest durations were **${concise(summary.medianDurationSeconds)} / ${concise(summary.fastestDurationSeconds)} / ${concise(summary.slowestDurationSeconds)} seconds**.

## Cluster-level results

| Metric | Median of sandbox medians | 95% cluster interval | Relative half-width | Precision gate |
| --- | ---: | ---: | ---: | --- |
${metricRows}

${charts}

## Execution environment

| Property | Requested | Observed |
| --- | --- | --- |
| GPU | ${escapeTable(metadata.gpuRequested)} | ${escapeTable(optional(observed.gpuName))} |
| GPU count / memory | 1 | ${optional(observed.gpuCount)} / ${optional(observed.gpuMemoryMiB, " MiB")} |
| Compute capability / driver | — | ${escapeTable(`${optional(observed.computeCapability)} / ${optional(observed.driverVersion)}`)} |
| CPU | ${metadata.cpuRequested} request / ${metadata.cpuLimit} limit | ${optional(observed.visibleCpus)} visible |
| Memory | ${metadata.memoryRequestedMiB} MiB request / ${metadata.memoryLimitMiB} MiB limit | ${optional(observed.memoryLimitMiB, " MiB")} |
| Python / vLLM | ${metadata.pythonRequested} / ${metadata.vllmRequested} | ${escapeTable(`${optional(observed.pythonVersion)} / ${optional(observed.vllmVersion)}`)} |
| PyTorch / CUDA | vLLM-managed wheels | ${escapeTable(`${optional(observed.torchVersion)} / ${optional(observed.cudaVersion)}`)} |
| CUDA compiler | ${escapeTable(metadata.cudaToolkitImage)} | ${escapeTable(optional(observed.nvccVersion))} |
| Triton / FlashInfer / CUTLASS DSL | vLLM-managed | ${escapeTable(`${optional(observed.tritonVersion)} / ${optional(observed.flashinferVersion)} / ${optional(observed.cutlassDslVersion)}`)} |
| PTS | ${escapeTable(metadata.profile)} | ${escapeTable(optional(observed.ptsVersion))} |
| CUDA graphs | FULL_AND_PIECEWISE | mode ${metadata.cudaGraphs.runtimeModeObserved ? "observed" : "missing"}; eager ${metadata.cudaGraphs.eagerDisabled ? "disabled" : "not verified"}; capture ${metadata.cudaGraphs.captureCompleted ? "complete" : "not verified"} |
| Base / kernel image | \`${metadata.baseImageId}\` | \`${metadata.kernelSnapshotImageId}\` |
| Model / snapshot registry | \`${metadata.modelVolume}\` | \`${metadata.kernelSnapshotRegistryVolume}\` |

## Replicate lifecycle

| Replicate | Modal sandbox | Output tokens/s | Creation through artifacts | Teardown |
| --- | --- | ---: | ---: | --- |
${replicateRows}

${failureRows ? `## Failed replicates\n\n| Replicate | Failure | Artifact directory |\n| --- | --- | --- |\n${failureRows}\n` : ""}
## Methodology

- The unit of replication is one independently allocated Modal gVisor GPU sandbox. PTS runs the fixed ${metadata.workloadMode} SPEED-Bench Coding workload once per allocation; requests inside a sandbox are not treated as independent machines.
- Model weights and prepared SPEED-Bench data are revision-pinned in a read-only Modal Volume. A configuration-keyed filesystem snapshot supplies the warmed Blackwell kernels and PTS installation, keeping network transfer and compilation outside measured runs.
- vLLM uses one GPU with TP=1 and PP=1, asynchronous scheduling, FP8 KV cache, safetensors prefetch, optimization level 2, and FULL_AND_PIECEWISE CUDA graphs. Complete graph evidence is required from every server log. FlashInfer autotuning was **${metadata.flashinferAutotune}**.
- The point estimate is the median of per-sandbox medians. The deterministic 10,000-resample percentile cluster bootstrap resamples whole sandboxes at 95% coverage. Output-token throughput is the predeclared primary endpoint; other intervals are descriptive.
- PTS dynamic convergence is not substituted for independent allocation variance. A confidence interval describes this configuration; comparison against another configuration requires an independently replicated baseline.
- Every sandbox is registered before creation begins, terminated with \`wait: true\`, and required to disappear from Modal inventory before its lifecycle record is written.

## Reproducibility artifacts

Each \`replicates/rN/\` directory contains the raw PTS composite, PTS metadata and forensics, native vLLM JSON and exact argv, server log, pinned asset manifest, resolved Python environment, allocation metadata, benchmark logs, and verified lifecycle record.
`,
	};
}
