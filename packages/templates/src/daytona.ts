// `@sandbox-benchmarks/templates/daytona` — one subpath, one module (the template policy).
import { config } from "@sandbox-benchmarks/providers";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Daytona sandbox template — defaults to the pre-baked toolchain snapshot (config). */
export function buildDaytonaTemplate(tag: string = config.daytonaSnapshotDefault): TemplateSpec {
	return makeTemplateSpec("daytona", tag);
}
