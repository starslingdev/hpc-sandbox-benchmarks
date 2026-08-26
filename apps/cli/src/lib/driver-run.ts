// The driver composition root (ADR-0007 §1).
//
// The kit deliberately splits three trust boundaries that a single `config` object used to blur:
// loading a driver module reads no ambient env, resolving an artifact imports no vendor SDK, and the
// driver never decides whether a run boots a candidate or a published artifact. This module owns
// those three small functions and nothing else, so `apps/cli` stays the only place the fleet and the
// harness meet.
//
// It also owns the two adapters that let a `SandboxSession` drive today's harness while
// `packages/harness` still speaks the legacy `SandboxHandle` shape. Both are deliberately thin and
// both disappear when the harness flips to the port.

import type {
	CreateRequest,
	DriverModule,
	ExecResult,
	ResolvedArtifact,
	SandboxDriver,
	SandboxSession,
} from "@sandbox-benchmarks/driver";
import { launchDetached, readTextFile, succeeded, writeTextFile } from "@sandbox-benchmarks/driver";
import { parseDriverEnv } from "@sandbox-benchmarks/driver/env";
import type { DriverProviderId } from "@sandbox-benchmarks/drivers";
import { loadDriverModule } from "@sandbox-benchmarks/drivers";
import type { SandboxHandle } from "@sandbox-benchmarks/harness";
import type {
	ArtifactPhase,
	ProviderArtifact,
	ProviderId,
	ProviderTransport,
} from "@sandbox-benchmarks/schema";
import {
	bakedArtifactName,
	isBakedProviderId,
	REGISTRY,
	TARGET_SPEC,
} from "@sandbox-benchmarks/schema";
import { toolchainImageRef } from "@sandbox-benchmarks/schema/toolchain";

/** Optional overrides a caller may supply instead of the registry-derived defaults. */
export interface ArtifactResolution {
	/** Which published phase the lane targets. Defaults to the immutable version. */
	readonly phase?: ArtifactPhase;
	/** Explicit ref, for validating an unpublished artifact without editing the registry. */
	readonly ref?: string;
}

/**
 * Resolve one provider's registry artifact descriptor to the concrete ref its driver will boot.
 *
 * This is the lane decision ADR-0007 keeps out of drivers: the registry says *what kind* of artifact
 * a provider boots, the composition root says *which one*. Every branch derives from a schema leaf,
 * so adding a provider needs no edit here — only a `built` recipe, whose resolver is provider-side
 * work by definition, must be supplied explicitly.
 */
export function resolveDriverArtifact(
	id: ProviderId,
	resolution: ArtifactResolution = {},
): ResolvedArtifact {
	return resolveArtifactDescriptor(id, REGISTRY[id].artifact, resolution);
}

/**
 * The exhaustive descriptor→ref mapping, taking the descriptor as a parameter.
 *
 * Deliberately not a `const` narrowed from `REGISTRY[id]`: that narrows the union to the kinds the
 * registry happens to declare today, so the first provider to register a new artifact kind would
 * silently fall through instead of failing the exhaustiveness check here.
 */
function resolveArtifactDescriptor(
	id: ProviderId,
	descriptor: ProviderArtifact,
	resolution: ArtifactResolution,
): ResolvedArtifact {
	const phase = resolution.phase ?? "version";
	const override = resolution.ref;
	switch (descriptor.kind) {
		case "none":
			// A provider that boots stock has nothing to resolve; an override would be a silent lie.
			if (override !== undefined) {
				throw new Error(`${id} declares artifact kind "none" and cannot boot ref ${override}`);
			}
			return { kind: "none" };
		case "image":
			return { kind: "image", ref: override ?? toolchainImageRef(phase) };
		case "baked": {
			if (override !== undefined) return { kind: "baked", ref: override };
			// The descriptor kind and the id partition are two views of one registry fact; the guard
			// carries that correlation across the type boundary rather than casting it away.
			if (!isBakedProviderId(id)) {
				throw new Error(`${id} declares a baked artifact but is not in the baked partition`);
			}
			return { kind: "baked", ref: bakedArtifactName(id, phase) };
		}
		case "mirror":
			// The mirrored ref is namespace-scoped configuration, never a registry constant.
			if (override === undefined) {
				throw new Error(`${id} boots a mirrored artifact; pass an explicit ref to resolve it`);
			}
			return { kind: "mirror", ref: override };
		case "built":
			// Building the artifact is release-lane work (ADR-0007 §7); this lane only boots its result.
			if (override === undefined) {
				throw new Error(
					`${id} boots a built artifact from recipe ${descriptor.recipe}; pass the built ref`,
				);
			}
			return { kind: "built", ref: override };
	}
}

/**
 * Project a driver module's execution policy onto the transport the current `StepRunner` reads.
 *
 * This is the seam that makes the policy load-bearing rather than decorative: `syncCapMs` crosses
 * unchanged, and `detachedPoll` is exactly "the module declared a durable route". `streaming` has no
 * transport consumer (ADR-0008 excludes it from the conformance inventory), so it is reported false
 * rather than invented.
 */
export function driverTransport(
	execution: DriverModule<ProviderId>["execution"],
): ProviderTransport {
	return {
		streaming: false,
		syncCapMs: execution.syncCapMs,
		detachedPoll: execution.durable !== "none",
	};
}

/**
 * Adapt a port session to the harness's legacy sandbox shape.
 *
 * Two properties are load-bearing. First, `filesystem` is present only when the session actually
 * exposes a working one — capability-by-presence, so the detached transport's poll can never select
 * a stub that throws (the namespace incident behind ADR-0008). Second, a background request routes
 * through `launchDetached`, which uses the driver's native `launch` when it has one and the kit's
 * `nohup` fallback when it does not, instead of fabricating a `CommandResult` for work that has not
 * finished.
 */
export function sessionHandle(session: SandboxSession): SandboxHandle {
	const handle: SandboxHandle = {
		sandboxId: session.sandboxRef.id,
		runCommand: async (command, options) => {
			if (options?.background === true) {
				await launchDetached(session, command);
				// A launch has no outcome yet. The harness observes completion through the done-file,
				// so the only honest placeholder is a success-shaped envelope with no output.
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			return commandResult(await session.exec(command));
		},
		destroy: () => session.destroy(),
	};
	const files = session.files;
	if (files === undefined) return handle;
	return {
		...handle,
		filesystem: {
			readFile: (path) => files.readFile(path),
			exists: (path) => files.exists(path),
		},
	};
}

/**
 * Collapse a port `ExecResult` onto the harness's `CommandResult`.
 *
 * The port models a withheld exit code as evidence (`kind: "unknown"`); the legacy shape has only a
 * number. A non-`exited` outcome therefore becomes a nonzero code with the reason preserved on
 * stderr, so the detail survives into the step log rather than being flattened into a bare `1`.
 */
function commandResult(result: ExecResult): { stdout: string; stderr: string; exitCode: number } {
	if (result.exit.kind === "exited") {
		return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exit.code };
	}
	const detail =
		result.exit.kind === "signalled"
			? `command terminated by signal ${result.exit.signal}`
			: `command exit status unavailable: ${result.exit.detail}`;
	const stderr = result.stderr.length > 0 ? `${result.stderr}\n${detail}` : detail;
	return { stdout: result.stdout, stderr, exitCode: 1 };
}

/**
 * Everything the composition root produced for one provider, before any sandbox exists.
 *
 * `module` is widened to the id-erased `DriverModule` because a caller holding a *runtime*
 * `ProviderId` cannot retain the correlation the generated map expresses for literal ids. The
 * handle type is erased with it — which is exactly ADR-0007's rule that a caller with a runtime id
 * receives the safe union and ignores `native`.
 */
export interface OpenedDriver {
	readonly module: DriverModule<ProviderId>;
	readonly driver: SandboxDriver;
	readonly artifact: ResolvedArtifact;
	readonly transport: ProviderTransport;
}

/**
 * Run ADR-0007's composition flow for one provider: load, parse, resolve, construct.
 *
 * Deliberately ordered so nothing vendor-specific evaluates until the module is selected, and
 * nothing ambient is read until the module has been loaded.
 */
export async function openDriver<P extends DriverProviderId>(
	id: P,
	options: {
		readonly artifact?: ArtifactResolution;
		readonly env?: Readonly<Record<string, string | undefined>>;
	} = {},
): Promise<OpenedDriver> {
	// Erase the correlation here, once, rather than at every downstream use. `loadDriverModule` and
	// the generated map already prove `id`'s module is the one whose literal id matches (see the
	// `_EveryDriverModuleMatchesItsId` assertion in packages/drivers/src/index.ts); TypeScript cannot
	// carry that through a generic parameter, and this is the single place that gap is crossed.
	const module = (await loadDriverModule(id)) as DriverModule<ProviderId>;
	const env = parseDriverEnv(id, options.env ?? process.env);
	const artifact = resolveDriverArtifact(id, options.artifact);
	// The context's three members are exactly what the registry declares for this id: the descriptor
	// and the resolved artifact both derive from REGISTRY[id], so they agree by construction.
	const driver = module.driver({
		env,
		artifact: REGISTRY[id].artifact,
		resolvedArtifact: artifact,
	} as Parameters<DriverModule<ProviderId>["driver"]>[0]);
	return { module, driver, artifact, transport: driverTransport(module.execution) };
}

/** The benchmark's pinned target, as a create request. Exported so callers cannot drift from it. */
export function benchmarkCreateRequest(
	artifact: ResolvedArtifact,
	deadlineMs: number,
): CreateRequest {
	return { spec: TARGET_SPEC, artifact, deadlineMs };
}

export { readTextFile, succeeded, writeTextFile };
