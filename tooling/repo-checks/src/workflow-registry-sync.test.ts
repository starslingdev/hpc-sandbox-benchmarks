// Invariant: the GitHub workflows that dispatch live benchmarks stay in lockstep with the schema
// registries (PROVIDERS + SUITE_NAMES). GHA can't import TypeScript, so the provider/suite choices and
// the per-provider credential env block are hand-mirrored across .github/workflows/bench-*.yml; this
// gate re-derives the truth from the registries and fails if someone adds a provider/suite (or its
// required secret) without updating the workflows. bench-matrix.yml has one suite-matrix job that calls
// the reusable bench-suite.yml (native nesting: suite / provider) — so the credential block + run-job
// timeout live in the reusable (the "matrix side" of the credential/timeout checks reads it), and a
// separate invariant asserts the suite-matrix caller stays wired to plan.outputs.suites. Mirrors
// runner-benchmarking's test/workflow-{env,suite}-sync.test.ts. See ./lib/workflow-sync.ts for the
// parsers + pure checks. Nesting (invariant 6) lives in ./lib/workflow-nesting.ts; YAML helpers in
// ./lib/workflow-yaml.ts — workflow-sync.ts re-exports the public surface.
//
// The runCheck() test against the real workflow files IS the gate's CI enforcement point (it runs under
// `bun test`, same precedent as boundary.test.ts); the rest is unit coverage of the parsers and the
// failure messages on synthetic drift, so a future regression names the offending file + key.
import { describe, expect, test } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import {
	checkCredentialEnv,
	checkProviderInput,
	checkSuiteInput,
	checkSuiteMatrixCaller,
	checkSuiteWorkflowNesting,
	checkWorkflowTimeouts,
	dispatchInput,
	EXPECTED_PROVIDER_NAME_EXPR,
	EXPECTED_SUITE_MATRIX_EXPR,
	EXPECTED_SUITE_NAME_EXPR,
	jobTimeoutMinutes,
	MATRIX_WORKFLOW,
	matrixSuiteCaller,
	RUN_STEP,
	readWorkflow,
	requiredCredentialKeys,
	runCheck,
	SMOKE_JOB,
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
const smokeEnv = stepEnv(smoke, SMOKE_JOB, RUN_STEP, SMOKE_WORKFLOW);
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

	test("stepEnv extracts a realistic credential block from both lanes", () => {
		expect(smokeEnv).toContainKey("DAYTONA_API_KEY");
		// The matrix lane's credential block lives in the reusable bench-suite.yml.
		expect(suiteEnv).toContainKey("E2B_API_KEY");
		// A real block (credentials + runtime context), not a parse fragment.
		expect(Object.keys(smokeEnv).length).toBeGreaterThanOrEqual(8);
	});

	test("both live-run jobs reserve host margin beyond the longest suite", () => {
		expect(jobTimeoutMinutes(smoke, SMOKE_JOB, SMOKE_WORKFLOW)).toBe(180);
		expect(jobTimeoutMinutes(suiteWf, SUITE_JOB, SUITE_WORKFLOW)).toBe(180);
	});

	test("dispatchInput throws on a missing input instead of passing vacuously", () => {
		expect(() => dispatchInput(smoke, "no-such-input", SMOKE_WORKFLOW)).toThrow(
			'input "no-such-input" not found',
		);
	});

	test("stepEnv throws on a missing job, step, or env mapping", () => {
		expect(() => stepEnv(smoke, "no-such-job", RUN_STEP, SMOKE_WORKFLOW)).toThrow(
			'job "no-such-job" not found',
		);
		expect(() => stepEnv(smoke, SMOKE_JOB, "No Such Step", SMOKE_WORKFLOW)).toThrow(
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
		expect(checkWorkflowTimeouts({ smoke: 180, matrix: 180 })).toEqual([]);
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
	test("requiredCredentialKeys records provenance per provider", () => {
		const required = requiredCredentialKeys();
		expect(required.get("E2B_API_KEY")).toEqual(["e2b"]);
		// A credential shared by a vendor's isolation variants records every owner, in registry order.
		expect(required.get("MODAL_TOKEN_ID")).toEqual(["modal-gvisor", "modal-vm"]);
		expect(required.get("DAYTONA_API_KEY")).toEqual(["daytona-vm", "daytona-container"]);
	});

	test("flags a required key dropped from the matrix (reusable) block, naming key and file", () => {
		const { E2B_API_KEY: _, ...drifted } = suiteEnv;
		const errors = checkCredentialEnv({
			[SMOKE_WORKFLOW]: smokeEnv,
			[SUITE_WORKFLOW]: drifted,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("E2B_API_KEY");
		expect(errors[0]).toContain("required by provider e2b");
		expect(errors[0]).toContain(SUITE_WORKFLOW);
		expect(errors[0]).not.toContain(SMOKE_WORKFLOW);
	});

	test("flags a shared key whose value expression differs across the two lanes", () => {
		const drifted = { ...suiteEnv, DAYTONA_API_KEY: `\${{ secrets.DAYTONA_API_KEY_OTHER }}` };
		const errors = checkCredentialEnv({
			[SMOKE_WORKFLOW]: smokeEnv,
			[SUITE_WORKFLOW]: drifted,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("DAYTONA_API_KEY:");
		expect(errors[0]).toContain(smokeEnv.DAYTONA_API_KEY);
		expect(errors[0]).toContain("DAYTONA_API_KEY_OTHER");
	});

	test("tolerates extra runtime-context vars beyond the required credentials", () => {
		const errors = checkCredentialEnv({
			[SMOKE_WORKFLOW]: { ...smokeEnv, SOME_RUNTIME_CONTEXT: "x" },
			[SUITE_WORKFLOW]: suiteEnv,
		});
		expect(errors).toEqual([]);
	});
});

describe("checkSuiteMatrixCaller", () => {
	const realCaller = matrixSuiteCaller(matrix);

	test("matrixSuiteCaller extracts the real suite-matrix nesting wiring", () => {
		expect(realCaller.jobId).toBe("suite");
		expect(realCaller.name).toBe(EXPECTED_SUITE_NAME_EXPR);
		expect(realCaller.suiteInput).toBe(EXPECTED_SUITE_NAME_EXPR);
		expect(realCaller.matrixSuiteExpr).toBe(EXPECTED_SUITE_MATRIX_EXPR);
		expect(realCaller.publishNeeds).toContain("suite");
	});

	test("the real suite-matrix caller is wired for native nesting", () => {
		expect(checkSuiteMatrixCaller(realCaller)).toEqual([]);
	});

	test("flags a caller whose display name is not matrix.suite", () => {
		const errors = checkSuiteMatrixCaller({ ...realCaller, name: "Bench suites" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("name must be");
		expect(errors[0]).toContain(EXPECTED_SUITE_NAME_EXPR);
	});

	test("flags a caller whose with.suite is not matrix.suite", () => {
		const errors = checkSuiteMatrixCaller({ ...realCaller, suiteInput: "cpu-node" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("with.suite must be");
	});

	test("flags a caller whose suite axis is not plan.outputs.suites", () => {
		const errors = checkSuiteMatrixCaller({
			...realCaller,
			// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal (wrong axis), not a JS template.
			matrixSuiteExpr: "${{ fromJSON(needs.plan.outputs.providers) }}",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("strategy.matrix.suite must be");
		expect(errors[0]).toContain(EXPECTED_SUITE_MATRIX_EXPR);
	});

	test("flags publish that does not need the suite-matrix caller", () => {
		const errors = checkSuiteMatrixCaller({ ...realCaller, publishNeeds: ["plan"] });
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
					with: { suite: EXPECTED_SUITE_NAME_EXPR },
					strategy: { matrix: { suite: EXPECTED_SUITE_MATRIX_EXPR } },
				},
				b: {
					name: EXPECTED_SUITE_NAME_EXPR,
					uses: "./.github/workflows/bench-suite.yml",
					with: { suite: EXPECTED_SUITE_NAME_EXPR },
					strategy: { matrix: { suite: EXPECTED_SUITE_MATRIX_EXPR } },
				},
			},
		});
		expect(() => matrixSuiteCaller(Bun.YAML.parse(yaml), "synthetic.yml")).toThrow(
			"expected exactly one suite-matrix caller",
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
});

describe("checkSuiteWorkflowNesting", () => {
	const suiteWf = readWorkflow(SUITE_WORKFLOW);

	test("the real reusable fan-out job is named matrix.provider", () => {
		expect(checkSuiteWorkflowNesting(suiteWf)).toEqual([]);
	});

	test("flags a fan-out job whose display name is not matrix.provider", () => {
		const yaml = Bun.YAML.stringify({
			jobs: { [SUITE_JOB]: { name: "Run", "runs-on": "ubuntu-24.04" } },
		});
		const errors = checkSuiteWorkflowNesting(Bun.YAML.parse(yaml), "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("name must be");
		expect(errors[0]).toContain(EXPECTED_PROVIDER_NAME_EXPR);
	});
});

describe("the gate itself", () => {
	test("the real workflows are in lockstep with the registries", () => {
		expect(runCheck()).toEqual([]);
	});
});
