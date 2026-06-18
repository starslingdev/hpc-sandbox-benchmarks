// `@sandbox-benchmarks/templates/daytona` — one subpath, one module (the template policy).
import { DAYTONA_SNAPSHOT_DEFAULT } from "@sandbox-benchmarks/providers";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Daytona sandbox template (stub) — defaults to the pre-baked toolchain snapshot. */
export function buildDaytonaTemplate(tag = DAYTONA_SNAPSHOT_DEFAULT): TemplateSpec {
	return makeTemplateSpec("daytona", tag);
}
