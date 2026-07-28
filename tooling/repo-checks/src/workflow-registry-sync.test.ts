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
	BAKE_JOB,
	BAKE_STEP,
	canonicalCredentialExpressions,
	checkCredentialEnv,
	checkCredentialExprExceptions,
	checkCredentialExpressions,
	checkProviderInput,
	checkReleaseCredentialEnv,
	checkReleaseLaneExemptions,
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
	PROMOTE_STEP,
	PUBLISH_JOB,
	RELEASE_LANE_EXEMPT,
	RELEASE_WORKFLOW,
	RUN_STEP,
	readWorkflow,
	releaseLaneLabel,
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
const release = readWorkflow(RELEASE_WORKFLOW);
const providerInput = dispatchInput(smoke, "provider", SMOKE_WORKFLOW);
const suiteInput = dispatchInput(smoke, "suite", SMOKE_WORKFLOW);
const smokeEnv = stepEnv(smoke, SMOKE_JOB, RUN_STEP, SMOKE_WORKFLOW);
const suiteEnv = stepEnv(suiteWf, SUITE_JOB, RUN_STEP, SUITE_WORKFLOW);
// The same helper runCheck uses, so a label change can't silently desync the gate from its tests.
const BAKE_LABEL = releaseLaneLabel(BAKE_JOB);
const PROMOTE_LABEL = releaseLaneLabel(PUBLISH_JOB);
const bakeEnv = stepEnv(release, BAKE_JOB, BAKE_STEP, BAKE_LABEL);
const promoteEnv = stepEnv(release, PUBLISH_JOB, PROMOTE_STEP, PROMOTE_LABEL);
const releaseEnv = { [BAKE_LABEL]: bakeEnv, [PROMOTE_LABEL]: promoteEnv };

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

describe("checkReleaseCredentialEnv (the toolchain release lane)", () => {
	test("stepEnv extracts both release-lane credential blocks", () => {
		// The bake cell scopes each secret on matrix.provider; promote passes them unconditionally
		// (it is a serial transaction over every provider, not a fan-out) — hence presence-only checks.
		expect(bakeEnv).toContainKey("E2B_API_KEY");
		expect(bakeEnv.E2B_API_KEY).toContain("matrix.provider == 'e2b'");
		expect(promoteEnv).toContainKey("E2B_API_KEY");
		expect(promoteEnv.E2B_API_KEY).not.toContain("matrix.provider");
	});

	test("the real release lane wires every non-exempt provider's credentials", () => {
		expect(checkReleaseCredentialEnv(releaseEnv)).toEqual([]);
	});

	test("blaxel is exempt, so its absent keys are not flagged", () => {
		// The invariant's whole escape hatch: blaxel boots a stock vendor image, so BL_* are absent from
		// both blocks by design. If this ever starts failing, blaxel got wired and the exemption is stale.
		expect(RELEASE_LANE_EXEMPT).toContainKey("blaxel");
		expect(bakeEnv).not.toContainKey("BL_API_KEY");
		expect(promoteEnv).not.toContainKey("BL_API_KEY");
	});

	test("flags a required key dropped from the bake cell, naming provider and job", () => {
		const { NOVITA_API_KEY: _, ...drifted } = bakeEnv;
		const errors = checkReleaseCredentialEnv({
			[BAKE_LABEL]: drifted,
			[PROMOTE_LABEL]: promoteEnv,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("NOVITA_API_KEY");
		expect(errors[0]).toContain("required by provider novita");
		expect(errors[0]).toContain(BAKE_LABEL);
		expect(errors[0]).not.toContain(PROMOTE_LABEL);
	});

	test("flags a required key dropped from the promote transaction", () => {
		// The gap this invariant closes: a provider fully wired for benchmarking whose release-lane
		// artifact is never validated, with the release still green.
		const { NSC_TOKEN_FILE: _, ...drifted } = promoteEnv;
		const errors = checkReleaseCredentialEnv({
			[BAKE_LABEL]: bakeEnv,
			[PROMOTE_LABEL]: drifted,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("NSC_TOKEN_FILE");
		expect(errors[0]).toContain("required by provider namespace");
		expect(errors[0]).toContain(PROMOTE_LABEL);
	});

	test("a partial exemption does not excuse a key a wired provider still needs", () => {
		// MODAL_TOKEN_ID is owned by both Modal variants. Exempting only one leaves the other needing it,
		// so the key stays required — otherwise one exemption would silently unwire a sibling variant.
		const { MODAL_TOKEN_ID: _, ...drifted } = bakeEnv;
		// Layered onto the real list, not replacing it — dropping blaxel's exemption would add unrelated
		// BL_* errors and stop this asserting what it names.
		const errors = checkReleaseCredentialEnv(
			{ [BAKE_LABEL]: drifted, [PROMOTE_LABEL]: promoteEnv },
			{ ...RELEASE_LANE_EXEMPT, "modal-vm": "synthetic partial exemption" },
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("MODAL_TOKEN_ID");
		expect(errors[0]).toContain("modal-gvisor, modal-vm");
	});

	test("flags a stale exemption whose provider IS in fact wired", () => {
		// Keeps the declaration honest in the other direction: an exemption that claims "deliberately not
		// wired" while the secret is threaded is a false comment the next reader would trust.
		const errors = checkReleaseCredentialEnv(releaseEnv, {
			...RELEASE_LANE_EXEMPT,
			novita: "synthetic stale exemption",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("NOVITA_API_KEY");
		expect(errors[0]).toContain("declared RELEASE_LANE_EXEMPT");
		expect(errors[0]).toContain("IS wired");
	});

	test("tolerates the blocks' non-credential runtime context vars", () => {
		expect(bakeEnv).toContainKey("PROVIDER");
		expect(promoteEnv).toContainKey("BAKE_REPORT_FILE");
		expect(checkReleaseCredentialEnv(releaseEnv)).toEqual([]);
	});
});

describe("checkReleaseLaneExemptions", () => {
	test("the real exemption list names only registered providers, each with a reason", () => {
		expect(checkReleaseLaneExemptions()).toEqual([]);
	});

	test("flags an exemption for a provider that is not in the registry", () => {
		const errors = checkReleaseLaneExemptions({ fly: "retired provider left behind" });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('names "fly"');
		expect(errors[0]).toContain("not in PROVIDERS");
	});

	test("flags a blank reason — an exemption is a permanent bypass, so it must be justified", () => {
		expect(checkReleaseLaneExemptions({ blaxel: "" })[0]).toContain("blank reason");
		// Whitespace-only is the same undocumented bypass, just harder to spot in review.
		expect(checkReleaseLaneExemptions({ blaxel: "   \n" })[0]).toContain("blank reason");
	});

	test("reports an unregistered id and its blank reason independently", () => {
		expect(checkReleaseLaneExemptions({ fly: "  " })).toHaveLength(2);
	});
});

describe("checkCredentialExpressions (registry-generated whitelist)", () => {
	const allLanes = {
		[SMOKE_WORKFLOW]: smokeEnv,
		[SUITE_WORKFLOW]: suiteEnv,
		[BAKE_LABEL]: bakeEnv,
		[PROMOTE_LABEL]: promoteEnv,
	};

	test("every real credential block matches a generated form", () => {
		expect(checkCredentialExpressions(allLanes)).toEqual([]);
	});

	test("generates the three canonical forms for a single-owner credential", () => {
		const forms = canonicalCredentialExpressions("E2B_API_KEY", ["e2b"]);
		// biome-ignore-start lint/suspicious/noTemplateCurlyInString: GHA expression literals, not JS templates.
		expect(forms).toEqual([
			"${{ secrets.E2B_API_KEY }}",
			"${{ inputs.provider == 'e2b' && secrets.E2B_API_KEY || '' }}",
			"${{ matrix.provider == 'e2b' && secrets.E2B_API_KEY || '' }}",
		]);
		// biome-ignore-end lint/suspicious/noTemplateCurlyInString: end of GHA expression literals.
	});

	test("parenthesizes the guard for a credential shared by isolation variants", () => {
		const forms = canonicalCredentialExpressions("MODAL_TOKEN_ID", ["modal-gvisor", "modal-vm"]);
		expect(forms).toContain(
			// biome-ignore lint/suspicious/noTemplateCurlyInString: a GHA expression literal, not a JS template.
			"${{ (matrix.provider == 'modal-gvisor' || matrix.provider == 'modal-vm') && secrets.MODAL_TOKEN_ID || '' }}",
		);
	});

	test("a declared exception replaces the canonical forms entirely", () => {
		const forms = canonicalCredentialExpressions("NSC_TOKEN_FILE", ["namespace"]);
		expect(forms).toHaveLength(1);
		expect(forms[0]).toContain("steps.nsc-token.outcome");
		// The generated provider-scoped form must NOT also be accepted for an excepted credential.
		expect(forms.some((f) => f.includes("secrets.NSC_TOKEN_FILE"))).toBe(false);
	});

	test("normalizes whitespace, so a pure reflow does not fail the gate", () => {
		expect(
			checkCredentialExpressions({
				"synthetic.yml": {
					E2B_API_KEY: `\${{   matrix.provider == 'e2b'   &&   secrets.E2B_API_KEY   ||   ''   }}`,
				},
			}),
		).toEqual([]);
	});

	// The whole point of inverting to a whitelist: every spelling below satisfied one or more of the
	// previous rule-based checks and still shipped an empty or over-broad credential. They are kept as a
	// table because they are the regression history of this invariant, not hypotheticals.
	const REJECTED: Array<[string, string]> = [
		["typo'd provider guard", `\${{ matrix.provider == 'e2bb' && secrets.E2B_API_KEY || '' }}`],
		["reversed operand order", `\${{ 'e2b' == matrix.provider && secrets.E2B_API_KEY || '' }}`],
		["negated guard", `\${{ matrix.provider != 'e2b' && secrets.E2B_API_KEY || '' }}`],
		["guard ORed with the secret", `\${{ matrix.provider == 'e2b' || secrets.E2B_API_KEY }}`],
		["inverted branches", `\${{ matrix.provider == 'e2b' && '' || secrets.E2B_API_KEY }}`],
		[
			"extra `||` smuggling the secret into the fallback",
			`\${{ matrix.provider == 'e2b' && '' || secrets.E2B_API_KEY || '' }}`,
		],
		["missing empty-string fallback", `\${{ matrix.provider == 'e2b' && secrets.E2B_API_KEY }}`],
		["bracket-form secret", `\${{ matrix.provider == 'e2b' && secrets['E2B_API_KEY'] || '' }}`],
		[
			"unreadable scoping form",
			`\${{ contains(matrix.provider, 'e2b') && secrets.E2B_API_KEY || '' }}`,
		],
		[
			"wrong provider's cell",
			`\${{ matrix.provider == 'daytona-vm' && secrets.E2B_API_KEY || '' }}`,
		],
	];

	for (const [label, expr] of REJECTED) {
		test(`rejects ${label}`, () => {
			const errors = checkCredentialExpressions({ "synthetic.yml": { E2B_API_KEY: expr } });
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("not one of the forms generated");
			// The message must show both sides, so the fix is mechanical rather than a puzzle.
			expect(errors[0]).toContain("actual:");
			expect(errors[0]).toContain("expected:");
		});
	}

	test("rejects a uniform typo — agreeing across every lane is no longer a defence", () => {
		const typo = `\${{ matrix.provider == 'novita' && secrets.NOVITA_API_KE || '' }}`;
		const errors = checkCredentialExpressions({
			"a.yml": { NOVITA_API_KEY: typo },
			"b.yml": { NOVITA_API_KEY: typo },
		});
		expect(errors).toHaveLength(2);
	});

	test("rejects an excepted credential wired to anything but its exact declared expression", () => {
		const errors = checkCredentialExpressions({
			"synthetic.yml": {
				NSC_TOKEN_FILE: `\${{ steps.nsc-token.outcome == 'success' && 'x' || '' }}`,
			},
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("declared exception");
	});

	test("a lane that omits a key is left to invariants 3/7, not double-reported here", () => {
		const { E2B_API_KEY: _, ...drifted } = suiteEnv;
		expect(checkCredentialExpressions({ [SUITE_WORKFLOW]: drifted })).toEqual([]);
	});
});

describe("checkCredentialExprExceptions", () => {
	test("the real exception list is well-formed", () => {
		expect(checkCredentialExprExceptions()).toEqual([]);
	});

	test("flags an exception for a key no provider requires", () => {
		const errors = checkCredentialExprExceptions({
			FLY_API_TOKEN: { reason: "retired", expression: "x" },
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("FLY_API_TOKEN");
	});

	test("flags a blank reason — an exception is a permanent exemption from the canonical shape", () => {
		const errors = checkCredentialExprExceptions({
			NSC_TOKEN_FILE: { reason: "  ", expression: "x" },
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("blank reason");
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
