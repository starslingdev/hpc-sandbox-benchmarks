import { describe, expect, it } from "bun:test";
import type { SandboxHandle } from "./execute.ts";
import { PREAMBLE, StepRunner, shellQuote } from "./execute.ts";

describe("shellQuote", () => {
	it("wraps in single quotes and escapes embedded quotes", () => {
		expect(shellQuote("echo hi")).toBe("'echo hi'");
		expect(shellQuote("it's")).toBe(`'it'\\''s'`);
	});
});

describe("StepRunner", () => {
	it("runs a step through the preamble, records it, and returns the result", async () => {
		const commands: string[] = [];
		const sandbox: SandboxHandle = {
			runCommand: async (command) => {
				commands.push(command);
				return { exitCode: 0, stdout: "ok" };
			},
			destroy: async () => undefined,
		};
		const runner = new StepRunner(sandbox);

		const result = await runner.run("echo", "echo hi", 5_000);

		expect(result.exitCode).toBe(0);
		expect(runner.stepLog).toHaveLength(1);
		expect(runner.stepLog[0]).toMatchObject({ label: "echo", phase: "setup", exitCode: 0 });
		expect(commands[0]).toContain(PREAMBLE);
		expect(commands[0]).toContain("echo hi");
	});

	it("throws on a non-zero exit unless allowFailure is set", async () => {
		const sandbox: SandboxHandle = {
			runCommand: async () => ({ exitCode: 1 }),
			destroy: async () => undefined,
		};
		const runner = new StepRunner(sandbox);

		await expect(runner.run("fail", "false", 5_000)).rejects.toThrow(/exit code 1/);
		const tolerated = await runner.run("fail-ok", "false", 5_000, { allowFailure: true });
		expect(tolerated.exitCode).toBe(1);
	});
});

describe("StepRunner.runDetached", () => {
	// A fake sandbox whose filesystem reports the done-file present after `readyAfter` polls and
	// serves canned log/exit-code contents — the detached transport's two reads.
	function detachedSandbox(opts: { readyAfter?: number; exitCode?: string; log?: string }): {
		sandbox: SandboxHandle;
		commands: Array<{ command: string; background?: boolean }>;
	} {
		const commands: Array<{ command: string; background?: boolean }> = [];
		let polls = 0;
		const sandbox: SandboxHandle = {
			runCommand: async (command, options) => {
				commands.push({ command, background: options?.background });
				return { exitCode: 0, stdout: "" };
			},
			destroy: async () => undefined,
			filesystem: {
				exists: async (path) => path.endsWith(".done") && polls++ >= (opts.readyAfter ?? 0),
				readFile: async (path) =>
					path.endsWith(".done") ? (opts.exitCode ?? "0") : (opts.log ?? "benchmark output"),
			},
		};
		return { sandbox, commands };
	}

	it("starts the step in the background and returns the polled log + exit code", async () => {
		const { sandbox, commands } = detachedSandbox({ log: "ran on the host", exitCode: "0\n" });
		const runner = new StepRunner(sandbox);

		const result = await runner.runDetached("bench", "mise run benchmark", 60_000);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe("ran on the host");
		// First command is the detached start, flagged background; never a synchronous foreground exec.
		expect(commands[0]?.background).toBe(true);
		expect(commands[0]?.command).toContain("nohup setsid");
		expect(runner.stepLog).toHaveLength(1);
		expect(runner.stepLog[0]).toMatchObject({ label: "bench", exitCode: 0 });
	});

	it("propagates a non-zero detached exit code as a failure", async () => {
		const { sandbox } = detachedSandbox({ exitCode: "42" });
		const runner = new StepRunner(sandbox);
		await expect(runner.runDetached("bench", "false", 60_000)).rejects.toThrow(/exit code 42/);
	});

	it("times out (and best-effort kills) when the done-file never appears", async () => {
		// exists always false → never ready; a 0ms budget trips the deadline on the first poll.
		const commands: string[] = [];
		const sandbox: SandboxHandle = {
			runCommand: async (command) => {
				commands.push(command);
				return { exitCode: 0, stdout: "" };
			},
			destroy: async () => undefined,
			filesystem: { exists: async () => false, readFile: async () => "" },
		};
		const runner = new StepRunner(sandbox);
		await expect(runner.runDetached("bench", "sleep 999", 0)).rejects.toThrow(/timed out/);
		expect(commands.some((c) => c.includes("pkill"))).toBe(true);
	});

	it("falls back to the foreground transport when the sandbox has no filesystem", async () => {
		const commands: string[] = [];
		const sandbox: SandboxHandle = {
			runCommand: async (command) => {
				commands.push(command);
				return { exitCode: 0, stdout: "fg" };
			},
			destroy: async () => undefined,
		};
		const runner = new StepRunner(sandbox);
		const result = await runner.runDetached("bench", "echo hi", 5_000);
		expect(result.stdout).toBe("fg");
		// Foreground path: a single synchronous bash -c exec, no background flag, no detach wrapper.
		expect(commands[0]).toContain("bash -c");
		expect(commands[0]).not.toContain("nohup setsid");
	});
});
