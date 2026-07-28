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
//   7. Every provider's requiredEnvVars is present in the credential env of BOTH credentialed jobs of
//      the toolchain release lane (toolchain-image.yml's `bake` cell and `publish` promote step), or the
//      provider is explicitly declared in {@link RELEASE_LANE_EXEMPT}. Invariant 3 covers only the two
//      bench lanes, so before this a new provider could be fully wired for benchmarking and still be a
//      silent missing-credentials skip through bake and promote — its toolchain artifact never built and
//      never validated, with a green release. That is the one gap this gate did not close.
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
	BAKE_JOB,
	BAKE_STEP,
	dispatchInput,
	jobTimeoutMinutes,
	MATRIX_WORKFLOW,
	PROMOTE_STEP,
	PUBLISH_JOB,
	RELEASE_WORKFLOW,
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
	BAKE_JOB,
	BAKE_STEP,
	dispatchInput,
	jobTimeoutMinutes,
	MATRIX_WORKFLOW,
	PROMOTE_STEP,
	PUBLISH_JOB,
	RELEASE_WORKFLOW,
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

/**
 * Providers deliberately NOT wired into the toolchain release lane, each with the reason — the explicit
 * escape hatch for Invariant 7. A provider belongs here only when the release lane has nothing to do
 * with it: it bakes no artifact AND its boot proves nothing the lane needs.
 *
 * Note that "bakes no artifact" alone is NOT sufficient: `namespace` and both `modal` variants also bake
 * nothing (they boot the toolchain image directly), yet all three are wired, because the bake cell's
 * validate boot and promote's re-validation are what prove the published image is actually reachable and
 * runnable on that provider. `blaxel` is the sole exemption because it boots a stock VENDOR base image
 * instead of the toolchain image, so booting it during a release would validate nothing about the bytes
 * being released.
 *
 * Keyed by provider id — typed as a plain string record so a test can inject a synthetic list, and
 * validated against the registry by {@link checkReleaseLaneExemptions} instead, so a typo'd or removed
 * id can't sit here silently exempting nothing.
 */
export const RELEASE_LANE_EXEMPT: Readonly<Record<string, string>> = Object.freeze({
	blaxel:
		"boots a stock vendor base image, not the toolchain image — it bakes no candidate artifact and " +
		"booting it would validate nothing about the bytes being released, so the release lane leaves it " +
		"unwired and its bake cell takes the missing-credentials skip",
});

/** Every exemption key names a registered provider (no stale/typo'd exemptions). `exempt` is injectable
 *  so the failure message is unit-testable without mutating the real declaration. */
export function checkReleaseLaneExemptions(
	exempt: Readonly<Record<string, string>> = RELEASE_LANE_EXEMPT,
): string[] {
	const registered = new Set(providerIds());
	return Object.keys(exempt)
		.filter((id) => !registered.has(id))
		.map(
			(id) =>
				`RELEASE_LANE_EXEMPT names "${id}", which is not in PROVIDERS ` +
				`(packages/schema/src/providers.ts) — drop the stale exemption or fix the id`,
		);
}

/**
 * Invariant 7: every provider requiredEnvVar is present in the credential env of BOTH credentialed
 * release-lane jobs, unless every provider that owns the key is declared in {@link RELEASE_LANE_EXEMPT}.
 *
 * Presence only — deliberately NOT the cross-lane value-expression equality of Invariant 4. The two
 * release jobs legitimately scope credentials differently: `bake` is a per-provider fan-out and guards
 * each secret on `matrix.provider` like the bench lanes, while `publish` is a serial transaction over
 * every provider and so passes them unconditionally. Requiring one expression across both would demand
 * they be wrong somewhere.
 *
 * `envByStep` keys are human labels (workflow + job) so an error names the file AND which of its two
 * blocks drifted. `exempt` is injectable for the same reason as {@link checkReleaseLaneExemptions}.
 */
export function checkReleaseCredentialEnv(
	envByStep: Record<string, Record<string, string>>,
	exempt: Readonly<Record<string, string>> = RELEASE_LANE_EXEMPT,
): string[] {
	const errors: string[] = [];
	const steps = Object.keys(envByStep);
	for (const [key, owners] of requiredCredentialKeys()) {
		// biome-ignore lint/style/noNonNullAssertion: keys come from Object.keys(envByStep).
		const present = steps.filter((step) => key in envByStep[step]!);
		// A key is exempt only when EVERY provider needing it is exempt: a key shared by an exempt and a
		// wired provider is still required (the wired one needs it), so partial exemption never excuses it.
		if (owners.every((id) => id in exempt)) {
			// The exemption claims the lane doesn't wire this. If it does, the declaration is a false
			// comment the next reader will trust — fail so the entry is dropped along with the wire-up.
			if (present.length > 0) {
				errors.push(
					`${key}: provider ${owners.join(", ")} is declared RELEASE_LANE_EXEMPT ("deliberately ` +
						`not wired into the release lane") but ${key} IS wired into ${present.join(" and ")} — ` +
						"the wiring and the exemption disagree; remove the RELEASE_LANE_EXEMPT entry",
				);
			}
			continue;
		}
		// biome-ignore lint/style/noNonNullAssertion: keys come from Object.keys(envByStep).
		const missing = steps.filter((step) => !(key in envByStep[step]!));
		if (missing.length > 0) {
			errors.push(
				`${key}: required by provider ${owners.join(", ")} (packages/schema/src/providers.ts ` +
					`requiredEnvVars) but missing from the credential env of ${missing.join(" and ")} — the ` +
					"release lane would record it as a missing-credentials skip, so its toolchain artifact is " +
					"never baked or validated while the release still goes green. Wire the secret, or add the " +
					"provider to RELEASE_LANE_EXEMPT with the reason it needs no release-lane boot.",
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
	// The release lane's two credentialed jobs each own their own credential block (see Invariant 7).
	const release = readWorkflow(RELEASE_WORKFLOW, root);
	const bakeLabel = `${RELEASE_WORKFLOW} (${BAKE_JOB})`;
	const promoteLabel = `${RELEASE_WORKFLOW} (${PUBLISH_JOB})`;
	return [
		...checkProviderInput(dispatchInput(smoke, "provider", SMOKE_WORKFLOW)),
		...checkSuiteInput(dispatchInput(smoke, "suite", SMOKE_WORKFLOW)),
		...checkCredentialEnv({
			[SMOKE_WORKFLOW]: stepEnv(smoke, SMOKE_JOB, RUN_STEP, SMOKE_WORKFLOW),
			[SUITE_WORKFLOW]: stepEnv(suiteWf, SUITE_JOB, RUN_STEP, SUITE_WORKFLOW),
		}),
		...checkReleaseLaneExemptions(),
		...checkReleaseCredentialEnv({
			[bakeLabel]: stepEnv(release, BAKE_JOB, BAKE_STEP, bakeLabel),
			[promoteLabel]: stepEnv(release, PUBLISH_JOB, PROMOTE_STEP, promoteLabel),
		}),
		...checkWorkflowTimeouts({
			[SMOKE_WORKFLOW]: jobTimeoutMinutes(smoke, SMOKE_JOB, SMOKE_WORKFLOW),
			[SUITE_WORKFLOW]: jobTimeoutMinutes(suiteWf, SUITE_JOB, SUITE_WORKFLOW),
		}),
		...checkSuiteMatrixCaller(matrixSuiteCaller(matrix, MATRIX_WORKFLOW), MATRIX_WORKFLOW),
		...checkSuiteWorkflowNesting(suiteWf, SUITE_WORKFLOW),
	];
}
