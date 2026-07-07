// Invariant: the GitHub Actions layer stays hardened. (1) every actions/checkout opts out of
// credential persistence unless it is an allowlisted pushing checkout, and (2) ci-lint.yml runs
// actionlint + zizmor at the agreed gate threshold. The runHardeningCheck() test against the real
// .github files IS the gate's CI enforcement point (same precedent as workflow-registry-sync.test.ts);
// the rest is unit coverage of the pure checks on synthetic drift so a regression names the offender.
// See ./lib/workflow-hardening.ts.
import { describe, expect, test } from "bun:test";
import type { CheckoutStep } from "./lib/workflow-hardening.ts";
import {
	CI_LINT_WORKFLOW,
	CREDENTIALED_CHECKOUTS,
	checkCiLintGate,
	checkoutSteps,
	checkPersistCredentials,
	listWorkflowFiles,
	readWorkflow,
	runHardeningCheck,
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
