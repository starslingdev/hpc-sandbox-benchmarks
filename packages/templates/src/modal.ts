// `@sandbox-benchmarks/templates/modal` — one subpath, one module (the template policy).
import { config } from "@sandbox-benchmarks/providers";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Modal sandbox template — defaults to the pre-baked toolchain image (config gatekeeper). */
export function buildModalTemplate(tag: string = config.toolchainImage): TemplateSpec {
	return makeTemplateSpec("modal", tag);
}
