import { describe, expect, it } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

	it("resolves ALSA to libasound2t64 where Ubuntu 24.04 dropped libasound2's install candidate", () => {
		const ptsStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "ensure PTS build deps + fresh apt index",
		);
		expect(ptsStep?.script).toContain("--dry-run libasound2 ");
		expect(ptsStep?.script).toContain("echo libasound2t64");
		expect(ptsStep?.script).toContain('"$ALSA_PKG"');
		const install = ptsStep?.script.split("$SUDO apt-get install").at(-1);
		expect(install).not.toMatch(/\blibasound2\b(?!t64)/);
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

	it("uses user-local mise on stock images and elevates only for root-owned mise paths", () => {
		const nodeStep = setupSteps(SUITES["cpu-node"]).find(
			(step) => step.label === "setup node 22 + pnpm 10",
		);
		if (!nodeStep) throw new Error("node setup step missing");
		const home = mkdtempSync(join(tmpdir(), "mise-setup-test-"));
		const log = join(home, "calls.log");
		try {
			for (const [name, body] of [
				["node", 'if [ "$1" = "-e" ]; then exit 1; fi; echo v22.23.1'],
				["pnpm", "echo 10.34.5"],
				["mise", 'echo "mise $*" >> "$PROBE_LOG"'],
				["sudo", 'echo sudo >> "$PROBE_LOG"; shift; exec "$@"'],
			] as const) {
				const path = join(home, name);
				writeFileSync(path, `#!/bin/sh\n${body}\n`);
				chmodSync(path, 0o755);
			}
			const run = (miseDataDir: string) => {
				writeFileSync(log, "");
				const result = Bun.spawnSync(["bash", "-c", nodeStep.script], {
					env: {
						...process.env,
						HOME: home,
						PATH: `${home}:${process.env.PATH}`,
						SUDO: "sudo -E",
						MISE_DATA_DIR: miseDataDir,
						MISE_CONFIG_DIR: "",
						PROBE_LOG: log,
					},
				});
				expect(result.exitCode, result.stderr.toString()).toBe(0);
				return readFileSync(log, "utf8");
			};
			expect(run("")).toBe("mise use --global --yes node@22.23.1\n");
			expect(run(join(home, "unwritable-mise-data"))).toBe(
				"sudo\nmise use --global --yes node@22.23.1\n",
			);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
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
