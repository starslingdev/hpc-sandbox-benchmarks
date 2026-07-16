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

/** A no-op step — the body for fixtures whose step content is irrelevant to what they assert. */
const NOOP_STEP = { run: "true" };
/** Build a single-job workflow doc: `{ ...root, jobs: { [id]: job } }`. */
const oneJob = (id: string, job: object, root: object = {}) => ({ ...root, jobs: { [id]: job } });

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

	test("matches the dot accessor even with GHA-legal whitespace around it", () => {
		expect(
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			customSecretsIn("${{ secrets . E2B_API_KEY }} ${{ secrets. DAYTONA_API_KEY }}"),
		).toEqual(["E2B_API_KEY", "DAYTONA_API_KEY"]);
	});

	test("detects a secret guarded behind a condition (the scoped `&& secrets.X || ''` form)", () => {
		expect(
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			customSecretsIn("${{ inputs.provider == 'daytona' && secrets.DAYTONA_API_KEY || '' }}"),
		).toEqual(["DAYTONA_API_KEY"]);
	});

	test("finds every secret access within a single expression block", () => {
		expect(
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			customSecretsIn("${{ secrets.A || secrets.B }}"),
		).toEqual(["A", "B"]);
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
		// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
		const env = { TOKEN: "${{ secrets.GITHUB_TOKEN }}" };
		const doc = oneJob("clone", { steps: [{ env, run: "true" }] });
		expect(checkPrivilegedEnvironment(doc, "safe.yml")).toEqual([]);
	});

	test("flags a custom secret without environment: privileged", () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
		const env = { E2B_API_KEY: "${{ secrets.E2B_API_KEY }}" };
		const doc = oneJob("bench", { steps: [{ env, run: "true" }] });
		const errors = checkPrivilegedEnvironment(doc, "leak.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("leak.yml::bench");
		expect(errors[0]).toContain(`environment: ${PRIVILEGED_ENVIRONMENT}`);
		expect(errors[0]).toContain("E2B_API_KEY");
	});

	test("flags a provider-scoped secret env value (condition && secrets.X || '') without privileged", () => {
		// The bench/smoke lanes scope each secret behind a condition; the gate must still require
		// `environment: privileged` for such a job, or removing it would silently pass the drift gate.
		const env = {
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			DAYTONA_API_KEY: "${{ matrix.provider == 'daytona' && secrets.DAYTONA_API_KEY || '' }}",
		};
		const doc = oneJob("bench", { steps: [{ env, run: "true" }] });
		const errors = checkPrivilegedEnvironment(doc, "scoped-leak.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("scoped-leak.yml::bench");
		expect(errors[0]).toContain("DAYTONA_API_KEY");
		expect(errors[0]).toContain(`environment: ${PRIVILEGED_ENVIRONMENT}`);
	});

	test("flags custom secrets in job or step if conditions without environment: privileged", () => {
		const doc = oneJob("bench", {
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			if: "${{ secrets.JOB_SECRET != '' }}",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			steps: [{ if: "${{ secrets.STEP_SECRET != '' }}", run: "true" }],
		});
		const errors = checkPrivilegedEnvironment(doc, "leak-if.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("leak-if.yml::bench");
		expect(errors[0]).toContain("JOB_SECRET");
		expect(errors[0]).toContain("STEP_SECRET");
	});

	test("flags custom secrets in workflow-level env inherited by every job", () => {
		const doc = oneJob(
			"plan",
			{ steps: [NOOP_STEP] },
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			{ env: { E2B_API_KEY: "${{ secrets.E2B_API_KEY }}" } },
		);
		const errors = checkPrivilegedEnvironment(doc, "leak-root-env.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("leak-root-env.yml::plan");
		expect(errors[0]).toContain("E2B_API_KEY");
	});

	test("flags packages: write without the privileged environment", () => {
		const doc = oneJob("publish", { permissions: { packages: "write" }, steps: [NOOP_STEP] });
		const errors = checkPrivilegedEnvironment(doc, "ghcr.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("packages: write");
	});

	test("accepts a write job that declares environment: privileged", () => {
		const doc = oneJob("publish", {
			environment: PRIVILEGED_ENVIRONMENT,
			permissions: { contents: "write" },
			steps: [NOOP_STEP],
		});
		expect(checkPrivilegedEnvironment(doc, "ok.yml")).toEqual([]);
	});

	test("handles the string permissions shorthand (write-all elevates, read-all does not)", () => {
		// `permissions: write-all` grants contents+packages write — must be flagged; the string form
		// must not throw (it once crashed asRecord). `read-all` grants no write, so it is clean.
		const errors = checkPrivilegedEnvironment(
			oneJob("publish", { permissions: "write-all", steps: [NOOP_STEP] }),
			"write-all.yml",
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("contents: write");
		expect(errors[0]).toContain("packages: write");

		expect(
			checkPrivilegedEnvironment(
				oneJob("publish", { permissions: "read-all", steps: [NOOP_STEP] }),
				"read-all.yml",
			),
		).toEqual([]);
	});

	test("flags secrets forwarded to a REMOTE reusable workflow (secrets: inherit) — unverifiable", () => {
		// `secrets: inherit` on a `uses:` job forwards every repo secret with no ${{ secrets.* }} here.
		// A remote callee can't be checked to gate on the privileged Environment, so it is flagged.
		const doc = oneJob("call", {
			uses: "org/repo/.github/workflows/release.yml@main",
			secrets: "inherit",
		});
		const errors = checkPrivilegedEnvironment(doc, "reusable.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("remote reusable workflow");
		expect(errors[0]).toContain(`environment: ${PRIVILEGED_ENVIRONMENT}`);
	});

	// A local callee that gates a job on the privileged Environment, and one that gates nothing —
	// injected via the resolver so these stay pure unit tests independent of on-disk workflow files.
	const gatedCallee = oneJob("run", {
		environment: PRIVILEGED_ENVIRONMENT,
		permissions: { contents: "write" },
		steps: [NOOP_STEP],
	});
	const ungatedCallee = oneJob("run", { permissions: { contents: "write" }, steps: [NOOP_STEP] });

	test("accepts a local reusable-workflow call that forwards secrets when the callee gates a job", () => {
		// GHA forbids `environment:` on a `uses:` job, so a local call can't gate on the caller — but the
		// caller's grant is invisible in the callee's YAML, so the gate resolves the callee and requires
		// it to gate a job itself.
		const doc = oneJob("call", {
			uses: "./.github/workflows/publish-dataset.yml",
			secrets: "inherit",
		});
		expect(
			checkPrivilegedEnvironment(doc, "reusable-ok.yml", PRIVILEGED_ENVIRONMENT, () => gatedCallee),
		).toEqual([]);
	});

	test("flags a local reusable call whose callee gates no job (caller can't gate itself)", () => {
		const doc = oneJob("publish", {
			uses: "./.github/workflows/ungated.yml",
			permissions: { contents: "write" },
		});
		const errors = checkPrivilegedEnvironment(
			doc,
			"caller.yml",
			PRIVILEGED_ENVIRONMENT,
			() => ungatedCallee,
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("caller.yml::publish");
		expect(errors[0]).toContain("no job in it sets");
		expect(errors[0]).toContain(`environment: ${PRIVILEGED_ENVIRONMENT}`);
	});

	test("skips a local reusable call whose callee can't be resolved (actionlint covers a missing file)", () => {
		const doc = oneJob("publish", {
			uses: "./.github/workflows/missing.yml",
			permissions: { contents: "write" },
		});
		const errors = checkPrivilegedEnvironment(doc, "caller.yml", PRIVILEGED_ENVIRONMENT, () => {
			throw new Error("ENOENT");
		});
		expect(errors).toEqual([]);
	});

	test("flags a secret passed to a REMOTE reusable workflow via a JOB-LEVEL with: input", () => {
		// A `uses:` job has no steps: its inputs ride a job-level `with:`. Passing a secret as an input
		// there (instead of the `secrets:` block) to an unverifiable remote callee must not slip past.
		const doc = oneJob("call", {
			uses: "org/repo/.github/workflows/deploy.yml@main",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			with: { api_key: "${{ secrets.DEPLOY_KEY }}" },
		});
		const errors = checkPrivilegedEnvironment(doc, "with-leak.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("DEPLOY_KEY");
		expect(errors[0]).toContain(`environment: ${PRIVILEGED_ENVIRONMENT}`);
	});

	test("accepts a local reusable call that passes a secret via a job-level with: input", () => {
		// A local call defers the privileged gate to the called file, which must gate a job itself.
		const doc = oneJob("call", {
			uses: "./.github/workflows/deploy.yml",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression under test
			with: { api_key: "${{ secrets.DEPLOY_KEY }}" },
		});
		expect(
			checkPrivilegedEnvironment(doc, "with-ok.yml", PRIVILEGED_ENVIRONMENT, () => gatedCallee),
		).toEqual([]);
	});

	test("accepts a local reusable call that grants write perms (bench-matrix.yml::publish shape)", () => {
		// The real case: bench-matrix's publish job grants contents/pull-requests write to the local
		// publish-dataset.yml. A `uses:` job can't set `environment:`; the called file gates a job.
		const doc = oneJob("publish", {
			uses: "./.github/workflows/publish-dataset.yml",
			permissions: { contents: "write", "pull-requests": "write", actions: "read" },
			with: { run_id: "123" },
		});
		expect(
			checkPrivilegedEnvironment(
				doc,
				"bench-matrix.yml",
				PRIVILEGED_ENVIRONMENT,
				() => gatedCallee,
			),
		).toEqual([]);
	});
});

describe("checkToolchainDispatchOnly", () => {
	// The main-only dispatch guard the publish job's `if:` must carry, and a publish job that passes.
	const DISPATCH_GATE_IF =
		"github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && github.repository == 'starslingdev/hpc-sandbox-benchmarks'";
	const gatedPublish = {
		environment: PRIVILEGED_ENVIRONMENT,
		if: DISPATCH_GATE_IF,
		steps: [NOOP_STEP],
	};

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
			on: { workflow_dispatch: {}, pull_request: {}, push: { branches: ["main"] } },
			jobs: { publish: gatedPublish },
		};
		const errors = checkToolchainDispatchOnly(doc, TOOLCHAIN_WORKFLOW);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("trigger `push` is not allowed");
	});

	test("flags a publish job missing the main-only dispatch gate", () => {
		const doc = {
			on: { workflow_dispatch: {}, pull_request: {} },
			jobs: { publish: { ...gatedPublish, if: "true" } },
		};
		const errors = checkToolchainDispatchOnly(doc, TOOLCHAIN_WORKFLOW);
		expect(errors.some((e) => e.includes('missing "workflow_dispatch"'))).toBe(true);
		expect(errors.some((e) => e.includes('missing "refs/heads/main"'))).toBe(true);
	});

	test("normalizes the string and array `on:` shorthand forms", () => {
		// `on: workflow_dispatch` (string) has no pull_request → the PR-gate requirement fires.
		const stringForm = { on: "workflow_dispatch", jobs: { publish: gatedPublish } };
		const stringErrors = checkToolchainDispatchOnly(stringForm, TOOLCHAIN_WORKFLOW);
		expect(stringErrors.some((e) => e.includes("must declare `pull_request`"))).toBe(true);
		// `on: [workflow_dispatch, pull_request]` (array) is the allowed pair → clean.
		const arrayForm = {
			on: ["workflow_dispatch", "pull_request"],
			jobs: { publish: gatedPublish },
		};
		expect(checkToolchainDispatchOnly(arrayForm, TOOLCHAIN_WORKFLOW)).toEqual([]);
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
