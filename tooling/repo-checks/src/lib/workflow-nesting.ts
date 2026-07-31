// Invariant 6: GitHub-native suite→provider nesting wiring for bench-matrix.yml + bench-suite.yml.
// Kept out of workflow-sync.ts so credential/timeout gates and nesting gates don't grow as one file.
import {
	asRecord,
	MATRIX_WORKFLOW,
	RUN_STEP,
	SUITE_JOB,
	SUITE_WORKFLOW,
	stepByName,
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
	/** The `with.replicates` expression — this suite's slice of the plan's per-suite map. */
	replicatesInput: string;
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
/** The expression that makes each reusable fan-out cell's display name the provider id (the nesting
 *  child): "<suite> / <provider>". There is no replicate suffix — one cell owns all R replicate
 *  sandboxes of its (suite, provider), driven concurrently from the single runner. */
// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
export const EXPECTED_PROVIDER_NAME_EXPR = "${{ matrix.provider }}";

/** The run-step env key that hands the cell its replicate index array. */
export const REPLICATES_ENV_KEY = "BENCH_REPLICATES";
/** The expression that key must carry: the reusable's own `replicates` input, verbatim. */
// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
export const EXPECTED_REPLICATES_ENV_EXPR = "${{ inputs.replicates }}";
/** The argument the run step must pass, so the env value is actually CONSUMED. Setting the env
 *  without passing the flag leaves bench-suite on its single-sandbox default — a green matrix run
 *  publishing R=1 — which is precisely what this invariant exists to prevent. */
export const EXPECTED_REPLICATES_ARG = `--replicates "$${REPLICATES_ENV_KEY}"`;
/** The expression the suite-matrix caller must hand down as `with.replicates`: this suite's slice of
 *  the plan's per-suite map. Pinned because a hardcoded array here (`'[0]'`) would pass every other
 *  nesting check while quietly running one sandbox per cell — the same R=1 outcome the callee-side
 *  checks guard, entered from the caller instead. */
export const EXPECTED_REPLICATES_INPUT_EXPR =
	// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
	"${{ toJSON(fromJSON(needs.plan.outputs.replicates)[matrix.suite]) }}";

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
		const replicatesInput = withMap.replicates;
		if (typeof replicatesInput !== "string") {
			throw new Error(`${label}: job "${jobId}" calls ${uses} without a string "replicates" input`);
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
		callers.push({ jobId, name, suiteInput, replicatesInput, matrixSuiteExpr });
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
	if (caller.replicatesInput !== EXPECTED_REPLICATES_INPUT_EXPR) {
		errors.push(
			`${label}: job "${caller.jobId}" with.replicates must be "${EXPECTED_REPLICATES_INPUT_EXPR}" ` +
				`so each cell receives its own suite's replicate axis from the plan — a literal or a ` +
				`different suite's slice silently changes how many sandboxes the run measures ` +
				`(got "${caller.replicatesInput}")`,
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
 * nested Actions UI cells read as "<suite> / <provider>", AND the replicate axis reaches the cell as
 * data rather than as a matrix axis.
 *
 * The replicate check is the load-bearing half. The `replicates` input used to be consumed by
 * `strategy.matrix.replicate`, so forgetting to wire it was impossible — the fan-out simply had no
 * cells. Now the array is handed to one cell through the run step's environment, and a dropped or
 * misspelled `BENCH_REPLICATES` would leave `bench-suite` on its single-sandbox default: a green
 * matrix run that quietly published R=1 for every provider, with the dataset's between-machine
 * intervals silently collapsing to within-machine ones. Assert both that the axis is gone from the
 * matrix (so R runners are not re-introduced by accident) and that the input reaches the cell.
 */
export function checkSuiteWorkflowNesting(doc: unknown, label: string = SUITE_WORKFLOW): string[] {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const job = jobs[SUITE_JOB];
	if (job === undefined) {
		return [`${label}: job "${SUITE_JOB}" is missing — the provider fan-out job is required`];
	}
	const bench = asRecord(job, `${label}: job "${SUITE_JOB}" is not a mapping`);
	const errors: string[] = [];

	const name = typeof bench.name === "string" ? bench.name : "";
	if (name !== EXPECTED_PROVIDER_NAME_EXPR) {
		errors.push(
			`${label}: job "${SUITE_JOB}" name must be "${EXPECTED_PROVIDER_NAME_EXPR}" for native ` +
				`provider nesting under each suite (got ${name ? `"${name}"` : "no name"})`,
		);
	}

	// A `replicate` matrix axis would restore one idle runner per replicate — the cost this fan-out
	// was moved in-process to remove. `?? {}` reads an absent strategy/matrix as "no axis"; a present
	// but malformed one still throws, matching how the rest of this module navigates.
	const strategy = asRecord(
		bench.strategy ?? {},
		`${label}: job "${SUITE_JOB}" strategy is not a mapping`,
	);
	const matrix = asRecord(
		strategy.matrix ?? {},
		`${label}: job "${SUITE_JOB}" strategy.matrix is not a mapping`,
	);
	if (matrix.replicate !== undefined) {
		errors.push(
			`${label}: job "${SUITE_JOB}" must not have a "replicate" matrix axis — the cell drives ` +
				`every replicate itself (bench-suite --replicates), so an axis here bills one idle ` +
				`runner per replicate for no extra throughput`,
		);
	}

	// Both remaining checks read the SAME step, so locate it once. `?? {}` again: a missing step or
	// env block is drift this gate reports, not a parse error — the two checks below name it.
	const step = stepByName(bench, RUN_STEP, label);
	const env = asRecord(
		step?.env ?? {},
		`${label}: job "${SUITE_JOB}" step "${RUN_STEP}" env is not a mapping`,
	);

	// ...the array must actually reach it, or the cell silently falls back to a single sandbox...
	const rawEnv = env[REPLICATES_ENV_KEY];
	const replicatesEnv = typeof rawEnv === "string" ? rawEnv : undefined;
	if (replicatesEnv !== EXPECTED_REPLICATES_ENV_EXPR) {
		errors.push(
			`${label}: job "${SUITE_JOB}" step "${RUN_STEP}" must set ${REPLICATES_ENV_KEY}: ` +
				`"${EXPECTED_REPLICATES_ENV_EXPR}" so the cell fans out over the plan's replicate axis ` +
				`(got ${replicatesEnv === undefined ? "no such env key" : `"${replicatesEnv}"`})`,
		);
	}

	// ...AND the command must consume it. Checking only the env block left the invariant bypassable by
	// its own stated failure mode: dropping the flag from the `run:` line keeps the env key present, so
	// the gate stayed green while bench-suite took its single-sandbox default and the legacy
	// `<runId>.json` glob in commit-dataset.yml collected the lone shard without complaint — a matrix
	// run that publishes R=1 with the dataset's between-machine intervals collapsed to within-machine
	// ones. A substring match is enough and matches how the rest of this module pins expressions.
	const runCommand = typeof step?.run === "string" ? step.run : undefined;
	if (runCommand === undefined || !runCommand.includes(EXPECTED_REPLICATES_ARG)) {
		errors.push(
			`${label}: job "${SUITE_JOB}" step "${RUN_STEP}" must pass ${EXPECTED_REPLICATES_ARG} to ` +
				`bench-suite — setting ${REPLICATES_ENV_KEY} without consuming it silently runs ONE sandbox ` +
				`per cell (got ${runCommand === undefined ? "no run: command" : `"${runCommand.trim()}"`})`,
		);
	}

	return errors;
}
