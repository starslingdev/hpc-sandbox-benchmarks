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
//   6. bench-matrix.yml has exactly one suite-matrix caller of the reusable bench-suite.yml, wired for
//      GitHub-native nesting: `name: ${{ matrix.suite }}`, `with.suite: ${{ matrix.suite }}`, and
//      `strategy.matrix.suite: ${{ fromJSON(needs.plan.outputs.suites) }}`, with `publish` needing that
//      caller. The suite axis itself comes from `plan-suites` (SUITE_NAMES, honoring the `suites`
//      input), so adding a suite is a schema change — this invariant keeps the nesting wiring from
//      drifting.
//
// Bun.YAML.parse is built into bun >= 1.3 (no new dependency), so the parse stays dependency-light.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROVIDERS, SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { findRepoRoot } from "./workspace.ts";

export const SMOKE_WORKFLOW = ".github/workflows/bench-smoke.yml";
export const MATRIX_WORKFLOW = ".github/workflows/bench-matrix.yml";
/** The reusable workflow each bench-matrix suite job calls; it owns the credential block + run timeout. */
export const SUITE_WORKFLOW = ".github/workflows/bench-suite.yml";
/** The step (in bench-smoke.yml and bench-suite.yml) that drives the provider SDK; it owns the env. */
export const RUN_STEP = "Run suite and normalize";
export const SMOKE_JOB = "smoke";
/** The fan-out job inside the reusable bench-suite.yml (its credential env + timeout). */
export const SUITE_JOB = "bench";
/** A bench-matrix suite job is one that `uses` this reusable workflow (matched by path suffix). */
const SUITE_WORKFLOW_USES_SUFFIX = "/bench-suite.yml";
/** Host-side checkout/teardown/normalization/upload allowance beyond the sandbox lifetime. */
export const WORKFLOW_TIMEOUT_MARGIN_MINUTES = 15;

// Single source of truth: this schema drives BOTH the runtime parse (coercions live in the morphs)
// and the exported DispatchInput type (inferred below) — there is no hand-written interface or
// typeof-narrowing that could drift from the parse. onUndeclaredKey("delete") drops the fields the
// gate ignores (description/required/…) so the parsed value is exactly what gets compared.
const dispatchInputSchema = type({
	// Only `type: choice` makes GitHub enforce `options`. A non-string (malformed YAML) coerces to
	// undefined so the invariant check reports it, rather than the parse throwing.
	"type?": type("unknown").pipe((v) => (typeof v === "string" ? v : undefined)),
	"default?": type("unknown").pipe((v) => (typeof v === "string" ? v : undefined)),
	// A YAML option list may carry non-string scalars; coerce each. A non-list value is rejected.
	"options?": type("unknown[]").pipe((arr) => arr.map((o) => String(o))),
}).onUndeclaredKey("delete");

/** A single `workflow_dispatch` input, narrowed to the fields the gate compares — inferred from
 *  {@link dispatchInputSchema} so the type and the parser can never disagree. */
export type DispatchInput = typeof dispatchInputSchema.infer;

// The workflow envelope down to the dynamic `inputs` map: validated once, with inference, so the
// navigation is type-safe end to end instead of a hand-rolled chain of object guards. (Bun.YAML keeps
// the GHA `on:` key as the string "on", so the YAML 1.1 boolean gotcha does not bite here.)
const workflowEnvelope = type({
	on: { workflow_dispatch: { inputs: { "[string]": "unknown" } } },
});

/** Parse a workflow YAML file under `root` (Bun.YAML — built-in, no dependency). */
export function readWorkflow(relPath: string, root: string = findRepoRoot()): unknown {
	return Bun.YAML.parse(readFileSync(join(root, relPath), "utf8"));
}

/**
 * The `on.workflow_dispatch.inputs.<name>` entry, parsed to its {@link DispatchInput}. Throws if the
 * envelope is malformed or the named input is missing — a renamed/removed input must fail the gate
 * loudly, not pass vacuously.
 */
export function dispatchInput(doc: unknown, name: string, label: string): DispatchInput {
	const envelope = workflowEnvelope(doc);
	if (envelope instanceof type.errors) {
		throw new Error(`${label}: ${envelope.summary}`);
	}
	const raw = envelope.on.workflow_dispatch.inputs[name];
	if (raw === undefined) {
		throw new Error(`${label}: workflow_dispatch input "${name}" not found`);
	}
	const input = dispatchInputSchema(raw);
	if (input instanceof type.errors) {
		throw new Error(`${label}: workflow_dispatch input "${name}" is malformed — ${input.summary}`);
	}
	return input;
}

/**
 * Assert `value` is a non-null, non-array object, or throw `message`. A lazy per-node guard for the
 * {@link stepEnv} navigation below: unlike the fixed `on.workflow_dispatch` path (an arktype envelope),
 * step-env walks to one *named* job/step, so validating the whole `jobs` map with a schema would
 * over-reject sibling jobs the gate doesn't care about.
 */
function asRecord(value: unknown, message: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(message);
	}
	return value as Record<string, unknown>;
}

/** Parse a job's literal positive integer `timeout-minutes`; expressions cannot satisfy this gate. */
export function jobTimeoutMinutes(doc: unknown, jobId: string, label: string): number {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const job = asRecord(jobs[jobId], `${label}: job "${jobId}" not found`);
	const timeout = job["timeout-minutes"];
	if (typeof timeout !== "number" || !Number.isInteger(timeout) || timeout <= 0) {
		throw new Error(`${label}: job "${jobId}" timeout-minutes must be a positive integer literal`);
	}
	return timeout;
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

/**
 * The single bench-matrix suite-matrix caller: the job that `uses` the reusable bench-suite.yml and
 * expands `strategy.matrix.suite` from the plan's suite axis. Native nesting depends on
 * `name` / `with.suite` both resolving to `matrix.suite`.
 */
export interface SuiteMatrixCaller {
	jobId: string;
	name: string;
	suiteInput: string;
	matrixSuiteExpr: string;
	/** Job ids listed in `publish.needs` (empty when publish is missing or has no needs list). */
	publishNeeds: string[];
}

/** The expression the suite-matrix job must use for its suite axis (plan output → fromJSON). */
// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
export const EXPECTED_SUITE_MATRIX_EXPR = "${{ fromJSON(needs.plan.outputs.suites) }}";
/** The expression that makes each caller cell's display name the suite id (native nesting parent). */
// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
export const EXPECTED_SUITE_NAME_EXPR = "${{ matrix.suite }}";

/**
 * The bench-matrix suite-matrix caller — exactly one job whose `uses` targets the reusable
 * bench-suite.yml, with its nesting wiring extracted. Zero or multiple callers throw (Invariant 6
 * must fail loudly, not pick one). Jobs that don't call the reusable (plan, publish) are ignored
 * except that `publish.needs` is captured for the dependency check.
 */
export function matrixSuiteCaller(
	doc: unknown,
	label: string = MATRIX_WORKFLOW,
): SuiteMatrixCaller {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const callers: Array<Omit<SuiteMatrixCaller, "publishNeeds">> = [];
	for (const [jobId, rawJob] of Object.entries(jobs)) {
		const job = asRecord(rawJob, `${label}: job "${jobId}" is not a mapping`);
		const uses = job.uses;
		if (typeof uses !== "string" || !uses.endsWith(SUITE_WORKFLOW_USES_SUFFIX)) continue;
		const withMap = asRecord(
			job.with,
			`${label}: job "${jobId}" calls ${uses} without a "with" mapping`,
		);
		const suiteInput = withMap.suite;
		if (typeof suiteInput !== "string") {
			throw new Error(`${label}: job "${jobId}" calls ${uses} without a string "suite" input`);
		}
		const name = typeof job.name === "string" ? job.name : "";
		const strategy = asRecord(
			job.strategy,
			`${label}: job "${jobId}" calls ${uses} without a "strategy" mapping`,
		);
		const matrix = asRecord(
			strategy.matrix,
			`${label}: job "${jobId}" calls ${uses} without a "strategy.matrix" mapping`,
		);
		const matrixSuiteExpr = matrix.suite;
		if (typeof matrixSuiteExpr !== "string") {
			throw new Error(
				`${label}: job "${jobId}" calls ${uses} without a string "strategy.matrix.suite" axis`,
			);
		}
		callers.push({ jobId, name, suiteInput, matrixSuiteExpr });
	}
	if (callers.length === 0) {
		throw new Error(
			`${label}: no job calls the reusable bench-suite.yml — the suite-matrix caller is missing`,
		);
	}
	if (callers.length > 1) {
		throw new Error(
			`${label}: expected exactly one suite-matrix caller of bench-suite.yml, found ` +
				`${callers.length} (${callers.map((c) => c.jobId).join(", ")})`,
		);
	}
	// biome-ignore lint/style/noNonNullAssertion: length checked above.
	const caller = callers[0]!;
	const publish = jobs.publish;
	let publishNeeds: string[] = [];
	if (publish !== undefined) {
		const publishJob = asRecord(publish, `${label}: job "publish" is not a mapping`);
		const needs = publishJob.needs;
		if (Array.isArray(needs)) {
			publishNeeds = needs.map((n) => String(n));
		} else if (typeof needs === "string") {
			publishNeeds = [needs];
		}
	}
	return { ...caller, publishNeeds };
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
 * Invariant 6: the bench-matrix suite-matrix caller is wired for GitHub-native nesting and depends on
 * the plan's suite axis — display name and `with.suite` are `${{ matrix.suite }}`, the matrix axis is
 * `fromJSON(needs.plan.outputs.suites)`, and `publish` needs the caller job. `label` names the
 * workflow in error messages.
 */
export function checkSuiteMatrixCaller(
	caller: SuiteMatrixCaller,
	label: string = MATRIX_WORKFLOW,
): string[] {
	const errors: string[] = [];
	if (caller.name !== EXPECTED_SUITE_NAME_EXPR) {
		errors.push(
			`${label}: job "${caller.jobId}" name must be "${EXPECTED_SUITE_NAME_EXPR}" for native ` +
				`suite nesting in the Actions UI (got ${caller.name ? `"${caller.name}"` : "no name"})`,
		);
	}
	if (caller.suiteInput !== EXPECTED_SUITE_NAME_EXPR) {
		errors.push(
			`${label}: job "${caller.jobId}" with.suite must be "${EXPECTED_SUITE_NAME_EXPR}" so each ` +
				`matrix cell dispatches its own suite (got "${caller.suiteInput}")`,
		);
	}
	if (caller.matrixSuiteExpr !== EXPECTED_SUITE_MATRIX_EXPR) {
		errors.push(
			`${label}: job "${caller.jobId}" strategy.matrix.suite must be "${EXPECTED_SUITE_MATRIX_EXPR}" ` +
				`so the suite axis stays registry-driven via plan.outputs.suites (got "${caller.matrixSuiteExpr}")`,
		);
	}
	if (!caller.publishNeeds.includes(caller.jobId)) {
		errors.push(
			`${label}: job "publish" must need "${caller.jobId}" so aggregation waits for every suite ` +
				`matrix cell (publish.needs=${JSON.stringify(caller.publishNeeds)})`,
		);
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
	];
}
