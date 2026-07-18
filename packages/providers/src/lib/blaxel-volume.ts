// Blaxel is the one provider that cannot express disk independently of RAM: its sandbox root is a
// RAM-overlay tmpfs (~50-80% of memory), and the control plane silently ignores the documented
// `storageMb`/`diskPercent` knobs on this plan (verified: they pass validation but never resize the
// root). The @computesdk/blaxel wrapper's config only exposes image/memory/region/ports, so there is
// no create-time disk option to pin either. The only mechanism that yields real disk decoupled from
// RAM is a durable Volume mounted at a path — so this module provisions one per sandbox and mounts it
// where the benchmark's heavy writes actually land.
//
// Every disk-heavy suite (the realworld repo clones/builds — mastra ~30 GiB, openclaw ~25 GiB — plus
// pgbench's ~1.5 GiB cluster, fio's test files, and all PTS installed-tests) writes under PTS's data
// dir, which resolves to /var/lib/phoronix-test-suite once PTS_USER_PATH_OVERRIDE is active (see
// packages/harness/src/lib/execute.ts and lib/bench.sh). Mounting the volume there both hands those
// suites their 40 GiB AND makes the override's `[ -d /var/lib/phoronix-test-suite ]` guard true from
// boot, so PTS deterministically writes onto the volume. The sandbox root stays a small tmpfs — fine,
// since only the light repo checkout lives there.
//
// A Blaxel volume attaches to exactly one sandbox at a time, and concurrent replicate/suite jobs share
// this account, so a shared volume name would collide. Each sandbox therefore gets its own uniquely-
// named volume, created just before it and deleted just after — patched onto the provider's
// create/destroy the same clone-the-method-table way e2b-root patches runCommand, so nothing re-wraps
// the SDK.

import { randomUUID } from "node:crypto";
import type { SandboxInstance } from "@blaxel/core";
import { initialize, VolumeInstance } from "@blaxel/core";
import type { BlaxelConfig } from "@computesdk/blaxel";
import type { SandboxMethods } from "@computesdk/provider";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import type { CreateSandboxOptions } from "computesdk";
import type { DirectProvider } from "./types.ts";

// The absolute path PTS writes all heavy data to. Must equal the PTS_USER_PATH_OVERRIDE value the
// harness preamble exports (packages/harness/src/lib/execute.ts) and the disk-measurement path the gate
// + observed-specs probe use — keep the three in lockstep.
const PTS_DATA_DIR = "/var/lib/phoronix-test-suite";

// Volume capacity, in MB (Blaxel's unit): the shared target spec's disk, so Blaxel matches the other
// runners' 40 GiB rather than the RAM-derived sliver it got before.
const VOLUME_SIZE_MB = TARGET_SPEC.diskGb * 1024;

// Volume-name prefix; the random suffix keeps concurrent sandboxes on distinct volumes.
const VOLUME_PREFIX = "sbx-bench";

type BlaxelSandboxMethods = SandboxMethods<SandboxInstance, BlaxelConfig>;
type BlaxelCreate = BlaxelSandboxMethods["create"];
type BlaxelDestroy = BlaxelSandboxMethods["destroy"];

interface PatchableManager {
	methods: Record<string, unknown> & { create: BlaxelCreate; destroy: BlaxelDestroy };
}

function patchableManager(provider: DirectProvider): PatchableManager {
	const manager = provider.sandbox as unknown as { methods?: Record<string, unknown> };
	if (
		typeof manager.methods?.create !== "function" ||
		typeof manager.methods?.destroy !== "function"
	) {
		throw new Error(
			"@computesdk/blaxel provider internals changed shape (sandbox manager has no patchable " +
				"create/destroy methods); revisit the volume adapter against the upgraded wrapper",
		);
	}
	return manager as PatchableManager;
}

/** Initialize the raw Blaxel SDK so VolumeInstance calls carry auth — the wrapper only does this inside
 *  its own create, and the volume is provisioned before that runs. Mirrors the wrapper's credential
 *  fallback (config, else BL_API_KEY/BL_WORKSPACE); idempotent, so the wrapper re-initializing is fine. */
function ensureBlaxelInitialized(config: BlaxelConfig): void {
	initialize({
		apikey: config.apiKey ?? process.env.BL_API_KEY,
		workspace: config.workspace ?? process.env.BL_WORKSPACE,
	});
}

/** Best-effort volume teardown. After the sandbox is deleted its volume's `attachedTo` clears
 *  asynchronously, so a delete issued immediately can fail as still-attached — retry with backoff, then
 *  give up with a warning. Teardown must never fail a Run, so a leaked volume is logged, not thrown. */
async function deleteVolumeWithRetry(name: string): Promise<void> {
	const BACKOFF_MS = [1_000, 3_000, 5_000, 8_000];
	for (let attempt = 0; ; attempt++) {
		try {
			await VolumeInstance.delete(name);
			return;
		} catch (err) {
			if (attempt >= BACKOFF_MS.length) {
				console.warn(
					`[blaxel] volume ${name} not deleted after ${attempt + 1} attempts ` +
						`(${err instanceof Error ? err.message : String(err)}); may need manual cleanup`,
				);
				return;
			}
			await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
		}
	}
}

/**
 * Patch one Blaxel provider instance so every sandbox it creates gets a dedicated {@link VOLUME_SIZE_MB}
 * MB volume mounted at {@link PTS_DATA_DIR}, torn down with the sandbox. Clones and mutates only this
 * instance's method table (never the wrapper's shared one).
 */
export function blaxelWithVolume(provider: DirectProvider): DirectProvider {
	const manager = patchableManager(provider);
	const originalCreate = manager.methods.create;
	const originalDestroy = manager.methods.destroy;
	// sandboxId → its volume name, so destroy tears down exactly the volume create provisioned. The
	// wrapper drops any `name` we pass (it destructures it out), so the sandbox id can't be pinned to the
	// volume name a priori; one entry per live sandbox, cleared on destroy.
	const sandboxVolumes = new Map<string, string>();

	const create: BlaxelCreate = async (config, options) => {
		ensureBlaxelInitialized(config);
		const volumeName = `${VOLUME_PREFIX}-${randomUUID().slice(0, 8)}`;
		await VolumeInstance.createIfNotExists({
			name: volumeName,
			size: VOLUME_SIZE_MB,
			region: config.region,
		});
		try {
			const result = await originalCreate(config, {
				...options,
				// `volumes` isn't in the wrapper's destructured-out set, so it rides through to the raw SDK's
				// createIfNotExists. Prepend ours; keep any caller-supplied bindings (there are none today).
				volumes: [
					{ name: volumeName, mountPath: PTS_DATA_DIR },
					...(Array.isArray(options?.volumes) ? options.volumes : []),
				],
			} as CreateSandboxOptions);
			sandboxVolumes.set(result.sandboxId, volumeName);
			return result;
		} catch (err) {
			// The sandbox never came up — don't leak the volume just provisioned for it.
			await deleteVolumeWithRetry(volumeName);
			throw err;
		}
	};

	const destroy: BlaxelDestroy = async (config, sandboxId) => {
		ensureBlaxelInitialized(config);
		try {
			await originalDestroy(config, sandboxId);
		} finally {
			const volumeName = sandboxVolumes.get(sandboxId);
			if (volumeName) {
				sandboxVolumes.delete(sandboxId);
				await deleteVolumeWithRetry(volumeName);
			} else {
				// No volume tracked for this sandbox in THIS process, so we can't name one to delete: the
				// map was lost to a process restart between create and teardown, or this sandbox came from
				// a getById/pre-patch path. Surface it like the other leak paths above so an operator can
				// sweep any orphaned volume by name — an in-process map can't collect a cross-process leak.
				console.warn(
					`[blaxel] destroy(${sandboxId}): no volume tracked in this process; ` +
						`if it was created here, look for an orphaned ${VOLUME_PREFIX}-* volume to delete`,
				);
			}
		}
	};

	manager.methods = { ...manager.methods, create, destroy };
	return provider;
}
