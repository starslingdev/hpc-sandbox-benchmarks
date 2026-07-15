// Novita's control plane speaks the E2B protocol, so the harness reuses the whole
// `@computesdk/e2b` wrapper — runCommand with daemon-backed streaming, filesystem, the lot —
// rather than growing a parallel adapter. But the wrapper's config-taking connection methods are
// hard-wired to e2b.dev twice over: both the wrapper's `create()` and the raw e2b SDK's ApiClient
// reject any key that doesn't match `e2b_<hex>` (Novita keys are `nvta_…`-prefixed), and every
// other connection method reaches the control plane via `{ apiKey }` with no `domain`.
//
// So the connection methods are driven through `novita-sandbox` — Novita's own fork of the e2b
// SDK — instead. The fork accepts `nvta_…` keys natively and defaults to Novita's regional
// control plane, which means the credential rides the SDK's own `apiKey` channel: it becomes an
// `X-API-KEY` header inside the control-plane ApiClient ONLY, and never reaches the data plane.
// (An earlier revision cleared the stock SDK's key-format guard with a placeholder `apiKey` plus a
// real-key `headers` override — but the SDK spreads connection `headers` into the envd RPC
// transport too, so every command/filesystem call delivered the ACCOUNT-level key to the envd
// daemon inside the guest, where TLS has already terminated and any root process — including a
// supply-chain-compromised benchmark — could read it. The fork makes that whole hack unnecessary;
// see the no-headers pin in index.test.ts.)
//
// Everything else the harness touches (runCommand, filesystem, getInfo) operates on the live
// sandbox INSTANCE returned by create — a fork instance already carrying Novita's domain and
// properly-channelled credential — so this module swaps the config-taking connection methods
// (create/getById/destroy/list) for fork-backed equivalents typed against the wrapper framework's
// own `SandboxMethods` contract, and removes the snapshot/template managers outright: their every
// method reconnects to e2b.dev with the stock SDK, and absent managers read downstream as a clean
// "provider exposes no snapshot operation" skip instead of a misleading failure against the wrong
// control plane.
import { createRequire } from "node:module";
import { e2b } from "@computesdk/e2b";
import type { SandboxMethods } from "@computesdk/provider";
import type { CreateSandboxOptions } from "computesdk";
import type {
	Sandbox as NovitaSandboxInstance,
	SandboxConnectOpts,
	SandboxOpts,
} from "novita-sandbox";
import { e2bCommandsAsRoot } from "./e2b-root.ts";
import type { DirectProvider } from "./types.ts";

// Loaded through the package's `require` (CJS) build, NOT an import: `@computesdk/e2b` is CJS and
// `require()`s chalk, while novita-sandbox's ESM build `import`s it — and Bun's require() of an
// ESM module throws "require() async module is unsupported" whenever that ESM load is still
// in-flight, which the two-format mix makes a load-order race (flaky test failures, not a
// deterministic break). One format for both SDKs removes the race; the type-only imports above
// still come from the package's type declarations and erase at compile time.
const requireCjs = createRequire(import.meta.url);
const { Sandbox: NovitaSandbox, SandboxNotFoundError } = requireCjs(
	"novita-sandbox",
) as typeof import("novita-sandbox");

/** Novita's E2B-compatible control-plane domain. REGIONAL, not the bare `sandbox.novita.ai` their
 *  docs open with: the bare domain serves only a legacy slice of the API (template list works; the
 *  v2 template-build routes 404 with "no matching operation was found"), while the regional domain
 *  serves the full surface (probed 2026-07-11; the novita-sandbox SDK's own default agrees, and
 *  names the bare domain legacy). Pinned explicitly rather than trusting the SDK default so a
 *  NOVITA_DOMAIN env var or an SDK-default change can't silently split the bake and the harness
 *  across regions — templates and sandboxes are region-scoped, so the two must agree. */
export const NOVITA_E2B_DOMAIN = "us-phx-1.sandbox.novita.ai";

/** The connection options every Novita control-plane call rides: the real key in the SDK's own
 *  `apiKey` channel (control-plane `X-API-KEY` only — NEVER a custom `headers` entry, which the
 *  SDK would replay to the envd daemon inside the guest on every data-plane call), and the region
 *  pinned. */
export function novitaConnection(apiKey: string): SandboxConnectOpts {
	return {
		apiKey,
		domain: NOVITA_E2B_DOMAIN,
	};
}

/** The connection-method half of the wrapper framework's sandbox method table — the exact slice
 *  this module replaces, typed by the framework so a wrapper upgrade that changes a signature is a
 *  compile error here, not a runtime surprise. (The sandbox generic is the fork's class: the fork
 *  is protocol- and surface-identical to the stock SDK, so the wrapper's instance methods —
 *  `sandbox.commands.run`, `sandbox.files.*` — drive it unchanged.) */
type ConnectionMethods = Pick<
	SandboxMethods<NovitaSandboxInstance>,
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
 * connection methods re-pointed at Novita's control plane via the novita-sandbox SDK.
 * Construction is lazy-credentialed like every other factory — the missing-key error only fires
 * when the harness actually selects the provider (it gates on NOVITA_API_KEY before that).
 */
export function novitaCompute(apiKey: string | undefined): DirectProvider {
	if (!apiKey) {
		throw new Error("NOVITA_API_KEY is required to construct the novita provider");
	}
	const connection: SandboxConnectOpts = novitaConnection(apiKey);

	const overrides: ConnectionMethods = {
		// The wrapper's create against the fork, with Novita's domain pinned. Mirrors the wrapper's
		// option handling — including the open `...providerOptions` passthrough that computesdk's
		// CreateSandboxOptions models with its index signature — but spreads the connection LAST, so
		// no stray `domain`/`apiKey` riding providerOptions can silently re-point creation at another
		// control plane. An undefined `timeoutMs` defers to the SDK's own default.
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
				? await NovitaSandbox.create(template, createOpts)
				: await NovitaSandbox.create(createOpts);
			if (!sandbox.sandboxId) throw new Error("Novita create() returned sandbox without an ID");
			return { sandbox, sandboxId: sandbox.sandboxId };
		},
		getById: async (_config, sandboxId) => {
			// Only a genuinely missing sandbox is the contract's `null`; anything else (auth, network)
			// propagates — folding those into null would mask an invalid key or an outage as "not found".
			try {
				const sandbox = await NovitaSandbox.connect(sandboxId, connection);
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
			await NovitaSandbox.kill(sandboxId, connection);
		},
		// The fork's list with the domain pinned — the harness's control-plane probe rides this.
		// Deliberately NOT swallowing errors into [] (the stock wrapper does): a failed enumeration
		// must surface as a probe skip, not publish a fast fake "success" sample. Single page on
		// purpose, too: the lifecycle benchmark times ONE list round-trip as the control-plane-read
		// metric — draining the paginator would time N requests and skew the sample (and nothing
		// downstream enumerates sandboxes for cleanup; teardown works by id).
		list: async (_config) => {
			const paginator = NovitaSandbox.list(connection);
			const items = await paginator.nextItems();
			return items.map((info) => ({
				sandbox: info as unknown as NovitaSandboxInstance,
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
	// Novita imports the same image through an E2B-compatible builder and injects the same
	// unprivileged default user. Use envd's native root identity for the benchmark lane so setup and
	// baked PTS state share one identity (the stock ComputeSDK wrapper omits the SDK's user option).
	return e2bCommandsAsRoot(compute);
}
