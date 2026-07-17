import { describe, expect, it } from "bun:test";
import type { ProviderTransport } from "@sandbox-benchmarks/schema";
import type { SandboxHandle } from "./execute.ts";
import {
	buildPreamble,
	MIN,
	PREAMBLE,
	StepRunner,
	selectTransport,
	shellQuote,
} from "./execute.ts";

const CAPPED: ProviderTransport = { streaming: false, syncCapMs: MIN, detachedPoll: true };
const UNCAPPED: ProviderTransport = { streaming: false, syncCapMs: null, detachedPoll: true };
const CAPPED_NO_DETACH: ProviderTransport = {
	streaming: false,
	syncCapMs: MIN,
	detachedPoll: false,
};

describe("selectTransport", () => {
	it("detaches a step that could reach or outlast a capped provider's synchronous limit", () => {
		// Budget past the cap, and the provider supports detached+poll → detached.
		expect(selectTransport(CAPPED, 2 * MIN)).toBe("detached");
		// Budget exactly at the cap could run right up to a hard limit with no margin (E2B's cap *is*
		// its SDK connection timeout) → detached, not sync. The boundary is inclusive of detach.
		expect(selectTransport(CAPPED, MIN)).toBe("detached");
	});

	it("keeps a step safely within the cap synchronous", () => {
		// Strictly under the cap → direct exec.
		expect(selectTransport(CAPPED, MIN - 1)).toBe("sync");
		expect(selectTransport(CAPPED, MIN / 2)).toBe("sync");
	});

	it("keeps every step synchronous on an uncapped provider", () => {
		// No cap → a synchronous exec is always safe, even for a long step.
		expect(selectTransport(UNCAPPED, 200 * MIN)).toBe("sync");
	});

	it("stays synchronous past the cap when the provider can't detach (no durable alternative)", () => {
		expect(selectTransport(CAPPED_NO_DETACH, 5 * MIN)).toBe("sync");
	});
});

describe("sandbox preamble", () => {
	it("does not auto-install repository developer tools when running benchmark tasks", () => {
		expect(PREAMBLE).toContain("MISE_TASK_RUN_AUTO_INSTALL=0");
	});

	it("reuses the baked PTS registry for an injected unprivileged runtime user", () => {
		expect(PREAMBLE).toContain("PTS_USER_PATH_OVERRIDE=/var/lib/phoronix-test-suite/");
	});

	// buildPreamble omits the trial vars entirely under BENCH_PASSES=1 (contract-verification mode), so
	// these trial-count assertions only hold outside it — skip in that mode rather than fail a contract run.
	it.skipIf(process.env.BENCH_PASSES === "1")(
		"uses two fixed PTS trials by default for a publishable comparison",
		() => {
			expect(PREAMBLE).toContain("PTS_RESPECT_TIMES_TO_RUN=1");
			expect(PREAMBLE).toContain("FORCE_TIMES_TO_RUN=2");
		},
	);

	it.skipIf(process.env.BENCH_PASSES === "1")(
		"pins the PTS repeat count (k) a suite requests",
		() => {
			expect(buildPreamble(1)).toContain("FORCE_TIMES_TO_RUN=1");
			expect(buildPreamble(3)).toContain("FORCE_TIMES_TO_RUN=3");
			// The variance-driven policy stays disabled at every k so a noisy provider can't stretch a suite.
			expect(buildPreamble(3)).toContain("PTS_RESPECT_TIMES_TO_RUN=1");
		},
	);

	it("rejects a non-positive or fractional k (would emit an empty/bogus FORCE_TIMES_TO_RUN)", () => {
		// Throws before touching the env, so this holds in every mode including BENCH_PASSES=1.
		expect(() => buildPreamble(0)).toThrow(/positive integer/);
		expect(() => buildPreamble(-1)).toThrow(/positive integer/);
		expect(() => buildPreamble(1.5)).toThrow(/positive integer/);
	});
});

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

	// Same BENCH_PASSES=1 caveat as the preamble tests above: the k is only emitted when trials are on.
	it.skipIf(process.env.BENCH_PASSES === "1")(
		"threads a per-suite PTS repeat count (k) into every step's preamble",
		async () => {
			const commands: string[] = [];
			const sandbox: SandboxHandle = {
				runCommand: async (command) => {
					commands.push(command);
					return { exitCode: 0, stdout: "ok" };
				},
				destroy: async () => undefined,
			};
			const runner = new StepRunner(sandbox, undefined, undefined, 3);
			await runner.run("echo", "echo hi", 5_000);
			expect(commands[0]).toContain("FORCE_TIMES_TO_RUN=3");
			expect(commands[0]).not.toContain("FORCE_TIMES_TO_RUN=2");
		},
	);

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
		// Double-fork daemonization: an outer nohup launches an inner nohup, not a single setsid.
		expect(commands[0]?.command).toContain("nohup");
		expect(commands[0]?.command).not.toContain("setsid");
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

	it("surfaces the detached log's tail on timeout, before the kill discards the sandbox", async () => {
		// Regression: the timeout path used to pkill and throw without ever reading logPath, so a hung
		// step (the one whose output matters most) was a black box in CI.
		const reads: string[] = [];
		const sandbox: SandboxHandle = {
			runCommand: async () => ({ exitCode: 0, stdout: "" }),
			destroy: async () => undefined,
			filesystem: {
				exists: async () => false,
				readFile: async (path) => {
					reads.push(path);
					return "line one\nStarted Run 18 @ 04:10:59 *";
				},
			},
		};
		const logged: string[] = [];
		const spy = console.log;
		console.log = (msg: string) => void logged.push(String(msg));
		try {
			const runner = new StepRunner(sandbox);
			await expect(runner.runDetached("bench", "sleep 999", 0)).rejects.toThrow(/timed out/);
		} finally {
			console.log = spy;
		}
		expect(reads.some((p) => p.endsWith(".log"))).toBe(true);
		expect(logged.join("\n")).toContain("Started Run 18");
	});

	it("distinguishes an unreadable log (wedged sandbox) from a quiet one", async () => {
		// A read that never resolves means the sandbox stopped answering — not that the step was silent.
		const sandbox: SandboxHandle = {
			runCommand: async () => ({ exitCode: 0, stdout: "" }),
			destroy: async () => undefined,
			filesystem: {
				exists: async () => false,
				readFile: async () => {
					throw new Error("sandbox unresponsive");
				},
			},
		};
		const logged: string[] = [];
		const spy = console.log;
		console.log = (msg: string) => void logged.push(String(msg));
		try {
			const runner = new StepRunner(sandbox);
			await expect(runner.runDetached("bench", "sleep 999", 0)).rejects.toThrow(/timed out/);
		} finally {
			console.log = spy;
		}
		expect(logged.join("\n")).toContain("stopped responding");
	});

	// A sandbox with NO filesystem API: the detached transport must still detach (double-fork) and
	// observe completion by `cat`-ing the done-file over exec. runCommand answers each command shape —
	// the launch (contains nohup), the done-file probe (`cat …done`), and the log read (`cat …log`).
	function catPollSandbox(opts: { readyAfter?: number; exitCode?: string; log?: string }): {
		sandbox: SandboxHandle;
		commands: Array<{ command: string; background?: boolean }>;
	} {
		const commands: Array<{ command: string; background?: boolean }> = [];
		const readyAfter = opts.readyAfter ?? 0;
		let probes = 0;
		const sandbox: SandboxHandle = {
			runCommand: async (command, options) => {
				commands.push({ command, background: options?.background });
				if (command.includes("nohup")) return { exitCode: 0, stdout: "launched" };
				if (command.includes(".done")) {
					const ready = probes++ >= readyAfter;
					return { exitCode: 0, stdout: ready ? (opts.exitCode ?? "0") : "__RUNNING__" };
				}
				return { exitCode: 0, stdout: opts.log ?? "cat output" }; // the `.log` read
			},
			destroy: async () => undefined,
		};
		return { sandbox, commands };
	}

	it("polls the done-file over exec when the sandbox has no filesystem", async () => {
		const { sandbox, commands } = catPollSandbox({
			readyAfter: 2,
			log: "ran via cat",
			exitCode: "0",
		});
		// Inject a no-op sleep so the two not-ready polls don't actually wait.
		const runner = new StepRunner(sandbox, CAPPED, async () => undefined);

		const result = await runner.runDetached("bench", "mise run benchmark", 60_000);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe("ran via cat");
		// Still a real detach: the launch is backgrounded and double-fork daemonized, not a foreground run.
		expect(commands[0]?.background).toBe(true);
		expect(commands[0]?.command).toContain("nohup");
		// Completion is observed by cat-ing the done-file (the no-filesystem fallback), then the log.
		expect(commands.some((c) => c.command.includes("cat") && c.command.includes(".done"))).toBe(
			true,
		);
		expect(commands.some((c) => c.command.includes("cat") && c.command.includes(".log"))).toBe(
			true,
		);
	});

	it("propagates a non-zero exit from the cat-polled done-file", async () => {
		const { sandbox } = catPollSandbox({ exitCode: "42" });
		const runner = new StepRunner(sandbox, CAPPED, async () => undefined);
		await expect(runner.runDetached("bench", "false", 60_000)).rejects.toThrow(/exit code 42/);
	});

	it("fails fast when the cat poll returns a non-zero exit — a wedged shell, not still-running", async () => {
		// Regression: the `|| echo __RUNNING__` guard makes bash exit 0 for both a present and an absent
		// done-file, so a non-zero exit means the shell itself couldn't run. runCommand RESOLVES with
		// that code rather than rejecting, so it slipped past the throw-based fast-fail and read as
		// "still running" — sitting on a wedged sandbox for the whole budget.
		let launched = false;
		const sandbox: SandboxHandle = {
			runCommand: async (command) => {
				if (!launched && command.includes("nohup")) {
					launched = true;
					return { exitCode: 0, stdout: "launched" };
				}
				return { exitCode: 137, stdout: "" }; // shell couldn't run: no reject, just a bad code
			},
			destroy: async () => undefined,
		};
		const runner = new StepRunner(sandbox, CAPPED, async () => undefined);
		await expect(runner.runDetached("bench", "mise run benchmark", 60 * 60_000)).rejects.toThrow(
			/lost its sandbox.*stopped responding/,
		);
	});

	it("fails fast when every detached poll throws — a dead sandbox, not a quiet step", async () => {
		// Regression: poll failures were swallowed as "not done yet", so a sandbox killed mid-step
		// (e2b orchestrator-stops, 2026-07-10) looked like a quietly-running benchmark for the WHOLE
		// command budget — CI cells sat on a corpse for 60+ minutes until the runner was reclaimed.
		let launched = false;
		const sandbox: SandboxHandle = {
			runCommand: async (command) => {
				if (!launched && command.includes("nohup")) {
					launched = true;
					return { exitCode: 0, stdout: "launched" };
				}
				throw new Error("sandbox is probably not running anymore");
			},
			destroy: async () => undefined,
			filesystem: {
				exists: async () => {
					throw new Error("sandbox is probably not running anymore");
				},
				readFile: async () => {
					throw new Error("sandbox is probably not running anymore");
				},
			},
		};
		const runner = new StepRunner(sandbox, CAPPED, async () => undefined);
		// Budget far above the poll-failure threshold: the fast-fail, not the deadline, must trip.
		await expect(runner.runDetached("bench", "mise run benchmark", 60 * 60_000)).rejects.toThrow(
			/lost its sandbox.*stopped responding/,
		);
	});

	it("tolerates a transient poll blip when later polls succeed", async () => {
		// One flaky poll must not kill an hour-long benchmark — only a consecutive run of failures may.
		let polls = 0;
		const sandbox: SandboxHandle = {
			runCommand: async () => ({ exitCode: 0, stdout: "launched" }),
			destroy: async () => undefined,
			filesystem: {
				exists: async (path) => {
					if (!path.endsWith(".done")) return false;
					polls++;
					if (polls === 1) throw new Error("transient fs blip");
					return polls >= 3;
				},
				readFile: async (path) => (path.endsWith(".done") ? "0" : "recovered fine"),
			},
		};
		const runner = new StepRunner(sandbox, CAPPED, async () => undefined);
		const result = await runner.runDetached("bench", "mise run benchmark", 60_000);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe("recovered fine");
	});

	it("distinguishes a wedged from a quiet sandbox on the no-filesystem path too", async () => {
		// Regression: readLogTail read the log via catFile, which folds every failure into "". On a
		// provider with no filesystem API the `.catch(() => null)` could therefore never fire, so a
		// wedged sandbox was reported as a step that ran quietly — the exact diagnosis this is meant to
		// tell apart. Only the fs path was covered before, which is how it shipped.
		const sandbox: SandboxHandle = {
			runCommand: async (command) => {
				if (command.includes("nohup")) return { exitCode: 0, stdout: "launched" };
				if (command.includes(".done")) return { exitCode: 0, stdout: "__RUNNING__" };
				throw new Error("sandbox unresponsive"); // the `.log` read
			},
			destroy: async () => undefined,
		};
		const logged: string[] = [];
		const spy = console.log;
		console.log = (msg: string) => void logged.push(String(msg));
		try {
			const runner = new StepRunner(sandbox, CAPPED, async () => undefined);
			await expect(runner.runDetached("bench", "sleep 999", 0)).rejects.toThrow(/timed out/);
		} finally {
			console.log = spy;
		}
		expect(logged.join("\n")).toContain("stopped responding");
	});

	it("backs off the poll interval geometrically up to the cap", async () => {
		// Done only after 7 not-ready polls → 7 inter-poll sleeps, exercising the geometric ramp + cap.
		const { sandbox } = detachedSandbox({ readyAfter: 7, exitCode: "0", log: "done" });
		const slept: number[] = [];
		const runner = new StepRunner(sandbox, CAPPED, async (ms) => {
			slept.push(ms);
		});

		await runner.runDetached("bench", "mise install", 60 * MIN);

		// 1.5s start, ×1.5 each poll, capped at 10s: 1500, 2250, 3375, 5062.5, 7593.75, 10000, 10000.
		expect(slept).toEqual([1_500, 2_250, 3_375, 5_062.5, 7_593.75, 10_000, 10_000]);
	});
});

describe("StepRunner.step (capability-driven transport)", () => {
	// A sandbox WITH a filesystem (so a detached selection truly detaches rather than falling back),
	// recording each command and its background flag. The done-file is present from the first poll.
	function fsSandbox(): {
		sandbox: SandboxHandle;
		commands: Array<{ command: string; background?: boolean }>;
	} {
		const commands: Array<{ command: string; background?: boolean }> = [];
		const sandbox: SandboxHandle = {
			runCommand: async (command, options) => {
				commands.push({ command, background: options?.background });
				return { exitCode: 0, stdout: "" };
			},
			destroy: async () => undefined,
			filesystem: {
				exists: async (path) => path.endsWith(".done"),
				readFile: async (path) => (path.endsWith(".done") ? "0" : "out"),
			},
		};
		return { sandbox, commands };
	}

	it("detaches a long step on a capped provider", async () => {
		const { sandbox, commands } = fsSandbox();
		const runner = new StepRunner(sandbox, CAPPED);
		await runner.step("long", "mise install", 20 * MIN);
		// Detached start: backgrounded, double-fork daemonized (nohup).
		expect(commands[0]?.background).toBe(true);
		expect(commands[0]?.command).toContain("nohup");
	});

	it("runs a short step synchronously on a capped provider", async () => {
		const { sandbox, commands } = fsSandbox();
		const runner = new StepRunner(sandbox, CAPPED);
		// Budget strictly under the cap → direct exec.
		await runner.step("short", "df -Pk /", MIN / 2);
		// Direct exec: a single bash -c, no background flag, no detach wrapper.
		expect(commands[0]?.background).toBeUndefined();
		expect(commands[0]?.command).toContain("bash -c");
		expect(commands[0]?.command).not.toContain("nohup");
	});

	it("stays synchronous past the cap on a provider that can't detach", async () => {
		// CAPPED_NO_DETACH exercises step()'s wiring end-to-end (selectTransport via the constructor):
		// even a long budget has no durable alternative, so it must stay a direct foreground exec and
		// never background. Guards the no-detach fallback against a future regression in step()'s wiring.
		const { sandbox, commands } = fsSandbox();
		const runner = new StepRunner(sandbox, CAPPED_NO_DETACH);
		await runner.step("long", "mise install", 5 * MIN);
		expect(commands[0]?.background).toBeUndefined();
		expect(commands[0]?.command).toContain("bash -c");
		expect(commands[0]?.command).not.toContain("nohup");
	});

	it("runs a long step synchronously on an uncapped provider", async () => {
		const { sandbox, commands } = fsSandbox();
		const runner = new StepRunner(sandbox, UNCAPPED);
		await runner.step("long", "mise run benchmark", 110 * MIN);
		// No cap → direct exec even for a multi-minute step; the filesystem is never polled.
		expect(commands[0]?.background).toBeUndefined();
		expect(commands[0]?.command).not.toContain("nohup");
	});

	it("defaults to a capped profile when constructed without a transport", async () => {
		// The no-transport constructor (used by the unit-test fakes) detaches a long step by default.
		const { sandbox, commands } = fsSandbox();
		const runner = new StepRunner(sandbox);
		await runner.step("long", "mise install", 20 * MIN);
		expect(commands[0]?.background).toBe(true);
	});
});
