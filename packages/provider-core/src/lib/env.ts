// The env-contract half of the provider packages' shared core: each provider package declares the
// env keys it owns and reads them through this single gate, so no unfiltered environment data
// reaches adapter logic.

/**
 * Read a declared slice of the environment. Only the declared keys are forwarded (process.env
 * carries hundreds of unrelated ones), and both missing AND empty values resolve to `undefined`:
 * GitHub Actions materializes an unconfigured secret as an empty-string env var (`FOO: ${{
 * secrets.MISSING }}` sets FOO=""), so treating "" as a misconfiguration would crash every provider
 * at module load the moment one optional secret is unsynced — the exact failure the DAYTONA_TARGET
 * `|| 'us-west-2'` workflow guard once papered over. Empty ⇒ unset keeps a missing credential what
 * it is everywhere else in the harness (missingCreds treats "" as missing): a downstream skip
 * decision, never an import-time crash.
 */
export function readProviderEnv<const K extends readonly string[]>(
	keys: K,
	env: Record<string, string | undefined> = process.env,
): { [P in K[number]]?: string } {
	const out: Partial<Record<K[number], string>> = {};
	for (const key of keys as readonly K[number][]) {
		const value = env[key];
		if (value !== undefined && value !== "") out[key] = value;
	}
	return out;
}
