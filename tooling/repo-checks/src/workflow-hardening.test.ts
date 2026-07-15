// Invariant: the GitHub Actions layer stays hardened. (1) every actions/checkout opts out of
// credential persistence unless it is an allowlisted pushing checkout, (2) ci-lint.yml runs
// actionlint + zizmor at the agreed gate threshold, (3) custom-secret / write jobs declare
// environment: privileged, and (4) toolchain publish is workflow_dispatch-only. The
// runHardeningCheck() test against the real .github files IS the gate's CI enforcement point
// (same precedent as workflow-registry-sync.test.ts); the rest is unit coverage of the pure checks
// on synthetic drift so a regression names the offender. See ./lib/workflow-hardening.ts.
import { describe, expect, test } from "bun:test";
import type { CheckoutStep } from "./lib/workflow-hardening.ts";
import {
	CI_LINT_WORKFLOW,
	CREDENTIALED_CHECKOUTS,
	checkCiLintGate,
	checkoutSteps,
	checkPersistCredentials,
	checkPrivilegedEnvironment,
	checkToolchainDispatchOnly,
	customSecretsIn,
	listWorkflowFiles,
	PRIVILEGED_ENVIRONMENT,
	readWorkflow,
	runHardeningCheck,
	TOOLCHAIN_WORKFLOW,
	WORKFLOWS_DIR,
} from "./lib/workflow-hardening.ts";

describe("checkoutSteps against the real workflows", () => {
	test("every workflow's checkouts are extracted with a persist-credentials reading", () => {
		const files = listWorkflowFiles();
		expect(files).toContain("ci.yml");
		expect(files).toContain("ci-lint.yml");
		const steps = files.flatMap((file) =>
			checkoutSteps(readWorkflow(`${WORKFLOWS_DIR}/${file}`, undefined), file),
		);
		// Sanity: there are several checkouts and ci.yml's reads false.
		expect(steps.length).toBeGreaterThanOrEqual(5);
		const ci = steps.find((s) => s.file === "ci.yml");
		expect(ci?.persistCredentials).toBe(false);
	});

	test("reads persist-credentials whether YAML types it as a boolean or a quoted string", () => {
		const doc = {
			jobs: {
				j: {
					steps: [
						{ uses: "actions/checkout@v4", with: { "persist-credentials": false } },
						{ uses: "actions/checkout@v4", with: { "persist-credentials": "false" } },
						{ uses: "actions/checkout@v4", with: { "persist-credentials": "true" } },
					],
				},
			},
		};
		expect(checkoutSteps(doc, "synthetic.yml").map((s) => s.persistCredentials)).toEqual([
			false,
			false,
			true,
		]);
	});
});

describe("checkPersistCredentials", () => {
	const allowlist = { "bench-matrix.yml::publish": "pushes the dataset" };

	test("passes when read-only checkouts opt out and the pushing one keeps its token", () => {
		const steps: CheckoutStep[] = [
			{ file: "ci.yml", jobId: "check", persistCredentials: false },
			{ file: "bench-matrix.yml", jobId: "plan", persistCredentials: false },
			{ file: "bench-matrix.yml", jobId: "publish", persistCredentials: undefined },
		];
		expect(checkPersistCredentials(steps, allowlist)).toEqual([]);
	});

	test("flags a read-only checkout that forgot persist-credentials: false", () => {
		const steps: CheckoutStep[] = [
			{ file: "ci.yml", jobId: "check", persistCredentials: undefined },
		];
		const errors = checkPersistCredentials(steps, {});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("ci.yml::check");
		expect(errors[0]).toContain("persist-credentials: false");
	});

	test("flags a checkout that sets persist-credentials: true explicitly", () => {
		const steps: CheckoutStep[] = [{ file: "ci.yml", jobId: "check", persistCredentials: true }];
		expect(checkPersistCredentials(steps, {})).toHaveLength(1);
	});

	test("flags an allowlisted pushing checkout that opted out (its push would break)", () => {
		const steps: CheckoutStep[] = [
			{ file: "bench-matrix.yml", jobId: "publish", persistCredentials: false },
		];
		const errors = checkPersistCredentials(steps, allowlist);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("allowlisted as a pushing checkout");
	});

	test("flags a stale allowlist entry with no matching checkout", () => {
		const errors = checkPersistCredentials([], allowlist);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("no such checkout step exists");
	});
});

describe("checkCiLintGate", () => {
	const good = {
		jobs: {
			actionlint: { steps: [{ run: "mise exec -- actionlint -no-color" }] },
			zizmor: {
				steps: [
					{
						run: "mise exec -- zizmor --min-severity medium --min-confidence high .github/workflows/",
					},
				],
			},
		},
	};

	test("passes the real ci-lint.yml", () => {
		expect(checkCiLintGate(readWorkflow(CI_LINT_WORKFLOW, undefined))).toEqual([]);
	});

	test("passes a well-formed synthetic gate", () => {
		expect(checkCiLintGate(good)).toEqual([]);
	});

	test("flags a missing zizmor job", () => {
		const errors = checkCiLintGate({ jobs: { actionlint: good.jobs.actionlint } });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('missing the "zizmor" job');
	});

	test("flags a loosened zizmor threshold (dropped --min-confidence)", () => {
		const loosened = {
			jobs: {
				actionlint: good.jobs.actionlint,
				zizmor: {
					steps: [{ run: "mise exec -- zizmor --min-severity medium .github/workflows/" }],
				},
			},
		};
		const errors = checkCiLintGate(loosened);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("--min-confidence high");
	});
});

describe("customSecretsIn", () => {
	test("ignores GITHUB_TOKEN and extracts provider secrets in dot and bracket notation", () => {
		expect(
			customSecretsIn(
				// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
				"${{ secrets.GITHUB_TOKEN }} ${{ secrets.E2B_API_KEY }} ${{ secrets.DAYTONA_TARGET || 'us-west-2' }} ${{ secrets['NOVITA_API_KEY'] }} ${{ secrets[\"BL_API_KEY\"] }}",
			),
		).toEqual(["E2B_API_KEY", "DAYTONA_TARGET", "NOVITA_API_KEY", "BL_API_KEY"]);
	});
});

describe("checkPrivilegedEnvironment", () => {
	test("passes the real privileged workflows", () => {
		for (const file of ["bench-matrix.yml", "bench-smoke.yml", "toolchain-image.yml"]) {
			expect(checkPrivilegedEnvironment(readWorkflow(`${WORKFLOWS_DIR}/${file}`), file)).toEqual(
				[],
			);
		}
	});

	test("passes jobs that only use GITHUB_TOKEN without an environment", () => {
		const doc = {
			jobs: {
				clone: {
					steps: [
						{
							name: "Run",
							// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
							env: { TOKEN: "${{ secrets.GITHUB_TOKEN }}" },
							run: "true",
						},
					],
				},
			},
		};
		expect(checkPrivilegedEnvironment(doc, "safe.yml")).toEqual([]);
	});

	test("flags a custom secret without environment: privileged", () => {
		const doc = {
			jobs: {
				bench: {
					steps: [
						{
							name: "Run",
							// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
							env: { E2B_API_KEY: "${{ secrets.E2B_API_KEY }}" },
							run: "true",
						},
					],
				},
			},
		};
		const errors = checkPrivilegedEnvironment(doc, "leak.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("leak.yml::bench");
		expect(errors[0]).toContain(`environment: ${PRIVILEGED_ENVIRONMENT}`);
		expect(errors[0]).toContain("E2B_API_KEY");
	});

	test("flags custom secrets in job or step if conditions without environment: privileged", () => {
		const doc = {
			jobs: {
				bench: {
					// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
					if: "${{ secrets.JOB_SECRET != '' }}",
					steps: [
						{
							name: "Run",
							// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
							if: "${{ secrets.STEP_SECRET != '' }}",
							run: "true",
						},
					],
				},
			},
		};
		const errors = checkPrivilegedEnvironment(doc, "leak-if.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("leak-if.yml::bench");
		expect(errors[0]).toContain("JOB_SECRET");
		expect(errors[0]).toContain("STEP_SECRET");
	});

	test("flags custom secrets in workflow-level env inherited by every job", () => {
		const doc = {
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			env: { E2B_API_KEY: "${{ secrets.E2B_API_KEY }}" },
			jobs: {
				plan: { steps: [{ run: "true" }] },
			},
		};
		const errors = checkPrivilegedEnvironment(doc, "leak-root-env.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("leak-root-env.yml::plan");
		expect(errors[0]).toContain("E2B_API_KEY");
	});

	test("flags packages: write without the privileged environment", () => {
		const doc = {
			jobs: {
				publish: {
					permissions: { packages: "write" },
					steps: [{ run: "true" }],
				},
			},
		};
		const errors = checkPrivilegedEnvironment(doc, "ghcr.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("packages: write");
	});

	test("accepts a write job that declares environment: privileged", () => {
		const doc = {
			jobs: {
				publish: {
					environment: PRIVILEGED_ENVIRONMENT,
					permissions: { contents: "write" },
					steps: [{ run: "true" }],
				},
			},
		};
		expect(checkPrivilegedEnvironment(doc, "ok.yml")).toEqual([]);
	});
});

describe("checkToolchainDispatchOnly", () => {
	test("passes the real toolchain-image.yml", () => {
		expect(
			checkToolchainDispatchOnly(
				readWorkflow(`${WORKFLOWS_DIR}/${TOOLCHAIN_WORKFLOW}`),
				TOOLCHAIN_WORKFLOW,
			),
		).toEqual([]);
	});

	test("flags a push trigger on the toolchain workflow", () => {
		const doc = {
			on: {
				workflow_dispatch: {},
				pull_request: {},
				push: { branches: ["main"] },
			},
			jobs: {
				publish: {
					environment: PRIVILEGED_ENVIRONMENT,
					if: "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && github.repository == 'starslingdev/sandbox-benchmarks'",
					steps: [{ run: "true" }],
				},
			},
		};
		const errors = checkToolchainDispatchOnly(doc, TOOLCHAIN_WORKFLOW);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("trigger `push` is not allowed");
	});

	test("flags a publish job missing the main-only dispatch gate", () => {
		const doc = {
			on: { workflow_dispatch: {}, pull_request: {} },
			jobs: {
				publish: {
					environment: PRIVILEGED_ENVIRONMENT,
					if: "true",
					steps: [{ run: "true" }],
				},
			},
		};
		const errors = checkToolchainDispatchOnly(doc, TOOLCHAIN_WORKFLOW);
		expect(errors.some((e) => e.includes('missing "workflow_dispatch"'))).toBe(true);
		expect(errors.some((e) => e.includes('missing "refs/heads/main"'))).toBe(true);
	});
});

describe("the gate itself", () => {
	test("the real .github layer is hardened", () => {
		expect(runHardeningCheck()).toEqual([]);
	});

	test("the allowlist documents a reason for every entry", () => {
		for (const [key, reason] of Object.entries(CREDENTIALED_CHECKOUTS)) {
			expect(key).toContain("::");
			expect(reason.length).toBeGreaterThan(0);
		}
	});
});
