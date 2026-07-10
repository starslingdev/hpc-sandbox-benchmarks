// The env-contract half of the provider packages' shared core: each provider package declares the
// env keys it owns and reads them through this single validated gate, so no unvalidated environment
// data reaches adapter logic (the same posture the original monolithic config gatekeeper enforced,
// now reusable per package).
import { type } from "arktype";

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
	const schema = type(Object.fromEntries(keys.map((key) => [`${key}?`, "string >= 1"])));
	const raw: Record<string, string> = {};
	for (const key of keys) {
		const value = env[key];
		if (value !== undefined) raw[key] = value;
	}
	const parsed = schema(raw);
	if (parsed instanceof type.errors) {
		throw new Error(`Invalid configuration: ${parsed.summary}`);
	}
	return parsed as { [P in K[number]]?: string };
}
