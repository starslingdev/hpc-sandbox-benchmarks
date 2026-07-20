// Blaxel is the one provider that cannot express disk independently of RAM: its sandbox root is a
// RAM-overlay tmpfs (~50-80% of memory), and the control plane silently ignores the documented
// `storageMb`/`diskPercent` knobs on this plan. The @computesdk/blaxel wrapper's config only exposes
// image/memory/region/ports, so there is no create-time disk option to pin either. On the 3.1
// (Firecracker) generation Blaxel supports *ephemeral* disk-backed volumes: scratch space created with
// the VM and torn down with it, needing no pre-existing Volume resource. This mounts one per sandbox
// where the benchmark's heavy writes land (/var/lib/phoronix-test-suite, per PTS_USER_PATH_OVERRIDE).
//
// Ephemeral volumes are lifecycle-bound to the sandbox: nothing to create beforehand or delete after,
// so unlike a persistent volume there is no provisioning/teardown to patch onto destroy. We only patch
// create to inject the ephemeral binding, cloning this instance's method table (never the shared one).

import { randomUUID } from "node:crypto";
import type { SandboxInstance } from "@blaxel/core";
import type { BlaxelConfig } from "@computesdk/blaxel";
import type { SandboxMethods } from "@computesdk/provider";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import type { CreateSandboxOptions } from "computesdk";
import type { DirectProvider } from "./types.ts";

const PTS_DATA_DIR = "/var/lib/phoronix-test-suite";
const VOLUME_SIZE_MB = TARGET_SPEC.diskGb * 1024;
const VOLUME_PREFIX = "sbx-bench";

type BlaxelSandboxMethods = SandboxMethods<SandboxInstance, BlaxelConfig>;
type BlaxelCreate = BlaxelSandboxMethods["create"];

interface PatchableManager {
	methods: Record<string, unknown> & { create: BlaxelCreate };
}

function patchableManager(provider: DirectProvider): PatchableManager {
	const manager = provider.sandbox as unknown as { methods?: Record<string, unknown> };
	if (typeof manager.methods?.create !== "function") {
		throw new Error(
			"@computesdk/blaxel provider internals changed shape (sandbox manager has no patchable " +
				"create method); revisit the volume adapter against the upgraded wrapper",
		);
	}
	return manager as PatchableManager;
}

export function blaxelWithVolume(provider: DirectProvider): DirectProvider {
	const manager = patchableManager(provider);
	const originalCreate = manager.methods.create;

	const create: BlaxelCreate = async (config, options) => {
		const volumeName = `${VOLUME_PREFIX}-${randomUUID().slice(0, 8)}`;
		return originalCreate(config, {
			...options,
			volumes: [
				{ name: volumeName, mountPath: PTS_DATA_DIR, type: "ephemeral", sizeMb: VOLUME_SIZE_MB },
				...(Array.isArray(options?.volumes) ? options.volumes : []),
			],
		} as CreateSandboxOptions);
	};

	manager.methods = { ...manager.methods, create };
	return provider;
}
