// `@sandbox-benchmarks/templates/daytona` — one subpath, one module (the template policy).
import { bakedArtifactName } from "@sandbox-benchmarks/schema/providers";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Daytona sandbox template — defaults to the version-scoped daytona-vm snapshot name. */
export function buildDaytonaTemplate(
	tag: string = bakedArtifactName("daytona-vm", "version"),
): TemplateSpec {
	return makeTemplateSpec("daytona", tag);
}
