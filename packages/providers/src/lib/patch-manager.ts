// Taking hold of a @computesdk provider's sandbox-method table, once, for every adapter that has to
// wrap an entry in it.
//
// Wrapping is how this repo adapts a published wrapper without forking it (pin Daytona's region,
// reactivate its snapshot, mount Blaxel's volume, run e2b's commands as root), and every one of those
// adapters needs the same two things: the `provider.sandbox.methods` table the public methods
// dispatch through, and a guard that the entries it is about to replace are actually there. The guard
// is the point — `methods` is wrapper INTERNALS, so a wrapper upgrade that renames or restructures it
// must fail loudly at construction instead of silently no-op-ing the adaptation and shipping a
// benchmark that measures the wrong thing.
//
// Written once here because the error grammar is part of that contract: an adapter whose guard fires
// has to say which package changed, which method went missing, and which adapter to revisit.

import type { DirectProvider } from "./types.ts";

/** One provider's method table, narrowed to the entries the caller proved are present. */
export interface PatchableManager<M> {
	methods: Record<string, unknown> & M;
}

export interface PatchableManagerOptions<M> {
	/** The `@computesdk/<pkg>` wrapper whose internals are being reached into, named in the error. */
	pkg: string;
	/** What to revisit when the guard fires — the adapter doing the wrapping, not the caller. */
	adapter: string;
	/** Methods this adapter is about to replace; every one must already be a function. */
	methods: readonly (keyof M & string)[];
}

/**
 * Narrow `provider.sandbox` to its patchable method table, or throw naming exactly what changed.
 *
 * The returned manager is the wrapper's own object, so assigning to `manager.methods` mutates the
 * provider in place — which is what callers want, and why each of them clones the table
 * (`{ ...manager.methods, name: wrapped }`) rather than editing the wrapper's shared entries.
 */
export function patchableManager<M>(
	provider: DirectProvider,
	options: PatchableManagerOptions<M>,
): PatchableManager<M> {
	const manager = provider.sandbox as unknown as { methods?: Record<string, unknown> };
	const missing = options.methods.filter((name) => typeof manager.methods?.[name] !== "function");
	if (missing.length > 0) {
		throw new Error(
			`@computesdk/${options.pkg} provider internals changed shape (sandbox manager has no ` +
				`patchable ${missing.join("/")} method); revisit the ${options.adapter} adapter against ` +
				"the upgraded wrapper",
		);
	}
	return manager as PatchableManager<M>;
}
