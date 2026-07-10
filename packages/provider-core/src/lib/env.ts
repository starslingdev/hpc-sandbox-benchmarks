// The env-contract half of the provider packages' shared core: each provider package declares the
// env keys it owns and reads them through this single validated gate, so no unvalidated environment
// data reaches adapter logic (the same posture the original monolithic config gatekeeper enforced,
// now reusable per package).
import { type } from "arktype";

// One compiled validator for the whole process — every key shares the same rule, so there is no
// per-call schema to build (readProviderEnv runs at module load in several packages).
const nonEmptyString = type("string >= 1");

/**
 * Read and validate a declared slice of the environment. Only the declared keys are forwarded
 * (process.env carries hundreds of unrelated ones), every key is optional — a missing credential is
 * a *skip* decision made downstream, not an error here — but an explicitly-set-yet-empty value is a
 * misconfiguration and is rejected loudly at module load.
 */
export function readProviderEnv<const K extends readonly string[]>(
	keys: K,
	env: Record<string, string | undefined> = process.env,
): { [P in K[number]]?: string } {
	const out: Partial<Record<K[number], string>> = {};
	for (const key of keys as readonly K[number][]) {
		const value = env[key];
		if (value === undefined) continue;
		const parsed = nonEmptyString(value);
		if (parsed instanceof type.errors) {
			throw new Error(`Invalid configuration: ${key} ${parsed.summary}`);
		}
		out[key] = parsed;
	}
	return out;
}
