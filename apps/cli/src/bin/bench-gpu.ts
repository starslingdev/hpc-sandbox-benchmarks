#!/usr/bin/env bun
import {
	shutdownOwnedSandboxes,
	withCleanupPreservingPrimaryError,
} from "@sandbox-benchmarks/harness";
import type { ModalClient } from "modal";
import { ModalClient as Client } from "modal";
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

async function run(args: GpuArgs, client: ModalClient): Promise<void> {
	const app = await client.apps.fromName(GPU_BENCHMARK.appName, { createIfMissing: true });
	const baseImage = await client.images
		.fromRegistry(GPU_BENCHMARK.software.cudaImage)
		.dockerfileCommands([...VLLM_IMAGE_COMMANDS])
		.dockerfileCommands([...GPU_RUNTIME_IMAGE_COMMANDS])
		.build(app);
	const modelVolume = await client.volumes.fromName(args.modelVolume, {
		createIfMissing: args.operation === "models",
	});
	if (args.operation === "models") {
		await prepareModelAssets({
			client,
			app,
			image: baseImage,
			volume: modelVolume,
			volumeName: args.modelVolume,
			cpu: args.cpuRequested,
			cpuLimit: args.cpuLimit,
			timeoutMinutes: args.timeoutMinutes,
		});
		console.log(JSON.stringify({ status: "prepared", modelVolume: args.modelVolume }, null, 2));
		return;
	}

	const registryVolume = await client.volumes.fromName(args.kernelSnapshotRegistryVolume, {
		createIfMissing: args.operation === "kernels",
	});
	const cachedKernelImage = await resolveKernelSnapshot({
		client,
		app,
		baseImage,
		registryVolume,
		registryVolumeName: args.kernelSnapshotRegistryVolume,
		args,
	});
	if (args.operation === "kernels") {
		const pointer = cachedKernelImage
			? { status: "already-prepared", kernelSnapshotImageId: cachedKernelImage.imageId }
			: {
					status: "prepared",
					...(await prepareKernelSnapshot({
						client,
						app,
						baseImage,
						modelVolume,
						modelVolumeName: args.modelVolume,
						registryVolume,
						registryVolumeName: args.kernelSnapshotRegistryVolume,
						args,
					})),
				};
		console.log(JSON.stringify(pointer, null, 2));
		return;
	}
	if (!cachedKernelImage) {
		throw new Error(
			"no compatible vLLM kernel snapshot is registered; run --prepare kernels first",
		);
	}
	await runGpuFleet({ client, app, baseImage, kernelImage: cachedKernelImage, modelVolume, args });
}

async function main(): Promise<void> {
	const args = parseGpuArgs(process.argv.slice(2));
	if (!process.env.MODAL_TOKEN_ID || !process.env.MODAL_TOKEN_SECRET) {
		throw new Error("MODAL_TOKEN_ID and MODAL_TOKEN_SECRET are required");
	}
	const client = new Client();
	await withCleanupPreservingPrimaryError(
		() => run(args, client),
		async () => {
			let failures: unknown[];
			try {
				failures = await shutdownOwnedSandboxes("GPU benchmark exit");
			} finally {
				client.close();
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
