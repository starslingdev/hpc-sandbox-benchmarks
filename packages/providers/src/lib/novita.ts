// Novita's control plane speaks the E2B protocol (their docs: E2B_DOMAIN=sandbox.novita.ai +
// E2B_API_KEY=<Novita key>), so the harness reuses the whole `@computesdk/e2b` wrapper — runCommand
// with daemon-backed streaming, filesystem, the lot — rather than growing a parallel adapter.
//
// Two wrapper behaviours stand in the way, both confined to the config-taking connection methods:
//
//   1. Both the wrapper's `create()` AND the raw e2b SDK's ApiClient reject any key that doesn't
//      match `e2b_<hex>` (client-side format guards), and Novita keys are `nvta_…`-prefixed — see
//      {@link novitaConnection} for the placeholder-plus-header-override that clears both.
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
import type { CreateSandboxOptions } from "computesdk";
// The raw e2b SDK, depended on directly: `@computesdk/e2b` re-exports it as `E2BSandbox` in its type
// declarations only — the runtime ESM build ships just the factory — so the re-export can't be used.
import type { SandboxConnectOpts, SandboxOpts } from "e2b";
import { Sandbox as E2BSandbox, SandboxNotFoundError } from "e2b";
import type { DirectProvider } from "./types.ts";

/** Novita's E2B-compatible control-plane domain. REGIONAL, not the bare `sandbox.novita.ai` their
 *  docs open with: the bare domain serves only a legacy slice of the API (template list works; the
 *  v2 template-build routes 404 with "no matching operation was found"), while the regional domain
 *  serves the full surface (probed 2026-07-11: an identical Template.build 404s on the bare domain
 *  and succeeds on us-phx-1). Templates and sandboxes are region-scoped, so the bake and the
 *  harness must agree on this value. */
export const NOVITA_E2B_DOMAIN = "us-phx-1.sandbox.novita.ai";

/** A dummy key matching the e2b SDK's client-side `e2b_<hex>` format check. The SDK validates
 *  `apiKey`'s SHAPE before any request (ApiClient), so Novita's `nvta_…` keys throw locally — but
 *  it spreads `headers` AFTER the `X-API-KEY` header it derives from `apiKey`, so the real Novita
 *  credential rides a header override while this placeholder satisfies the format guard. */
export const E2B_KEY_FORMAT_PLACEHOLDER = `e2b_${"0".repeat(40)}`;

/** The connection options that authenticate against Novita despite the e2b SDK's key-shape guard:
 *  placeholder `apiKey` for the client-side check, real key via the `X-API-KEY` header override. */
export function novitaConnection(apiKey: string): SandboxConnectOpts {
	return {
		apiKey: E2B_KEY_FORMAT_PLACEHOLDER,
		headers: { "X-API-KEY": apiKey },
		domain: NOVITA_E2B_DOMAIN,
	};
}

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
	const connection: SandboxConnectOpts = novitaConnection(apiKey);

	const overrides: ConnectionMethods = {
		// The wrapper's create minus the `e2b_` prefix guard, with Novita's domain pinned. Mirrors the
		// wrapper's option handling — including the open `...providerOptions` passthrough that
		// computesdk's CreateSandboxOptions models with its index signature — but spreads the
		// connection LAST, so no stray `domain`/`apiKey` riding providerOptions can silently re-point
		// creation at e2b.dev with the nvta_ key. An undefined `timeoutMs` defers to the SDK's own
		// default.
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
				timeoutMs: timeout,
				envs,
				metadata,
				...providerOptions,
				...connection,
			};
			const template = templateId ?? snapshotId;
			const sandbox = template
				? await E2BSandbox.create(template, createOpts)
				: await E2BSandbox.create(createOpts);
			if (!sandbox.sandboxId) throw new Error("Novita create() returned sandbox without an ID");
			return { sandbox, sandboxId: sandbox.sandboxId };
		},
		getById: async (_config, sandboxId) => {
			// Only a genuinely missing sandbox is the contract's `null`; anything else (auth, network)
			// propagates — folding those into null would mask an invalid key or an outage as "not found".
			try {
				const sandbox = await E2BSandbox.connect(sandboxId, connection);
				return { sandbox, sandboxId };
			} catch (error) {
				if (error instanceof SandboxNotFoundError) return null;
				throw error;
			}
		},
		// One domain-aware DELETE via the SDK's static kill — no connect round-trip first (connect
		// also re-extends the sandbox timeout as a side effect, pure waste on a teardown path the
		// lifecycle benchmark TIMES). `kill` resolves false when the sandbox is already gone (the
		// legitimate best-effort case); a real control-plane failure REJECTS and propagates, so the
		// harness records a teardown failure instead of a fake success over a leaked, billing sandbox.
		destroy: async (_config, sandboxId) => {
			await E2BSandbox.kill(sandboxId, connection);
		},
		// The wrapper's list with the domain pinned — the harness's control-plane probe rides this.
		// Deliberately NOT swallowing errors into [] (the stock wrapper does): a failed enumeration
		// must surface as a probe skip, not publish a fast fake "success" sample. Single page on
		// purpose, too: the lifecycle benchmark times ONE list round-trip as the control-plane-read
		// metric — draining the paginator would time N requests and skew the sample (and nothing
		// downstream enumerates sandboxes for cleanup; teardown works by id).
		list: async (_config) => {
			const paginator = E2BSandbox.list(connection);
			const items = await paginator.nextItems();
			return items.map((info) => ({
				sandbox: info as unknown as E2BSandbox,
				sandboxId: info.sandboxId,
			}));
		},
	};

	const compute = e2b({ apiKey });
	const manager: unknown = compute.sandbox;
	assertPatchable(manager);
	manager.methods = { ...manager.methods, ...overrides };
	// Absent managers make the harness's snapshot/template probes record a clean capability skip
	// (the probe's `!snapshots` guard treats undefined as not-exposed) — the wrapper's own managers
	// reconnect without a domain, i.e. against the wrong control plane.
	(compute as { snapshot?: unknown }).snapshot = undefined;
	(compute as { template?: unknown }).template = undefined;
	return compute;
}
