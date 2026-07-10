// Bake the novita template: the e2b bake pointed at Novita's E2B-protocol-compatible control plane.
// Novita's compatibility API accepts the stock e2b CLI (their docs: set E2B_DOMAIN=sandbox.novita.ai
// and E2B_API_KEY=<Novita key>), so template creation is bakeE2bTemplate verbatim — same committed
// Dockerfile, same generated e2b.toml, same remote-builder protocol — with only the domain and
// credentials swapped for the spawned CLI. The template lands in Novita's namespace (independent of
// e2b.dev), which is why it can reuse the same version-scoped artifact name.
import { config, NOVITA_E2B_DOMAIN } from "@sandbox-benchmarks/providers";
import { bakeE2bTemplate } from "./e2b.ts";
import type { Log } from "./types.ts";

/** Build the novita template `name` from `baseImage` on Novita's control plane. */
export async function bakeNovitaTemplate(name: string, baseImage: string, log: Log): Promise<void> {
	const apiKey = config.novita.apiKey;
	// The bake loop gates on requiredEnvVars before calling this, so a missing key here means the
	// loop's contract broke — fail loudly rather than let the CLI fall back to an e2b.dev session.
	if (!apiKey) throw new Error("NOVITA_API_KEY is required to bake the novita template");

	log(`novita template create ${name} via ${NOVITA_E2B_DOMAIN} (base ${baseImage})`);
	await bakeE2bTemplate(name, baseImage, log, {
		E2B_DOMAIN: NOVITA_E2B_DOMAIN,
		E2B_API_KEY: apiKey,
	});
}
