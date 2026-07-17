// Drift gate: the GitHub workflows that dispatch live benchmarks must stay in lockstep with the
// schema registries. GHA can't import TypeScript, so the provider/suite vocabulary and the
// per-provider credential wiring are re-spelled by hand in the workflow files; this module re-derives
// the truth from PROVIDERS + SUITE_NAMES (packages/schema) and compares. It mirrors
// runner-benchmarking's check-workflow-{env,suite}-sync.ts, adapted to this repo's workflows.
//
// Two workflows dispatch live benchmarks: bench-smoke.yml (one dispatched suite × provider) and
// bench-matrix.yml (one suite-matrix job that calls the reusable bench-suite.yml once per suite, which
// then fans out over the selected providers). The credential block + the run job's timeout therefore
// live in bench-suite.yml for the matrix lane, so the "matrix side" of the credential/timeout checks
// reads that reusable workflow, not bench-matrix.yml itself.
//
// Invariants (each maps to a real "added X, forgot the workflow" failure mode):
//   1. bench-smoke.yml's `provider` dispatch input options == the PROVIDERS id set, and its default
//      is one of them — a new provider must be dispatchable, a removed one must not linger.
//   2. bench-smoke.yml's `suite` dispatch input options == SUITE_NAMES, with a valid default.
//   3. Every provider's requiredEnvVars (schema) is present in the "Run suite and normalize" step env
//      of BOTH bench-smoke.yml and the reusable bench-suite.yml — the secret a new provider needs must
//      be wired into both the smoke lane and the matrix fan-out, or the live run silently skips it.
//   4. A credential key shared across the two lanes maps to the same value expression — both must hand
//      the suite the same secret, not plan one and run the other. Each lane scopes its secrets to the
//      selected provider (so a cell only sees its own credential), and the two lanes pick that provider
//      differently — `inputs.provider` in smoke, `matrix.provider` in the fan-out — so the comparison
//      folds those two selector tokens together before checking.
//   5. Both live-run jobs (smoke's job and the reusable fan-out) outlast the longest registered sandbox
//      lifetime by a fixed margin, so a suite budget increase cannot leave an otherwise healthy job to
//      be killed by Actions first.
//   6. Nesting wiring (suite-matrix caller + reusable provider job name) — see workflow-nesting.ts.
//
// YAML navigation lives in workflow-yaml.ts; nesting checks in workflow-nesting.ts. This file owns
// credential/timeout invariants plus runCheck orchestration, and re-exports the public surface the
// gate's tests import.
import { PROVIDERS, SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";
import {
	checkSuiteMatrixCaller,
	checkSuiteWorkflowNesting,
	matrixSuiteCaller,
} from "./workflow-nesting.ts";
import type { DispatchInput } from "./workflow-yaml.ts";
import {
	dispatchInput,
	jobTimeoutMinutes,
	MATRIX_WORKFLOW,
	RUN_STEP,
	readWorkflow,
	SMOKE_JOB,
	SMOKE_WORKFLOW,
	SUITE_JOB,
	SUITE_WORKFLOW,
	stepEnv,
	WORKFLOW_TIMEOUT_MARGIN_MINUTES,
} from "./workflow-yaml.ts";
import { findRepoRoot } from "./workspace.ts";

export type { SuiteMatrixCaller } from "./workflow-nesting.ts";
export {
	checkSuiteMatrixCaller,
	checkSuiteWorkflowNesting,
	EXPECTED_PROVIDER_NAME_EXPR,
	EXPECTED_SUITE_MATRIX_EXPR,
	EXPECTED_SUITE_NAME_EXPR,
	matrixSuiteCaller,
} from "./workflow-nesting.ts";
export type { DispatchInput } from "./workflow-yaml.ts";
export {
	dispatchInput,
	jobTimeoutMinutes,
	MATRIX_WORKFLOW,
	RUN_STEP,
	readWorkflow,
	SMOKE_JOB,
	SMOKE_WORKFLOW,
	SUITE_JOB,
	SUITE_WORKFLOW,
	stepEnv,
	WORKFLOW_TIMEOUT_MARGIN_MINUTES,
} from "./workflow-yaml.ts";

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
	// GitHub only enforces `options` for `type: choice`; under any other type (or none, which defaults
	// to free-text `string`) a dispatched run could pass an unlisted value, so a matching options list
	// would be cosmetic. Check this first — it's the invariant the options/default checks rest on.
	if (input.type !== "choice") {
		errors.push(
			`${label}: ${kind} input is not "type: choice" (got ${input.type ? `"${input.type}"` : "no type"}) — ` +
				`GitHub only enforces the options list for choice inputs, so a dispatched run could pass an unlisted ${kind}`,
		);
	}
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
	// The invariant requires a default that is one of the options. A missing default — or a malformed
	// non-string one, which dispatchInput coerces to undefined — must fail, not pass vacuously.
	if (input.default === undefined) {
		errors.push(
			`${label}: ${kind} input has no valid string default — it must default to one of ${source}`,
		);
	} else if (!expectedSet.has(input.default)) {
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
 * Fold a credential value expression to its lane-independent form for cross-lane comparison. Each
 * lane scopes a secret to the selected provider so a cell receives only its own credential, but the
 * two lanes name that selector differently — `inputs.provider` (the smoke dispatch input) vs
 * `matrix.provider` (the matrix cell) — so both selector tokens collapse to one placeholder. A
 * genuine drift (a secret guarded on a different provider id, or a different secret entirely)
 * survives the fold and still fails Invariant 4.
 */
function canonicalCredentialExpr(value: string): string {
	return value.replace(/\b(?:inputs|matrix)\.provider\b/g, "<provider>");
}

/**
 * Invariants 3 + 4: every provider requiredEnvVar is present in the run-step env of every workflow,
 * and a key shared across them maps to the same value expression (modulo each lane's provider
 * selector — see {@link canonicalCredentialExpr}). `envByWorkflow` keys are workflow paths so error
 * messages name the offending file.
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
		// Dedupe on the canonical (selector-folded) form, but report the raw expressions so a human
		// sees the real drift, not the placeholder. First raw value wins per canonical form.
		const rawByCanonical = new Map<string, string>();
		for (const wf of workflows) {
			// biome-ignore lint/style/noNonNullAssertion: presence checked above.
			const raw = envByWorkflow[wf]![key]!;
			const canonical = canonicalCredentialExpr(raw);
			if (!rawByCanonical.has(canonical)) rawByCanonical.set(canonical, raw);
		}
		if (rawByCanonical.size > 1) {
			errors.push(
				`${key}: maps to different value expressions across workflows ` +
					`(${[...rawByCanonical.values()].map((v) => `"${v}"`).join(" vs ")}) — every lane must hand the suite the same secret`,
			);
		}
	}
	return errors;
}

/** Invariant 5: every live-run job has margin beyond the longest registered sandbox lifetime. */
export function checkWorkflowTimeouts(timeoutByWorkflow: Record<string, number>): string[] {
	const longestSuite = Math.max(...Object.values(SUITES).map((suite) => suite.timeoutMinutes));
	const minimum = longestSuite + WORKFLOW_TIMEOUT_MARGIN_MINUTES;
	return Object.entries(timeoutByWorkflow)
		.filter(([, timeout]) => timeout < minimum)
		.map(
			([workflow, timeout]) =>
				`${workflow}: job timeout-minutes ${timeout} is below the required ${minimum} ` +
				`(${longestSuite}-minute longest suite + ${WORKFLOW_TIMEOUT_MARGIN_MINUTES}-minute host margin)`,
		);
}

/**
 * The whole gate against the real workflow files under `root` — the single owner of which files feed
 * the gate, used by the real-file test in workflow-registry-sync.test.ts.
 */
export function runCheck(root: string = findRepoRoot()): string[] {
	const smoke = readWorkflow(SMOKE_WORKFLOW, root);
	const matrix = readWorkflow(MATRIX_WORKFLOW, root);
	// The matrix lane's credential block + run-job timeout live in the reusable bench-suite.yml that
	// every suite job calls, so the "matrix side" of Invariants 3–5 reads that file.
	const suiteWf = readWorkflow(SUITE_WORKFLOW, root);
	return [
		...checkProviderInput(dispatchInput(smoke, "provider", SMOKE_WORKFLOW)),
		...checkSuiteInput(dispatchInput(smoke, "suite", SMOKE_WORKFLOW)),
		...checkCredentialEnv({
			[SMOKE_WORKFLOW]: stepEnv(smoke, SMOKE_JOB, RUN_STEP, SMOKE_WORKFLOW),
			[SUITE_WORKFLOW]: stepEnv(suiteWf, SUITE_JOB, RUN_STEP, SUITE_WORKFLOW),
		}),
		...checkWorkflowTimeouts({
			[SMOKE_WORKFLOW]: jobTimeoutMinutes(smoke, SMOKE_JOB, SMOKE_WORKFLOW),
			[SUITE_WORKFLOW]: jobTimeoutMinutes(suiteWf, SUITE_JOB, SUITE_WORKFLOW),
		}),
		...checkSuiteMatrixCaller(matrixSuiteCaller(matrix, MATRIX_WORKFLOW), MATRIX_WORKFLOW),
		...checkSuiteWorkflowNesting(suiteWf, SUITE_WORKFLOW),
	];
}
