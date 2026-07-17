// Invariant 6: GitHub-native suite→provider nesting wiring for bench-matrix.yml + bench-suite.yml.
// Kept out of workflow-sync.ts so credential/timeout gates and nesting gates don't grow as one file.
import {
	asRecord,
	MATRIX_WORKFLOW,
	SUITE_JOB,
	SUITE_WORKFLOW,
} from "./workflow-yaml.ts";

/** A bench-matrix suite job is one that `uses` this reusable workflow (matched by path suffix). */
const SUITE_WORKFLOW_USES_SUFFIX = "/bench-suite.yml";

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
/** The expression that makes each reusable fan-out cell's display name the provider id (nesting child). */
// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
export const EXPECTED_PROVIDER_NAME_EXPR = "${{ matrix.provider }}";

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

/**
 * Invariant 6 (callee half): the reusable bench-suite fan-out job display name is the provider id so
 * nested Actions UI cells read as "<suite> / <provider>".
 */
export function checkSuiteWorkflowNesting(doc: unknown, label: string = SUITE_WORKFLOW): string[] {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const job = jobs[SUITE_JOB];
	if (job === undefined) {
		return [`${label}: job "${SUITE_JOB}" is missing — the provider fan-out job is required`];
	}
	const bench = asRecord(job, `${label}: job "${SUITE_JOB}" is not a mapping`);
	const name = typeof bench.name === "string" ? bench.name : "";
	if (name !== EXPECTED_PROVIDER_NAME_EXPR) {
		return [
			`${label}: job "${SUITE_JOB}" name must be "${EXPECTED_PROVIDER_NAME_EXPR}" for native ` +
				`provider nesting under each suite (got ${name ? `"${name}"` : "no name"})`,
		];
	}
	return [];
}
