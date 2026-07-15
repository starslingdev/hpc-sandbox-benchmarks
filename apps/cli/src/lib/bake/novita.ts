// Bake the novita template: the novita-sandbox SDK's Template API against Novita's
// E2B-protocol-compatible control plane. The spawned-CLI path the e2b bake uses is a dead end for
// Novita twice over — @e2b/cli ≥ 2.12 rejects `nvta_…` keys client-side before any request is
// made, and Novita's control plane 404s the CLI's build route on the bare domain — so this bakes
// programmatically via `Template.build` against the REGIONAL domain (see NOVITA_E2B_DOMAIN),
// which serves the full v2 build surface (verified 2026-07-11: 34s remote build). novita-sandbox
// is Novita's fork of the e2b SDK: it takes the `nvta_…` key in its own `apiKey` channel, so the
// account credential rides control-plane requests only (see the compat module). `fromImage(baseImage)` templates straight
// from the pushed candidate base ref; the e2b variant Dockerfile's only deltas (validate-base +
// OCI labels) don't ride along, which is acceptable because the template still provably derives
// from the same validated, registry-pinned bytes. The template lands in Novita's namespace
// (independent of e2b.dev), which is why it can reuse the same version-scoped artifact name.
import { createRequire } from "node:module";
import { config, novitaConnection } from "@sandbox-benchmarks/providers";
import { resolveImageDigestRef } from "./image.ts";
import type { Log } from "./types.ts";

// CJS build on purpose — same chalk dual-format race the compat module documents
// (packages/providers/src/lib/novita.ts): mixing novita-sandbox's ESM build with the CJS
// wrapper chain makes Bun's require(chalk) flaky.
const requireCjs = createRequire(import.meta.url);
const { Template } = requireCjs("novita-sandbox") as typeof import("novita-sandbox");

/** Build the novita template `name` from `baseImage` on Novita's control plane. */
export async function bakeNovitaTemplate(name: string, baseImage: string, log: Log): Promise<void> {
	const apiKey = config.novita.apiKey;
	// The bake loop gates on requiredEnvVars before calling this, so a missing key here means the
	// loop's contract broke — fail loudly rather than let the SDK fall back to an e2b.dev session.
	if (!apiKey) throw new Error("NOVITA_API_KEY is required to bake the novita template");

	const connection = novitaConnection(apiKey);
	const pinnedBaseImage = await resolveImageDigestRef(baseImage);
	log(`novita Template.build ${name} via ${connection.domain} (base ${pinnedBaseImage})`);
	// Mask the PTS phoromatic units at template-build time, mirroring the base image's own mask
	// (packages/templates/images/base/scripts/20-pts.sh). Novita boots the image with systemd as
	// PID 1 exactly like e2b, and an unmasked phoromatic-client POWERS OFF the guest at t+300s
	// (probed 2026-07-11 on a live Novita sandbox: dead at exactly 5:00; masked → survives).
	// Redundant-but-idempotent once the base image ships the mask — kept so the novita template is
	// protected even when it's rebuilt from a candidate base that predates the base-image fix.
	const template = Template()
		.fromImage(pinnedBaseImage)
		.runCmd(
			// `set -e` so any failed mask fails the BUILD: without it the loop's exit status is the
			// last ln's, and an unmasked phoromatic-client means every sandbox booted from this
			// template powers off at t+300s — a loud bake error is infinitely cheaper than that.
			"set -e; for unit in phoromatic-client phoromatic-server phoronix-result-server; do " +
				'ln -sf /dev/null "/etc/systemd/system/$unit.service"; done',
			// Build steps run as the template's default user; /etc needs root.
			{ user: "root" },
		);
	const info = await Template.build(template, name, {
		...connection,
		cpuCount: config.targetSpec.vcpus,
		memoryMB: config.targetSpec.memoryGb * 1024,
		onBuildLogs: (entry) => log(String(entry)),
	});
	log(`novita template built: ${info.templateId} (build ${info.buildId})`);
}
