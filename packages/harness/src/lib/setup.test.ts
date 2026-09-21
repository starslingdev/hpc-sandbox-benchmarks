import { describe, expect, it } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SUITES } from "@sandbox-benchmarks/schema";
import { observedSpecsScript, REPO_URL, setupSteps } from "./setup.ts";

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

describe("observedSpecsScript", () => {
	it("emits syntactically valid shell with and without a create stamp", () => {
		for (const script of [observedSpecsScript(), observedSpecsScript({ createdAtMs: 1 })]) {
			const result = Bun.spawnSync(["bash", "-n", "-c", script]);
			expect(result.exitCode, result.stderr.toString()).toBe(0);
		}
	});

	it("records the elapsed wait on the HARNESS clock, both ends", () => {
		// Both ends read here, never in the sandbox: a sandbox whose wall clock is offset (a restored
		// snapshot, a provider without NTP) would otherwise distort the denominator the verdict rests on.
		const script = observedSpecsScript({ createdAtMs: 1_000, now: () => 91_500 });
		expect(script).toContain("elapsed_since_create_s=90.50");
	});

	it("leaves the denominator empty when the caller cannot vouch for t0", () => {
		// A caller handed an already-running sandbox does not know when it was asked for. The classifier
		// must then say "indeterminate" rather than resting a verdict on an invented t0.
		expect(observedSpecsScript()).toContain("elapsed_since_create_s=\n");
		// Same for a stamp that cannot be true — a create dated in the future.
		expect(observedSpecsScript({ createdAtMs: 10_000, now: () => 1_000 })).toContain(
			"elapsed_since_create_s=\n",
		);
	});

	it("probes both age readings and the boot id", () => {
		const script = observedSpecsScript({ createdAtMs: 1 });
		expect(script).toContain("/proc/uptime");
		expect(script).toContain("/proc/1/stat");
		expect(script).toContain("/proc/sys/kernel/random/boot_id");
	});

	it("reads pid 1's start time by counting back from the last ')', not by field index", () => {
		// /proc/1/stat field 2 is the comm, parenthesized and free to contain spaces and parens. A bare
		// $22 misreads every sandbox whose pid 1 has a space in its name — and silently, since it still
		// yields a number. Exercised against a real stat line with both.
		const stat =
			"1 (my proc (x) 1) S 0 1 1 0 -1 4194560 100 0 0 0 5 3 0 0 20 0 1 0 4200 0 0 0 0 0 0 0 0 0 0 0 0 0 0";
		const statFile = join(tmpdir(), `pid1-stat-${process.pid}`);
		writeFileSync(statFile, `${stat}\n`);
		// The emitted line verbatim, with only the path redirected at the fixture: the awk program under
		// test is the one that ships, not a copy of it that could drift.
		const awk = observedSpecsScript()
			.split("\n")
			.find((line) => line.startsWith("pid1_age_s="))
			?.replace("/proc/1/stat", statFile);
		expect(awk).toBeDefined();
		const result = Bun.spawnSync([
			"bash",
			"-c",
			`uptime_s=100; hz=100; ${awk}; printf '%s' "$pid1_age_s"`,
		]);
		rmSync(statFile, { force: true });
		// starttime 4200 ticks / 100 Hz = 42s into a 100s uptime.
		expect(result.stdout.toString()).toBe("58.00");
	});

	it("omits a reading the sandbox could not produce rather than defaulting it to zero", () => {
		// A zero age would read as "booted the instant we asked" — the strongest possible claim, made on
		// no evidence. Absence has to stay absence.
		const script = observedSpecsScript({ createdAtMs: 1 });
		expect(script).toContain('if [ -n "$uptime_s" ]; then');
		expect(script).toContain('if [ -n "$pid1_age_s" ]; then');
		expect(script).toContain('if [ -n "$boot_id" ]; then');
	});
});
