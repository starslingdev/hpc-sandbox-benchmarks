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

	it("refreshes apt + build deps for every PTS suite, including a stale baked image", () => {
		const ptsStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "ensure PTS build deps + fresh apt index",
		);
		expect(ptsStep?.script).toMatch(/apt-get.*update/);
		expect(ptsStep?.script).toContain("autoconf");
		expect(ptsStep?.script).not.toContain("command -v phoronix-test-suite");
	});

	it("requires both Python aliases on every successful base-package path", () => {
		const baseStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "install base packages",
		);
		const script = baseStep?.script ?? "";
		const branches = script.split(/\s+\|\|\s+/);

		expect(branches).toHaveLength(3);
		for (const branch of branches) {
			expect(branch).toContain("command -v git");
			expect(branch).toContain("command -v curl");
			expect(branch).toContain("python --version");
			expect(branch).toContain("python3 --version");
		}
		expect(branches[1]).toContain("python3 python-is-python3");
		// Pin the terminal no-apt fallback explicitly: it must not succeed on git/curl alone.
		expect(branches[2]).toEndWith(") >/dev/null 2>&1");
	});

	it("includes fast-cli's Puppeteer/Chrome runtime libs in the stock-image PTS deps fallback", () => {
		// Regression guard for the class of bug fixed in a2dd493: this list must stay in lockstep with
		// packages/templates/images/base/scripts/00-apt.sh's Chrome/Puppeteer block, or a stock-image
		// provider (e.g. modal) crashes fast-cli's freshly-downloaded Chrome with a missing-.so error.
		const ptsStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "ensure PTS build deps + fresh apt index",
		);
		for (const chromeDep of [
			"libglib2.0-0",
			"libnss3",
			"libgtk-3-0",
			"libx11-6",
			"fonts-liberation",
			"libasound2",
			"libatk-bridge2.0-0",
			"libcairo2",
			"libgbm1",
			"libxcomposite1",
			"libxdamage1",
			"libxrandr2",
			"xdg-utils",
		]) {
			expect(ptsStep?.script).toContain(chromeDep);
		}
	});

	it("does not install repository developer tools inside benchmark sandboxes", () => {
		expect(labels).not.toContain("mise install");
		const nodeStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "setup node 22 + pnpm 10",
		);
		expect(nodeStep?.script).toContain('cd "$HOME"');
		expect(nodeStep?.script).toContain("mise use --global");
		expect(nodeStep?.script).toContain("node@22.22.3");
		expect(nodeStep?.script).toContain('npm install --global --prefix "$HOME/.local" pnpm@10.34.3');
		expect(nodeStep?.script).not.toMatch(/mise use[^&]*pnpm/);
		expect(nodeStep?.script).not.toContain(`cd "$HOME/sandbox-benchmarks" && mise use`);
	});

	it("checksum-verifies the pinned mise fallback without executing a remote installer", () => {
		const miseStep = setupSteps(SUITES["cpu-node"]).find((step) => step.label === "install mise");
		expect(miseStep?.script).toContain("sha256sum -c -");
		expect(miseStep?.script).toContain("mise-v2026.5.16-linux-$a");
		expect(miseStep?.script).not.toContain("mise.run");
	});

	it("emits syntactically valid shell for every setup step", () => {
		for (const step of setupSteps(SUITES["cpu-node"])) {
			const result = Bun.spawnSync(["bash", "-n", "-c", step.script]);
			expect(result.exitCode, `${step.label}: ${result.stderr.toString()}`).toBe(0);
		}
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
