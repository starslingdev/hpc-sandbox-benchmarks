// The runtime dual of EnvOf (ADR-0007 §3), exposed on its own subpath to keep ambient-env parsing
// and arktype separate from the root driver-kit surface. Both the compile-time slice (define.ts)
// and this parser derive from REGISTRY[id].inputs, so type and validator cannot drift.

import { normalizeProviderInput } from "@sandbox-benchmarks/schema/provider-meta";
import type { ProviderId } from "@sandbox-benchmarks/schema/providers";
import { REGISTRY } from "@sandbox-benchmarks/schema/providers";
import type { Out } from "arktype";
import { type } from "arktype";
import type { EnvInputOf, EnvOf } from "./lib/define.ts";
import { DriverError } from "./lib/errors.ts";

// One schema per provider, compiled on first use and reused — arktype's `type()` build is the
// expensive step, and there are only 14 possible ids.
const schemaCache = new Map<ProviderId, import("arktype").Type>();
const nonEmptyString = type("string >= 1");
type StringPropertyDefinition = typeof nonEmptyString | ReturnType<typeof nonEmptyString.default>;
type ProviderEnvSchema<P extends ProviderId> = import("arktype").Type<
	(In: EnvInputOf<P>) => Out<EnvOf<P>>
>;

/** The exact raw-to-resolved schema for one provider's registry-declared input slice. */
export function envSchemaFor<P extends ProviderId>(id: P): ProviderEnvSchema<P> {
	let schema = schemaCache.get(id);
	if (schema === undefined) {
		const shape: Record<string, StringPropertyDefinition> = {};
		for (const raw of REGISTRY[id].inputs) {
			const input = normalizeProviderInput(raw);
			if (input.default !== undefined) {
				shape[input.name] = nonEmptyString.default(input.default);
			} else {
				shape[input.required ? input.name : `${input.name}?`] = nonEmptyString;
			}
		}
		schema = type(shape).onUndeclaredKey("delete");
		schemaCache.set(id, schema);
	}
	// The runtime shape is built from the same literal tuple both mapped types read. Arktype cannot
	// retain that id-indexed relationship through a mutable shape, so this cast records the proof.
	return schema as unknown as ProviderEnvSchema<P>;
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
	const picked: Record<string, string> = {};
	for (const raw of REGISTRY[id].inputs) {
		const input = normalizeProviderInput(raw);
		const value = ambient[input.name];
		if (value !== undefined && value !== "") {
			picked[input.name] = value;
		}
	}
	const parsed = envSchemaFor(id)(picked);
	if (parsed instanceof type.errors) {
		throw new DriverError(
			"missing-credentials",
			`missing credentials for ${id}: ${parsed.summary}`,
			{
				provider: id,
			},
		);
	}
	// The schema is assembled dynamically from the same tuple EnvOf maps statically. Arktype cannot
	// retain that id-indexed relationship through a mutable shape, so this cast records the proof.
	return parsed as EnvOf<P>;
}
