// `@sandbox-benchmarks/templates/modal` — one subpath, one module (the template policy).
import { createStubAdapter } from "@sandbox-benchmarks/providers";
import { makeTemplateSpec, type TemplateSpec } from "./lib/internal.ts";

/** Build the Modal sandbox template (stub). */
export function buildModalTemplate(tag = "latest"): TemplateSpec {
  const { descriptor } = createStubAdapter("modal", "Modal");
  return makeTemplateSpec(descriptor.id, tag);
}
