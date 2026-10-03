// Release composition for provider artifacts. The registry decides which providers participate and
// what each artifact is called; the generated `ARTIFACT_BUILDERS` join supplies each baked
// provider's builder from its own package. This module only assembles the build request, so it
// imports no vendor library and names no provider.

import { homedir } from "node:os";
import { join } from "node:path";
import type { ArtifactBuildResult, OwnBuildSandbox } from "@sandbox-benchmarks/driver/artifact";
import { parseDriverEnv } from "@sandbox-benchmarks/driver/env";
import { loadArtifactBuilder } from "@sandbox-benchmarks/drivers";
import {
	createOwnedSandbox,
	ownedSandboxShutdownSignal,
	withOwnedShutdownOperation,
} from "@sandbox-benchmarks/harness";
import type {
	ArtifactPhase,
	BakedProviderId,
	ProviderId,
} from "@sandbox-benchmarks/schema/providers";
import {
	bakedArtifactName,
	isNativeSnapshotProviderId,
	REGISTRY,
} from "@sandbox-benchmarks/schema/providers";
import { releaseConfig } from "../release-config.ts";

import { nativeSnapshotPreparation } from "./native-snapshot.ts";
import type { Log } from "./types.ts";

/** The toolchain images directory an OCI builder assembles a remote build context from. */
const IMAGES_DIR = join(import.meta.dir, "../../../../../packages/templates/images");
const DIGEST_PINNED = /@sha256:[a-f0-9]{64}$/;

/**
 * The release lane's process ownership of a build, bound to the harness: a build sandbox registers
 * with the SIGINT/SIGTERM drain before its create is invoked, so an interrupt destroys it whether
 * pending or live and a create that lands late is reclaimed; the build's signal aborts once that
 * drain begins.
 */
export const releaseBuildOwnership: {
	readonly own: OwnBuildSandbox;
	readonly signal: AbortSignal;
} = {
	own: (create) => createOwnedSandbox(create, { destroy: (destroy, options) => destroy(options) }),
	signal: ownedSandboxShutdownSignal(),
};

export interface ArtifactBuildInputs {
	readonly phase: ArtifactPhase;
	/** The digest-pinned base, resolved once by the caller; required by an OCI baker. */
	readonly base?: string;
	/** A version build of a native snapshot boots the immutable candidate just revalidated. */
	readonly candidate?: string;
	/**
	 * Whether the build may replace an existing artifact of its name: the caller knows whether that
	 * name may already be published (see `versionReplacement`).
	 */
	readonly replace: "allowed" | "forbidden";
	readonly log: Log;
}

/**
 * Build one baked provider's artifact for a release phase through its generated builder. Candidate
 * bake and version promote call this same function; the registry-derived name and, for a native
 * snapshot, the candidate it boots are all that differ.
 *
 * The caller says whether the name may be replaced: a candidate is mutable, but a version name a
 * backfill builds onto the live version may already be published. A builder that can only replace
 * destructively refuses a forbidden replacement before it deletes, and says in its result when it
 * replaced destructively.
 */
export async function buildProviderArtifact(
	id: BakedProviderId,
	inputs: ArtifactBuildInputs,
): Promise<ArtifactBuildResult> {
	return withOwnedShutdownOperation(async (signal) => {
		const { phase, replace, log } = inputs;
		const name = bakedArtifactName(id, phase);
		const common = {
			name,
			spec: releaseConfig.targetSpec,
			replace,
			log,
			signal,
		} as const;
		if (isNativeSnapshotProviderId(id)) {
			if (phase === "version" && inputs.candidate === undefined)
				throw new Error(`${id} version build needs the revalidated candidate's immutable ref`);
			const builder = await loadArtifactBuilder(id);
			return builder.build({
				...common,
				bakes: "native-snapshot",
				env: parseDriverEnv(id, process.env),
				artifact: REGISTRY[id].artifact,
				...(phase === "version" && inputs.candidate !== undefined
					? { candidate: { ref: inputs.candidate } }
					: {}),
				prepare: nativeSnapshotPreparation(id, phase, name),
				own: releaseBuildOwnership.own,
			});
		}
		const base = inputs.base;
		if (base === undefined || !DIGEST_PINNED.test(base))
			throw new Error(`${id} builds from the OCI base, which must be digest-pinned (got ${base})`);
		// The join is correlated per id; a runtime id meets the union of builders, all OCI here.
		const builder = (await loadArtifactBuilder(id)) as {
			build(request: object): Promise<ArtifactBuildResult>;
		};
		return builder.build({
			...common,
			bakes: "oci",
			env: parseDriverEnv(id, process.env),
			base: { digestRef: base },
			imagesDir: IMAGES_DIR,
			dockerConfig: process.env.DOCKER_CONFIG ?? join(homedir(), ".docker"),
		});
	});
}

/** Say what a build replaced; a destructive replacement left the name unresolvable meanwhile. */
export function describeReplacement(id: ProviderId, name: string, result: ArtifactBuildResult) {
	switch (result.replaced) {
		case "none":
			return `${id}: built ${result.ref}`;
		case "atomic":
			return `${id}: built ${result.ref}, replacing ${name} in place`;
		case "destructive":
			return `${id}: built ${result.ref} after deleting the previous ${name} (it did not resolve in between)`;
	}
}
