// Blaxel is the one provider that cannot express disk independently of RAM: its sandbox root is a
// RAM-overlay tmpfs (~50-80% of memory), and the control plane silently ignores the documented
// `storageMb`/`diskPercent` knobs on this plan. The @computesdk/blaxel wrapper's config only exposes
// image/memory/region/ports, so there is no create-time disk option to pin either. On the 3.1
// (Firecracker) generation Blaxel supports *ephemeral* disk-backed volumes: scratch space created with
// the VM and torn down with it, needing no pre-existing Volume resource. This mounts one per sandbox
// where the benchmark's heavy writes land (/var/lib/phoronix-test-suite, per PTS_USER_PATH_OVERRIDE).
//
// Ephemeral volumes are lifecycle-bound to the sandbox: nothing to create beforehand or delete after,
// so unlike a persistent volume there is no provisioning/teardown to patch onto destroy. Blaxel also
// enters standby after ~15s without an inbound request; a benchmark process does not itself count as
// activity. Start one native keepAlive process for the sandbox lifetime so synchronous commands,
// detached commands, and gaps between harness calls all run continuously. We patch only this provider
// instance's create method, cloning its method table (never the shared one).

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
const KEEPALIVE_PROCESS_NAME = "benchmark-keepalive";

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

export function blaxelWithVolumeAndKeepAlive(provider: DirectProvider): DirectProvider {
	const manager = patchableManager(provider);
	const originalCreate = manager.methods.create;

	const create: BlaxelCreate = async (config, options) => {
		const volumeName = `${VOLUME_PREFIX}-${randomUUID().slice(0, 8)}`;
		const created = await originalCreate(config, {
			...options,
			volumes: [
				{ name: volumeName, mountPath: PTS_DATA_DIR, type: "ephemeral", sizeMb: VOLUME_SIZE_MB },
				...(Array.isArray(options?.volumes) ? options.volumes : []),
			],
		} as CreateSandboxOptions);

		try {
			await created.sandbox.process.exec({
				name: KEEPALIVE_PROCESS_NAME,
				command: "sleep infinity",
				keepAlive: true,
				timeout: 0,
			});
		} catch (err) {
			// Creation succeeded, but the caller has no handle yet. Delete here or a failed keepalive
			// launch would leak the sandbox because the harness's normal finally block cannot reach it.
			await created.sandbox.delete().catch(() => undefined);
			throw new Error("Failed to start Blaxel benchmark keepalive process", { cause: err });
		}

		return created;
	};

	manager.methods = { ...manager.methods, create };
	return provider;
}
