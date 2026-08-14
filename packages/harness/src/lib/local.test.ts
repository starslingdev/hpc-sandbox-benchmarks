import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MIN, selectTransport, shellQuote } from "./execute.ts";
import { createLocalSandbox, LOCAL_TRANSPORT, localSuitePlan } from "./local.ts";

const dirs: string[] = [];
function freshDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "harness-local-"));
	dirs.push(dir);
	return dir;
}
process.on("exit", () => {
	for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("LOCAL_TRANSPORT", () => {
	// Pinned against the REAL selector rather than asserted in a comment: the whole reason the local
	// lane can skip the done-file poll, the log read-back and their failure modes is that no step ever
	// selects "detached", and this is the only thing that proves it at a realistic suite budget.
	it("never selects the detached transport, at any step budget", () => {
		for (const budget of [MIN, 30 * MIN, 90 * MIN, 600 * MIN]) {
			expect(selectTransport(LOCAL_TRANSPORT, budget)).toBe("sync");
		}
	});
});

describe("createLocalSandbox", () => {
	it("captures stdout, stderr and a zero exit code", async () => {
		const sandbox = createLocalSandbox({ cwd: freshDir() });
		const result = await sandbox.runCommand("echo out; echo err >&2");
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("out");
		expect(result.stderr).toContain("err");
	});

	it("reports a non-zero exit code rather than throwing", async () => {
		const sandbox = createLocalSandbox({ cwd: freshDir() });
		expect((await sandbox.runCommand("exit 42")).exitCode).toBe(42);
	});

	// A signalled child reports exitCode null, and finishStep tests `exitCode !== 0` — so a null would
	// report a killed process as a clean success and let the suite continue on results never produced.
	it("maps a signalled exit to a non-zero 128 + signal", async () => {
		const sandbox = createLocalSandbox({ cwd: freshDir() });
		const result = await sandbox.runCommand("kill -TERM $$; sleep 5");
		expect(result.exitCode).not.toBe(0);
		expect(result.exitCode).toBeGreaterThanOrEqual(128);
	});

	it("runs in the given cwd", async () => {
		const dir = freshDir();
		const sandbox = createLocalSandbox({ cwd: dir });
		expect((await sandbox.runCommand("pwd")).stdout).toContain(dir);
	});

	// Pipes hold ~64 KiB. Draining stdout to completion before touching stderr blocks the child on a
	// full stderr pipe while awaiting a stdout EOF that can never arrive — a hang, not an error, which
	// would present as a benchmark that silently burns its whole step budget.
	it("does not deadlock when both streams carry more than a pipe buffer", async () => {
		const sandbox = createLocalSandbox({ cwd: freshDir() });
		const result = await sandbox.runCommand(
			"yes abcdefghij | head -c 2000000; yes klmnopqrst | head -c 2000000 >&2",
		);
		expect(result.exitCode).toBe(0);
		expect(result.stdout?.length).toBeGreaterThan(1_900_000);
		expect(result.stderr?.length).toBeGreaterThan(1_900_000);
	});

	// StepRunner's timeout is a WAIT-cap, not a kill: it stops awaiting and moves on. In a sandbox the
	// teardown reaps whatever was left; on a developer's machine nothing would, so destroy() must.
	it("kills still-running children on destroy", async () => {
		const dir = freshDir();
		const marker = join(dir, "still-alive");
		const sandbox = createLocalSandbox({ cwd: dir });
		// Not awaited: this is the straggler a timed-out step leaves behind.
		void sandbox.runCommand(`sleep 5; echo yes > ${marker}`);
		await Bun.sleep(250);
		await sandbox.destroy();
		await Bun.sleep(750);
		expect(() => readFileSync(marker, "utf8")).toThrow();
	});

	it("refuses to start a command after destroy", async () => {
		const sandbox = createLocalSandbox({ cwd: freshDir() });
		await sandbox.destroy();
		await expect(sandbox.runCommand("true")).rejects.toThrow(/destroyed/);
	});

	it("exposes no sandboxId, so cost evidence has no billable subject", () => {
		expect(createLocalSandbox({ cwd: freshDir() }).sandboxId).toBeUndefined();
	});

	// Unreachable under LOCAL_TRANSPORT, so refusing beats implementing: a silent `{ exitCode: 0 }`
	// for a process nobody observes is the worse failure if a future plan wires a detached transport.
	it("refuses a background command rather than faking one", async () => {
		const sandbox = createLocalSandbox({ cwd: freshDir() });
		await expect(sandbox.runCommand("true", { background: true })).rejects.toThrow(
			/no detached transport/,
		);
	});
});

describe("localSuitePlan", () => {
	const plan = localSuitePlan({ repoRoot: "/repo" });

	it("installs nothing — the toolchain is the developer's", () => {
		expect(plan.setup({ commandTimeoutMinutes: 1, timeoutMinutes: 1 } as never)).toEqual([]);
	});

	// The producer writing straight into the raw tree is what keeps a stale repo-root
	// benchmark-results/ from being swept into today's Run as a real measurement.
	it("points the producer at the raw tree and never at the sandbox checkout", () => {
		const command = plan.command("mise run benchmark:memory:all", "/raw/local/memory");
		expect(command).toContain("BENCHMARK_RESULTS_DIR='/raw/local/memory'");
		expect(command).toContain("cd '/repo'");
		expect(command).toContain("mise run benchmark:memory:all");
		expect(command).not.toContain("sandbox-benchmarks");
	});

	// buildPreamble sets SUDO="sudo -E" for a non-root user, so ensure_pts would reach `sudo apt-get`
	// and block on a password prompt mid-benchmark — with stdout quarantined, as a silent hang.
	it("pins $SUDO empty by default so no step can block on a password prompt", () => {
		expect(plan.command("x", "/raw")).toContain("SUDO=''");
	});

	it("honours an explicit sudo opt-in", () => {
		expect(localSuitePlan({ repoRoot: "/repo", sudo: "sudo" }).command("x", "/raw")).toContain(
			"SUDO='sudo'",
		);
	});

	it("writes the observed-specs probe into the suite's raw directory", () => {
		const script = plan.observedSpecs("/raw/local/memory");
		expect(script).toContain("/raw/local/memory/observed-specs.json");
		expect(script).toContain("cd '/repo'");
	});

	// `runSuiteOnSandbox` creates the results directory in its prologue, before any plan hook runs, so
	// nothing here needs to — and the command must not re-create it either.
	it("collects nothing: the producer already wrote in place", async () => {
		const dir = join(freshDir(), "nested", "results");
		await expect(plan.collect(undefined as never, dir)).resolves.toBeUndefined();
		expect(plan.command("x", "/raw/local/memory")).not.toContain("mkdir");
	});
});

describe("shell quoting through a real shell", () => {
	// execute.test.ts already pins `shellQuote`'s output; this pins the property the local lane needs
	// from it — that a hostile repo path cannot break out of the command the plan builds around it.
	it("round-trips a hostile path", async () => {
		const sandbox = createLocalSandbox({ cwd: freshDir() });
		const hostile = `/tmp/a'; echo pwned; '`;
		const result = await sandbox.runCommand(`printf '%s' ${shellQuote(hostile)}`);
		expect(result.stdout).toBe(hostile);
		expect(result.stdout).not.toContain("pwned\n");
	});
});
