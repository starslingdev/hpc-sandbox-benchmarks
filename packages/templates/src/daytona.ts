// `@sandbox-benchmarks/templates/daytona` — one subpath, one module (the template policy).
import { createStubAdapter } from "@sandbox-benchmarks/providers";
import { makeTemplateSpec, type TemplateSpec } from "./lib/internal.ts";

/** Build the Daytona sandbox template (stub). */
export function buildDaytonaTemplate(tag = "latest"): TemplateSpec {
  const { descriptor } = createStubAdapter("daytona", "Daytona");
  return makeTemplateSpec(descriptor.id, tag);
}
