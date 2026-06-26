import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DirectProvider, ProviderConfig } from "@sandbox-benchmarks/providers";
import type { Suite } from "@sandbox-benchmarks/schema";
import {
	hasRequiredCreds,
	missingCreds,
	requiredProviders,
	runSuite,
	runSuiteOnSandbox,
	SuiteUsageError,
	timeOperation,
	unmetRequirements,
	withSandbox,
} from "./index.ts";
import type { SandboxHandle } from "./lib/execute.ts";

// A transport capability for the test fixtures — capped-with-detach, matching a single-round-trip
// provider; none of these tests exercise real exec, so the exact values are inert here.
const fixtureTransport = { streaming: false, syncCapMs: 60_000, detachedPoll: true } as const;

// timeOperation only reads identity, never calls createCompute — a throwing stub keeps this unit
// test free of any real SDK while staying fully typed.
const config: ProviderConfig = {
	name: "e2b",
	requiredEnvVars: [],
	transport: fixtureTransport,
	createCompute: () => {
		throw new Error("not exercised");
	},
};

// A fake provider that records its lifecycle calls, so withSandbox can be exercised offline with no
// real SDK. Only the methods withSandbox touches are implemented; the cast recovers the full type.
function fakeProvider(calls: string[], opts: { destroyFails?: boolean } = {}): ProviderConfig {
	const sandbox = {
		sandboxId: "sb-1",
		provider: "e2b",
		runCommand: (cmd: string) => {
			calls.push(`run:${cmd}`);
			return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
		},
		destroy: () => {
			calls.push("destroy");
			return opts.destroyFails ? Promise.reject(new Error("destroy failed")) : Promise.resolve();
		},
	};
	const compute = {
		sandbox: {
			create: () => {
				calls.push("create");
				return Promise.resolve(sandbox);
			},
		},
	} as unknown as DirectProvider;
	return {
		name: "e2b",
		requiredEnvVars: [],
		transport: fixtureTransport,
		createCompute: () => compute,
	};
}

describe("@sandbox-benchmarks/harness", () => {
	it("times an operation and emits a raw run for the provider", async () => {
		const run = await timeOperation(config, "spawn", () => {});
		expect(run.provider).toBe("e2b");
		expect(run.operation).toBe("spawn");
		expect(run.durationMs).toBeGreaterThan(0);
	});

	it("withSandbox creates, runs the body, then destroys", async () => {
		const calls: string[] = [];
		const out = await withSandbox(fakeProvider(calls), async (sb) => {
			await sb.runCommand("echo hi");
			return "result";
		});
		expect(out).toBe("result");
		expect(calls).toEqual(["create", "run:echo hi", "destroy"]);
	});

	it("withSandbox destroys even when the body throws", async () => {
		const calls: string[] = [];
		await expect(
			withSandbox(fakeProvider(calls), async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect(calls).toEqual(["create", "destroy"]);
	});

	it("withSandbox surfaces the body error, not a teardown error, when both fail", async () => {
		const calls: string[] = [];
		// destroy also rejects — the original "boom" must win so the root cause isn't masked, and
		// destroy must be attempted exactly once (no double-teardown).
		await expect(
			withSandbox(fakeProvider(calls, { destroyFails: true }), async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect(calls).toEqual(["create", "destroy"]);
	});

	it("withSandbox surfaces a teardown failure on the success path", async () => {
		const calls: string[] = [];
		// fn succeeded but destroy fails — a leaked sandbox is worth failing on, so it surfaces.
		await expect(
			withSandbox(fakeProvider(calls, { destroyFails: true }), async () => "ok"),
		).rejects.toThrow("destroy failed");
		expect(calls).toEqual(["create", "destroy"]);
	});

	// Named "modal", so it carries modal's real (uncapped) transport rather than the capped
	// fixtureTransport — these creds tests never read transport, but keeping the fixture faithful to
	// the name stops a future transport-aware test from exercising E2B/Daytona semantics under a
	// modal-named config.
	const credsCfg: ProviderConfig = {
		name: "modal",
		requiredEnvVars: ["A", "B"],
		transport: { streaming: false, syncCapMs: null, detachedPoll: true },
		createCompute: () => {
			throw new Error("not exercised");
		},
	};

	it("missingCreds lists the required vars that are unset or empty", () => {
		expect(missingCreds(credsCfg, { A: "1", B: "2" })).toEqual([]);
		expect(missingCreds(credsCfg, { A: "1", B: "" })).toEqual(["B"]);
		expect(missingCreds(credsCfg, {})).toEqual(["A", "B"]);
	});

	it("hasRequiredCreds is true only when every required var is present and non-empty", () => {
		expect(hasRequiredCreds(credsCfg, { A: "1", B: "2" })).toBe(true);
		expect(hasRequiredCreds(credsCfg, { A: "1", B: "" })).toBe(false);
		expect(hasRequiredCreds(credsCfg, { A: "1" })).toBe(false);
		expect(hasRequiredCreds({ ...credsCfg, requiredEnvVars: [] }, {})).toBe(true);
	});

	it("requiredProviders parses --require, --require=, and the env fallback (empty by default)", () => {
		expect(requiredProviders([], {})).toEqual([]);
		expect(requiredProviders(["--require", "e2b,daytona,modal"], {})).toEqual([
			"e2b",
			"daytona",
			"modal",
		]);
		expect(requiredProviders(["--require=e2b, daytona"], {})).toEqual(["e2b", "daytona"]);
		// A bare --require with no value falls through to the env var rather than swallowing the next flag.
		expect(requiredProviders(["--require", "--other"], { REQUIRE_PROVIDERS: "modal" })).toEqual([
			"modal",
		]);
		// CLI takes precedence over env.
		expect(requiredProviders(["--require", "e2b"], { REQUIRE_PROVIDERS: "modal" })).toEqual([
			"e2b",
		]);
	});

	it("unmetRequirements flags required providers that did not run-and-pass", () => {
		const reports = [
			{ provider: "e2b", status: "ok" },
			{ provider: "daytona", status: "skipped" },
			{ provider: "modal", status: "failed" },
		];
		expect(unmetRequirements(reports, [])).toEqual([]);
		expect(unmetRequirements(reports, ["e2b"])).toEqual([]);
		// skipped, failed, and entirely-absent (a typo'd id) all count as unmet.
		expect(unmetRequirements(reports, ["e2b", "daytona", "modal", "typo"])).toEqual([
			"daytona",
			"modal",
			"typo",
		]);
	});
});

const work = mkdtempSync(join(tmpdir(), "harness-runsuite-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

let dirSeq = 0;
const freshDir = (): string => join(work, `r${dirSeq++}`);

// Build the stdout the in-sandbox collect command emits: BEGIN/END markers around a base64'd tar of a
// benchmark-results/ directory holding the given files — what runSuiteOnSandbox extracts.
function collectPayload(files: Record<string, string>): string {
	const src = mkdtempSync(join(tmpdir(), "harness-collect-src-"));
	mkdirSync(join(src, "benchmark-results"), { recursive: true });
	for (const [name, contents] of Object.entries(files)) {
		writeFileSync(join(src, "benchmark-results", name), contents);
	}
	const b64 = execFileSync("bash", ["-c", "tar -czf - benchmark-results | base64 | tr -d '\\n'"], {
		cwd: src,
		encoding: "utf8",
	});
	rmSync(src, { recursive: true, force: true });
	return `__BENCH_RESULTS_TGZ_BEGIN__\n${b64}\n__BENCH_RESULTS_TGZ_END__\n`;
}

// A fake sandbox that dispatches on command content: the disk probe, the benchmark command (token
// `benchmark-cmd`), and the base64 collect stream. No filesystem, so runDetached uses the foreground
// path. `destroyed` flips when teardown runs.
function makeSandbox(opts: {
	freeKb?: string;
	benchmarkFails?: boolean;
	collectFails?: boolean;
	collectFiles?: Record<string, string>;
	destroyed: { hit: boolean };
}): SandboxHandle {
	return {
		async runCommand(command) {
			if (command.includes("df -Pk")) return { exitCode: 0, stdout: opts.freeKb ?? "999999999" };
			if (command.includes("base64")) {
				if (opts.collectFails) return { exitCode: 1, stderr: "collect boom" };
				const files = opts.collectFiles ?? { "pts_node-web-tooling.xml": "<xml/>" };
				return { exitCode: 0, stdout: collectPayload(files) };
			}
			if (command.includes("benchmark-cmd")) {
				return opts.benchmarkFails ? { exitCode: 1, stderr: "bench boom" } : { exitCode: 0 };
			}
			return { exitCode: 0, stdout: "" };
		},
		async destroy() {
			opts.destroyed.hit = true;
			return undefined;
		},
	};
}

const suite = (overrides: Partial<Suite>): Suite => ({
	commandTimeoutMinutes: 1,
	timeoutMinutes: 1,
	commands: ["benchmark-cmd"],
	...overrides,
});

const ctx = (s: Suite, resultsDir: string) => ({
	suite: s,
	suiteName: "cpu-node",
	providerName: "daytona",
	resultsDir,
	// Daytona-shaped: synchronous execs capped, detached+poll available. The fake sandbox has no
	// filesystem, so a detached selection falls back to the foreground path — behavior is unchanged.
	transport: fixtureTransport,
});

describe("runSuite (resolution + credential gate)", () => {
	it("rejects an unknown suite as a usage error", async () => {
		await expect(
			runSuite({ providerName: "daytona", suiteName: "nope", resultsDir: freshDir() }),
		).rejects.toBeInstanceOf(SuiteUsageError);
	});

	it("rejects an unknown provider as a usage error", async () => {
		await expect(
			runSuite({ providerName: "nope", suiteName: "cpu-node", resultsDir: freshDir() }),
		).rejects.toBeInstanceOf(SuiteUsageError);
	});

	it("records a skip marker (not a failure) when credentials are missing", async () => {
		const resultsDir = freshDir();
		// Empty env → daytona's required key is absent, so the suite skips before any sandbox is created.
		await runSuite({ providerName: "daytona", suiteName: "cpu-node", resultsDir, env: {} });
		expect(existsSync(join(resultsDir, "sandbox-daytona-cpu-node--skipped.json"))).toBe(true);
	});
});

describe("runSuiteOnSandbox (orchestration + teardown)", () => {
	it("runs the suite, collects results, and tears the sandbox down", async () => {
		const resultsDir = freshDir();
		const destroyed = { hit: false };
		const sandbox = makeSandbox({
			destroyed,
			collectFiles: { "pts_node-web-tooling.xml": "<x/>" },
		});
		await runSuiteOnSandbox(sandbox, ctx(suite({ setupPts: true }), resultsDir));
		expect(existsSync(join(resultsDir, "pts_node-web-tooling.xml"))).toBe(true);
		expect(destroyed.hit).toBe(true);
	});

	it("tears the sandbox down even when the benchmark fails, and propagates the error", async () => {
		const destroyed = { hit: false };
		const sandbox = makeSandbox({ destroyed, benchmarkFails: true });
		await expect(runSuiteOnSandbox(sandbox, ctx(suite({}), freshDir()))).rejects.toThrow(
			/exit code 1/,
		);
		expect(destroyed.hit).toBe(true);
	});

	it("prefers the benchmark error over a later collect failure", async () => {
		const destroyed = { hit: false };
		const sandbox = makeSandbox({ destroyed, benchmarkFails: true, collectFails: true });
		// The in-flight benchmark error wins; the collect failure is logged, not thrown.
		await expect(runSuiteOnSandbox(sandbox, ctx(suite({}), freshDir()))).rejects.toThrow(
			/bench boom|exit code 1/,
		);
		expect(destroyed.hit).toBe(true);
	});

	it("surfaces a collect failure when the benchmark succeeded", async () => {
		const destroyed = { hit: false };
		const sandbox = makeSandbox({ destroyed, collectFails: true });
		await expect(runSuiteOnSandbox(sandbox, ctx(suite({}), freshDir()))).rejects.toThrow(
			/exit code 1/,
		);
		expect(destroyed.hit).toBe(true);
	});

	it("skips (marker, no throw) and tears down when free disk is below the suite minimum", async () => {
		const resultsDir = freshDir();
		const destroyed = { hit: false };
		// 1 KiB free, suite needs 50 GiB.
		const sandbox = makeSandbox({ destroyed, freeKb: "1" });
		await runSuiteOnSandbox(sandbox, ctx(suite({ minDiskGb: 50 }), resultsDir));
		expect(existsSync(join(resultsDir, "sandbox-daytona-cpu-node--skipped.json"))).toBe(true);
		expect(destroyed.hit).toBe(true);
	});

	it("fails a PTS suite that collected no pts_*.xml (silent PTS failure)", async () => {
		const destroyed = { hit: false };
		// Collect succeeds (a skip marker satisfies collection) but yields no pts_*.xml.
		const sandbox = makeSandbox({
			destroyed,
			collectFiles: { "sandbox-daytona-cpu-node--skipped.json": '{"skipped":true}' },
		});
		await expect(
			runSuiteOnSandbox(sandbox, ctx(suite({ setupPts: true }), freshDir())),
		).rejects.toThrow(/no pts_\*\.xml/);
		expect(destroyed.hit).toBe(true);
	});
});
