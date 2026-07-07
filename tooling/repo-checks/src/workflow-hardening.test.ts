// Invariant: the GitHub Actions layer stays hardened — every actions/checkout opts out of credential
// persistence unless it is an allowlisted pushing checkout. This is unit coverage of the pure checks
// on synthetic drift (so a regression names the offender) plus a sanity read of the real workflows.
// The ci-lint threshold coverage and the runHardeningCheck() real-file gate land in the next PR up the
// stack. See ./lib/workflow-hardening.ts.
import { describe, expect, test } from "bun:test";
import type { CheckoutStep } from "./lib/workflow-hardening.ts";
import {
	checkoutSteps,
	checkPersistCredentials,
	listWorkflowFiles,
	readWorkflow,
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
