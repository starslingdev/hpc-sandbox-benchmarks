// Bake a durable Runloop Blueprint from the shared toolchain image. Runloop selects the latest
// successfully built Blueprint by name, so candidate builds deliberately reuse one mutable name:
// a failed successor never displaces the last working candidate.
import { RunloopSDK } from "@runloop/api-client";
import { config } from "@sandbox-benchmarks/providers";
import { resolveImageDigestRef } from "./image.ts";
import type { Log } from "./types.ts";

export type RunloopBlueprintParams = Parameters<RunloopSDK["blueprint"]["create"]>[0];
type RunloopBlueprintClient = Pick<RunloopSDK["blueprint"], "create" | "list">;

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
	sdk: { blueprint: RunloopBlueprintClient } = new RunloopSDK(),
): Promise<void> {
	const pinnedBaseImage = await resolveImageDigestRef(baseImage);
	const params = runloopBlueprintParams(name, pinnedBaseImage);
	log(`runloop Blueprint build ${name} (base ${pinnedBaseImage})`);
	let blueprint: Awaited<ReturnType<RunloopBlueprintClient["create"]>>;
	try {
		blueprint = await sdk.blueprint.create(params);
	} catch (buildError) {
		// Failed build records can consume the account's Blueprint quota even though name lookup ignores
		// them. Remove failed same-name records without touching the last successful candidate, then
		// preserve the original build error as the operation's outcome.
		try {
			const failed = await sdk.blueprint.list({ name, status: "failed", limit: 100 });
			for (const stale of failed) {
				try {
					await stale.delete();
					log(`runloop Blueprint removed failed build: ${stale.id}`);
				} catch (cleanupError) {
					log(
						`warning: could not remove failed Runloop Blueprint ${stale.id}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
					);
				}
			}
		} catch (cleanupError) {
			log(
				`warning: could not enumerate failed Runloop Blueprints named ${name}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
			);
		}
		throw buildError;
	}
	log(`runloop Blueprint built: ${blueprint.id}`);

	// Names intentionally advance by creating a successor, because Runloop resolves the latest
	// successful build. Clean older same-name records only AFTER the successor is ready so a failed
	// build never displaces the last working candidate. Cleanup is best-effort: dependent snapshots can
	// legitimately prevent deletion, and that must not invalidate the successfully built successor.
	try {
		// Restrict the sweep to completed predecessors. A concurrent build with this canonical name is
		// another release attempt, not stale state, and must be allowed to finish independently.
		const sameName = await sdk.blueprint.list({ name, status: "build_complete", limit: 100 });
		for (const stale of sameName) {
			if (stale.id === blueprint.id) continue;
			try {
				await stale.delete();
				log(`runloop Blueprint removed stale same-name build: ${stale.id}`);
			} catch (error) {
				log(
					`warning: could not remove stale Runloop Blueprint ${stale.id}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	} catch (error) {
		log(
			`warning: could not enumerate stale Runloop Blueprints named ${name}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
