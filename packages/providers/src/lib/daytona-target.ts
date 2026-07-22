// ComputeSDK's Daytona wrapper builds its native client fresh per operation as `new Daytona({ apiKey })`
// — not only for create, but equally for getById, list, and destroy. That client resolves its region
// from constructor config or the DAYTONA_TARGET env fallback (createParams.target is ignored), so
// pinning DAYTONA_TARGET around the wrapped call is the only channel to the client-level target through
// this wrapper. create is not the sole region-sensitive call: a sandbox created in `target` can only be
// fetched or torn down by a client pointed at the SAME region, so getById/list/destroy must run under
// the same pin. Otherwise a container CI job — where DAYTONA_TARGET materializes SET-but-empty — would
// create in us-west-2 but tear down against the account default region, failing the delete and leaking
// the sandbox. The pin is race-free in this harness — each CI job runs exactly one provider, so no
// concurrent call observes it — and every wrapped call restores the prior env in a finally, keeping the
// config gatekeeper's env view stable for everything after the call. Methods that act on an
// already-constructed sandbox (runCommand/getInfo/getUrl, filesystem.*) build no client and stay stock.

import type { SandboxMethods } from "@computesdk/provider";
import type { DirectProvider } from "./types.ts";

type DaytonaSandboxMethods = SandboxMethods<unknown, unknown>;

/** The wrapper's sandbox methods that construct a fresh Daytona client and therefore need the region
 *  pin. create additionally consumes a per-call target override (see below); the rest key off the
 *  adapter's configured target alone (their second arg is a sandboxId, not create options). */
const CLIENT_TARGETED_METHODS = ["create", "getById", "list", "destroy"] as const;

/** Candidate validation passes its freshly-baked region through create options. The native Daytona
 *  SDK ignores that field, but this adapter must still honor it when selecting the client-level pin. */
function createTarget(options: unknown): string | undefined {
	if (typeof options !== "object" || options === null || !("target" in options)) return undefined;
	const value = (options as { target?: unknown }).target;
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

interface PatchableManager {
	methods: Record<string, unknown> &
		Pick<DaytonaSandboxMethods, "create" | "getById" | "list" | "destroy">;
}

function patchableManager(provider: DirectProvider): PatchableManager {
	const manager = provider.sandbox as unknown as { methods?: Record<string, unknown> };
	const missing = CLIENT_TARGETED_METHODS.filter(
		(name) => typeof manager.methods?.[name] !== "function",
	);
	if (missing.length > 0) {
		throw new Error(
			"@computesdk/daytona provider internals changed shape (sandbox manager has no patchable " +
				`${missing.join("/")} method); revisit the client-target adapter against the upgraded wrapper`,
		);
	}
	return manager as PatchableManager;
}

/** Run `stock` with DAYTONA_TARGET pinned to `effectiveTarget` when set, restoring the prior env value
 *  afterward — including on a rejected call — without leaking the literal string "undefined". */
async function withTargetPin<T>(
	effectiveTarget: string | undefined,
	stock: () => Promise<T>,
): Promise<T> {
	const previous = process.env.DAYTONA_TARGET;
	if (effectiveTarget) process.env.DAYTONA_TARGET = effectiveTarget;
	try {
		return await stock();
	} finally {
		// delete, not `= undefined` — assigning undefined to process.env stringifies to "undefined".
		if (previous === undefined) {
			delete process.env.DAYTONA_TARGET;
		} else {
			process.env.DAYTONA_TARGET = previous;
		}
	}
}

/** Clone and patch one Daytona provider instance so every client-constructing call — create plus the
 *  getById/list/destroy teardown path — runs with the client-level target pinned via DAYTONA_TARGET
 *  (the sole channel the native SDK honors), restoring the prior env value (including on a rejected
 *  call) without mutating the wrapper's shared table. */
export function daytonaClientTarget(
	provider: DirectProvider,
	target: string | undefined,
): DirectProvider {
	const manager = patchableManager(provider);
	const { create, getById, list, destroy } = manager.methods;

	// Candidate validation layers its target onto createOptions. Although the native SDK ignores
	// createParams.target, consume it here as a per-call override so validate.ts's public mapping
	// actually boots the candidate in the region it names; ordinary harness calls fall back to the
	// adapter's configured target captured above.
	const pinnedCreate: DaytonaSandboxMethods["create"] = (config, options) =>
		withTargetPin(createTarget(options) ?? target, () => create(config, options));
	// getById/list/destroy carry no per-call region (their second arg is a sandboxId), so they key off
	// the adapter's configured target — the same region create used, so teardown finds the live sandbox.
	const pinnedGetById: DaytonaSandboxMethods["getById"] = (config, sandboxId) =>
		withTargetPin(target, () => getById(config, sandboxId));
	const pinnedList: DaytonaSandboxMethods["list"] = (config) =>
		withTargetPin(target, () => list(config));
	const pinnedDestroy: DaytonaSandboxMethods["destroy"] = (config, sandboxId) =>
		withTargetPin(target, () => destroy(config, sandboxId));

	manager.methods = {
		...manager.methods,
		create: pinnedCreate,
		getById: pinnedGetById,
		list: pinnedList,
		destroy: pinnedDestroy,
	};
	return provider;
}
