// Drift gate: the GitHub workflows that dispatch live benchmarks must stay in lockstep with the
// schema registries. GHA can't import TypeScript, so the provider/suite vocabulary and the
// per-provider credential wiring are re-spelled by hand in the workflow files; this module re-derives
// the truth from PROVIDERS + SUITE_NAMES (packages/schema) and compares. It mirrors
// runner-benchmarking's check-workflow-{env,suite}-sync.ts, adapted to this repo's two workflows.
//
// Invariants (each maps to a real "added X, forgot the workflow" failure mode):
//   1. bench-smoke.yml's `provider` dispatch input options == the PROVIDERS id set, and its default
//      is one of them — a new provider must be dispatchable, a removed one must not linger.
//   2. bench-smoke.yml's `suite` dispatch input options == SUITE_NAMES, with a valid default.
//   3. Every provider's requiredEnvVars (schema) is present in the "Run suite and normalize" step env
//      of BOTH bench-smoke.yml and bench-matrix.yml — the secret a new provider needs must be wired
//      into both the smoke lane and the matrix lane, or the live run silently skips it.
//   4. A credential key shared across the two workflows maps to the same value expression — both
//      lanes must hand the suite the same secret, not plan one and run the other.
//
// Bun.YAML.parse is built into bun >= 1.3 (no new dependency), so the parse stays dependency-light.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./workspace.ts";

export const SMOKE_WORKFLOW = ".github/workflows/bench-smoke.yml";
export const MATRIX_WORKFLOW = ".github/workflows/bench-matrix.yml";
/** The step (in both workflows) that drives the provider SDK; it owns the credential env block. */
export const RUN_STEP = "Run suite and normalize";
export const SMOKE_JOB = "smoke";
export const MATRIX_JOB = "bench";

/** A single `workflow_dispatch` input, narrowed to the fields the gate compares. */
export interface DispatchInput {
	default?: string;
	options?: string[];
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(message);
	}
	return value as Record<string, unknown>;
}

/** Parse a workflow YAML file under `root` (Bun.YAML — built-in, no dependency). */
export function readWorkflow(relPath: string, root: string = findRepoRoot()): unknown {
	return Bun.YAML.parse(readFileSync(join(root, relPath), "utf8"));
}

/**
 * The `on.workflow_dispatch.inputs.<name>` entry, narrowed to its default + options. Throws if the
 * input is missing — a renamed input must fail the gate loudly, not pass vacuously. (Bun.YAML keeps
 * the GHA `on:` key as the string "on", so the YAML 1.1 boolean gotcha does not bite here.)
 */
export function dispatchInput(doc: unknown, name: string, label: string): DispatchInput {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const on = asRecord(root.on, `${label}: no "on" mapping`);
	const dispatch = asRecord(on.workflow_dispatch, `${label}: no on.workflow_dispatch mapping`);
	const inputs = asRecord(dispatch.inputs, `${label}: no on.workflow_dispatch.inputs mapping`);
	const input = asRecord(inputs[name], `${label}: workflow_dispatch input "${name}" not found`);
	const options = input.options;
	if (options !== undefined && !Array.isArray(options)) {
		throw new Error(`${label}: input "${name}" options is not a list`);
	}
	return {
		default: typeof input.default === "string" ? input.default : undefined,
		options: options === undefined ? undefined : options.map((o) => String(o)),
	};
}

/**
 * The `env` mapping of a named step inside a job, as key -> value-expression entries. Throws if the
 * job, the step, or its env block is missing, or an env value is not a string — a renamed job/step
 * must fail the gate, not silently match nothing.
 */
export function stepEnv(
	doc: unknown,
	jobId: string,
	stepName: string,
	label: string,
): Record<string, string> {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const job = asRecord(jobs[jobId], `${label}: job "${jobId}" not found`);
	const steps = job.steps;
	if (!Array.isArray(steps)) throw new Error(`${label}: job "${jobId}" has no steps list`);
	const step = steps.find((s) => asRecord(s, `${label}: malformed step`).name === stepName);
	if (step === undefined) {
		throw new Error(`${label}: job "${jobId}" has no step named "${stepName}"`);
	}
	const env = asRecord(
		(step as Record<string, unknown>).env,
		`${label}: step "${stepName}" has no env mapping`,
	);
	const entries: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (typeof value !== "string") {
			throw new Error(`${label}: step "${stepName}" env.${key} is not a string value`);
		}
		entries[key] = value;
	}
	return entries;
}

/** The canonical provider ids from the schema registry. */
export function providerIds(): string[] {
	return PROVIDERS.map((p) => p.id);
}

/** Every requiredEnvVars entry across the Provider registry, with provenance (key -> owning ids). */
export function requiredCredentialKeys(): Map<string, string[]> {
	const byKey = new Map<string, string[]>();
	for (const provider of PROVIDERS) {
		for (const key of provider.requiredEnvVars) {
			const owners = byKey.get(key) ?? [];
			owners.push(provider.id);
			byKey.set(key, owners);
		}
	}
	return byKey;
}

/** Pure comparison of a dispatch input's options against an expected id set. */
function checkChoiceOptions(
	input: DispatchInput,
	expected: string[],
	kind: string,
	source: string,
	label: string,
): string[] {
	const errors: string[] = [];
	if (input.options === undefined) {
		errors.push(
			`${label}: ${kind} input has no options list — expected a "type: choice" listing every ${kind} from ${source}`,
		);
		return errors;
	}
	const expectedSet = new Set(expected);
	const optionSet = new Set(input.options);
	for (const id of expectedSet) {
		if (!optionSet.has(id)) {
			errors.push(
				`${label}: ${kind} input options missing "${id}" — it is in ${source}; a dispatched run can't target it`,
			);
		}
	}
	for (const opt of optionSet) {
		if (!expectedSet.has(opt)) {
			errors.push(
				`${label}: ${kind} input option "${opt}" is not in ${source} — remove it or add it to the registry`,
			);
		}
	}
	if (input.default !== undefined && !expectedSet.has(input.default)) {
		errors.push(`${label}: ${kind} input default "${input.default}" is not in ${source}`);
	}
	return errors;
}

/** Invariant 1: the provider dispatch input options == the PROVIDERS id set. */
export function checkProviderInput(input: DispatchInput, label: string = SMOKE_WORKFLOW): string[] {
	return checkChoiceOptions(
		input,
		providerIds(),
		"provider",
		"PROVIDERS (packages/schema/src/providers.ts)",
		label,
	);
}

/** Invariant 2: the suite dispatch input options == SUITE_NAMES. */
export function checkSuiteInput(input: DispatchInput, label: string = SMOKE_WORKFLOW): string[] {
	return checkChoiceOptions(
		input,
		[...SUITE_NAMES],
		"suite",
		"SUITE_NAMES (packages/schema/src/suites.ts)",
		label,
	);
}

/**
 * Invariants 3 + 4: every provider requiredEnvVar is present in the run-step env of every workflow,
 * and a key shared across them maps to the same value expression. `envByWorkflow` keys are workflow
 * paths so error messages name the offending file.
 */
export function checkCredentialEnv(
	envByWorkflow: Record<string, Record<string, string>>,
): string[] {
	const errors: string[] = [];
	const workflows = Object.keys(envByWorkflow);
	for (const [key, owners] of requiredCredentialKeys()) {
		// biome-ignore lint/style/noNonNullAssertion: keys come from Object.keys(envByWorkflow).
		const missing = workflows.filter((wf) => !(key in envByWorkflow[wf]!));
		if (missing.length > 0) {
			errors.push(
				`${key}: required by provider ${owners.join(", ")} (packages/schema/src/providers.ts ` +
					`requiredEnvVars) but missing from the "${RUN_STEP}" step env of ${missing.join(" and ")}`,
			);
			continue;
		}
		// biome-ignore lint/style/noNonNullAssertion: presence checked above.
		const values = new Set(workflows.map((wf) => envByWorkflow[wf]![key]!));
		if (values.size > 1) {
			errors.push(
				`${key}: maps to different value expressions across workflows ` +
					`(${[...values].map((v) => `"${v}"`).join(" vs ")}) — every lane must hand the suite the same secret`,
			);
		}
	}
	return errors;
}

/**
 * The whole gate against the real workflow files under `root` — the single owner of which files feed
 * the gate, used by the real-file test in workflow-registry-sync.test.ts.
 */
export function runCheck(root: string = findRepoRoot()): string[] {
	const smoke = readWorkflow(SMOKE_WORKFLOW, root);
	const matrix = readWorkflow(MATRIX_WORKFLOW, root);
	return [
		...checkProviderInput(dispatchInput(smoke, "provider", SMOKE_WORKFLOW)),
		...checkSuiteInput(dispatchInput(smoke, "suite", SMOKE_WORKFLOW)),
		...checkCredentialEnv({
			[SMOKE_WORKFLOW]: stepEnv(smoke, SMOKE_JOB, RUN_STEP, SMOKE_WORKFLOW),
			[MATRIX_WORKFLOW]: stepEnv(matrix, MATRIX_JOB, RUN_STEP, MATRIX_WORKFLOW),
		}),
	];
}
