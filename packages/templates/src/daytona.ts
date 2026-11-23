// `@sandbox-benchmarks/templates/daytona` — one subpath, one module (the template policy).
import { config } from "@sandbox-benchmarks/providers/config";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Daytona sandbox template — defaults to the daytona-vm-zen5 pre-baked toolchain image (config). */
export function buildDaytonaTemplate(
	tag: string = config.daytonaVmArtifacts["daytona-vm-zen5"].version,
): TemplateSpec {
	return makeTemplateSpec("daytona", tag);
}
