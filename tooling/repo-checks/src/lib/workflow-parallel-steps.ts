import { type } from "arktype";

const runnable = type({ "run?": "string", "uses?": "string" }).narrow(
	(step, ctx) =>
		(step.run === undefined) !== (step.uses === undefined) ||
		ctx.mustBe('a step with exactly one of "run" or "uses"'),
);
const group = type({ parallel: type("object[] >= 2") }).onUndeclaredKey("reject");
const workflow = type({ jobs: { "[string]": { "steps?": "object[]" } } });

/**
 * Compatibility validation until actionlint understands GitHub's `parallel` step groups
 * (rhysd/actionlint#693). actionlint reads a group as a step with neither `run` nor `uses`, so that
 * one diagnostic is ignored and this check enforces it instead: every step is runnable or is a
 * group (nothing but `parallel`, at least two members) whose members are all runnable. Groups do
 * not nest — GitHub runs each member as a background step.
 */
export function checkParallelSteps(source: string): void {
	const parsed = workflow.assert(Bun.YAML.parse(source));
	for (const [jobId, job] of Object.entries(parsed.jobs)) {
		for (const [index, step] of (job.steps ?? []).entries()) {
			const label = `job "${jobId}" step ${index + 1}`;
			if (!("parallel" in step)) {
				const result = runnable(step);
				if (result instanceof type.errors) throw new Error(`${label}: ${result.summary}`);
				continue;
			}
			const members = group(step);
			if (members instanceof type.errors) throw new Error(`${label}: ${members.summary}`);
			for (const [member, child] of members.parallel.entries()) {
				const result = runnable(child);
				if (result instanceof type.errors)
					throw new Error(`${label} parallel member ${member + 1}: ${result.summary}`);
			}
		}
	}
}

// Match only the step diagnostic a `parallel` group produces; checkParallelSteps re-enforces it.
export const ACTIONLINT_PARALLEL_STEPS_COMPATIBILITY =
	'^step must run script with "run" section or run action with "uses" section$';
