import { describe, expect, test } from "bun:test";
import type { ClauseId, ClauseStatus } from "./conformance.ts";
import {
	admissionFailures,
	CONFORMANCE_CLAUSES,
	formatConformanceReport,
	runConformance,
	selectExecutionRoute,
	verifyDriverReadiness,
} from "./conformance.ts";
import type { DriverModule } from "./lib/define.ts";
import { DriverError } from "./lib/errors.ts";
import type { ExecutionPolicy } from "./lib/policy.ts";
import type {
	CreateRequest,
	ExecResult,
	Exit,
	ResolvedArtifact,
	SandboxDriver,
	SandboxSession,
} from "./lib/port.ts";

/* --------------------------- a controllable in-memory driver --------------------------- */

interface FakeOptions {
	readonly execution?: ExecutionPolicy;
	readonly withFiles?: boolean;
	readonly withLaunch?: boolean;
	readonly withProbes?: boolean;
	readonly withSnapshots?: boolean;
	readonly artifact?: ResolvedArtifact;
	/** Report this artifact on the session instead of the requested one. */
	readonly reportArtifact?: ResolvedArtifact;
	/** Override the exit a given command reports — the fabrication lever. */
	readonly exitFor?: (command: string) => Exit | undefined;
	/** Keep reporting `running` after destroy resolves. */
	readonly neverConverges?: boolean;
	/** Swallow detached launches so no done-file ever appears. */
	readonly swallowLaunch?: boolean;
	/** Claim a filesystem whose `exists` lies, the UnsupportedFileSystem shape. */
	readonly lyingExists?: boolean;
	readonly readiness?: DriverModule<"e2b", unknown>["readiness"];
	readonly accelerator?: DriverModule<"e2b", unknown>["accelerator"];
	/** Return a session for a gpu request even with no accelerator strategy. */
	readonly acceptsGpuWithoutStrategy?: boolean;
	/** Bill an allocation and only afterwards reject the gpu request. */
	readonly allocatesBeforeRefusingGpu?: boolean;
	/** Files present in the guest before the suite runs (an in-image marker, for fingerprinting). */
	readonly seedFiles?: Readonly<Record<string, string>>;
	/** Expose a native filesystem disconnected from the guest seen by exec. */
	readonly disconnectedFiles?: boolean;
	/** Number of destroy calls that fail before teardown succeeds. */
	readonly destroyFailures?: number;
}

const BAKED: ResolvedArtifact = { kind: "baked", ref: "toolchain-v8" };

function fakeDriver(options: FakeOptions = {}): {
	driver: SandboxDriver;
	allocations: () => number;
} {
	const files = new Map<string, string>(Object.entries(options.seedFiles ?? {}));
	const nativeFiles = options.disconnectedFiles
		? new Map<string, string>(Object.entries(options.seedFiles ?? {}))
		: files;
	let destroyed = false;
	let destroyAttempts = 0;
	let allocations = 0;

	// A shell faithful to exactly the command shapes the kit emits. This matters: the "fallback is
	// tested, not skipped" rule is only true if the fake actually executes base64-chunked writes,
	// `mv`, and `cat` rather than pattern-matching them away.
	const unquote = (value: string): string =>
		value.startsWith("'") && value.endsWith("'")
			? value.slice(1, -1).replaceAll(`'\\''`, "'")
			: value;

	const runSimple = (raw: string): { stdout: string; code: number } => {
		const command = raw.trim();
		if (command.length === 0 || /^sleep /.test(command)) return { stdout: "", code: 0 };

		const exitCode = /^exit (\d+)$/.exec(command);
		if (exitCode?.[1] !== undefined) return { stdout: "", code: Number(exitCode[1]) };

		const nohup = /^nohup \/bin\/sh -lc ('(?:[^']|'\\'')*')/.exec(command);
		if (nohup?.[1] !== undefined) {
			// runSimple, not runScript: the inner is a single `sh -c '…; …'` invocation, and splitting
			// on `;` before unquoting tears the quoted script apart — which silently broke the
			// shell-detach fallback this fake exists to exercise.
			if (!options.swallowLaunch) runSimple(unquote(nohup[1]));
			return { stdout: "", code: 0 };
		}

		const nested = /^sh -c ('(?:[^']|'\\'')*')$/.exec(command);
		// Propagate the inner status: a wrapper that swallowed it would make the fake itself commit
		// the exit-code fabrication this suite exists to catch.
		if (nested?.[1] !== undefined) return runScript(unquote(nested[1]));

		const truncate = /^: > (\S+)$/.exec(command);
		if (truncate?.[1] !== undefined) {
			files.set(unquote(truncate[1]), "");
			return { stdout: "", code: 0 };
		}

		const append = /^printf '%s' '([^']*)' \| base64 -d >> (\S+)$/.exec(command);
		if (append?.[1] !== undefined && append[2] !== undefined) {
			const path = unquote(append[2]);
			const decoded = Buffer.from(append[1], "base64").toString("utf8");
			files.set(path, (files.get(path) ?? "") + decoded);
			return { stdout: "", code: 0 };
		}

		const move = /^mv (\S+) (\S+)$/.exec(command);
		if (move?.[1] !== undefined && move[2] !== undefined) {
			const from = unquote(move[1]);
			const to = unquote(move[2]);
			const body = files.get(from);
			if (body === undefined) return { stdout: "", code: 1 };
			files.delete(from);
			files.set(to, body);
			return { stdout: "", code: 0 };
		}

		const read = /^cat (\S+)$/.exec(command);
		if (read?.[1] !== undefined) {
			const body = files.get(unquote(read[1]));
			return body === undefined ? { stdout: "", code: 1 } : { stdout: body, code: 0 };
		}

		const remove = /^rm -f (\S+)$/.exec(command);
		if (remove?.[1] !== undefined) {
			files.delete(unquote(remove[1]));
			return { stdout: "", code: 0 };
		}

		const redirect = /^echo (\S+) > (\S+)$/.exec(command);
		if (redirect?.[1] !== undefined && redirect[2] !== undefined) {
			files.set(unquote(redirect[2]), `${redirect[1]}\n`);
			return { stdout: "", code: 0 };
		}

		if (command === "echo out") return { stdout: "out\n", code: 0 };
		if (command === "echo err 1>&2") return { stdout: "", code: 0 };
		if (command.startsWith("nvidia-smi")) return { stdout: "NVIDIA H100 80GB HBM3\n", code: 0 };
		return { stdout: "", code: 0 };
	};

	/** Run a `;`-separated script, stopping at the first nonzero status. */
	const runScript = (script: string): { stdout: string; code: number } => {
		let stdout = "";
		let code = 0;
		for (const part of script.split(";")) {
			const result = runSimple(part);
			stdout += result.stdout;
			code = result.code;
			if (code !== 0) break;
		}
		return { stdout, code };
	};

	const exec = async (command: string): Promise<ExecResult> => {
		const override = options.exitFor?.(command);
		// The launch wrapper carries shell bookkeeping past the nohup; only its head is modelled.
		const script = command.startsWith("nohup ")
			? (command.split(" & child=$!")[0] ?? command)
			: command;
		// runSimple, not runScript: splitting on `;` first would tear apart a quoted `sh -c '…; …'`.
		const result = runSimple(script);
		const stderr = script.includes("echo err 1>&2") ? "err\n" : "";
		const exit: Exit = override ?? { kind: "exited", code: result.code };
		return { exit, stdout: result.stdout, stderr, durationMs: 1, truncated: false };
	};

	const session = (requested: ResolvedArtifact): SandboxSession => {
		const base: SandboxSession = {
			sandboxRef: { provider: "e2b", id: "isandbox" },
			artifact: options.reportArtifact ?? requested,
			native: undefined,
			exec,
			destroy: async () => {
				destroyAttempts += 1;
				if (destroyAttempts <= (options.destroyFailures ?? 0)) {
					throw new DriverError("destroy-failed", "injected destroy failure", {
						provider: "e2b",
					});
				}
				destroyed = true;
			},
		};
		const withFiles = options.withFiles
			? {
					...base,
					files: {
						readFile: async (path: string) => nativeFiles.get(path) ?? "",
						exists: async (path: string) => (options.lyingExists ? false : nativeFiles.has(path)),
						writeText: async (path: string, text: string) => {
							nativeFiles.set(path, text);
						},
					},
				}
			: base;
		return options.withLaunch
			? {
					...withFiles,
					launch: async (command: string) => {
						if (options.swallowLaunch) return;
						await exec(command.replace("sleep 1; ", ""));
					},
				}
			: withFiles;
	};

	const driver: SandboxDriver = {
		create: async (request: CreateRequest) => {
			if (request.gpu !== undefined && options.accelerator === undefined) {
				if (options.allocatesBeforeRefusingGpu) {
					allocations += 1;
					throw new DriverError("invalid-create-request", "gpu is not supported", {
						provider: "e2b",
					});
				}
				if (!options.acceptsGpuWithoutStrategy) {
					// Refuse BEFORE allocating: the row's whole point is that a refusal costs nothing.
					throw new DriverError("invalid-create-request", "gpu is not supported", {
						provider: "e2b",
					});
				}
			}
			allocations += 1;
			return session(request.artifact);
		},
		...(options.withProbes
			? {
					probes: {
						observe: async () => ({
							state: options.neverConverges
								? ("running" as const)
								: destroyed
									? ("absent" as const)
									: ("running" as const),
						}),
					},
				}
			: {}),
		...(options.withSnapshots
			? {
					snapshots: {
						create: async () => ({ snapshotId: "snap-1" }),
						delete: async () => {},
					},
				}
			: {}),
	};
	return { driver, allocations: () => allocations };
}

const DEFAULT_EXECUTION: ExecutionPolicy = { syncCapMs: 60_000, durable: "shell-detach" };

function fakeModule(options: FakeOptions = {}): DriverModule<"e2b", unknown> & {
	readonly allocations: () => number;
} {
	const { driver, allocations } = fakeDriver(options);
	return {
		allocations,
		id: "e2b",
		provenance: { packageName: "fake", version: "0.0.0" },
		readiness: options.readiness ?? { startup: "create-returns-ready" },
		execution: options.execution ?? DEFAULT_EXECUTION,
		...(options.accelerator === undefined ? {} : { accelerator: options.accelerator }),
		driver: () => driver,
	};
}

function fakeContext(artifact: ResolvedArtifact = BAKED) {
	return {
		env: { E2B_API_KEY: "sentinel" },
		artifact: { kind: "baked" },
		resolvedArtifact: artifact,
	} as unknown as Parameters<typeof runConformance<"e2b", unknown>>[0]["context"];
}

async function run(options: FakeOptions = {}, extra: Record<string, unknown> = {}) {
	const module = fakeModule(options);
	return runConformance({
		module,
		// The kit tier can see the fake's own counter, so the GPU row's ordering requirement is
		// observable here rather than taken on trust.
		observeAllocations: module.allocations,
		context: fakeContext(options.artifact ?? BAKED),
		tier: "kit",
		// The kit tier drives an in-memory fake; a live-tier durable budget would make every PR wait
		// two minutes per negative case.
		durableBudgetMs: 200,
		durablePollIntervalMs: 10,
		...extra,
	});
}

function statusOf(
	clauses: readonly { clause: ClauseId; status: ClauseStatus }[],
	clause: ClauseId,
): ClauseStatus {
	const found = clauses.find((entry) => entry.clause === clause);
	if (found === undefined) throw new Error(`clause ${clause} missing from the report`);
	return found.status;
}

/* ---------------------------------------- tests ---------------------------------------- */

describe("the report shape", () => {
	test("every inventory clause appears exactly once, in order", async () => {
		const report = await run({ withFiles: true, withLaunch: true, withProbes: true });
		expect(report.clauses.map((clause) => clause.clause)).toEqual([...CONFORMANCE_CLAUSES]);
	});

	test("a conforming driver passes every observable row", async () => {
		const report = await run({ withFiles: true, withLaunch: true, withProbes: true });
		const failures = report.clauses.filter((clause) => clause.status === "fail");
		expect(failures.map((clause) => `${clause.clause}: ${clause.detail}`)).toEqual([]);
		for (const clause of [
			"core-lifecycle",
			"readiness",
			"filesystem",
			"durable-execution",
		] as const) {
			expect(statusOf(report.clauses, clause)).toBe("pass");
		}
		expect(statusOf(report.clauses, "sync-routing")).toBe("pass");
		expect(statusOf(report.clauses, "control-plane-convergence")).toBe("pass");
	});

	test("unverified rows block admission exactly like failures", async () => {
		const report = await run({ withFiles: true, withLaunch: true, withProbes: true });
		// Secret diagnostics and the un-exercised gpu axis are unverified in this tier, so a driver
		// that breaks nothing is still not admissible — an unobserved claim is not a green one.
		expect(statusOf(report.clauses, "secret-diagnostics")).toBe("unverified");
		expect(report.admissible).toBe(false);
		expect(admissionFailures(report).map((clause) => clause.clause)).toContain(
			"secret-diagnostics",
		);
	});

	test("a fully observed conforming driver is admissible", async () => {
		const accelerator = {
			family: "nvidia",
			command: "nvidia-smi --query-gpu=name --format=csv,noheader",
			parse: (stdout: string) => ({ model: stdout.trim(), count: 1 }),
			matches: (
				requested: { model: string; count: number },
				observed: { model: string; count: number },
			) => observed.model.includes(requested.model) && observed.count === requested.count,
		};
		const report = await run(
			{
				accelerator,
				withFiles: true,
				withLaunch: true,
				withProbes: true,
				seedFiles: { "/etc/toolchain": "toolchain-v8\n" },
			},
			{
				fingerprint: {
					artifact: BAKED,
					command: "cat /etc/toolchain",
					expect: "toolchain-v8",
				},
				gpu: { model: "H100", count: 1 },
				secretDiagnostics: async () => ({
					kind: "observed" as const,
					sensitiveValues: ["sentinel-secret"],
					diagnostics: ["--token ***"],
					executionReceivedSecrets: true,
				}),
			},
		);
		expect(
			report.clauses.filter(
				(clause) => clause.status !== "pass" && clause.status !== "not-applicable",
			),
		).toEqual([]);
		expect(report.admissible).toBe(true);
	});

	test("the formatted report names the verdict and every clause", async () => {
		const text = formatConformanceReport(await run({ withProbes: true }));
		expect(text).toContain("e2b (kit tier): BLOCKED");
		for (const clause of CONFORMANCE_CLAUSES) expect(text).toContain(clause);
	});
});

describe("core lifecycle", () => {
	test("catches a fabricated exit code", async () => {
		// The `?? 1` fabrication ADR-0007 catalogued: the guest exited 7, the driver reports 1.
		const report = await run({
			exitFor: (command) => (command.includes("exit 7") ? { kind: "exited", code: 1 } : undefined),
		});
		expect(statusOf(report.clauses, "core-lifecycle")).toBe("fail");
	});

	test("catches a withheld exit code presented as success", async () => {
		const report = await run({
			exitFor: (command) =>
				command.includes("exit 7") ? { kind: "unknown", detail: "vendor withheld" } : undefined,
		});
		expect(statusOf(report.clauses, "core-lifecycle")).toBe("fail");
	});

	test("catches stderr leaking into stdout", async () => {
		const module = fakeModule();
		const driver = module.driver({} as never);
		const original = driver.create;
		const leaking: SandboxDriver = {
			...driver,
			create: async (request) => {
				const session = await original.call(driver, request);
				return {
					...session,
					exec: async (command: string) => {
						const result = await session.exec(command);
						return command.includes("echo out")
							? { ...result, stdout: "out\nerr\n", stderr: "err\n" }
							: result;
					},
				};
			},
		};
		const report = await runConformance({
			module: { ...module, driver: () => leaking },
			context: fakeContext(),
			tier: "kit",
			durableBudgetMs: 200,
			durablePollIntervalMs: 10,
		});
		expect(statusOf(report.clauses, "core-lifecycle")).toBe("fail");
	});
});

describe("filesystem", () => {
	test("is tested through the kit fallback when the session has no files", async () => {
		const report = await run({ withFiles: false, withProbes: true });
		// "fallback is tested, not skipped" — absence must never produce not-applicable here.
		expect(statusOf(report.clauses, "filesystem")).toBe("pass");
	});

	test("catches a present-but-lying filesystem", async () => {
		// The namespace incident in miniature: the capability is advertised, the reads are wrong.
		const report = await run({ withFiles: true, lyingExists: true });
		expect(statusOf(report.clauses, "filesystem")).toBe("fail");
	});

	test("catches a native filesystem disconnected from the exec-visible guest", async () => {
		const report = await run({ withFiles: true, disconnectedFiles: true });
		expect(statusOf(report.clauses, "filesystem")).toBe("fail");
	});
});

describe("durable execution", () => {
	test("catches a launch that never produces a done-file", async () => {
		const report = await run({ withLaunch: true, swallowLaunch: true });
		expect(statusOf(report.clauses, "durable-execution")).toBe("fail");
	}, 130_000);

	test("passes through the kit's shell-detach fallback, with no native launch", async () => {
		// Without this the fallback path was never asserted to reach a done-file, and a fake that
		// could not run the nohup wrapper at all looked exactly like a passing suite.
		const report = await run({ withLaunch: false });
		expect(statusOf(report.clauses, "durable-execution")).toBe("pass");
	}, 10_000);

	test("catches native-launch declared without a launch member", async () => {
		const report = await run({
			execution: { syncCapMs: 60_000, durable: "native-launch" },
			withLaunch: false,
		});
		expect(statusOf(report.clauses, "durable-execution")).toBe("fail");
	});

	test("is not-applicable only when there is no durable route and no cap", async () => {
		const report = await run({ execution: { syncCapMs: null, durable: "none" } });
		expect(statusOf(report.clauses, "durable-execution")).toBe("not-applicable");
		expect(statusOf(report.clauses, "sync-routing")).toBe("not-applicable");
	});
});

describe("sync routing", () => {
	test("the kit router sends a step at the cap to the durable path", () => {
		const execution: ExecutionPolicy = { syncCapMs: 60_000, durable: "shell-detach" };
		expect(selectExecutionRoute(execution, 60_000)).toBe("durable");
		expect(selectExecutionRoute(execution, 59_999)).toBe("sync");
		expect(selectExecutionRoute(execution, 600_000)).toBe("durable");
	});

	test("an uncapped policy never routes durable", () => {
		expect(selectExecutionRoute({ syncCapMs: null, durable: "shell-detach" }, 10 ** 9)).toBe(
			"sync",
		);
	});
});

describe("artifact identity", () => {
	test("agreement without a guest fingerprint is unverified, not pass", async () => {
		const report = await run({ withProbes: true });
		expect(statusOf(report.clauses, "artifact-identity")).toBe("unverified");
	});

	test("a matching guest fingerprint upgrades it to pass", async () => {
		const report = await run(
			{ withProbes: true, seedFiles: { "/etc/toolchain": "toolchain-v8\n" } },
			{ fingerprint: { artifact: BAKED, command: "cat /etc/toolchain", expect: "toolchain-v8" } },
		);
		expect(statusOf(report.clauses, "artifact-identity")).toBe("pass");
	});

	test("catches a guest booted from an artifact other than the one reported", async () => {
		// The failure the fingerprint exists to catch: the control plane says v8, the guest is v7.
		const report = await run(
			{ withProbes: true, seedFiles: { "/etc/toolchain": "toolchain-v7\n" } },
			{ fingerprint: { artifact: BAKED, command: "cat /etc/toolchain", expect: "toolchain-v8" } },
		);
		expect(statusOf(report.clauses, "artifact-identity")).toBe("fail");
	});

	test("rejects a matching fingerprint expectation bound to a different artifact", async () => {
		const report = await run(
			{ seedFiles: { "/etc/toolchain": "toolchain-v8\n" } },
			{
				fingerprint: {
					artifact: { kind: "baked", ref: "toolchain-v7" },
					command: "cat /etc/toolchain",
					expect: "toolchain-v8",
				},
			},
		);
		expect(statusOf(report.clauses, "artifact-identity")).toBe("fail");
	});

	test("catches a driver reporting an artifact it was not asked for", async () => {
		const report = await run({ reportArtifact: { kind: "baked", ref: "something-else" } });
		expect(statusOf(report.clauses, "artifact-identity")).toBe("fail");
	});

	test("is not-applicable for a provider that boots stock", async () => {
		const report = await run({ artifact: { kind: "none" } });
		expect(statusOf(report.clauses, "artifact-identity")).toBe("not-applicable");
	});
});

describe("control-plane convergence", () => {
	test("catches destroy resolving while the sandbox is still running", async () => {
		await expect(run({ withProbes: true, neverConverges: true })).rejects.toMatchObject({
			code: "conformance-cleanup-failed",
		});
	});

	test("omitting probes is unverified, never a silent pass", async () => {
		const report = await run({ withProbes: false });
		expect(statusOf(report.clauses, "control-plane-convergence")).toBe("unverified");
	});

	test("records a destroy violation after a successful cleanup retry", async () => {
		const report = await run({ withProbes: true, destroyFailures: 1 });
		expect(statusOf(report.clauses, "control-plane-convergence")).toBe("fail");
	});

	test("preserves cleanup ownership when teardown keeps failing", async () => {
		await expect(run({ withProbes: true, destroyFailures: 2 })).rejects.toMatchObject({
			code: "conformance-cleanup-failed",
		});
	});
});

describe("secret diagnostics", () => {
	test("passes kit evidence only when execution received the redacted sentinel", async () => {
		const report = await run(
			{},
			{
				secretDiagnostics: async () => ({
					kind: "observed" as const,
					sensitiveValues: ["sentinel-secret"],
					diagnostics: ["argv: --token ***", "create failed: redacted"],
					executionReceivedSecrets: true,
				}),
			},
		);
		expect(statusOf(report.clauses, "secret-diagnostics")).toBe("pass");
	});

	test("catches a secret in any observed diagnostic surface", async () => {
		const report = await run(
			{},
			{
				secretDiagnostics: async () => ({
					kind: "observed" as const,
					sensitiveValues: ["sentinel-secret"],
					diagnostics: ["safe", "argv: --token sentinel-secret"],
					executionReceivedSecrets: true,
				}),
			},
		);
		expect(statusOf(report.clauses, "secret-diagnostics")).toBe("fail");
	});
});

describe("snapshots", () => {
	test("absent is not-applicable; present must round-trip", async () => {
		expect(statusOf((await run({})).clauses, "snapshots")).toBe("not-applicable");
		expect(statusOf((await run({ withSnapshots: true })).clauses, "snapshots")).toBe("pass");
	});
});

describe("gpu", () => {
	const accelerator = {
		family: "nvidia",
		command: "nvidia-smi --query-gpu=name --format=csv,noheader",
		parse: (stdout: string) => ({ model: stdout.trim(), count: 1 }),
		matches: (
			requested: { model: string; count: number },
			observed: { model: string; count: number },
		) => observed.model.includes(requested.model) && observed.count === requested.count,
	};

	test("a driver with no strategy must refuse before allocating", async () => {
		const report = await run({}, { gpu: { model: "H100", count: 1 } });
		expect(statusOf(report.clauses, "gpu")).toBe("pass");
	});

	test("catches a driver that allocates first and only then refuses", async () => {
		// The refusal looks identical across the port either way; only the allocation count separates
		// a free rejection from one the account is already being billed for.
		const report = await run(
			{ allocatesBeforeRefusingGpu: true },
			{ gpu: { model: "H100", count: 1 } },
		);
		expect(statusOf(report.clauses, "gpu")).toBe("fail");
	});

	test("is unverified when nobody can observe the allocation ordering", async () => {
		// A live tier with no counter must not accept the refusal on trust; §5 blocks admission.
		const module = fakeModule({});
		const report = await runConformance({
			module,
			context: fakeContext(),
			tier: "smoke",
			durableBudgetMs: 200,
			durablePollIntervalMs: 10,
			gpu: { model: "H100", count: 1 },
		});
		expect(statusOf(report.clauses, "gpu")).toBe("unverified");
	});

	test("catches a driver that returns a session for a gpu it cannot provide", async () => {
		// Silently benchmarking CPU is the failure mode this row exists for.
		const report = await run(
			{ acceptsGpuWithoutStrategy: true },
			{ gpu: { model: "H100", count: 1 } },
		);
		expect(statusOf(report.clauses, "gpu")).toBe("fail");
	});

	test("a declared strategy must confirm the requested model in-guest", async () => {
		const report = await run({ accelerator }, { gpu: { model: "H100", count: 1 } });
		expect(statusOf(report.clauses, "gpu")).toBe("pass");
	});

	test("catches a guest reporting a different accelerator than requested", async () => {
		const report = await run({ accelerator }, { gpu: { model: "A100", count: 1 } });
		expect(statusOf(report.clauses, "gpu")).toBe("fail");
	});

	test("turns a throwing gpu probe into a failure after cleaning up its session", async () => {
		const report = await run(
			{
				accelerator,
				exitFor: (command) => {
					if (command.startsWith("nvidia-smi")) throw new Error("probe transport broke");
					return;
				},
			},
			{ gpu: { model: "H100", count: 1 } },
		);
		expect(statusOf(report.clauses, "gpu")).toBe("fail");
		expect(report.clauses.find((clause) => clause.clause === "gpu")?.detail).toContain(
			"probe transport broke",
		);
	});

	test("no gpu axis leaves the row unverified rather than passing it", async () => {
		expect(statusOf((await run({})).clauses, "gpu")).toBe("unverified");
	});
});

describe("readiness", () => {
	test("runs readiness before any lifecycle command", async () => {
		let ready = false;
		const report = await run({
			exitFor: () => (ready ? undefined : { kind: "exited", code: 1 }),
			readiness: {
				startup: "create-then-poll",
				signal: "vendor-state",
				totalBudgetMs: 1_000,
				attemptTimeoutMs: 100,
				probe: async () => {
					ready = true;
					return { status: "ready" };
				},
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("pass");
		expect(statusOf(report.clauses, "core-lifecycle")).toBe("pass");
	});

	test("create-returns-ready must be usable with no polling", async () => {
		const report = await run({
			readiness: { startup: "create-returns-ready" },
			exitFor: (command) => (command.includes("exit 0") ? { kind: "exited", code: 1 } : undefined),
		});
		expect(statusOf(report.clauses, "readiness")).toBe("fail");
	});

	test("bounds and reaps the create-returns-ready verification exec", async () => {
		let cancellationObserved = false;
		let settled = false;
		const session: SandboxSession = {
			sandboxRef: { provider: "e2b", id: "isandbox" },
			artifact: BAKED,
			native: undefined,
			exec: (_command, options) =>
				new Promise<ExecResult>((_resolve, reject) => {
					const signal = options?.signal;
					if (signal === undefined) throw new Error("verification exec received no signal");
					signal.addEventListener(
						"abort",
						() => {
							cancellationObserved = true;
							queueMicrotask(() => {
								settled = true;
								reject(signal.reason);
							});
						},
						{ once: true },
					);
				}),
			destroy: async () => {},
		};

		const outcome = await verifyDriverReadiness(fakeModule(), session, {
			createReturnsReadyTimeoutMs: 10,
		});

		expect(outcome.status).toBe("fail");
		expect(outcome.detail).toContain("exceeded its 10ms budget");
		expect(cancellationObserved).toBe(true);
		expect(settled).toBe(true);
	});

	test("a create-then-poll signal must reach ready inside its declared budget", async () => {
		const report = await run({
			readiness: {
				startup: "create-then-poll",
				signal: "exec",
				totalBudgetMs: 1_000,
				attemptTimeoutMs: 100,
				probe: async () => ({ status: "pending" }),
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("fail");
	}, 10_000);

	test("a terminal readiness signal fails immediately", async () => {
		const report = await run({
			readiness: {
				startup: "create-then-poll",
				signal: "vendor-state",
				totalBudgetMs: 60_000,
				attemptTimeoutMs: 1_000,
				probe: async () => ({ status: "terminal", detail: "status=failed" }),
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("fail");
	});

	test("a probe that never settles cannot hang the suite", async () => {
		// The defect this guards: an unbounded `await` on a stalled probe never returns to re-test the
		// loop condition, so neither declared bound can end it and the suite inherits the driver's hang.
		const started = performance.now();
		const report = await run({
			readiness: {
				startup: "create-then-poll",
				signal: "vendor-state",
				totalBudgetMs: 300,
				attemptTimeoutMs: 50,
				probe: () => new Promise(() => {}),
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("fail");
		// Bounded by the DECLARED total budget, not by the test runner giving up on us.
		expect(performance.now() - started).toBeLessThan(3_000);
	}, 10_000);

	test("does not retry a timed-out probe that ignores cancellation", async () => {
		let attempts = 0;
		const report = await run({
			readiness: {
				startup: "create-then-poll",
				signal: "exec",
				totalBudgetMs: 5_000,
				attemptTimeoutMs: 25,
				probe: () => {
					attempts += 1;
					return new Promise(() => {});
				},
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("fail");
		expect(attempts).toBe(1);
		expect(report.clauses.find((clause) => clause.clause === "readiness")?.detail).toContain(
			"refusing to overlap retries",
		);
	}, 10_000);

	test("cancels each abandoned attempt instead of leaving probes in flight", async () => {
		// Abandoning without cancelling leaves one stalled probe per retry; over a long budget those
		// accumulate into concurrent requests aimed at the sandbox under test.
		const signals: AbortSignal[] = [];
		const report = await run({
			readiness: {
				startup: "create-then-poll",
				signal: "vendor-state",
				totalBudgetMs: 400,
				attemptTimeoutMs: 30,
				probe: (_session, options) => {
					if (options?.signal !== undefined) signals.push(options.signal);
					return new Promise((_resolve, reject) => {
						options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), {
							once: true,
						});
					});
				},
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("fail");
		expect(signals.length).toBeGreaterThan(1);
		// Every abandoned attempt is cancelled, not just the last one.
		expect(signals.every((signal) => signal.aborted)).toBe(true);
	}, 10_000);

	test("a probe slower than its declared per-attempt timeout is reported as such", async () => {
		const report = await run({
			readiness: {
				startup: "create-then-poll",
				signal: "cli",
				totalBudgetMs: 300,
				attemptTimeoutMs: 25,
				// Eventually ready, but only by breaking the bound the module itself declared.
				probe: async () => {
					await Bun.sleep(200);
					return { status: "ready" as const };
				},
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("fail");
		const readiness = report.clauses.find((clause) => clause.clause === "readiness");
		expect(readiness?.detail).toContain("per-attempt timeout");
	}, 10_000);

	test("a signal that reaches ready passes", async () => {
		const report = await run({
			readiness: {
				startup: "create-then-poll",
				signal: "cli",
				totalBudgetMs: 60_000,
				attemptTimeoutMs: 1_000,
				probe: async () => ({ status: "ready" }),
			},
		});
		expect(statusOf(report.clauses, "readiness")).toBe("pass");
	});
});

describe("create failure", () => {
	test("a timed-out create retains and later disposes its eventual session", async () => {
		const module = fakeModule();
		let resolveCreate!: (session: SandboxSession) => void;
		const pending = new Promise<SandboxSession>((resolve) => {
			resolveCreate = resolve;
		});
		let destroyed = false;
		const timedOut = runConformance({
			module: { ...module, driver: () => ({ create: async () => pending }) },
			context: fakeContext(),
			tier: "kit",
			deadlineMs: 20,
		}).catch((error: unknown) => error);
		const error = (await timedOut) as AsyncDisposable & { readonly name: string };
		expect(error.name).toBe("ConformanceCreateTimeoutError");
		resolveCreate({
			sandboxRef: { provider: "e2b", id: "late" },
			artifact: BAKED,
			native: undefined,
			exec: async () => ({
				exit: { kind: "exited", code: 0 },
				stdout: "",
				stderr: "",
				durationMs: 0,
				truncated: false,
			}),
			destroy: async () => {
				destroyed = true;
			},
		});
		await error[Symbol.asyncDispose]();
		expect(destroyed).toBe(true);
	});

	test("a driver that cannot create reports fail and leaves the rest unverified", async () => {
		const module = fakeModule();
		const report = await runConformance({
			module: {
				...module,
				driver: () => ({
					create: async () => {
						throw new DriverError("create-failed", "capacity", { provider: "e2b" });
					},
				}),
			},
			context: fakeContext(),
			tier: "kit",
			durableBudgetMs: 200,
			durablePollIntervalMs: 10,
		});
		expect(statusOf(report.clauses, "core-lifecycle")).toBe("fail");
		expect(statusOf(report.clauses, "filesystem")).toBe("unverified");
		expect(report.admissible).toBe(false);
		// Every clause still appears; none is silently dropped.
		expect(report.clauses).toHaveLength(CONFORMANCE_CLAUSES.length);
	});
});
