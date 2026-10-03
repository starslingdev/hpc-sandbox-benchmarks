// Publish a successor before retiring completed predecessors. Own the accepted build across cancellation.
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { RunloopSDK } from "@runloop/api-client";
import type { EnvOf, TargetSpec } from "@sandbox-benchmarks/driver";
import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";

type Blueprints = Pick<RunloopSDK["api"]["blueprints"], "create" | "retrieve" | "list" | "delete">;
type RunloopBlueprintParams = Parameters<Blueprints["create"]>[0];
export function runloopBlueprintParams(
	name: string,
	digestRef: string,
	spec: TargetSpec,
): RunloopBlueprintParams {
	return {
		name,
		dockerfile: `FROM ${digestRef}
`,
		launch_parameters: {
			resource_size_request: "CUSTOM_SIZE",
			custom_cpu_cores: spec.vcpus,
			custom_gb_memory: spec.memoryGb,
			...(spec.diskGb !== undefined && { custom_disk_size: spec.diskGb }),
		},
	};
}
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
export function runloopArtifactBuilder(
	client: (env: EnvOf<"runloop">) => { readonly api: { readonly blueprints: Blueprints } } = (
		env,
	) => new RunloopSDK({ bearerToken: env.RUNLOOP_API_KEY }),
) {
	return defineArtifactBuilder<"runloop", EnvOf<"runloop">>("runloop", async (request) => {
		const { name, base, spec, env, log } = request,
			api = client(env).api.blueprints;
		const attempt = randomUUID(),
			signal = AbortSignal.any([request.signal, AbortSignal.timeout(15 * 60_000)]);
		const options = { signal, maxRetries: 0 };
		let blueprint: Awaited<ReturnType<Blueprints["create"]>> | undefined;
		try {
			blueprint = await api.create(
				{
					...runloopBlueprintParams(name, base.digestRef, spec),
					metadata: { benchmark_build_attempt: attempt },
				},
				options,
			);
			while (["queued", "provisioning", "building"].includes(blueprint.status)) {
				signal.throwIfAborted();
				blueprint = await api.retrieve(blueprint.id, options);
				if (["queued", "provisioning", "building"].includes(blueprint.status))
					await setTimeout(1000, undefined, { signal });
			}
			if (blueprint.status !== "build_complete")
				throw Error(`Blueprint ${blueprint.id} is in non-complete state ${blueprint.status}`);
			signal.throwIfAborted();
		} catch (error) {
			const cleanup = { signal: AbortSignal.timeout(10_000), maxRetries: 0 };
			try {
				if (blueprint) await api.delete(blueprint.id, cleanup);
				else {
					// A lost POST response may still allocate. Reconcile only this attempt, never another release.
					for (;;) {
						let found = false;
						for await (const row of api.list({ name, limit: 100 }, cleanup)) {
							if (row.metadata?.benchmark_build_attempt !== attempt) continue;
							await api.delete(row.id, cleanup);
							found = true;
						}
						if (found) break;
						await setTimeout(100, undefined, { signal: cleanup.signal });
					}
				}
			} catch (cleanupError) {
				log(`warning: Runloop build ${attempt} cleanup unconfirmed: ${message(cleanupError)}`);
			}
			throw error;
		}
		log(`runloop Blueprint built: ${blueprint.id}`);
		try {
			const cleanup = { signal: AbortSignal.timeout(10_000), maxRetries: 0 };
			for await (const stale of api.list({ name, status: "build_complete", limit: 100 }, cleanup)) {
				if (stale.id === blueprint.id || stale.create_time_ms >= blueprint.create_time_ms) continue;
				await api
					.delete(stale.id, cleanup)
					.catch((error) =>
						log(`warning: Runloop predecessor ${stale.id} cleanup failed: ${message(error)}`),
					);
			}
		} catch (error) {
			log(`warning: Runloop predecessor cleanup failed: ${message(error)}`);
		}
		return { ref: name, replaced: "atomic" };
	});
}
export default runloopArtifactBuilder();
