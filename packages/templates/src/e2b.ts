// `@sandbox-benchmarks/templates/e2b` — one subpath, one module (the template policy).
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the E2B sandbox template (stub). */
export function buildE2bTemplate(tag = "latest"): TemplateSpec {
	return makeTemplateSpec("e2b", tag);
}
