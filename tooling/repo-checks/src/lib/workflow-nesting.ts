// Invariant 6: GitHub-native suite→provider nesting wiring for the two dispatch lanes
// (bench-matrix.yml, bench-smoke.yml) + the reusable bench-suite.yml they share. Kept out of
// workflow-sync.ts so credential/timeout gates and nesting gates don't grow as one file.
import {
	asRecord,
	flattenSteps,
	RUN_STEP,
	SUITE_JOB,
	SUITE_WORKFLOW,
	stepByName,
} from "./workflow-yaml.ts";

/** A suite-matrix job is one that `uses` this reusable workflow (matched by path suffix). */
const SUITE_WORKFLOW_USES_SUFFIX = "/bench-suite.yml";

/**
 * The single suite-matrix caller of a dispatch lane: the job that `uses` the reusable bench-suite.yml
 * and expands `strategy.matrix.suite` from the plan's suite axis. Native nesting depends on
 * `name` / `with.suite` both resolving to `matrix.suite`. Both lanes have exactly one — bench-matrix
 * over every planned suite, bench-smoke over the single dispatched one — and they are held to the same
 * wiring so the smoke lane cannot quietly become a different pipeline.
 */
export interface SuiteMatrixCaller {
	jobId: string;
	name: string;
	suiteInput: string;
	/** The `with.replicates` expression — this suite's slice of the plan's per-suite map. */
	replicatesInput: string;
	/** The `with.require_providers` expression, or undefined when the caller omits it (the matrix
	 *  lane's graceful default: a provider with no credential skips rather than sinking the run). */
	requireProvidersInput?: string;
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
/** The expression bench-smoke's caller must hand down as `with.require_providers`: the dispatched
 *  provider. Pinned because the whole point of a smoke run is to prove ONE lane end to end — without
 *  it a missing or misnamed credential is recorded as a skip and the job still exits 0 having
 *  benchmarked nothing, which is a green run that hides the provider never being smoked. Everything
 *  else about the two lanes is now literally the same file, so this is the one behavioural difference
 *  a gate still has to hold in place. */
// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
export const EXPECTED_REQUIRE_PROVIDERS_INPUT_EXPR = "${{ inputs.provider }}";

/**
 * A dispatch lane's suite-matrix caller — exactly one job whose `uses` targets the reusable
 * bench-suite.yml, with its nesting wiring extracted. Zero or multiple callers throw (Invariant 6
 * must fail loudly, not pick one). Jobs that don't call the reusable (plan, publish) are ignored
 * except that `publish.needs` is captured for the dependency check. Used for both bench-matrix.yml
 * and bench-smoke.yml; `label` names the lane in error messages.
 */
export function matrixSuiteCaller(doc: unknown, label: string): SuiteMatrixCaller {
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
		// Optional by design: absent IS the matrix lane's posture (no provider is required, so a
		// credential-less cell skips). A present non-string value is malformed YAML and must not read
		// as absent: GitHub coerces it into a real workflow input, bypassing the matrix lane's absence
		// assertion below.
		if ("require_providers" in withMap && typeof withMap.require_providers !== "string") {
			throw new Error(
				`${label}: job "${jobId}" calls ${uses} with a non-string "require_providers" input`,
			);
		}
		const requireProvidersInput =
			typeof withMap.require_providers === "string" ? withMap.require_providers : undefined;
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
		callers.push({
			jobId,
			name,
			suiteInput,
			replicatesInput,
			...(requireProvidersInput !== undefined ? { requireProvidersInput } : {}),
			matrixSuiteExpr,
		});
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
 * The two ways the dispatch lanes are ALLOWED to differ, declared per lane. Both fields are required
 * on purpose: a partial object would replace a defaulted one wholesale, so `{ requireProviderAssertion:
 * true }` would silently read as `requirePublishNeeds: undefined` and switch off an assertion the
 * caller never meant to waive. Making every call site state both flags means the complete list of
 * permitted differences is written out at each lane, which is the point of the invariant.
 */
export interface SuiteMatrixCallerOptions {
	/**
	 * Require a `publish` job that needs the caller. True for bench-matrix.yml, where aggregation must
	 * wait for every suite matrix cell. FALSE for bench-smoke.yml, which deliberately has no publish
	 * phase at all — that missing third phase is the entire difference between the lanes, so demanding
	 * it there would be demanding the smoke commit a dataset.
	 */
	requirePublishNeeds: boolean;
	/**
	 * Require `with.require_providers` to be {@link EXPECTED_REQUIRE_PROVIDERS_INPUT_EXPR}. True for
	 * bench-smoke.yml (a smoke must fail when its dispatched provider never ran). When false the input
	 * must be ABSENT, not merely different: the matrix's lenient posture is a property worth pinning,
	 * since a stray value there would fail every cell whose provider it names.
	 */
	requireProviderAssertion: boolean;
}

/**
 * Invariant 6: a dispatch lane's suite-matrix caller is wired for GitHub-native nesting and depends on
 * the plan's suite axis — display name and `with.suite` are `${{ matrix.suite }}`, `with.replicates` is
 * the plan's per-suite slice, and the matrix axis is `fromJSON(needs.plan.outputs.suites)`. The two
 * per-lane differences are declared explicitly via {@link SuiteMatrixCallerOptions}. `label` names the
 * workflow in error messages and is required — with two lanes sharing this check, a defaulted label
 * would misattribute the smoke lane's drift to bench-matrix.yml.
 */
export function checkSuiteMatrixCaller(
	caller: SuiteMatrixCaller,
	label: string,
	options: SuiteMatrixCallerOptions,
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
	if (options.requirePublishNeeds && !caller.publishNeeds.includes(caller.jobId)) {
		errors.push(
			`${label}: job "publish" must need "${caller.jobId}" so aggregation waits for every suite ` +
				`matrix cell (publish.needs=${JSON.stringify(caller.publishNeeds)})`,
		);
	}
	if (options.requireProviderAssertion) {
		if (caller.requireProvidersInput !== EXPECTED_REQUIRE_PROVIDERS_INPUT_EXPR) {
			errors.push(
				`${label}: job "${caller.jobId}" with.require_providers must be ` +
					`"${EXPECTED_REQUIRE_PROVIDERS_INPUT_EXPR}" so a missing or misnamed credential fails the ` +
					`run instead of being recorded as a skip on a job that still exits 0 (got ` +
					`${caller.requireProvidersInput === undefined ? "no such input" : `"${caller.requireProvidersInput}"`})`,
			);
		}
	} else if (caller.requireProvidersInput !== undefined) {
		// The lenient posture is a property too. A value here fails every cell whose provider it names —
		// loudly, but across a whole matrix run's worth of provider quota before anyone reads the error.
		errors.push(
			`${label}: job "${caller.jobId}" must not pass with.require_providers (got ` +
				`"${caller.requireProvidersInput}") — this lane's posture is that a provider with no ` +
				`credential SKIPS, so one unauthenticated cell cannot sink the run`,
		);
	}
	return errors;
}

/** The bin a benchmark cell runs. A lane job whose `run:` mentions it is driving sandboxes itself,
 *  whatever the step is called. */
const CELL_DRIVER_BIN = "bench-suite.ts";

/** The step in a lane's `plan` job that resolves the axes (the shared plan-bench-axes action). */
export const PLAN_STEP = "Plan";
/** The expression bench-smoke's plan step must pass as `with.replicas`.
 *
 *  A smoke is one sandbox, and `default: '1'` alone does NOT guarantee that: a dispatch `default:`
 *  applies only when the field is ABSENT, while both the Actions UI (clear the box) and an API
 *  dispatch can send an empty string. Blank reaches plan-replicates as an unset BENCH_REPLICAS, which
 *  means "each suite's Suite.defaultReplicas" — R=12 on every realworld suite. So the fallback is what
 *  actually holds the property, and it is pinned here rather than left to a comment: losing it turns a
 *  cleared text field into twelve real sandboxes with no error anywhere. */
export const EXPECTED_SMOKE_REPLICAS_INPUT_EXPR =
	// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal matched verbatim against the workflow, not a JS template.
	"${{ inputs.replicas || '1' }}";

/**
 * Invariant 7: a smoke dispatch measures ONE sandbox unless an operator explicitly asks for more —
 * both halves of it, the dispatch `default:` and the blank-value fallback (see
 * {@link EXPECTED_SMOKE_REPLICAS_INPUT_EXPR} for why the default alone is not enough).
 */
export function checkSmokeSingleSandboxDefault(doc: unknown, label: string): string[] {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const plan = jobs.plan;
	if (plan === undefined) {
		return [`${label}: job "plan" is missing — the smoke lane resolves its axes there`];
	}
	const step = stepByName(
		asRecord(plan, `${label}: job "plan" is not a mapping`),
		PLAN_STEP,
		label,
	);
	if (step === undefined) {
		return [`${label}: job "plan" has no step named "${PLAN_STEP}"`];
	}
	const withMap = asRecord(step.with ?? {}, `${label}: step "${PLAN_STEP}" with is not a mapping`);
	const replicas = withMap.replicas;
	if (replicas === EXPECTED_SMOKE_REPLICAS_INPUT_EXPR) return [];
	return [
		`${label}: job "plan" step "${PLAN_STEP}" must pass replicas: ` +
			`"${EXPECTED_SMOKE_REPLICAS_INPUT_EXPR}" so a CLEARED replicas field still means one sandbox ` +
			`(blank falls through to each suite's Suite.defaultReplicas — R=12 on every realworld suite — ` +
			`with no error raised anywhere) (got ` +
			`${replicas === undefined ? "no replicas input" : `"${String(replicas)}"`})`,
	];
}

/** Every `env:` key a job could carry, step-level or job-level, as one flat list. Job-level `env` is
 *  included deliberately: it is inherited by every step, so hanging provider credentials there is a way
 *  to build a cell that no per-step scan would ever see. */
function jobEnvKeys(job: Record<string, unknown>, label: string): string[] {
	const keys: string[] = [];
	const collect = (value: unknown): void => {
		if (value === undefined || value === null) return;
		keys.push(...Object.keys(asRecord(value, `${label}: env is not a mapping`)));
	};
	collect(job.env);
	// Flattened: a credential hung off a step inside a `parallel:` block is exactly the "no per-step
	// scan would ever see it" case this function exists to close, one nesting level deeper.
	for (const step of flattenSteps(job.steps, label)) collect(step.env);
	return keys;
}

/**
 * Invariant 3b (the consolidation invariant): a dispatch lane owns no benchmark cell of its own — it
 * reaches sandboxes only through the reusable bench-suite.yml.
 *
 * bench-smoke.yml used to carry a hand-mirrored copy of the cell: its own checkout, its own Namespace
 * mint, its own per-provider credential block, its own timeout and its own upload. Keeping that copy
 * honest took a cross-lane credential gate (Invariant 4) and still let everything the gate did not
 * compare — the runner routing, the cell budget, the shard-gated upload, the replicate fan-out — drift
 * silently, so a smoke run could pass while exercising a different pipeline than the one it was meant
 * to rehearse. Now both lanes call the reusable, and this rejects the ways back in.
 *
 * THREE probes, because one is not enough. Matching {@link RUN_STEP} by name alone catches the literal
 * copy-paste and nothing else: a re-grown cell under a fresh step name, or provider credentials hung
 * off a job-level `env:`, would both sail through — and those are the shapes someone re-adding a cell
 * by hand actually writes. So also reject a `run:` that invokes the cell driver, and any provider
 * credential appearing anywhere in a lane's env at all. `credentialKeys` is passed in (rather than
 * imported) to keep this module free of the schema dependency; runCheck hands it the registry's
 * requiredEnvVars, so the probe widens automatically when a provider is added.
 */
export function checkLaneDelegates(
	doc: unknown,
	label: string,
	credentialKeys: Iterable<string>,
): string[] {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const credentials = new Set(credentialKeys);
	const errors: string[] = [];
	const cell =
		`the benchmark cell (credentials, runner routing, cell budget, replicate fan-out, artifact ` +
		`upload) must live only in ${SUITE_WORKFLOW}, which both dispatch lanes call; a second copy is ` +
		`exactly the drift this consolidation removed`;
	for (const [jobId, rawJob] of Object.entries(jobs)) {
		const job = asRecord(rawJob, `${label}: job "${jobId}" is not a mapping`);
		if (stepByName(job, RUN_STEP, label) !== undefined) {
			errors.push(`${label}: job "${jobId}" declares a "${RUN_STEP}" step — ${cell}`);
		}
		for (const step of flattenSteps(job.steps, label)) {
			if (typeof step.run === "string" && step.run.includes(CELL_DRIVER_BIN)) {
				errors.push(
					`${label}: job "${jobId}" has a step whose run: invokes ${CELL_DRIVER_BIN} — ${cell}`,
				);
			}
		}
		const leaked = [...new Set(jobEnvKeys(job, label))].filter((k) => credentials.has(k)).sort();
		if (leaked.length > 0) {
			errors.push(
				`${label}: job "${jobId}" puts provider credential(s) ${leaked.join(", ")} in its env — ` +
					`${cell}. A lane never needs a provider secret: it passes none down, and the cell resolves ` +
					`its own from Environment "privileged"`,
			);
		}
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
