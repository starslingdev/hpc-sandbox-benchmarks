// Build through the regional SDK endpoint; the E2B CLI rejects Novita keys.

import { createRequire } from "node:module";
import { e2bProtocolArtifactBuilder } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { NOVITA_DOMAIN } from "./vendor.ts";

/** The SDK surface the builder translates onto. */
export type NovitaTemplateSdk = Pick<typeof import("novita-sandbox"), "Template">;

// Mask phoromatic services: otherwise systemd shuts the guest down after five minutes.
export const NOVITA_PHOROMATIC_MASK =
	"set -e; for unit in phoromatic-client phoromatic-server phoronix-result-server; do " +
	'ln -sf /dev/null "/etc/systemd/system/$unit.service"; done';

// The SDK's CJS build, as the driver loads it: mixing its ESM build with CJS dependents makes
// Bun's require(chalk) race.
const loadSdk = (): NovitaTemplateSdk =>
	createRequire(import.meta.url)("novita-sandbox") as NovitaTemplateSdk;

/** The Novita builder over an SDK loader; the default export binds the real SDK lazily. */
export const novitaArtifactBuilder = (sdk: () => NovitaTemplateSdk = loadSdk) =>
	e2bProtocolArtifactBuilder("novita", sdk, {
		apiKey: (env) => env.NOVITA_API_KEY,
		domain: NOVITA_DOMAIN,
		// Build steps run as the template's default user; /etc needs root.
		steps: (template) => template.runCmd(NOVITA_PHOROMATIC_MASK, { user: "root" }),
	});

export default novitaArtifactBuilder();
