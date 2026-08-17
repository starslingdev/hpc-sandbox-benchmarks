// The runtime dual of EnvOf (ADR-0007 §3), on its own subpath because it imports arktype and
// the root entry stays arktype-free. Both the compile-time slice (define.ts) and this parser
// derive from the SAME declaration (DRIVER_CREDENTIALS), so type and validator cannot drift.

import type { ProviderId } from "@sandbox-benchmarks/schema/providers";
import { type } from "arktype";
import type { CredentialSpec, EnvOf } from "./lib/define.ts";
import { DRIVER_CREDENTIALS } from "./lib/define.ts";

// One schema per provider, compiled on first use and reused — arktype's `type()` build is the
// expensive step, and there are only 14 possible ids.
const schemaCache = new Map<ProviderId, import("arktype").Type<unknown>>();

/** The arktype schema for a provider's env slice: required credentials are non-empty strings. */
export function envSchemaFor<P extends ProviderId>(id: P): import("arktype").Type<EnvOf<P>> {
	let schema = schemaCache.get(id);
	if (schema === undefined) {
		const shape: Record<string, "string >= 1"> = {};
		const declared: readonly CredentialSpec[] = DRIVER_CREDENTIALS[id];
		for (const credential of declared) {
			shape[credential.optional ? `${credential.name}?` : credential.name] = "string >= 1";
		}
		schema = type(shape);
		schemaCache.set(id, schema);
	}
	// The runtime shape is built from the same literal the mapped type reads; the cast records
	// that equivalence (arktype cannot see through the dynamic key loop).
	return schema as unknown as import("arktype").Type<EnvOf<P>>;
}

/**
 * Parse a provider's env slice out of an ambient environment (`process.env`-shaped input).
 *
 * Only DECLARED keys are picked before validation — the ambient environment legitimately holds
 * hundreds of undeclared variables, so undeclared-key rejection would be wrong here; the slice
 * boundary is the pick itself. Empty values count as unset (the config gatekeeper's rule).
 * Failures carry the repo's one error grammar: `TAMA_TOKEN must be a string (was missing)`.
 */
export function parseDriverEnv<P extends ProviderId>(
	id: P,
	ambient: Readonly<Record<string, string | undefined>>,
): EnvOf<P> {
	const declared: readonly CredentialSpec[] = DRIVER_CREDENTIALS[id];
	const picked: Record<string, string> = {};
	for (const credential of declared) {
		const value = ambient[credential.name];
		if (value !== undefined && value !== "") {
			picked[credential.name] = value;
		}
	}
	const parsed = envSchemaFor(id)(picked);
	if (parsed instanceof type.errors) {
		throw new Error(`missing credentials for ${id}: ${parsed.summary}`);
	}
	// `picked` holds exactly the declared, validated keys; the cast records what the schema
	// just proved (arktype's distilled output type cannot be named through the dynamic loop).
	return picked as EnvOf<P>;
}
