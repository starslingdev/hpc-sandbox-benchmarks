// Public surface of @sandbox-benchmarks/templates (the "." subpath).
// Per-provider builders live at their own subpaths: ./e2b, ./daytona, ./modal.
import { buildDaytonaTemplate } from "./daytona.ts";
import { buildE2bTemplate } from "./e2b.ts";
import type { TemplateSpec } from "./lib/internal.ts";
import { buildModalTemplate } from "./modal.ts";

export type { TemplateSpec };
export { buildDaytonaTemplate, buildE2bTemplate, buildModalTemplate };

/** Each provider id mapped to its template builder. `templateProviders` is derived from these
 *  keys, so the published id list can't drift from the builders that actually exist. */
const templateBuilders = {
	e2b: buildE2bTemplate,
	daytona: buildDaytonaTemplate,
	modal: buildModalTemplate,
} satisfies Record<string, (tag?: string) => TemplateSpec>;

/** All provider ids that ship a template builder this pass. */
export const templateProviders = Object.keys(templateBuilders) as (keyof typeof templateBuilders)[];
