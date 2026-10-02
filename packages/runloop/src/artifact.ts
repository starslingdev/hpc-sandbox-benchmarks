// The Runloop Blueprint builder: a durable Blueprint from the digest-pinned toolchain base.
// Runloop selects the latest successfully built Blueprint by name, so candidate builds deliberately
// reuse one name: a failed successor never displaces the last working candidate.

import { RunloopSDK } from "@runloop/api-client";
import type { EnvOf, TargetSpec } from "@sandbox-benchmarks/driver";
import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";

export type RunloopBlueprintParams = Parameters<RunloopSDK["blueprint"]["create"]>[0];
/** The SDK surface the builder translates onto. */
export type RunloopBlueprintClient = {
	readonly blueprint: Pick<RunloopSDK["blueprint"], "create" | "list">;
};

/** The Blueprint request: the exact immutable FROM, the canonical name, and the target sizing. */
export function runloopBlueprintParams(
	name: string,
	digestRef: string,
	spec: TargetSpec,
): RunloopBlueprintParams {
	return {
		name,
		dockerfile: `FROM ${digestRef}\n`,
		launch_parameters: {
			resource_size_request: "CUSTOM_SIZE",
			custom_cpu_cores: spec.vcpus,
			custom_gb_memory: spec.memoryGb,
			...(spec.diskGb !== undefined && { custom_disk_size: spec.diskGb }),
		},
	};
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The Runloop builder over a client factory; the default export binds the real SDK. The SDK's
 * `blueprint.create` awaits the remote build, polling until it completes or fails.
 */
export function runloopArtifactBuilder(
	client: (env: EnvOf<"runloop">) => RunloopBlueprintClient = (env) =>
		new RunloopSDK({ bearerToken: env.RUNLOOP_API_KEY }),
) {
	return defineArtifactBuilder<"runloop", EnvOf<"runloop">>("runloop", async (request) => {
		const { name, base, spec, env, log } = request;
		const sdk = client(env);
		const params = runloopBlueprintParams(name, base.digestRef, spec);
		log(`runloop Blueprint build ${name} (base ${base.digestRef})`);
		let blueprint: Awaited<ReturnType<RunloopBlueprintClient["blueprint"]["create"]>>;
		try {
			blueprint = await sdk.blueprint.create(params);
		} catch (buildError) {
			// Failed build records can consume the account's Blueprint quota even though name lookup
			// ignores them. Remove failed same-name records without touching the last successful
			// candidate, then preserve the original build error as the operation's outcome.
			try {
				const failed = await sdk.blueprint.list({ name, status: "failed", limit: 100 });
				for (const stale of failed) {
					try {
						await stale.delete();
						log(`runloop Blueprint removed failed build: ${stale.id}`);
					} catch (cleanupError) {
						log(
							`warning: could not remove failed Runloop Blueprint ${stale.id}: ${describe(cleanupError)}`,
						);
					}
				}
			} catch (cleanupError) {
				log(
					`warning: could not enumerate failed Runloop Blueprints named ${name}: ${describe(cleanupError)}`,
				);
			}
			throw buildError;
		}
		log(`runloop Blueprint built: ${blueprint.id}`);

		// Names advance by creating a successor, because Runloop resolves the latest successful
		// build. Older same-name records are cleaned only AFTER the successor is ready, so a failed
		// build never displaces the last working candidate. Cleanup is best-effort: dependent
		// snapshots can legitimately prevent deletion, which must not invalidate the successor.
		try {
			// Only completed predecessors: a concurrent build with this name is another release
			// attempt, not stale state, and must be allowed to finish independently.
			const sameName = await sdk.blueprint.list({ name, status: "build_complete", limit: 100 });
			for (const stale of sameName) {
				if (stale.id === blueprint.id) continue;
				try {
					await stale.delete();
					log(`runloop Blueprint removed stale same-name build: ${stale.id}`);
				} catch (error) {
					log(`warning: could not remove stale Runloop Blueprint ${stale.id}: ${describe(error)}`);
				}
			}
		} catch (error) {
			log(
				`warning: could not enumerate stale Runloop Blueprints named ${name}: ${describe(error)}`,
			);
		}
		return { ref: name, replaced: "atomic" };
	});
}

export default runloopArtifactBuilder();
