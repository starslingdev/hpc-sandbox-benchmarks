// Bake a durable Runloop Blueprint from the shared toolchain image. Runloop selects the latest
// successfully built Blueprint by name, so candidate builds deliberately reuse one mutable name:
// a failed successor never displaces the last working candidate.
import { RunloopSDK } from "@runloop/api-client";
import { config } from "@sandbox-benchmarks/providers";
import { resolveImageDigestRef } from "./image.ts";
import type { Log } from "./types.ts";

export type RunloopBlueprintParams = Parameters<RunloopSDK["blueprint"]["create"]>[0];

/** Pure Blueprint request builder, exported so the release contract is pinned without live API calls. */
export function runloopBlueprintParams(
	name: string,
	pinnedBaseImage: string,
): RunloopBlueprintParams {
	return {
		name,
		dockerfile: `FROM ${pinnedBaseImage}\n`,
		launch_parameters: {
			resource_size_request: "CUSTOM_SIZE",
			custom_cpu_cores: config.targetSpec.vcpus,
			custom_gb_memory: config.targetSpec.memoryGb,
			custom_disk_size: config.targetSpec.diskGb,
		},
	};
}

/** Create `name` from an immutable base digest and await a successful remote Blueprint build. */
export async function bakeRunloopBlueprint(
	name: string,
	baseImage: string,
	log: Log,
	sdk: Pick<RunloopSDK, "blueprint"> = new RunloopSDK(),
): Promise<void> {
	const pinnedBaseImage = await resolveImageDigestRef(baseImage);
	const params = runloopBlueprintParams(name, pinnedBaseImage);
	log(`runloop Blueprint build ${name} (base ${pinnedBaseImage})`);
	const blueprint = await sdk.blueprint.create(params);
	log(`runloop Blueprint built: ${blueprint.id}`);
}
