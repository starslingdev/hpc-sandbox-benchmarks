// `@sandbox-benchmarks/templates/modal` — one subpath, one module (the template policy).
import { toolchainImageRef } from "@sandbox-benchmarks/schema/toolchain";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Modal sandbox template — defaults to the public toolchain image version. */
export function buildModalTemplate(tag: string = toolchainImageRef("version")): TemplateSpec {
	return makeTemplateSpec("modal", tag);
}
