// Prototype: the generic loader for data-only providers. In the target design the generated
// packages/drivers loader calls this for every registry entry that carries a `driver` manifest,
// so such providers have no package, no index.ts, and no vendor dependency.

import type { DriverContext, ProviderId } from "@sandbox-benchmarks/driver";
import type { CliManifest } from "./cli.ts";
import { compileCliManifest } from "./cli.ts";
import type { HttpControlPlane } from "./http.ts";
import { httpOps } from "./http.ts";
import { defineOpsDriver } from "./ops.ts";

export type DriverManifest = HttpControlPlane<object> | CliManifest;

export function manifestDriver<P extends ProviderId>(
	provider: P,
	manifest: DriverManifest,
	provenance: { readonly packageName: string; readonly version: string },
	seams: { readonly fetch?: typeof globalThis.fetch; readonly pollMs?: number } = {},
) {
	if (manifest.kind === "cli") return compileCliManifest(provider, manifest).module(provenance);
	return defineOpsDriver(provider, {
		provenance,
		ops: (context: DriverContext<P>) =>
			httpOps(manifest, {
				env: context.env as Readonly<Record<string, string | undefined>>,
				...(seams.fetch && { fetch: seams.fetch }),
				...(seams.pollMs !== undefined && { timing: { pollMs: seams.pollMs } }),
			}),
	});
}
