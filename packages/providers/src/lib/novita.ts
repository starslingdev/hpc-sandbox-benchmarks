// Novita's control plane speaks the E2B protocol (their docs: E2B_DOMAIN=sandbox.novita.ai +
// E2B_API_KEY=<Novita key>), so the harness reuses the whole `@computesdk/e2b` wrapper — runCommand
// with daemon-backed streaming, filesystem, the lot — rather than growing a parallel adapter.
//
// Two wrapper behaviours stand in the way, both confined to the config-taking connection methods:
//
//   1. `create()` rejects any key that doesn't start with `e2b_` (a client-side format guard), and
//      Novita keys are `nvta_…`-prefixed.
//   2. `destroy()`/`getById()` reconnect via `E2BSandbox.connect(sandboxId, { apiKey })` with no
//      `domain`, so they'd hit e2b.dev instead of Novita (the e2b SDK only falls back to the
//      E2B_DOMAIN env var, and mutating process-wide env from one provider's adapter would leak into
//      a same-process e2b run).
//
// Everything else the harness touches (runCommand, filesystem, getInfo) operates on the live sandbox
// INSTANCE returned by create — which already carries Novita's domain — so this module swaps exactly
// those three config-taking methods for domain-aware, guard-free equivalents and leaves the rest of
// the generated provider untouched.
import { e2b } from "@computesdk/e2b";
import type { CreateSandboxOptions } from "computesdk";
// The raw e2b SDK, depended on directly: `@computesdk/e2b` re-exports it as `E2BSandbox` in its type
// declarations only — the runtime ESM build ships just the factory — so the re-export can't be used.
import { Sandbox as E2BSandbox } from "e2b";
import type { DirectProvider } from "./types.ts";

/** Novita's E2B-compatible control-plane domain (what their docs set E2B_DOMAIN to). */
export const NOVITA_E2B_DOMAIN = "sandbox.novita.ai";

/** Mirrors the e2b wrapper's create-time default when no timeout is passed. */
const DEFAULT_TIMEOUT_MS = 300_000;

/** The slice of `@computesdk/provider`'s generated sandbox manager the patch reaches into: the
 *  vendor method table it dispatches through. Internal to that package, so asserted at runtime
 *  ({@link assertPatchable}) rather than trusted blindly across upgrades. */
interface PatchableManager {
	methods: {
		create(config: unknown, options?: CreateSandboxOptions): Promise<unknown>;
		getById(config: unknown, sandboxId: string): Promise<unknown>;
		destroy(config: unknown, sandboxId: string): Promise<void>;
		[method: string]: unknown;
	};
}

function assertPatchable(manager: unknown): asserts manager is PatchableManager {
	const methods = (manager as { methods?: Record<string, unknown> })?.methods;
	if (
		typeof methods?.create !== "function" ||
		typeof methods.getById !== "function" ||
		typeof methods.destroy !== "function"
	) {
		throw new Error(
			"@computesdk/e2b provider internals changed shape (sandbox manager has no patchable " +
				"methods table); revisit the novita adapter against the upgraded wrapper",
		);
	}
}

/**
 * A computesdk provider for Novita: the `@computesdk/e2b` provider with its three config-taking
 * connection methods re-pointed at Novita's domain and freed of the `e2b_` key-format guard.
 * Construction is lazy-credentialed like every other factory — the missing-key error only fires
 * when the harness actually selects the provider (it gates on NOVITA_API_KEY before that).
 */
export function novitaCompute(apiKey: string | undefined): DirectProvider {
	if (!apiKey) {
		throw new Error("NOVITA_API_KEY is required to construct the novita provider");
	}
	const connection = { apiKey, domain: NOVITA_E2B_DOMAIN };

	const compute = e2b({ apiKey });
	const manager: unknown = compute.sandbox;
	assertPatchable(manager);
	manager.methods = {
		...manager.methods,
		// The wrapper's create minus the `e2b_` prefix guard, with Novita's domain pinned. Omitting
		// templateId/snapshotId boots Novita's default template (there is no pre-baked toolchain
		// template on their control plane yet).
		create: async (_config: unknown, options?: CreateSandboxOptions) => {
			const { timeout, envs, metadata, templateId, snapshotId } = options ?? {};
			const createOpts = {
				...connection,
				timeoutMs: timeout ?? DEFAULT_TIMEOUT_MS,
				envs,
				metadata,
			};
			const template = templateId ?? snapshotId;
			const sandbox = template
				? await E2BSandbox.create(template, createOpts)
				: await E2BSandbox.create(createOpts);
			if (!sandbox.sandboxId) throw new Error("Novita create() returned sandbox without an ID");
			return { sandbox, sandboxId: sandbox.sandboxId };
		},
		getById: async (_config: unknown, sandboxId: string) => {
			try {
				const sandbox = await E2BSandbox.connect(sandboxId, connection);
				return { sandbox, sandboxId };
			} catch {
				return null;
			}
		},
		// Best-effort like the wrapper's own destroy: a sandbox that's already gone must not fail
		// the harness's teardown path.
		destroy: async (_config: unknown, sandboxId: string) => {
			try {
				const sandbox = await E2BSandbox.connect(sandboxId, connection);
				await sandbox.kill();
			} catch {
				// already gone / unreachable — teardown is best-effort
			}
		},
	};
	return compute;
}
