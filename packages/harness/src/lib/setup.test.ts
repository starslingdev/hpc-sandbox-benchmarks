import { describe, expect, it } from "bun:test";
import { SUITES } from "@sandbox-benchmarks/schema";
import { REPO_URL, setupSteps } from "./setup.ts";

describe("setupSteps", () => {
	const labels = setupSteps(SUITES["cpu-node"]).map((step) => step.label);

	it("clones the repo and brings the toolchain up (node + PTS for cpu-node)", () => {
		expect(labels).toEqual([
			"install base packages",
			"clone repo",
			"install mise",
			"trust mise config",
			"setup node 22 + pnpm 10",
			"ensure PTS build deps + fresh apt index",
			"setup phoronix-test-suite",
		]);
	});

	it("refreshes the apt index + build deps for a PTS suite regardless of a stale baked image", () => {
		const ptsStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "ensure PTS build deps + fresh apt index",
		);
		expect(ptsStep).toBeDefined();
		// Unconditional apt refresh (not gated on `command -v phoronix-test-suite`), so a stale baked
		// image whose apt index was cleaned still has one before PTS installs a test's external deps.
		expect(ptsStep?.script).toMatch(/apt-get.*update/);
		expect(ptsStep?.script).not.toContain("command -v phoronix-test-suite");
	});

	it("does not install repository developer tools inside benchmark sandboxes", () => {
		expect(labels).not.toContain("mise install");
	});

	it("clones this repo by default, so the in-sandbox producer matches the harness", () => {
		expect(REPO_URL).toContain("sandbox-benchmarks");
	});

	it("omits node/PTS setup for a bare suite", () => {
		const bare = setupSteps({
			commandTimeoutMinutes: 1,
			timeoutMinutes: 1,
			dimensions: [],
			metrics: [],
			commands: [],
		}).map((step) => step.label);
		expect(bare).not.toContain("setup node 22 + pnpm 10");
		expect(bare).not.toContain("setup phoronix-test-suite");
	});
});
