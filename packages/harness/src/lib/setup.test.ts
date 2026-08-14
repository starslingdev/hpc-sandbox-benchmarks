import { describe, expect, it } from "bun:test";
import type { Suite } from "@sandbox-benchmarks/schema";
import { PTS_BAKED_ROOT, SUITES } from "@sandbox-benchmarks/schema";
import {
	localSetupSteps,
	OBSERVED_SPECS_SCRIPT,
	observedSpecsScript,
	REPO_URL,
	setupSteps,
} from "./setup.ts";

/** A suite with no toolchain requirements; each case turns on the one flag it is about. */
const bareSuite = (overrides: Partial<Suite> = {}): Suite => ({
	commandTimeoutMinutes: 1,
	timeoutMinutes: 1,
	dimensions: [],
	metrics: [],
	commands: [],
	...overrides,
});

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
		expect(nodeStep?.script).toContain("node@22.23.1");
		expect(nodeStep?.script).toContain('npm install --global --prefix "$HOME/.local" pnpm@10.34.5');
		expect(nodeStep?.script).not.toMatch(/mise use[^&]*pnpm/);
		expect(nodeStep?.script).not.toContain(`cd "$HOME/sandbox-benchmarks" && mise use`);
	});

	// The mise fallback writes to the baked image's root-owned MISE_DATA_DIR/MISE_CONFIG_DIR, so an
	// unprivileged sandbox (runloop) needs the preamble's $SUDO to survive it. The pnpm branch must
	// NOT be elevated — it installs under $HOME, where root-owned files would be the new bug.
	it("elevates only the mise fallback, which writes outside $HOME", () => {
		const nodeStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "setup node 22 + pnpm 10",
		);
		expect(nodeStep?.script).toContain("$SUDO mise use --global");
		expect(nodeStep?.script).not.toContain("$SUDO npm install");
	});

	it("checksum-verifies the pinned mise fallback without executing a remote installer", () => {
		const miseStep = setupSteps(SUITES["cpu-node"]).find((step) => step.label === "install mise");
		expect(miseStep?.script).toContain("sha256sum -c -");
		expect(miseStep?.script).toContain("mise-v2026.7.11-linux-$a");
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
		const bare = setupSteps(bareSuite()).map((step) => step.label);
		expect(bare).not.toContain("setup node 22 + pnpm 10");
		expect(bare).not.toContain("setup phoronix-test-suite");
	});
});

describe("observedSpecsScript", () => {
	it("defaults to the sandbox checkout and the collected results tree", () => {
		expect(observedSpecsScript()).toBe(OBSERVED_SPECS_SCRIPT);
		expect(OBSERVED_SPECS_SCRIPT).toContain('cd "$HOME/sandbox-benchmarks"');
		expect(OBSERVED_SPECS_SCRIPT).toContain("benchmark-results/observed-specs.json");
	});

	// The probe is the ONE artifact lib/bench.sh's results_dir() does not place — the harness writes it
	// — so a producer writing straight into the raw tree must still be told where that tree is.
	it("redirects both the working directory and the output for the bare-metal lane", () => {
		const script = observedSpecsScript({
			dir: "'/repo'",
			outFile: "/raw/local/memory/observed-specs.json",
		});
		expect(script).toContain("cd '/repo'");
		expect(script).toContain("> '/raw/local/memory/observed-specs.json'");
		expect(script).not.toContain("sandbox-benchmarks");
	});

	it("measures the disk the benchmark actually writes to, from the schema's own constant", () => {
		expect(OBSERVED_SPECS_SCRIPT).toContain(`disk_src=${PTS_BAKED_ROOT}`);
	});
});

describe("localSetupSteps", () => {
	it("verifies mise for every suite — every suite command is `mise run …`", () => {
		expect(localSetupSteps(bareSuite()).map((step) => step.label)).toEqual(["check mise"]);
	});

	it("adds a PTS check for a PTS-backed suite, with the install recipe as the remedy", () => {
		const steps = localSetupSteps(bareSuite({ setupPts: true }));
		expect(steps.map((step) => step.label)).toEqual(["check mise", "check phoronix-test-suite"]);
		expect(steps[1]?.script).toContain("ensure_pts");
	});

	it("adds node + pnpm checks and a pin comparison for a Node-backed suite", () => {
		const labels = localSetupSteps(bareSuite({ setupNode: true })).map((step) => step.label);
		expect(labels).toEqual([
			"check mise",
			"check node",
			"check pnpm",
			"check local Node/pnpm against the CI pins",
		]);
	});

	// Installing the developer's toolchain behind their back is not ours to do, and `$SUDO apt-get`
	// would block on a password prompt mid-run. These steps only ever look.
	it("never installs anything", () => {
		for (const suite of Object.values(SUITES)) {
			for (const step of localSetupSteps(suite)) {
				expect(step.script).not.toContain("apt-get");
				expect(step.script).not.toContain("$SUDO");
				expect(step.script).not.toContain("curl");
				expect(step.script).not.toContain("git clone");
			}
		}
	});

	// A version mismatch is disclosed, not blocking: a developer profiling their own machine should
	// not be stopped by a patch release, and the Run records whatever actually ran.
	it("warns on a pin mismatch rather than failing", () => {
		const pinCheck = localSetupSteps(bareSuite({ setupNode: true })).at(-1);
		expect(pinCheck?.script).toContain("NOTE:");
		expect(pinCheck?.script).toMatch(/true$/);
	});

	it("covers every registered suite without throwing", () => {
		for (const suite of Object.values(SUITES)) {
			expect(localSetupSteps(suite).length).toBeGreaterThan(0);
		}
	});
});
