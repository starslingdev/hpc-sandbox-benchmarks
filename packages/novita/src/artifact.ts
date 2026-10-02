// The Novita template builder: the novita-sandbox SDK's Template API against Novita's
// E2B-compatible control plane. The spawned-CLI path the e2b builder uses is a dead end for Novita
// twice over: @e2b/cli >= 2.12 rejects `nvta_…` keys client-side before any request is made, and
// Novita's control plane 404s the CLI's build route on the bare domain. So this builds
// programmatically via `Template.build` against the REGIONAL domain (NOVITA_DOMAIN), which serves
// the full v2 build surface (verified 2026-07-11: 34s remote build).
//
// The account key rides the SDK's own `apiKey` channel, so it reaches control-plane requests only
// (never a custom `headers` entry, which the SDK would replay to the guest daemon). `fromImage`
// templates straight from the digest-pinned base; the e2b variant Dockerfile's only deltas
// (validate-base and OCI labels) do not ride along, which is acceptable because the template still
// provably derives from the same validated bytes. The template lands in Novita's namespace, which
// is why it reuses the version-scoped artifact name.

import { createRequire } from "node:module";
import type { EnvOf } from "@sandbox-benchmarks/driver";
import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";
import { NOVITA_DOMAIN } from "./vendor.ts";

/** The SDK surface the builder translates onto. */
type NovitaTemplateSdk = Pick<typeof import("novita-sandbox"), "Template">;

/**
 * Mask the PTS phoromatic units at template-build time, mirroring the base image's own mask
 * (packages/templates/images/base/scripts/20-pts.sh). Novita boots the image with systemd as PID 1,
 * and an unmasked phoromatic-client POWERS OFF the guest at t+300s (probed 2026-07-11 on a live
 * sandbox: dead at exactly 5:00; masked, it survives). Redundant but idempotent once the base ships
 * the mask; kept so a template rebuilt from an older base is protected too. `set -e` makes any
 * failed mask fail the BUILD: a loud build error is far cheaper than sandboxes that power off.
 */
export const NOVITA_PHOROMATIC_MASK =
	"set -e; for unit in phoromatic-client phoromatic-server phoronix-result-server; do " +
	'ln -sf /dev/null "/etc/systemd/system/$unit.service"; done';

// The SDK's CJS build, as the driver loads it: mixing its ESM build with CJS dependents makes
// Bun's require(chalk) race.
const loadSdk = (): NovitaTemplateSdk =>
	createRequire(import.meta.url)("novita-sandbox") as NovitaTemplateSdk;

/** The Novita builder over an SDK loader; the default export binds the real SDK lazily. */
export function novitaArtifactBuilder(sdk: () => NovitaTemplateSdk = loadSdk) {
	return defineArtifactBuilder<"novita", EnvOf<"novita">>("novita", async (request) => {
		const { name, base, spec, env, log } = request;
		const { Template } = sdk();
		log(`novita Template.build ${name} via ${NOVITA_DOMAIN} (base ${base.digestRef})`);
		// Build steps run as the template's default user; /etc needs root.
		const template = Template()
			.fromImage(base.digestRef)
			.runCmd(NOVITA_PHOROMATIC_MASK, { user: "root" });
		request.signal.throwIfAborted();
		const info = await Template.build(template, name, {
			apiKey: env.NOVITA_API_KEY,
			domain: NOVITA_DOMAIN,
			cpuCount: spec.vcpus,
			memoryMB: spec.memoryGb * 1024,
			onBuildLogs: (entry) => log(String(entry)),
		});
		log(`novita template built: ${info.templateId} (build ${info.buildId})`);
		// Template names are replaced in place by the control plane.
		return { ref: name, replaced: "atomic" };
	});
}

export default novitaArtifactBuilder();
