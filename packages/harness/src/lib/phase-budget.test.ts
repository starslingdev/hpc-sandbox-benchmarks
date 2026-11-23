import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { SandboxSession } from "@sandbox-benchmarks/driver";
import { SessionStepRunner } from "./execute.ts";

test("an exhausted phase never launches a subsequent command", async () => {
	let calls = 0;
	let deadline = Date.now() + 60_000;
	const session: SandboxSession = {
		sandboxRef: { provider: "tama", id: "test" },
		artifact: { kind: "none" },
		native: undefined,
		destroy: async () => {},
		exec: async () => {
			calls++;
			return {
				exit: { kind: "exited", code: 0 },
				stdout: "",
				stderr: "",
				durationMs: 1,
				truncated: false,
			};
		},
	};
	const runner = new SessionStepRunner(
		session,
		{ syncCapMs: null, durable: "none" },
		undefined,
		{ mode: "fixed", times: 2 },
		() => deadline,
	);
	runner.phase = "benchmark";
	await runner.step("first command", "true", 1000);
	deadline = Date.now() - 1;
	await expect(runner.step("second command", "true", 1000)).rejects.toThrow("phase deadline");
	expect(calls).toBe(1);
});

test("foreground transport failure preserves attempted phase with unknown exit", async () => {
	const session: SandboxSession = {
		sandboxRef: { provider: "tama", id: "test" },
		artifact: { kind: "none" },
		native: undefined,
		destroy: async () => {},
		exec: async () => {
			throw new Error("transport unavailable");
		},
	};
	const runner = new SessionStepRunner(session, { syncCapMs: null, durable: "none" });
	runner.phase = "benchmark";
	await expect(runner.run("workload", "true", 1000)).rejects.toThrow("transport unavailable");
	expect(runner.stepLog).toMatchObject([{ label: "workload", phase: "benchmark", exitCode: null }]);
});

test("managed checkout gets the pinned tree in one commit when the branch has moved", async () => {
	const { REPO_URL, setupSteps } = await import("./setup.ts");
	const { SUITES } = await import("@sandbox-benchmarks/schema");
	const home = mkdtempSync(join(tmpdir(), "bench-source-"));
	try {
		// Only this fixture's repositories: an inherited GIT_DIR (as in a git hook) would point the
		// clone script's init, remote and fetch at the caller's checkout.
		const env = Object.fromEntries(
			Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
		);
		const origin = join(home, "origin.git");
		const checkout = join(home, "sandbox-benchmarks");
		const init = Bun.spawnSync(["git", "init", "--bare", "--initial-branch=main", origin], {
			env,
		});
		expect(init.exitCode, init.stderr.toString()).toBe(0);
		const history = [1, 2]
			.map((n) =>
				[
					"commit refs/heads/main",
					`committer Fixture <fixture@example.com> 100000000${n} +0000`,
					"data 1",
					String(n),
					"M 100644 inline workload",
					"data 1",
					String(n),
					"",
				].join("\n"),
			)
			.join("\n");
		const write = Bun.spawnSync(["git", "-C", origin, "fast-import", "--quiet"], {
			env,
			stdin: Buffer.from(history),
		});
		expect(write.exitCode, write.stderr.toString()).toBe(0);
		const git = (dir: string, ...args: string[]) =>
			Bun.spawnSync(["git", "-C", dir, ...args], { env, stdout: "pipe" })
				.stdout.toString()
				.trim();
		const sha = git(origin, "rev-parse", "main^");
		const clone = setupSteps(SUITES.pgbench, sha).find((step) => step.label === "clone repo");
		if (!clone) throw new Error("clone step missing");
		const result = Bun.spawnSync(["bash", "-c", clone.script], {
			env: {
				...env,
				HOME: home,
				GIT_CONFIG_COUNT: "1",
				GIT_CONFIG_KEY_0: `url.${pathToFileURL(origin).href}.insteadOf`,
				GIT_CONFIG_VALUE_0: REPO_URL,
			},
		});
		expect(result.exitCode, result.stderr.toString()).toBe(0);
		expect(git(checkout, "rev-parse", "HEAD")).toBe(sha);
		expect(git(checkout, "rev-parse", "--is-shallow-repository")).toBe("true");
		expect(readFileSync(join(checkout, "workload"), "utf8")).toBe("1");
		expect(git(checkout, "config", "--get", "remote.origin.url")).toBe(REPO_URL);
	} finally {
		rmSync(home, { recursive: true, force: true });
	}
});
