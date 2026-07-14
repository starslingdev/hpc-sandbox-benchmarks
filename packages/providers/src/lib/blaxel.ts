// Blaxel disk is a tmpfs overlay carved from VM RAM (~50-78%), so the stock adapter had to buy disk
// by buying memory (16 GiB RAM => only ~12.5 GiB disk), which still fell short of the realworld
// suites' 30 GiB working set — they skipped on Blaxel with "Insufficient disk". This module fixes
// that by attaching a dedicated EPHEMERAL overlay-on-/ volume: created with the sandbox, destroyed
// with it (no persistent resource to pre-create, region-match, or clean up between runs), and mounted
// at / so `df /` — the exact filesystem the harness disk gate and observed-specs probe measure —
// reports the volume's size. That clears the gate with NO harness/working-directory changes.
//
// Why a custom module rather than adapter `createOptions`: the `@computesdk/blaxel` wrapper feeds its
// create through `SandboxInstance.createIfNotExists({ image, memory, ..., volumes })`, whose
// `normalizeVolumes` accepts only the persistent-attachment shape ({name, mountPath, readOnly}) and
// STRIPS the ephemeral fields (`type`, `sizeMb`). So we mirror the novita precedent (novita.ts): keep
// every instance method the wrapper provides (runCommand, filesystem, destroy, getById, list) and
// swap only the config-taking `create`, building a FULL sandbox spec — which skips normalizeVolumes —
// so the ephemeral volume reaches the create API intact.
//
// The pinned SDK (@blaxel/core 0.2.95) types ephemeral volumes only on jobs (JobVolume), not on the
// sandbox spec, so the ephemeral fields are cast past `VolumeAttachment`; the Blaxel sandbox API
// accepts the same shape (verified against the same overlay-on-/ config Blaxel jobs run on).
import { createRequire } from "node:module";
import type { BlaxelSandbox } from "@computesdk/blaxel";
import { blaxel } from "@computesdk/blaxel";
import type { SandboxMethods } from "@computesdk/provider";
import type { CreateSandboxOptions } from "computesdk";
import type { DirectProvider } from "./types.ts";

// Loaded through the package's `require` (CJS) build, NOT an import: `@computesdk/blaxel` is CJS and
// `require()`s `@blaxel/core`, so requiring it here returns the SAME cached CJS module instance —
// hence the SAME `settings` singleton `initialize()` populates and the wrapper's instance methods
// read. An ESM `import` would risk a second, separately-authenticated copy. The type-only imports
// below still come from the package's declarations and erase at compile time.
const requireCjs = createRequire(import.meta.url);
const { SandboxInstance, initialize } = requireCjs("@blaxel/core") as typeof import("@blaxel/core");
type SandboxModel = Parameters<typeof SandboxInstance.createIfNotExists>[0];

/** Name of the sandbox-scoped ephemeral overlay volume. Scoped to the sandbox (created and destroyed
 *  with it), so a static identifier is fine — it never collides across sandboxes or runs. */
const ROOT_OVERLAY_VOLUME = "bench-root-overlay";

/** The ephemeral-volume shape the Blaxel API accepts but the SDK types only for jobs. */
interface EphemeralVolume {
	name: string;
	mountPath: string;
	type: "ephemeral";
	sizeMb: number;
}

/** Inputs to {@link buildRootOverlaySpec}: the provider config plus the per-create disk/timeout. */
export interface RootOverlaySpecInput {
	image?: string;
	memory?: number;
	region?: string;
	/** Ephemeral overlay-on-/ disk in GiB. */
	diskGb: number;
	/** Requested sandbox lifetime in ms (the wrapper's `timeout` create option); omitted => SDK default. */
	timeoutMs?: number;
}

/**
 * Build the FULL Blaxel sandbox spec the create override submits. Pure and exported so the ephemeral
 * overlay volume — the whole point of this module — has a regression guard that doesn't need a live
 * sandbox: passing this shape (rather than the wrapper's flat `{image, memory, volumes}` config) is
 * exactly what skips `normalizeVolumes` and lets the `type`/`sizeMb` fields reach the create API.
 * Metadata is omitted so the SDK generates the sandbox name (as the stock wrapper relies on).
 */
export function buildRootOverlaySpec(input: RootOverlaySpecInput): SandboxModel {
	const { image, memory, region, diskGb, timeoutMs } = input;
	const ttl = timeoutMs ? `${Math.ceil(timeoutMs / 1000)}s` : undefined;
	const rootOverlay: EphemeralVolume = {
		name: ROOT_OVERLAY_VOLUME,
		mountPath: "/",
		type: "ephemeral",
		sizeMb: diskGb * 1024,
	};
	return {
		spec: {
			region,
			runtime: {
				image,
				memory,
				generation: "mk3",
				...(ttl ? { ttl } : {}),
			},
			volumes: [rootOverlay],
		},
		// The SDK types ephemeral volumes only on jobs (JobVolume), so cast past `VolumeAttachment`; the
		// sandbox create API accepts the same shape (the overlay-on-/ config Blaxel jobs already run on).
	} as unknown as SandboxModel;
}

/** The single method this module replaces on the wrapper's sandbox-method table. */
type ConnectionMethods = Pick<SandboxMethods<BlaxelSandbox>, "create">;

/** The internal seam the patch reaches through: the generated sandbox manager dispatches every call
 *  via its `methods` table (the same seam novita.ts patches). Asserted at runtime rather than trusted
 *  blindly across wrapper upgrades. */
interface PatchableManager {
	methods: ConnectionMethods & Record<string, unknown>;
}

function assertPatchable(manager: unknown): asserts manager is PatchableManager {
	const create = (manager as { methods?: Record<string, unknown> })?.methods?.create;
	if (typeof create !== "function") {
		throw new Error(
			"@computesdk/blaxel provider internals changed shape (sandbox manager has no patchable " +
				"create method); revisit the blaxel adapter against the upgraded wrapper",
		);
	}
}

export interface BlaxelComputeOptions {
	/** Sandbox image (the Debian ts-app image — the stock Alpine base has no apt for PTS). */
	image: string;
	/** Memory in MB. Also fixes CPU (cores = MB / 2048) and the tmpfs root size; disk now comes from
	 *  the ephemeral volume, so this is a pure CPU/RAM knob. */
	memory: number;
	/** Region; the sandbox and its volume are co-located here. */
	region: string;
	/** Ephemeral overlay-on-/ disk in GiB (the harness target spec). */
	diskGb: number;
}

/**
 * A computesdk provider for Blaxel with a dedicated ephemeral overlay-on-/ volume: the
 * `@computesdk/blaxel` provider with its config-taking `create` re-pointed at a full-spec
 * `SandboxInstance.createIfNotExists` that attaches the volume (which the wrapper's create would
 * otherwise strip). Everything else — runCommand, filesystem, destroy, getById, list — is the stock
 * wrapper, driving the same sandbox instance `create` returns. Credentials come from
 * BL_API_KEY/BL_WORKSPACE (the factory's env fallback), like the stock adapter.
 */
export function blaxelCompute(options: BlaxelComputeOptions): DirectProvider {
	const { image, memory, region, diskGb } = options;

	const create: ConnectionMethods["create"] = async (
		config,
		createOptions?: CreateSandboxOptions,
	) => {
		// The wrapper calls initializeBlaxel() inside its own create; we replace create, so seed the
		// shared settings singleton here. Credentials are the only thing we read off the factory config
		// (env fallback matches the wrapper's initializeBlaxel); image/memory/region come from the
		// closure, so the override doesn't depend on the manager passing the factory config through.
		initialize({
			apikey: config.apiKey ?? process.env.BL_API_KEY,
			workspace: config.workspace ?? process.env.BL_WORKSPACE,
		});
		// A FULL sandbox spec with the ephemeral overlay volume — the shape that skips the
		// wrapper-triggered normalizeVolumes so the ephemeral fields survive to the create API. `timeout`
		// asks for a sandbox lifetime covering setup + the suite, where supported (mirrors the wrapper).
		const sandbox = await SandboxInstance.createIfNotExists(
			buildRootOverlaySpec({ image, memory, region, diskGb, timeoutMs: createOptions?.timeout }),
		);
		return { sandbox, sandboxId: sandbox.metadata?.name ?? "blaxel-unknown" };
	};

	// Build the stock wrapper (image/memory/region ride its config, which the manager hands our
	// override as `config`), then swap only its create on the internal method table.
	const compute = blaxel({ image, memory, region });
	const manager: unknown = compute.sandbox;
	assertPatchable(manager);
	manager.methods = { ...manager.methods, create };
	return compute;
}
