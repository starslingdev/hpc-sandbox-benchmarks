// `@sandbox-benchmarks/templates/modal` — one subpath, one module (the template policy).
import { TOOLCHAIN_IMAGE } from "@sandbox-benchmarks/providers";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Modal sandbox template (stub) — defaults to the pre-baked toolchain image. */
export function buildModalTemplate(tag = TOOLCHAIN_IMAGE): TemplateSpec {
	return makeTemplateSpec("modal", tag);
}
