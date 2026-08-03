// Invariant: the GitHub workflows that dispatch live benchmarks stay in lockstep with the schema
// registries (PROVIDERS + SUITE_NAMES). GHA can't import TypeScript, so the provider/suite choices and
// the per-provider credential env block are hand-written YAML; this gate re-derives the truth from the
// registries and fails if someone adds a provider/suite (or its required secret) without updating the
// workflows. Both dispatch lanes — bench-matrix.yml (the full matrix, ending in a dataset commit) and
// bench-smoke.yml (the same pipeline narrowed to one provider × suite and stopped before that commit) —
// are one `plan` job plus one suite-matrix job calling the reusable bench-suite.yml (native nesting:
// suite / provider). The credential block + run-job timeout live in that single reusable, so the
// credential/timeout checks read it; separate invariants assert both callers stay wired to
// plan.outputs.suites and that neither lane grows a benchmark cell of its own again. Mirrors
// runner-benchmarking's test/workflow-{env,suite}-sync.test.ts. See ./lib/workflow-sync.ts for the
// parsers + pure checks. Nesting (invariant 6) lives in ./lib/workflow-nesting.ts; YAML helpers in
// ./lib/workflow-yaml.ts — workflow-sync.ts re-exports the public surface.
//
// The runCheck() test against the real workflow files IS the gate's CI enforcement point (it runs under
// `bun test`, same precedent as boundary.test.ts); the rest is unit coverage of the parsers and the
// failure messages on synthetic drift, so a future regression names the offending file + key.
import { describe, expect, test } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import type { SuiteMatrixCaller } from "./lib/workflow-sync.ts";
import {
	CELL_BUDGET_ENV_KEY,
	checkCellBudgetEnv,
	checkCredentialEnv,
	checkLaneDelegates,
	checkProviderInput,
	checkSmokeSingleSandboxDefault,
	checkSuiteInput,
	checkSuiteMatrixCaller,
	checkSuiteWorkflowNesting,
	checkWorkflowTimeouts,
	dispatchInput,
	EXPECTED_PROVIDER_NAME_EXPR,
	EXPECTED_REPLICATES_ARG,
	EXPECTED_REPLICATES_ENV_EXPR,
	EXPECTED_REPLICATES_INPUT_EXPR,
	EXPECTED_REQUIRE_PROVIDERS_INPUT_EXPR,
	EXPECTED_SMOKE_REPLICAS_INPUT_EXPR,
	EXPECTED_SUITE_MATRIX_EXPR,
	EXPECTED_SUITE_NAME_EXPR,
	jobTimeoutMinutes,
	MATRIX_WORKFLOW,
	matrixSuiteCaller,
	PLAN_STEP,
	REPLICATES_ENV_KEY,
	RUN_STEP,
	readWorkflow,
	requiredCredentialKeys,
	runCheck,
	SMOKE_WORKFLOW,
	SUITE_JOB,
	SUITE_WORKFLOW,
	stepEnv,
	WORKFLOW_TIMEOUT_MARGIN_MINUTES,
} from "./lib/workflow-sync.ts";

const smoke = readWorkflow(SMOKE_WORKFLOW);
const matrix = readWorkflow(MATRIX_WORKFLOW);
const suiteWf = readWorkflow(SUITE_WORKFLOW);
const providerInput = dispatchInput(smoke, "provider", SMOKE_WORKFLOW);
const suiteInput = dispatchInput(smoke, "suite", SMOKE_WORKFLOW);
const suiteEnv = stepEnv(suiteWf, SUITE_JOB, RUN_STEP, SUITE_WORKFLOW);

describe("parsers against the real workflow files", () => {
	test("dispatchInput extracts the smoke provider choice (type + options + default)", () => {
		expect(new Set(providerInput.options)).toEqual(new Set(PROVIDERS.map((p) => p.id)));
		expect(providerInput.default).toBeDefined();
		// `type: choice` is what makes GitHub enforce the options — assert it's captured.
		expect(providerInput.type).toBe("choice");
	});

	test("dispatchInput extracts the smoke suite choice", () => {
		expect(new Set(suiteInput.options)).toEqual(new Set(SUITE_NAMES));
		expect(suiteInput.type).toBe("choice");
	});

	test("stepEnv extracts the one real credential block, in the reusable cell", () => {
		expect(suiteEnv).toContainKey("E2B_API_KEY");
		expect(suiteEnv).toContainKey("DAYTONA_API_KEY");
		// A real block (credentials + runtime context), not a parse fragment.
		expect(Object.keys(suiteEnv).length).toBeGreaterThanOrEqual(8);
	});

	test("the live-run job reserves host margin beyond the longest suite", () => {
		expect(jobTimeoutMinutes(suiteWf, SUITE_JOB, SUITE_WORKFLOW)).toBe(180);
	});

	test("dispatchInput throws on a missing input instead of passing vacuously", () => {
		expect(() => dispatchInput(smoke, "no-such-input", SMOKE_WORKFLOW)).toThrow(
			'input "no-such-input" not found',
		);
	});

	test("stepEnv throws on a missing job, step, or env mapping", () => {
		expect(() => stepEnv(suiteWf, "no-such-job", RUN_STEP, SUITE_WORKFLOW)).toThrow(
			'job "no-such-job" not found',
		);
		expect(() => stepEnv(suiteWf, SUITE_JOB, "No Such Step", SUITE_WORKFLOW)).toThrow(
			'has no step named "No Such Step"',
		);
		const yaml = Bun.YAML.stringify({ jobs: { j: { steps: [{ name: "bare" }] } } });
		expect(() => stepEnv(Bun.YAML.parse(yaml), "j", "bare", "synthetic.yml")).toThrow(
			"has no env mapping",
		);
	});
});

describe("checkWorkflowTimeouts", () => {
	test("passes timeouts with the required host margin", () => {
		expect(checkWorkflowTimeouts({ bench: 180 })).toEqual([]);
	});

	test("flags a job cap that cannot outlast the longest suite", () => {
		// The longest registered suite budget is 90 min, so the required floor is 90 + 15 = 105. A 100-min
		// cap outlasts the suite itself but not by the host margin — exactly the drift this invariant catches.
		const errors = checkWorkflowTimeouts({ smoke: 100 });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("smoke");
		expect(errors[0]).toContain(`${WORKFLOW_TIMEOUT_MARGIN_MINUTES}-minute host margin`);
	});
});

describe("checkCellBudgetEnv", () => {
	// The real workflow: the literal the run step advertises must be the job's own timeout-minutes.
	test("the real cell budget matches the real job timeout", () => {
		expect(
			checkCellBudgetEnv(
				suiteEnv,
				jobTimeoutMinutes(suiteWf, SUITE_JOB, SUITE_WORKFLOW),
				SUITE_WORKFLOW,
			),
		).toEqual([]);
	});

	// Dropping the key disables the fan-out budget guard entirely — a capped cell would then be
	// cancelled three hours in with every shard lost, which is what the guard exists to prevent.
	test("flags a missing budget key", () => {
		const errors = checkCellBudgetEnv({}, 180, SUITE_WORKFLOW);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(CELL_BUDGET_ENV_KEY);
	});

	// The drift that matters: raising `timeout-minutes` without raising the copied literal keeps
	// rejecting caps that now fit; lowering it without lowering the literal waves through caps that
	// no longer do.
	test("flags a budget that has drifted from the job timeout", () => {
		const errors = checkCellBudgetEnv({ [CELL_BUDGET_ENV_KEY]: "180" }, 240, SUITE_WORKFLOW);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('is "180"');
		expect(errors[0]).toContain("timeout-minutes is 240");
	});
});

describe("checkProviderInput", () => {
	test("the real provider choice is in sync", () => {
		expect(checkProviderInput(providerInput)).toEqual([]);
	});

	test("flags a registry provider dropped from the options", () => {
		const drifted = {
			...providerInput,
			options: providerInput.options?.filter((o) => o !== "modal-gvisor"),
		};
		const errors = checkProviderInput(drifted);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('missing "modal-gvisor"');
		expect(errors[0]).toContain("PROVIDERS");
	});

	test("flags a stray option that no provider owns", () => {
		const drifted = { ...providerInput, options: [...(providerInput.options ?? []), "fly"] };
		const errors = checkProviderInput(drifted);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('option "fly" is not in PROVIDERS');
	});

	test("flags a default that is not a known provider", () => {
		const errors = checkProviderInput({ ...providerInput, default: "ghost" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('default "ghost"');
	});

	test("flags a missing options list entirely", () => {
		const errors = checkProviderInput({ type: "choice", default: "e2b" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("no options list");
	});

	test("flags a missing default (the invariant requires one, not a vacuous pass)", () => {
		const errors = checkProviderInput({ type: "choice", options: providerInput.options });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("no valid string default");
	});

	test('flags a non-choice type (options are unenforced free text unless "type: choice")', () => {
		// Registry-matching options/default, but type: string → GitHub ignores the options list.
		const errors = checkProviderInput({ ...providerInput, type: "string" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('not "type: choice"');
		expect(errors[0]).toContain('"string"');
	});

	test("flags a missing type (defaults to free-text string in GHA)", () => {
		const errors = checkProviderInput({ ...providerInput, type: undefined });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("no type");
	});
});

describe("checkSuiteInput", () => {
	test("the real suite choice is in sync", () => {
		expect(checkSuiteInput(suiteInput)).toEqual([]);
	});

	test("flags a registry suite dropped from the options", () => {
		const [first] = SUITE_NAMES;
		const drifted = { ...suiteInput, options: suiteInput.options?.filter((o) => o !== first) };
		const errors = checkSuiteInput(drifted);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(`missing "${first}"`);
		expect(errors[0]).toContain("SUITE_NAMES");
	});

	test("flags a stray suite option not in the registry", () => {
		const drifted = { ...suiteInput, options: [...(suiteInput.options ?? []), "gpu"] };
		const errors = checkSuiteInput(drifted);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('option "gpu" is not in SUITE_NAMES');
	});

	test("flags a non-choice suite type (shared check applies on the suite axis too)", () => {
		const errors = checkSuiteInput({ ...suiteInput, type: "string" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('not "type: choice"');
	});
});

describe("checkCredentialEnv", () => {
	// A hypothetical second lane declaring its own block, spelled with the OTHER provider selector —
	// the shape the fold exists for. The real repo has exactly one block (Invariant 3b keeps it that
	// way), so the cross-workflow half of this check is exercised synthetically.
	const laneEnv = Object.fromEntries(
		Object.entries(suiteEnv).map(([key, value]) => [
			key,
			value.replaceAll("matrix.provider", "inputs.provider"),
		]),
	);

	test("requiredCredentialKeys records provenance per provider", () => {
		const required = requiredCredentialKeys();
		expect(required.get("E2B_API_KEY")).toEqual(["e2b"]);
		// A credential shared by a vendor's isolation variants records every owner, in registry order.
		expect(required.get("MODAL_TOKEN_ID")).toEqual(["modal-gvisor", "modal-vm"]);
		expect(required.get("DAYTONA_API_KEY")).toEqual(["daytona-vm", "daytona-container"]);
	});

	test("the real reusable block covers every registered provider's credentials", () => {
		expect(checkCredentialEnv({ [SUITE_WORKFLOW]: suiteEnv })).toEqual([]);
	});

	test("flags a required key dropped from the reusable block, naming key and file", () => {
		const { E2B_API_KEY: _, ...drifted } = suiteEnv;
		const errors = checkCredentialEnv({ [SUITE_WORKFLOW]: drifted });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("E2B_API_KEY");
		expect(errors[0]).toContain("required by provider e2b");
		expect(errors[0]).toContain(SUITE_WORKFLOW);
	});

	// The selector fold: the same secret guarded on `inputs.provider` rather than `matrix.provider` is
	// the same wiring, not drift, so two lanes spelling it either way must still agree.
	test("folds the two provider selectors together across workflows", () => {
		expect(checkCredentialEnv({ [SMOKE_WORKFLOW]: laneEnv, [SUITE_WORKFLOW]: suiteEnv })).toEqual(
			[],
		);
	});

	test("flags a shared key whose value expression differs across two workflows", () => {
		const drifted = { ...suiteEnv, DAYTONA_API_KEY: `\${{ secrets.DAYTONA_API_KEY_OTHER }}` };
		const errors = checkCredentialEnv({
			[SMOKE_WORKFLOW]: laneEnv,
			[SUITE_WORKFLOW]: drifted,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("DAYTONA_API_KEY:");
		expect(errors[0]).toContain(laneEnv.DAYTONA_API_KEY);
		expect(errors[0]).toContain("DAYTONA_API_KEY_OTHER");
	});

	test("tolerates extra runtime-context vars beyond the required credentials", () => {
		const errors = checkCredentialEnv({
			[SUITE_WORKFLOW]: { ...suiteEnv, SOME_RUNTIME_CONTEXT: "x" },
		});
		expect(errors).toEqual([]);
	});
});

describe("checkLaneDelegates", () => {
	const CREDENTIALS = [...requiredCredentialKeys().keys()];
	const lane = (doc: unknown, label = "synthetic.yml"): string[] =>
		checkLaneDelegates(doc, label, CREDENTIALS);
	const laneYaml = (jobs: object): string[] => lane(Bun.YAML.parse(Bun.YAML.stringify({ jobs })));

	// Invariant 3b: the consolidation itself. Both dispatch lanes must reach sandboxes only through the
	// reusable — a re-introduced cell in either is the copy-paste this change removed.
	test("the real dispatch lanes own no benchmark cell", () => {
		expect(lane(smoke, SMOKE_WORKFLOW)).toEqual([]);
		expect(lane(matrix, MATRIX_WORKFLOW)).toEqual([]);
	});

	test("the reusable itself is where the cell lives (so it would NOT pass this lane check)", () => {
		const errors = lane(suiteWf, SUITE_WORKFLOW);
		// All three probes fire on the real cell: the step name, the run: that drives it, and its
		// credential block. That is the shape the lanes must never have.
		expect(errors.length).toBeGreaterThanOrEqual(3);
		for (const error of errors) expect(error).toContain(SUITE_JOB);
	});

	test("flags a lane that re-grows its own run step, naming the job", () => {
		const errors = laneYaml({
			plan: { "runs-on": "ubuntu-24.04", steps: [{ name: "Plan" }] },
			smoke: { "runs-on": "ubuntu-24.04", steps: [{ name: RUN_STEP }] },
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('job "smoke"');
		expect(errors[0]).toContain(RUN_STEP);
	});

	// The bypass a name-only check misses: same cell, fresh step name. This is the shape someone
	// re-adding a cell by hand writes — they do not copy the reusable's step name along with it.
	test("flags a re-grown cell hiding under a different step name", () => {
		const errors = laneYaml({
			smoke: {
				"runs-on": "ubuntu-24.04",
				steps: [
					{ name: "Benchmark the cell", run: "bun apps/cli/src/bin/bench-suite.ts e2b system" },
				],
			},
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("bench-suite.ts");
	});

	// The other bypass: credentials on a JOB-level env, which every step inherits, so no per-step scan
	// would ever see them.
	test("flags provider credentials hung off a job-level env", () => {
		const errors = laneYaml({
			smoke: {
				"runs-on": "ubuntu-24.04",
				env: { E2B_API_KEY: "x", DAYTONA_API_KEY: "y", SOME_RUNTIME_CONTEXT: "z" },
				steps: [{ name: "Something else" }],
			},
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("DAYTONA_API_KEY, E2B_API_KEY");
		// Non-credential env is not the lane's business.
		expect(errors[0]).not.toContain("SOME_RUNTIME_CONTEXT");
	});

	test("flags provider credentials on a step env too", () => {
		const errors = laneYaml({
			smoke: { "runs-on": "ubuntu-24.04", steps: [{ name: "x", env: { NOVITA_API_KEY: "k" } }] },
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("NOVITA_API_KEY");
	});

	// A lane legitimately runs bun bins (the planners) and carries non-credential env; neither is a cell.
	test("passes a lane that plans and orchestrates without touching a credential", () => {
		expect(
			laneYaml({
				plan: {
					"runs-on": "ubuntu-24.04",
					steps: [
						{
							name: "Plan",
							run: "bun apps/cli/src/bin/plan-suites.ts",
							env: { BENCH_SUITES: "s" },
						},
					],
				},
				suite: { uses: "./.github/workflows/bench-suite.yml", with: { suite: "system" } },
			}),
		).toEqual([]);
	});
});

describe("checkSmokeSingleSandboxDefault", () => {
	// Invariant 7. `default: '1'` does NOT hold this on its own — a cleared dispatch field sends "",
	// which means "each suite's Suite.defaultReplicas" (R=12 on realworld). The fallback is the guard.
	test("the real smoke lane pins one sandbox against a cleared field", () => {
		expect(checkSmokeSingleSandboxDefault(smoke, SMOKE_WORKFLOW)).toEqual([]);
		expect(dispatchInput(smoke, "replicas", SMOKE_WORKFLOW).default).toBe("1");
	});

	test("flags a plan step that forwards replicas without the blank fallback", () => {
		const yaml = Bun.YAML.stringify({
			jobs: {
				plan: {
					steps: [
						// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal, not a JS template.
						{ name: PLAN_STEP, with: { replicas: "${{ inputs.replicas }}" } },
					],
				},
			},
		});
		const errors = checkSmokeSingleSandboxDefault(Bun.YAML.parse(yaml), "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(EXPECTED_SMOKE_REPLICAS_INPUT_EXPR);
		expect(errors[0]).toContain("R=12");
	});

	test("flags a missing plan job or plan step rather than passing vacuously", () => {
		const noJob = Bun.YAML.stringify({ jobs: { suite: {} } });
		expect(checkSmokeSingleSandboxDefault(Bun.YAML.parse(noJob), "synthetic.yml")[0]).toContain(
			'job "plan" is missing',
		);
		const noStep = Bun.YAML.stringify({ jobs: { plan: { steps: [{ name: "Checkout" }] } } });
		expect(checkSmokeSingleSandboxDefault(Bun.YAML.parse(noStep), "synthetic.yml")[0]).toContain(
			`no step named "${PLAN_STEP}"`,
		);
	});
});

describe("checkSuiteMatrixCaller", () => {
	const realCaller = matrixSuiteCaller(matrix, MATRIX_WORKFLOW);
	// The matrix lane's complete, declared posture: it owns the publish dependency and must NOT require
	// a provider. Every call states both — a partial object would silently waive the flag it omits,
	// which is exactly why the options type has no optional fields.
	const MATRIX_LANE = { requirePublishNeeds: true, requireProviderAssertion: false } as const;
	const check = (caller: SuiteMatrixCaller, label = MATRIX_WORKFLOW): string[] =>
		checkSuiteMatrixCaller(caller, label, MATRIX_LANE);

	test("matrixSuiteCaller extracts the real suite-matrix nesting wiring", () => {
		expect(realCaller.jobId).toBe("suite");
		expect(realCaller.name).toBe(EXPECTED_SUITE_NAME_EXPR);
		expect(realCaller.suiteInput).toBe(EXPECTED_SUITE_NAME_EXPR);
		expect(realCaller.matrixSuiteExpr).toBe(EXPECTED_SUITE_MATRIX_EXPR);
		expect(realCaller.publishNeeds).toContain("suite");
	});

	test("the real suite-matrix caller is wired for native nesting", () => {
		expect(check(realCaller)).toEqual([]);
	});

	test("flags a caller whose display name is not matrix.suite", () => {
		const errors = check({ ...realCaller, name: "Bench suites" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("name must be");
		expect(errors[0]).toContain(EXPECTED_SUITE_NAME_EXPR);
	});

	test("flags a caller whose with.suite is not matrix.suite", () => {
		const errors = check({ ...realCaller, suiteInput: "cpu-node" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("with.suite must be");
	});

	test("flags a caller whose suite axis is not plan.outputs.suites", () => {
		const errors = check({
			...realCaller,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal (wrong axis), not a JS template.
			matrixSuiteExpr: "${{ fromJSON(needs.plan.outputs.providers) }}",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("strategy.matrix.suite must be");
		expect(errors[0]).toContain(EXPECTED_SUITE_MATRIX_EXPR);
	});

	test("flags publish that does not need the suite-matrix caller", () => {
		const errors = check({ ...realCaller, publishNeeds: ["plan"] });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('publish" must need "suite"');
	});

	test("matrixSuiteCaller throws when no job calls the reusable", () => {
		const yaml = Bun.YAML.stringify({ jobs: { plan: { "runs-on": "ubuntu-24.04" } } });
		expect(() => matrixSuiteCaller(Bun.YAML.parse(yaml), "synthetic.yml")).toThrow(
			"no job calls the reusable bench-suite.yml",
		);
	});

	test("matrixSuiteCaller throws on multiple suite-matrix callers", () => {
		const yaml = Bun.YAML.stringify({
			jobs: {
				a: {
					name: EXPECTED_SUITE_NAME_EXPR,
					uses: "./.github/workflows/bench-suite.yml",
					with: { suite: EXPECTED_SUITE_NAME_EXPR, replicates: EXPECTED_REPLICATES_INPUT_EXPR },
					strategy: { matrix: { suite: EXPECTED_SUITE_MATRIX_EXPR } },
				},
				b: {
					name: EXPECTED_SUITE_NAME_EXPR,
					uses: "./.github/workflows/bench-suite.yml",
					with: { suite: EXPECTED_SUITE_NAME_EXPR, replicates: EXPECTED_REPLICATES_INPUT_EXPR },
					strategy: { matrix: { suite: EXPECTED_SUITE_MATRIX_EXPR } },
				},
			},
		});
		expect(() => matrixSuiteCaller(Bun.YAML.parse(yaml), "synthetic.yml")).toThrow(
			"expected exactly one suite-matrix caller",
		);
	});

	// The caller-side twin of the run-step bypass: hardcoding the array here passes every other nesting
	// check while quietly measuring one sandbox per cell.
	test("flags a caller that hardcodes with.replicates instead of taking the plan's slice", () => {
		const caller = {
			...matrixSuiteCaller(matrix, MATRIX_WORKFLOW),
			replicatesInput: "[0]",
		};
		const errors = check(caller, "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("with.replicates must be");
		expect(errors[0]).toContain(EXPECTED_REPLICATES_INPUT_EXPR);
	});

	test("matrixSuiteCaller throws on a reusable-caller job with no string replicates", () => {
		const yaml = Bun.YAML.stringify({
			jobs: {
				bad: {
					uses: "./.github/workflows/bench-suite.yml",
					with: { suite: EXPECTED_SUITE_NAME_EXPR },
					strategy: { matrix: { suite: EXPECTED_SUITE_MATRIX_EXPR } },
				},
			},
		});
		expect(() => matrixSuiteCaller(Bun.YAML.parse(yaml), "synthetic.yml")).toThrow(
			'without a string "replicates" input',
		);
	});

	test("matrixSuiteCaller throws on a reusable-caller job with no string suite", () => {
		const yaml = Bun.YAML.stringify({
			jobs: { bad: { uses: "./.github/workflows/bench-suite.yml", with: { providers: "[]" } } },
		});
		expect(() => matrixSuiteCaller(Bun.YAML.parse(yaml), "synthetic.yml")).toThrow(
			'without a string "suite" input',
		);
	});

	test("matrixSuiteCaller rejects a present non-string require_providers input", () => {
		const yaml = Bun.YAML.stringify({
			jobs: {
				bad: {
					name: EXPECTED_SUITE_NAME_EXPR,
					uses: "./.github/workflows/bench-suite.yml",
					with: {
						suite: EXPECTED_SUITE_NAME_EXPR,
						replicates: EXPECTED_REPLICATES_INPUT_EXPR,
						require_providers: true,
					},
					strategy: { matrix: { suite: EXPECTED_SUITE_MATRIX_EXPR } },
				},
			},
		});
		expect(() => matrixSuiteCaller(Bun.YAML.parse(yaml), "synthetic.yml")).toThrow(
			'with a non-string "require_providers" input',
		);
	});
});

describe("checkSuiteMatrixCaller on the smoke lane", () => {
	const smokeCaller = matrixSuiteCaller(smoke, SMOKE_WORKFLOW);
	// The smoke lane's complete, declared posture — the exact mirror of MATRIX_LANE above.
	const SMOKE_LANE = { requirePublishNeeds: false, requireProviderAssertion: true } as const;

	// The consolidation in one assertion: the smoke lane's caller is the matrix lane's caller, down to
	// the job id and every nesting expression. If these diverge, "a smoke is a real run minus the
	// commit" has stopped being true.
	test("the smoke caller is wired identically to the matrix caller", () => {
		const matrixCaller = matrixSuiteCaller(matrix, MATRIX_WORKFLOW);
		expect(smokeCaller.jobId).toBe(matrixCaller.jobId);
		expect(smokeCaller.name).toBe(matrixCaller.name);
		expect(smokeCaller.suiteInput).toBe(matrixCaller.suiteInput);
		expect(smokeCaller.replicatesInput).toBe(matrixCaller.replicatesInput);
		expect(smokeCaller.matrixSuiteExpr).toBe(matrixCaller.matrixSuiteExpr);
	});

	test("the real smoke caller passes its dispatched provider as require_providers", () => {
		expect(smokeCaller.requireProvidersInput).toBe(EXPECTED_REQUIRE_PROVIDERS_INPUT_EXPR);
		expect(checkSuiteMatrixCaller(smokeCaller, SMOKE_WORKFLOW, SMOKE_LANE)).toEqual([]);
	});

	// Dropping it is the silent regression: every nesting check still passes, the job still goes green,
	// and a missing credential is recorded as a skip on a run that benchmarked nothing.
	test("flags a smoke caller that stopped requiring its provider", () => {
		const { requireProvidersInput: _dropped, ...caller } = smokeCaller;
		const errors = checkSuiteMatrixCaller(caller, SMOKE_WORKFLOW, SMOKE_LANE);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("with.require_providers must be");
		expect(errors[0]).toContain("no such input");
	});

	// The smoke lane deliberately has NO publish job — that missing third phase IS the difference
	// between the lanes — so the publish dependency must not be demanded of it.
	test("does not demand a publish dependency of the smoke lane", () => {
		expect(smokeCaller.publishNeeds).toEqual([]);
		expect(checkSuiteMatrixCaller(smokeCaller, SMOKE_WORKFLOW, SMOKE_LANE)).toEqual([]);
	});

	// The mirror image, and the reason `requireProviderAssertion: false` asserts ABSENCE rather than
	// merely not-checking: a stray value on the matrix lane fails every cell whose provider it names —
	// loudly, but only after a whole matrix run's worth of provider quota is committed.
	test("flags a matrix-lane caller that grew a require_providers input", () => {
		const errors = checkSuiteMatrixCaller(
			{ ...matrixSuiteCaller(matrix, MATRIX_WORKFLOW), requireProvidersInput: "e2b" },
			MATRIX_WORKFLOW,
			{ requirePublishNeeds: true, requireProviderAssertion: false },
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("must not pass with.require_providers");
	});
});

describe("checkSuiteWorkflowNesting", () => {
	const suiteWf = readWorkflow(SUITE_WORKFLOW);

	test("the real reusable fan-out job is named matrix.provider", () => {
		expect(checkSuiteWorkflowNesting(suiteWf)).toEqual([]);
	});

	/** A fan-out job that satisfies every nesting invariant; each drift test bends exactly one field. */
	const wiredRunStep = {
		name: RUN_STEP,
		env: { [REPLICATES_ENV_KEY]: EXPECTED_REPLICATES_ENV_EXPR },
		run: `bun apps/cli/src/bin/bench-suite.ts "$BENCH_PROVIDER" "$BENCH_SUITE" "$GITHUB_RUN_ID" ${EXPECTED_REPLICATES_ARG}`,
	};
	const wiredFanOut = {
		name: EXPECTED_PROVIDER_NAME_EXPR,
		"runs-on": "ubuntu-24.04",
		steps: [wiredRunStep],
	};
	const nestingErrors = (job: object): string[] =>
		checkSuiteWorkflowNesting(
			Bun.YAML.parse(Bun.YAML.stringify({ jobs: { [SUITE_JOB]: job } })),
			"synthetic.yml",
		);

	test("passes a fan-out job named matrix.provider that receives the replicate array", () => {
		expect(nestingErrors(wiredFanOut)).toEqual([]);
	});

	test("flags a fan-out job whose display name is not matrix.provider", () => {
		const errors = nestingErrors({ ...wiredFanOut, name: "Run" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("name must be");
		expect(errors[0]).toContain(EXPECTED_PROVIDER_NAME_EXPR);
	});

	// Re-adding the axis is the exact regression the in-process fan-out exists to prevent: it would
	// silently restore one idle runner per replicate.
	test("flags a reinstated replicate matrix axis", () => {
		const errors = nestingErrors({
			...wiredFanOut,
			strategy: { matrix: { provider: "[]", replicate: "[0,1]" } },
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('must not have a "replicate" matrix axis');
	});

	test("accepts a provider-only matrix", () => {
		expect(nestingErrors({ ...wiredFanOut, strategy: { matrix: { provider: "[]" } } })).toEqual([]);
	});

	// Without the env wiring the cell falls back to ONE sandbox — a green run that publishes R=1 while
	// the plan asked for R=12, so the drift must fail the gate rather than the dataset.
	test("flags a run step that never receives the replicate array", () => {
		const errors = nestingErrors({
			...wiredFanOut,
			steps: [{ ...wiredRunStep, env: {} }],
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(REPLICATES_ENV_KEY);
		expect(errors[0]).toContain("no such env key");
	});

	// The bypass that made the env check alone insufficient: keep the env key, drop the flag. The cell
	// then takes bench-suite's single-sandbox default and commit-dataset's legacy glob collects the one
	// shard without complaint — a green matrix run publishing R=1.
	test("flags a run step that sets the env but never passes --replicates", () => {
		const errors = nestingErrors({
			...wiredFanOut,
			steps: [
				{
					...wiredRunStep,
					run: 'bun apps/cli/src/bin/bench-suite.ts "$BENCH_PROVIDER" "$BENCH_SUITE" "$GITHUB_RUN_ID"',
				},
			],
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(EXPECTED_REPLICATES_ARG);
	});

	test("flags a run step with no run: command at all", () => {
		const { run: _dropped, ...noRun } = wiredRunStep;
		const errors = nestingErrors({ ...wiredFanOut, steps: [noRun] });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("no run: command");
	});

	// `replicas` (the dispatch knob) vs `replicates` (the plan's index array) is the plausible typo:
	// it's a live input name, so it resolves to a value rather than failing the workflow outright.
	test("flags a replicate array wired to the wrong expression", () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal, not a JS template.
		const wrongExpr = "${{ inputs.replicas }}";
		const errors = nestingErrors({
			...wiredFanOut,
			steps: [{ ...wiredRunStep, env: { [REPLICATES_ENV_KEY]: wrongExpr } }],
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(EXPECTED_REPLICATES_ENV_EXPR);
	});
});

describe("the gate itself", () => {
	test("the real workflows are in lockstep with the registries", () => {
		expect(runCheck()).toEqual([]);
	});
});
