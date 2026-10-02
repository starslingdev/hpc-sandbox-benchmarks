import { writeTextFile } from "@sandbox-benchmarks/driver";
import type { ModalGpuPlatform, ModalGpuVolume } from "@sandbox-benchmarks/modal/gpu";
import { tagModalGpuSandbox } from "@sandbox-benchmarks/modal/gpu";
import { GPU_BENCHMARK, MODEL_CACHE_ENV, readSource } from "./config.ts";
import type { GpuSandbox } from "./sandbox.ts";
import { withGpuSandbox } from "./sandbox.ts";

const REMOTE_SCRIPT = "/tmp/prepare-gpu-models.py";
const REMOTE_CONFIG = "/tmp/gpu-benchmark-assets.json";

export function modelAssetConfig() {
	return {
		model: GPU_BENCHMARK.workload.model,
		speedBench: GPU_BENCHMARK.assets.speedBench,
		paths: {
			modelMount: GPU_BENCHMARK.paths.modelMount,
			modelCache: `${GPU_BENCHMARK.paths.modelCache}/hub`,
			speedBench: GPU_BENCHMARK.paths.speedBench,
		},
	};
}

async function stageModelPreparation(sandbox: GpuSandbox): Promise<void> {
	await Promise.all([
		writeTextFile(
			sandbox.session,
			REMOTE_SCRIPT,
			readSource("apps/cli/src/lib/gpu/prepare-models.py"),
		),
		writeTextFile(
			sandbox.session,
			REMOTE_CONFIG,
			`${JSON.stringify(modelAssetConfig(), null, 2)}\n`,
		),
	]);
}

async function runModelPreparation(
	sandbox: GpuSandbox,
	mode: "download" | "check",
	timeoutMs: number,
): Promise<void> {
	await stageModelPreparation(sandbox);
	await sandbox.runner.step(
		`${mode === "download" ? "prepare" : "validate"} model assets`,
		`${GPU_BENCHMARK.paths.vllmEnvironment}/bin/python ${REMOTE_SCRIPT} ${mode} ${REMOTE_CONFIG}`,
		timeoutMs,
	);
}

export async function validateModelAssets(sandbox: GpuSandbox): Promise<void> {
	await runModelPreparation(sandbox, "check", 5 * 60_000);
}

export async function prepareModelAssets(options: {
	platform: ModalGpuPlatform;
	volume: ModalGpuVolume;
	cpu: number;
	cpuLimit: number;
	timeoutMinutes: number;
}): Promise<void> {
	await withGpuSandbox(
		options.platform,
		{
			image: options.platform.baseImage,
			resources: {
				cpu: options.cpu,
				cpuLimit: options.cpuLimit,
				memoryMiB: GPU_BENCHMARK.modelPreparation.memoryMiB,
				memoryLimitMiB: GPU_BENCHMARK.modelPreparation.memoryLimitMiB,
				timeoutMs: options.timeoutMinutes * 60_000,
			},
			env: { ...MODEL_CACHE_ENV },
			mounts: { [GPU_BENCHMARK.paths.modelMount]: { volume: options.volume, writable: true } },
		},
		async (sandbox) => {
			await tagModalGpuSandbox(sandbox.session, {
				"gpu-benchmark-role": "model-cache",
				"model-volume": options.volume.name,
			});
			console.error(`Modal model-cache sandbox: ${sandbox.session.sandboxRef.id}`);
			await runModelPreparation(
				sandbox,
				"download",
				Math.max(60_000, options.timeoutMinutes * 60_000 - 60_000),
			);
		},
	);
	// Modal Volume v1 commits its final state during the scoped sandbox termination above.
}
