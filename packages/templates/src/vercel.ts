// `@sandbox-benchmarks/templates/vercel` — VCR image policy for Vercel Sandbox.
import { config } from "@sandbox-benchmarks/providers";
import type { TemplateSpec } from "./lib/internal.ts";
import { makeTemplateSpec } from "./lib/internal.ts";

/** Build the Vercel template descriptor, defaulting to the project-scoped VCR image. */
export function buildVercelTemplate(tag: string = config.vercelImage): TemplateSpec {
	return makeTemplateSpec("vercel", tag);
}
