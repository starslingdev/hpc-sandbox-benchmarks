// Drift gate: the GitHub workflows that dispatch live benchmarks must stay in lockstep with the
// schema registries. GHA can't import TypeScript, so the provider/suite vocabulary and the
// per-provider credential wiring are re-spelled by hand in the workflow files; this module re-derives
// the truth from PROVIDERS + SUITE_NAMES (packages/schema) and compares. It mirrors
// runner-benchmarking's check-workflow-{env,suite}-sync.ts, adapted to this repo's workflows.
//
// Two workflows dispatch live benchmarks — bench-matrix.yml (the full provider × suite matrix, ending
// in a dataset commit) and bench-smoke.yml (the same pipeline narrowed to one dispatched provider ×
// suite and stopped before that commit) — and they are now the SAME implementation: each is a `plan`
// job over ./.github/actions/plan-bench-axes plus one suite-matrix job calling the reusable
// bench-suite.yml. The credential block, the run-step env and the live-run timeout therefore exist
// exactly once, in that reusable, which is what the credential/timeout checks read.
//
// Invariants (each maps to a real "added X, forgot the workflow" failure mode):
//   1. bench-smoke.yml's `provider` dispatch input options == the PROVIDERS id set, and its default
//      is one of them — a new provider must be dispatchable, a removed one must not linger.
//   2. bench-smoke.yml's `suite` dispatch input options == SUITE_NAMES, with a valid default.
//   3. Every provider's requiredEnvVars (schema) is present in the "Run suite and normalize" step env
//      of the reusable bench-suite.yml — the secret a new provider needs must be wired into the one
//      cell implementation, or every live run silently skips that provider.
//  3b. NEITHER dispatch lane owns a benchmark cell: no "Run suite and normalize" step, no `run:` that
//      invokes the cell driver, and no provider credential in any job- or step-level env (see
//      checkLaneDelegates). This is the invariant that replaces the old cross-lane credential
//      comparison — by removing the second lane's copy rather than diffing it. All three probes are
//      needed: a name match alone misses a cell re-grown under a fresh step name, and a step-level
//      scan alone misses credentials hung off a job-level env that every step inherits.
//   4. checkCredentialEnv still compares a key's value expression ACROSS whatever workflows it is
//      handed, folding each lane's provider selector. With one lane left it degenerates to a presence
//      check; it stays cross-workflow so a future third caller is compared, not assumed.
//   5. The live-run job (the reusable's fan-out) outlasts the longest registered sandbox lifetime by a
//      fixed margin, so a suite budget increase cannot leave an otherwise healthy job to be killed by
//      Actions first; and the budget literal it advertises equals that timeout.
//   6. Nesting wiring for BOTH lanes' suite-matrix callers (they are held to one shape, with the two
//      deliberate per-lane differences — the matrix's publish dependency, the smoke's
//      require_providers assertion — stated explicitly at each lane, in both directions) plus the
//      reusable's provider job name and the replicate axis reaching the cell as BENCH_REPLICATES data.
//   7. A smoke dispatch measures ONE sandbox unless asked otherwise — the dispatch default AND the
//      blank-value fallback, since `default:` alone does not survive a cleared field and blank means
//      "each suite's Suite.defaultReplicas" (R=12 on realworld). See workflow-nesting.ts.
//
// YAML navigation lives in workflow-yaml.ts; nesting checks in workflow-nesting.ts. This file owns
// credential/timeout invariants plus runCheck orchestration, and re-exports the public surface the
// gate's tests import.
import { PROVIDERS, SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";
import {
	checkLaneDelegates,
	checkSmokeSingleSandboxDefault,
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
	SMOKE_WORKFLOW,
	SUITE_JOB,
	SUITE_WORKFLOW,
	stepEnv,
	WORKFLOW_TIMEOUT_MARGIN_MINUTES,
} from "./workflow-yaml.ts";
import { findRepoRoot } from "./workspace.ts";

export type { SuiteMatrixCaller, SuiteMatrixCallerOptions } from "./workflow-nesting.ts";
export {
	checkLaneDelegates,
	checkSmokeSingleSandboxDefault,
	checkSuiteMatrixCaller,
	checkSuiteWorkflowNesting,
	EXPECTED_PROVIDER_NAME_EXPR,
	EXPECTED_REPLICATES_ARG,
	EXPECTED_REPLICATES_ENV_EXPR,
	EXPECTED_REPLICATES_INPUT_EXPR,
	EXPECTED_REQUIRE_PROVIDERS_INPUT_EXPR,
	EXPECTED_SMOKE_REPLICAS_INPUT_EXPR,
	EXPECTED_SUITE_MATRIX_EXPR,
	EXPECTED_SUITE_NAME_EXPR,
	matrixSuiteCaller,
	PLAN_STEP,
	REPLICATES_ENV_KEY,
} from "./workflow-nesting.ts";
export type { DispatchInput } from "./workflow-yaml.ts";
export {
	dispatchInput,
	jobTimeoutMinutes,
	MATRIX_WORKFLOW,
	RUN_STEP,
	readWorkflow,
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
 * Fold a credential value expression to its lane-independent form for cross-workflow comparison. A
 * lane scopes a secret to the selected provider so a cell receives only its own credential, and a
 * caller may name that selector either way — `inputs.provider` (a dispatch input) or `matrix.provider`
 * (a matrix cell) — so both selector tokens collapse to one placeholder. A genuine drift (a secret
 * guarded on a different provider id, or a different secret entirely) survives the fold and still
 * fails Invariant 4. Only the reusable declares the block today; the fold is kept so that if a second
 * workflow ever declares one, the two are compared rather than assumed equal.
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

/** The run-step env key carrying the cell's job budget down to `bench-suite`. */
export const CELL_BUDGET_ENV_KEY = "BENCH_CELL_BUDGET_MINUTES";

/**
 * Invariant 5 (second half): the budget the cell's run step advertises equals the job's real
 * `timeout-minutes`.
 *
 * `bench-suite` refuses a `--max-concurrency` cap whose serial waves cannot fit the cell's budget —
 * the check that keeps a capped fan-out from being cancelled mid-flight with all R shards lost. It
 * learns that budget from this env key, because `timeout-minutes` is not readable from an expression
 * context, so the value is a hand-copied literal. Copied literals drift: raising the job timeout
 * without raising the env would keep rejecting caps that now fit, and lowering it without lowering the
 * env would wave through caps that no longer do — the exact failure the guard exists to prevent,
 * re-entered through its own configuration. Assert them equal.
 */
export function checkCellBudgetEnv(
	env: Record<string, string>,
	timeoutMinutes: number,
	workflow: string,
): string[] {
	const raw = env[CELL_BUDGET_ENV_KEY];
	if (raw === undefined) {
		return [
			`${workflow}: run step must set ${CELL_BUDGET_ENV_KEY} so bench-suite can reject a ` +
				`--max-concurrency cap that cannot fit the job's ${timeoutMinutes}-minute budget`,
		];
	}
	if (Number(raw) !== timeoutMinutes) {
		return [
			`${workflow}: ${CELL_BUDGET_ENV_KEY} is "${raw}" but the job's timeout-minutes is ` +
				`${timeoutMinutes} — the cell would size its fan-out against a budget it does not have`,
		];
	}
	return [];
}

/**
 * The whole gate against the real workflow files under `root` — the single owner of which files feed
 * the gate, used by the real-file test in workflow-registry-sync.test.ts.
 */
export function runCheck(root: string = findRepoRoot()): string[] {
	const smoke = readWorkflow(SMOKE_WORKFLOW, root);
	const matrix = readWorkflow(MATRIX_WORKFLOW, root);
	// Both lanes' credential block + live-run timeout live in the one reusable bench-suite.yml they
	// call, so Invariants 3–5 read that file — and Invariant 3b (checkLaneDelegates) is what keeps that
	// true by rejecting a lane that grows a cell of its own again.
	const suiteWf = readWorkflow(SUITE_WORKFLOW, root);
	// Read once and share: the suite run step's env feeds both the credential gate and the cell-budget
	// gate, and its job timeout feeds both the margin gate and that same budget gate.
	const suiteEnv = stepEnv(suiteWf, SUITE_JOB, RUN_STEP, SUITE_WORKFLOW);
	const suiteTimeout = jobTimeoutMinutes(suiteWf, SUITE_JOB, SUITE_WORKFLOW);
	const credentialKeys = [...requiredCredentialKeys().keys()];
	return [
		...checkProviderInput(dispatchInput(smoke, "provider", SMOKE_WORKFLOW)),
		...checkSuiteInput(dispatchInput(smoke, "suite", SMOKE_WORKFLOW)),
		...checkCredentialEnv({ [SUITE_WORKFLOW]: suiteEnv }),
		// The credential keys are what make Invariant 3b more than a step-name match: a lane that hangs
		// any of them off a job- or step-level env is building a cell, whatever it calls the step.
		...checkLaneDelegates(smoke, SMOKE_WORKFLOW, credentialKeys),
		...checkLaneDelegates(matrix, MATRIX_WORKFLOW, credentialKeys),
		...checkWorkflowTimeouts({ [SUITE_WORKFLOW]: suiteTimeout }),
		...checkCellBudgetEnv(suiteEnv, suiteTimeout, SUITE_WORKFLOW),
		// Both lanes are held to one caller shape, and each states BOTH flags: the matrix owns the
		// publish dependency and must not require a provider; the smoke is the mirror image. Spelling
		// out both at each lane is what makes this the complete, declared list of permitted differences
		// rather than a default someone can drift past.
		...checkSuiteMatrixCaller(matrixSuiteCaller(matrix, MATRIX_WORKFLOW), MATRIX_WORKFLOW, {
			requirePublishNeeds: true,
			requireProviderAssertion: false,
		}),
		...checkSuiteMatrixCaller(matrixSuiteCaller(smoke, SMOKE_WORKFLOW), SMOKE_WORKFLOW, {
			requirePublishNeeds: false,
			requireProviderAssertion: true,
		}),
		...checkSmokeSingleSandboxDefault(smoke, SMOKE_WORKFLOW),
		...checkSuiteWorkflowNesting(suiteWf, SUITE_WORKFLOW),
	];
}
