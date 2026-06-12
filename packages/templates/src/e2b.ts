// `@sandbox-benchmarks/templates/e2b` — one subpath, one module (the template policy).
import { createStubAdapter } from "@sandbox-benchmarks/providers";
import { makeTemplateSpec, type TemplateSpec } from "./lib/internal.ts";

/** Build the E2B sandbox template (stub). */
export function buildE2bTemplate(tag = "latest"): TemplateSpec {
  const { descriptor } = createStubAdapter("e2b", "E2B");
  return makeTemplateSpec(descriptor.id, tag);
}
