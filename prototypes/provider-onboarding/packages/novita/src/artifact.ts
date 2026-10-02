// Novita template bake, moved from apps/cli/src/lib/bake/novita.ts and
// packages/providers/src/lib/novita.ts so novita-sandbox has exactly one importing package.
// It builds programmatically via Template.build against the REGIONAL domain, which serves the full
// v2 build surface (the e2b CLI rejects `nvta_` keys and 404s on the bare domain).

import type { ArtifactBuildRequest } from "../../driver-vendor/src/artifact.ts";
import { defineArtifactBuilder } from "../../driver-vendor/src/artifact.ts";
import type { NovitaSdk } from "./sdk.ts";
import { loadNovitaSdk, NOVITA_DOMAIN } from "./sdk.ts";

// An unmasked phoromatic-client powers the guest off at t+300s; `set -e` makes any failed mask
// fail the BUILD instead of every later sandbox.
export const MASK_PHOROMATIC =
	"set -e; for unit in phoromatic-client phoromatic-server phoronix-result-server; do " +
	'ln -sf /dev/null "/etc/systemd/system/$unit.service"; done';

type NovitaEnv = { readonly NOVITA_API_KEY: string };

/** Builder over an injected SDK; the default export binds the real one. */
export function novitaArtifactBuilder(sdk: Pick<NovitaSdk, "Template">) {
	return defineArtifactBuilder("novita", async (request: ArtifactBuildRequest<NovitaEnv>) => {
		const template = sdk
			.Template()
			.fromImage(request.base.digestRef)
			// Build steps run as the template's default user; /etc needs root.
			.runCmd(MASK_PHOROMATIC, { user: "root" });
		request.log(`novita Template.build ${request.name} via ${NOVITA_DOMAIN}`);
		const info = await sdk.Template.build(template, request.name, {
			apiKey: request.env.NOVITA_API_KEY,
			domain: NOVITA_DOMAIN,
			cpuCount: request.spec.vcpus,
			memoryMB: request.spec.memoryGb * 1024,
			onBuildLogs: (entry) => request.log(String(entry)),
		});
		request.log(`novita template built: ${info.templateId} (build ${info.buildId})`);
		// Template names are replaced in place by the control plane.
		return { ref: request.name, replaced: "atomic" };
	});
}

export default novitaArtifactBuilder(loadNovitaSdk());
