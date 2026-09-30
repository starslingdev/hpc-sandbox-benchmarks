import { describe, expect, test } from "bun:test";
import {
	checkProviderIsolation,
	listWorkflowFiles,
	readWorkflow,
} from "./lib/workflow-hardening.ts";

const workflow = (job: object) => ({
	on: { workflow_call: {} },
	permissions: { contents: "read" },
	jobs: { worker: job },
});
const worker = {
	permissions: { contents: "read" },
	environment: "provider-brezel",
	"runs-on": "ubuntu-24.04",
	steps: [{ run: "true", env: { BREZEL_API_KEY: `\${{ secrets.BREZEL_API_KEY }}` } }],
};

describe("provider job credential isolation", () => {
	test("rejects broad inheritance even without a secret reference", () => {
		expect(
			checkProviderIsolation(
				workflow({ uses: "./.github/workflows/bench-suite.yml", secrets: "inherit" }),
				"caller.yml",
			).join("\n"),
		).toContain("secret forwarding");
	});
	test("rejects the shared privileged environment for provider secrets", () => {
		expect(
			checkProviderIsolation(workflow({ ...worker, environment: "privileged" }), "worker.yml").join(
				"\n",
			),
		).toContain("provider environment");
	});
	test("requires the standard fresh hosted runner", () => {
		expect(
			checkProviderIsolation(
				workflow({ ...worker, "runs-on": "starsling-ubuntu-24.04-2" }),
				"worker.yml",
			).join("\n"),
		).toContain("hosted runner");
	});
	test("rejects OIDC on Brezel", () => {
		expect(
			checkProviderIsolation(
				workflow({ ...worker, permissions: { contents: "read", "id-token": "write" } }),
				"worker.yml",
			).join("\n"),
		).toContain("OIDC");
	});
	test("rejects foreign secrets and whole-context serialization", () => {
		for (const value of [
			`\${{ secrets.E2B_API_KEY }}`,
			`\${{ toJSON(secrets) }}`,
			`\${{ secrets[inputs.key] }}`,
		]) {
			expect(
				checkProviderIsolation(
					workflow({ ...worker, steps: [{ env: { VALUE: value }, run: "true" }] }),
					"worker.yml",
				).length,
			).toBeGreaterThan(0);
		}
	});
	test("accepts a scoped Brezel worker", () => {
		expect(checkProviderIsolation(workflow(worker), "worker.yml")).toEqual([]);
	});
	test("real workflows enforce isolation", () => {
		for (const file of listWorkflowFiles()) {
			expect(checkProviderIsolation(readWorkflow(`.github/workflows/${file}`), file)).toEqual([]);
		}
	});
});

test("direct dispatch cannot acquire organization secrets alongside provider credentials", () => {
	expect(
		checkProviderIsolation({ on: { workflow_dispatch: {} }, jobs: { worker } }, "worker.yml").join(
			"\n",
		),
	).toContain("reusable-only");
});
test("provider workers cannot grant arbitrary write scopes", () => {
	expect(
		checkProviderIsolation(
			workflow({ ...worker, permissions: { contents: "read", issues: "write" } }),
			"worker.yml",
		).join("\n"),
	).toContain("issues: write");
});
