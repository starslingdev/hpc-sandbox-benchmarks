#!/usr/bin/env bun
import {
	shutdownOwnedSandboxes,
	withCleanupPreservingPrimaryError,
} from "@sandbox-benchmarks/harness";
import type { ModalGpuPlatform } from "@sandbox-benchmarks/modal/gpu";
import { openModalGpuPlatform } from "@sandbox-benchmarks/modal/gpu";
import type { GpuArgs } from "../lib/gpu/args.ts";
import { parseGpuArgs } from "../lib/gpu/args.ts";
import {
	GPU_BENCHMARK,
	GPU_RUNTIME_IMAGE_COMMANDS,
	VLLM_IMAGE_COMMANDS,
} from "../lib/gpu/config.ts";
import { runGpuFleet } from "../lib/gpu/fleet.ts";
import { prepareKernelSnapshot, resolveKernelSnapshot } from "../lib/gpu/prepare-kernels.ts";
import { prepareModelAssets } from "../lib/gpu/prepare-models.ts";

async function run(args: GpuArgs, platform: ModalGpuPlatform): Promise<void> {
	const modelVolume = await platform.volume(args.modelVolume, {
		create: args.operation === "models",
	});
	if (args.operation === "models") {
		await prepareModelAssets({
			platform,
			volume: modelVolume,
			cpu: args.cpuRequested,
			cpuLimit: args.cpuLimit,
			timeoutMinutes: args.timeoutMinutes,
		});
		console.log(JSON.stringify({ status: "prepared", modelVolume: args.modelVolume }, null, 2));
		return;
	}

	const registryVolume = await platform.volume(args.kernelSnapshotRegistryVolume, {
		create: args.operation === "kernels",
	});
	const cachedKernelImage = await resolveKernelSnapshot({ platform, registryVolume, args });
	if (args.operation === "kernels") {
		const pointer = cachedKernelImage
			? { status: "already-prepared", kernelSnapshotImageId: cachedKernelImage.imageId }
			: {
					status: "prepared",
					...(await prepareKernelSnapshot({ platform, modelVolume, registryVolume, args })),
				};
		console.log(JSON.stringify(pointer, null, 2));
		return;
	}
	if (!cachedKernelImage) {
		throw new Error(
			"no compatible vLLM kernel snapshot is registered; run --prepare kernels first",
		);
	}
	await runGpuFleet({ platform, kernelImage: cachedKernelImage, modelVolume, args });
}

async function main(): Promise<void> {
	const args = parseGpuArgs(process.argv.slice(2));
	const platform = await openModalGpuPlatform({
		appName: GPU_BENCHMARK.appName,
		registryImage: GPU_BENCHMARK.software.cudaImage,
		layers: [VLLM_IMAGE_COMMANDS, GPU_RUNTIME_IMAGE_COMMANDS],
	});
	await withCleanupPreservingPrimaryError(
		() => run(args, platform),
		async () => {
			let failures: unknown[];
			try {
				failures = await shutdownOwnedSandboxes("GPU benchmark exit");
			} finally {
				platform.close();
			}
			if (failures.length > 0) {
				throw new AggregateError(failures, "GPU sandbox cleanup failed");
			}
		},
		(error) => console.error("GPU benchmark cleanup also failed:", error),
	);
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	}
}
