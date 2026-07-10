// Novita's control plane speaks the E2B protocol (their docs: E2B_DOMAIN=sandbox.novita.ai +
// E2B_API_KEY=<Novita key>), so the harness reuses the whole `@computesdk/e2b` wrapper — runCommand
// with daemon-backed streaming, filesystem, the lot — rather than growing a parallel adapter.
//
// Two wrapper behaviours stand in the way, both confined to the config-taking connection methods:
//
//   1. `create()` rejects any key that doesn't start with `e2b_` (a client-side format guard), and
//      Novita keys are `nvta_…`-prefixed.
//   2. Every other connection method reaches the control plane via `{ apiKey }` with no `domain`,
//      so it would hit e2b.dev instead of Novita (the e2b SDK only falls back to the E2B_DOMAIN env
//      var, and mutating process-wide env from one provider's adapter would leak into a
//      same-process e2b run).
//
// Everything else the harness touches (runCommand, filesystem, getInfo) operates on the live sandbox
// INSTANCE returned by create — which already carries Novita's domain — so this module swaps the
// config-taking connection methods (create/getById/destroy/list) for domain-aware, guard-free
// equivalents typed against the wrapper framework's own `SandboxMethods` contract, and removes the
// snapshot/template managers outright: their every method reconnects without a domain, and absent
// managers read downstream as a clean "provider exposes no snapshot operation" skip instead of a
// misleading failure against the wrong control plane.
import { e2b } from "@computesdk/e2b";
import type { SandboxMethods } from "@computesdk/provider";
import type { DirectProvider } from "@sandbox-benchmarks/provider-core";
import type { CreateSandboxOptions } from "computesdk";
// The raw e2b SDK, depended on directly: `@computesdk/e2b` re-exports it as `E2BSandbox` in its type
// declarations only — the runtime ESM build ships just the factory — so the re-export can't be used.
import type { SandboxConnectOpts, SandboxOpts } from "e2b";
import { Sandbox as E2BSandbox } from "e2b";

/** Novita's E2B-compatible control-plane domain (what their docs set E2B_DOMAIN to). */
export const NOVITA_E2B_DOMAIN = "sandbox.novita.ai";

/** The connection-method half of the wrapper framework's sandbox method table — the exact slice
 *  this module replaces, typed by the framework so a wrapper upgrade that changes a signature is a
 *  compile error here, not a runtime surprise. */
type ConnectionMethods = Pick<
	SandboxMethods<E2BSandbox>,
	"create" | "getById" | "destroy" | "list"
>;

/** The internal seam the patch reaches through: the generated sandbox manager dispatches every call
 *  via its `methods` table. Internal to @computesdk/provider, so asserted at runtime
 *  ({@link assertPatchable}) rather than trusted blindly across upgrades. */
interface PatchableManager {
	methods: ConnectionMethods & Record<string, unknown>;
}

function assertPatchable(manager: unknown): asserts manager is PatchableManager {
	const methods = (manager as { methods?: Record<string, unknown> })?.methods;
	for (const method of ["create", "getById", "destroy", "list"] as const) {
		if (typeof methods?.[method] !== "function") {
			throw new Error(
				"@computesdk/e2b provider internals changed shape (sandbox manager has no patchable " +
					`${method} method); revisit the novita adapter against the upgraded wrapper`,
			);
		}
	}
}

/**
 * A computesdk provider for Novita: the `@computesdk/e2b` provider with its config-taking
 * connection methods re-pointed at Novita's domain and freed of the `e2b_` key-format guard.
 * Construction is lazy-credentialed like every other factory — the missing-key error only fires
 * when the harness actually selects the provider (it gates on NOVITA_API_KEY before that).
 */
export function novitaCompute(apiKey: string | undefined): DirectProvider {
	if (!apiKey) {
		throw new Error("NOVITA_API_KEY is required to construct the novita provider");
	}
	const connection: SandboxConnectOpts = { apiKey, domain: NOVITA_E2B_DOMAIN };

	/** Reconnect to a live sandbox on Novita's control plane, or null when it's already gone. */
	const connectTo = async (sandboxId: string): Promise<E2BSandbox | null> => {
		try {
			return await E2BSandbox.connect(sandboxId, connection);
		} catch {
			return null;
		}
	};

	const overrides: ConnectionMethods = {
		// The wrapper's create minus the `e2b_` prefix guard, with Novita's domain pinned. Mirrors the
		// wrapper's option handling exactly — including the open `...providerOptions` passthrough that
		// computesdk's CreateSandboxOptions models with its index signature — so novita diverges from
		// the stock e2b behavior only where the guard forces it to. Omitting templateId/snapshotId
		// boots Novita's default template (no pre-baked toolchain template on their control plane
		// yet); an undefined `timeoutMs` defers to the SDK's own default.
		create: async (_config, options?: CreateSandboxOptions) => {
			const {
				timeout,
				envs,
				metadata,
				templateId,
				snapshotId,
				sandboxId: _sandboxId,
				name: _name,
				namespace: _namespace,
				directory: _directory,
				...providerOptions
			} = options ?? {};
			const createOpts: SandboxOpts = {
				...connection,
				timeoutMs: timeout,
				envs,
				metadata,
				...providerOptions,
			};
			const template = templateId ?? snapshotId;
			const sandbox = template
				? await E2BSandbox.create(template, createOpts)
				: await E2BSandbox.create(createOpts);
			if (!sandbox.sandboxId) throw new Error("Novita create() returned sandbox without an ID");
			return { sandbox, sandboxId: sandbox.sandboxId };
		},
		getById: async (_config, sandboxId) => {
			const sandbox = await connectTo(sandboxId);
			return sandbox ? { sandbox, sandboxId } : null;
		},
		// Best-effort like the wrapper's own destroy: a sandbox that's already gone must not fail
		// the harness's teardown path.
		destroy: async (_config, sandboxId) => {
			const sandbox = await connectTo(sandboxId);
			await sandbox?.kill().catch(() => undefined);
		},
		// The wrapper's list with the domain pinned — the harness's control-plane probe rides this.
		list: async (_config) => {
			try {
				const paginator = E2BSandbox.list(connection);
				const items = await paginator.nextItems();
				return items.map((info) => ({
					sandbox: info as unknown as E2BSandbox,
					sandboxId: info.sandboxId,
				}));
			} catch {
				return [];
			}
		},
	};

	const compute = e2b({ apiKey });
	const manager: unknown = compute.sandbox;
	assertPatchable(manager);
	manager.methods = { ...manager.methods, ...overrides };
	// Absent managers make the harness's snapshot/template probes record a clean capability skip
	// (the probe's `!snapshots` guard treats undefined as not-exposed).
	(compute as { snapshot?: unknown }).snapshot = undefined;
	(compute as { template?: unknown }).template = undefined;
	return compute;
}
