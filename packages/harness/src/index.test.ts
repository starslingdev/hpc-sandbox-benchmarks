import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DirectProvider, ProviderConfig } from "@sandbox-benchmarks/providers";
import type { Suite } from "@sandbox-benchmarks/schema";
import {
	benchmarkLifecycle,
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
import type { CommandResult, SandboxHandle } from "./lib/execute.ts";
import type { LifecycleCompute } from "./lib/lifecycle.ts";

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

	// A lifecycle-capable fake provider: createCompute returns a structural LifecycleCompute (cast to the
	// SDK's DirectProvider, as the real adapters do), letting benchmarkLifecycle run with no real SDK.
	function lifecycleConfig(
		opts: { withSnapshot?: boolean; withList?: boolean; failCreateOnCycle?: number } = {},
	): ProviderConfig {
		let created = 0;
		const sandbox = {
			create: async () => {
				const cycle = ++created;
				if (cycle === opts.failCreateOnCycle) throw new Error("spawn boom");
				return {
					sandboxId: `sb-${cycle}`,
					runCommand: async () => ({ exitCode: 0 }),
					getInfo: async () => ({ status: "running" }),
					destroy: async () => undefined,
				};
			},
			...(opts.withList ? { list: async () => [] } : {}),
		};
		const compute: LifecycleCompute = { sandbox };
		if (opts.withSnapshot) {
			compute.snapshot = {
				create: async () => ({ id: "snap-1" }),
				delete: async () => undefined,
			};
		}
		return {
			name: "e2b",
			requiredEnvVars: [],
			transport: fixtureTransport,
			createCompute: () => compute as unknown as DirectProvider,
		};
	}

	it("benchmarkLifecycle runs N cold-start cycles and aggregates Samples per Metric", async () => {
		const result = await benchmarkLifecycle(
			lifecycleConfig({ withSnapshot: true, withList: true }),
			{
				iterations: 3,
				controlPlaneSamples: 2,
			},
		);
		expect(result.provider).toBe("e2b");
		// 3 cold starts → 3 spawn + 3 teardown Samples; 2 info probes per cycle → 6.
		const spawn = result.aggregates.find((a) => a.metricId === "lifecycle_spawn_ms");
		const info = result.aggregates.find((a) => a.metricId === "control_plane_info_ms");
		expect(spawn?.aggregates.n).toBe(3);
		expect(info?.aggregates.n).toBe(6);
		expect(result.gaps).toEqual([]);
	});

	it("benchmarkLifecycle dedups a repeated unsupported-op skip across cycles", async () => {
		const result = await benchmarkLifecycle(lifecycleConfig(), { iterations: 4 });
		// No snapshot/list support → one skip each, not four, despite four cycles.
		const snapshotSkips = result.gaps.filter((g) => g.id === "lifecycle_snapshot_ms");
		const listSkips = result.gaps.filter((g) => g.id === "control_plane_list_ms");
		expect(snapshotSkips.length).toBe(1);
		expect(listSkips.length).toBe(1);
		// Cold-start Samples still accrue per cycle.
		expect(result.aggregates.find((a) => a.metricId === "lifecycle_spawn_ms")?.aggregates.n).toBe(
			4,
		);
	});

	it("benchmarkLifecycle records a mid-run spawn failure as a failed gap and keeps the surviving cycles", async () => {
		const result = await benchmarkLifecycle(lifecycleConfig({ failCreateOnCycle: 2 }), {
			iterations: 3,
		});
		// Cycle 2 fails to spawn; cycles 1 and 3 still produce spawn/teardown Samples (not discarded).
		expect(result.aggregates.find((a) => a.metricId === "lifecycle_spawn_ms")?.aggregates.n).toBe(
			2,
		);
		expect(
			result.aggregates.find((a) => a.metricId === "lifecycle_teardown_ms")?.aggregates.n,
		).toBe(2);
		// The failure surfaces as a FAILED spawn gap carrying the create error — the provider was asked
		// for a sandbox and did not produce one, which is an outage, not a decision.
		const spawnGap = result.gaps.find((g) => g.id === "lifecycle_spawn_ms");
		expect(spawnGap?.reason).toBe("spawn boom");
		expect(spawnGap?.outcome).toBe("failed");
	});

	it("benchmarkLifecycle clamps a non-finite iterations to a single cycle", async () => {
		const result = await benchmarkLifecycle(lifecycleConfig(), { iterations: Number.NaN });
		// NaN must not make `i < iterations` never run (zero Samples) — it falls back to one cold start.
		expect(result.aggregates.find((a) => a.metricId === "lifecycle_spawn_ms")?.aggregates.n).toBe(
			1,
		);
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
// `benchmark-cmd`), and the base64 collect stream. No filesystem, so a detached step uses the
// cat-poll fallback — the detached launch wraps the real script (so the step's result is computed
// from the launch command) and is stashed under the step's tag for the done-file/log `cat` polls to
// read back, exercising the no-filesystem transport end-to-end. `destroyed` flips when teardown runs.
function makeSandbox(opts: {
	freeKb?: string;
	benchmarkFails?: boolean;
	collectFails?: boolean;
	collectFiles?: Record<string, string>;
	destroyed: { hit: boolean };
}): SandboxHandle {
	// Results of detached steps, keyed by their /tmp/<tag> so the cat-polls can read them back.
	const detached = new Map<string, { exit: number; out: string }>();
	const resultFor = (command: string): CommandResult => {
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
	};
	const tagOf = (command: string, ext: string): string | undefined =>
		command.match(new RegExp(`/tmp/(bench-[0-9a-f-]+)\\.${ext}`))?.[1];
	return {
		async runCommand(command) {
			// Detached launch (double-fork, so it carries nohup): compute the wrapped step's result and
			// stash it under its tag for the cat-polls. The launch itself just acknowledges.
			if (command.includes("nohup")) {
				const tag = tagOf(command, "log");
				if (tag) {
					const r = resultFor(command);
					detached.set(tag, { exit: r.exitCode, out: r.stdout ?? r.stderr ?? "" });
				}
				return { exitCode: 0, stdout: "launched" };
			}
			// Cat-poll of the done-file: the stashed exit code (present from launch), else still-running.
			const doneTag = tagOf(command, "done");
			if (doneTag) {
				const d = detached.get(doneTag);
				return { exitCode: 0, stdout: d ? String(d.exit) : "__RUNNING__" };
			}
			// Cat-read of the log: the stashed output (stderr merged into stdout, mirroring live 2>&1).
			const logTag = tagOf(command, "log");
			if (logTag) return { exitCode: 0, stdout: detached.get(logTag)?.out ?? "" };
			// Synchronous foreground exec (short steps: the disk probe, observed-specs).
			return resultFor(command);
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
	// The harness never reads dimensions/metrics (those drive the results contract, not orchestration);
	// keep the fixture empty so it stays decoupled from real catalog ids — like setup.test.ts's bare suite.
	dimensions: [],
	metrics: [],
	commands: ["benchmark-cmd"],
	...overrides,
});

const ctx = (s: Suite, resultsDir: string) => ({
	suite: s,
	suiteName: "cpu-node",
	providerName: "daytona",
	resultsDir,
	// Daytona-shaped: synchronous execs capped, detached+poll available. The fake sandbox has no
	// filesystem, so a detached selection drives the cat-poll fallback (done-file read over exec).
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
