import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SUITE_NAMES, sandboxSkipMarkerFile } from "@sandbox-benchmarks/schema";
import { buildPlan, planOutputs, readFlag, writeSkipMarkers } from "./bin/plan-matrix.ts";

// Default-region credentials for each registry provider (the planner joins the runtime `providers`
// config, whose daytona requiredEnvVars resolves to DAYTONA_API_KEY when DAYTONA_REGION is unset).
const ALL_CREDS = {
	E2B_API_KEY: "e",
	DAYTONA_API_KEY: "d",
	MODAL_TOKEN_ID: "m1",
	MODAL_TOKEN_SECRET: "m2",
};

describe("readFlag", () => {
	it("parses --flag value, --flag=value, and a valueless trailing flag", () => {
		expect(readFlag(["--providers", "daytona"], "providers")).toBe("daytona");
		expect(readFlag(["--providers=daytona,e2b"], "providers")).toBe("daytona,e2b");
		expect(readFlag(["--providers"], "providers")).toBe("");
		// A following flag is not consumed as this flag's value.
		expect(readFlag(["--providers", "--suites", "all"], "providers")).toBe("");
		expect(readFlag(["--suites", "all"], "providers")).toBeUndefined();
	});
});

describe("buildPlan", () => {
	it("plans every registry provider into the matrix when all credentials are present", () => {
		const plan = buildPlan([], ALL_CREDS);
		// Registry (declaration) order: e2b, daytona, modal.
		expect(plan.providers).toEqual(["e2b", "daytona", "modal"]);
		expect(plan.suites).toEqual([...SUITE_NAMES]);
		expect(plan.skipped).toEqual([]);
	});

	it("drops credential-less providers and records a skip cell per selected suite", () => {
		const plan = buildPlan([], { DAYTONA_API_KEY: "d" });
		expect(plan.providers).toEqual(["daytona"]);
		const droppedProviders = new Set(plan.skipped.map((c) => c.provider));
		expect(droppedProviders).toEqual(new Set(["e2b", "modal"]));
		// Every dropped provider × every selected suite is recorded.
		expect(plan.skipped.length).toBe(2 * SUITE_NAMES.length);
		for (const cell of plan.skipped) expect(cell.reason).toMatch(/^Missing credentials: /);
	});

	it("honours --providers: an UNSELECTED provider is excluded, not skipped", () => {
		const plan = buildPlan(["--providers", "daytona"], ALL_CREDS);
		expect(plan.providers).toEqual(["daytona"]);
		// e2b/modal were not requested, so they are simply absent — no skip markers for them.
		expect(plan.skipped).toEqual([]);
	});

	it("honours --suites against the registry", () => {
		const plan = buildPlan(["--suites", "cpu-node"], ALL_CREDS);
		expect(plan.suites).toEqual(["cpu-node"]);
	});

	it("rejects an unknown provider", () => {
		expect(() => buildPlan(["--providers", "nope"], ALL_CREDS)).toThrow(/Unknown provider: nope/);
	});
});

describe("planOutputs ($GITHUB_OUTPUT contract)", () => {
	it("emits compact-JSON providers, a padded suite list, and a string has_skips", () => {
		const outputs = planOutputs(buildPlan([], ALL_CREDS));
		expect(outputs.providers).toBe('["e2b","daytona","modal"]');
		expect(outputs.suites).toBe(`,${SUITE_NAMES.join(",")},`);
		expect(outputs.has_skips).toBe("false");
		// Single line: the value must never carry a newline (the $GITHUB_OUTPUT contract).
		for (const value of Object.values(outputs)) expect(value).not.toContain("\n");
	});

	it("sets has_skips true once any provider is dropped", () => {
		expect(planOutputs(buildPlan([], {})).has_skips).toBe("true");
		expect(planOutputs(buildPlan([], {})).providers).toBe("[]");
	});
});

describe("writeSkipMarkers", () => {
	it("writes <dir>/<provider>/<sandbox marker> with the harness skip-marker body", () => {
		const dir = mkdtempSync(join(tmpdir(), "plan-matrix-skips-"));
		const plan = buildPlan([], {}); // no creds → every provider dropped
		writeSkipMarkers(dir, plan);

		// One provider subdirectory per dropped provider.
		expect(new Set(readdirSync(dir))).toEqual(new Set(["e2b", "daytona", "modal"]));

		const [suite] = SUITE_NAMES;
		if (suite === undefined) throw new Error("SUITE_NAMES is empty");
		const markerPath = join(dir, "e2b", sandboxSkipMarkerFile("e2b", suite));
		const body = JSON.parse(readFileSync(markerPath, "utf8"));
		expect(body).toEqual({
			provider: "e2b",
			suite,
			skipped: true,
			reason: "Missing credentials: E2B_API_KEY",
		});
	});
});
