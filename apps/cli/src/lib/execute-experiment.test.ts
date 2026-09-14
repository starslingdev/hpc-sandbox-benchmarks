import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExecResult, ProviderId, SandboxSession } from "@sandbox-benchmarks/driver";
import { loadDriverModule } from "@sandbox-benchmarks/drivers";
import { evaluateExperiment } from "@sandbox-benchmarks/results";
import { TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema/toolchain";
import type { AccountRecord } from "./account-journal.ts";
import { recoverAccount } from "./account-journal.ts";
import { recoverAllocatedIntent } from "./allocated-intent-recovery.ts";
import type { OpenedDriver } from "./driver-run.ts";
import { resolveDriverArtifact } from "./driver-run.ts";
import {
	batchIsComplete,
	cellStartupDeadline,
	executeExperimentBatch,
} from "./execute-experiment.ts";
import { readExperimentAttempt } from "./experiment-artifacts.ts";
import { workflowExperiment } from "./workflow-experiment.ts";

const root = mkdtempSync(join(tmpdir(), "experiment-integration-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const plan = workflowExperiment(
	{
		GITHUB_RUN_ID: "123",
		GITHUB_SHA: "a".repeat(40),
		BENCH_PROVIDERS: "tama",
		BENCH_SUITES: "cpu-node",
		BENCH_REPLICAS: "2",
		BENCH_PTS_PASSES: "2",
		BENCH_ACCOUNT_CAPACITY: '{"tama":{"sandboxes":2}}',
	},
	"2026-09-10",
);
const ok = (stdout = "", code = 0): ExecResult => ({
	stdout,
	stderr: "",
	exit: { kind: "exited", code },
	durationMs: 1,
	truncated: false,
});

function rollingPlan(id: string, replicas = 2, capacity = 1) {
	return workflowExperiment(
		{
			GITHUB_RUN_ID: id,
			GITHUB_SHA: plan.sha,
			BENCH_PROVIDERS: "tama",
			BENCH_SUITES: "cpu-node",
			BENCH_REPLICAS: String(replicas),
			BENCH_ACCOUNT_CAPACITY: JSON.stringify({ tama: { sandboxes: capacity } }),
		},
		"2026-09-13",
	);
}
async function fixture(name: string, failCleanup = false) {
	const directory = join(root, name);
	mkdirSync(directory, { recursive: true });
	const payloadRoot = join(directory, "payload");
	mkdirSync(join(payloadRoot, "benchmark-results"), { recursive: true });
	writeFileSync(
		join(payloadRoot, "benchmark-results", "pts_node-web-tooling.xml"),
		readFileSync(
			new URL(
				"../../../../packages/results/src/lib/__fixtures__/daytona-vm/pts_node-web-tooling.xml",
				import.meta.url,
			),
			"utf8",
		)
			.replace("16.19:16.3:16.08", "16.19:16.3")
			.replace("<Value>16.19</Value>", "<Value>16.245</Value>"),
	);
	const tar = Bun.spawnSync(["tar", "-czf", "-", "benchmark-results"], { cwd: payloadRoot });
	if (tar.exitCode !== 0) throw new Error("fixture archive failed");
	const payload = `__BENCH_RESULTS_TGZ_BEGIN__\n${tar.stdout.toString("base64")}\n__BENCH_RESULTS_TGZ_END__\n`;
	const records: AccountRecord[] = [];
	const events: string[] = [];
	const present = new Set<string>();
	let sequence = 0;
	let peak = 0;
	const artifact = resolveDriverArtifact("tama");
	const module = await loadDriverModule("tama");
	const opened: OpenedDriver = {
		artifact,
		module: {
			id: module.id,
			provenance: module.provenance,
			driver: () => {
				throw new Error("fixture is already opened");
			},
			readiness: { startup: "create-returns-ready" },
			execution: { syncCapMs: null, durable: "none" },
		},
		transport: { syncCapMs: null, detachedPoll: false, streaming: false },
		driver: {
			inventory: {
				list: async () => ({
					owned: [...present].map((id) => ({ provider: "tama" as const, id })),
					foreignCount: 0,
				}),
			},
			probes: { observe: async (ref) => ({ state: present.has(ref.id) ? "running" : "absent" }) },
			destroyById: async (ref) => {
				present.delete(ref.id);
			},
			create: async () => {
				const id = `sandbox-${++sequence}`;
				expect(records.filter((record) => record.kind === "intent").length).toBeGreaterThanOrEqual(
					sequence,
				);
				present.add(id);
				peak = Math.max(peak, present.size);
				events.push("create");
				const session: SandboxSession = {
					sandboxRef: { provider: "tama", id },
					artifact,
					native: undefined,
					exec: async (command) => {
						if (command.includes("/toolchain-manifest.json"))
							return ok(
								JSON.stringify({
									image_name: "sandbox-benchmarks-toolchain",
									image_version: TOOLCHAIN_VERSION,
								}),
							);
						if (command.includes("base64")) return ok(payload);
						if (command.includes("benchmark:cpu"))
							expect(
								records.some((record) => record.kind === "allocated" && record.ref.id === id),
							).toBe(true);
						return ok();
					},
					destroy: async () => {
						events.push("destroy");
						if (failCleanup) throw new Error("cleanup unavailable");
						present.delete(id);
					},
				};
				return session;
			},
		},
	};
	const options = {
		plan,
		batchId: "batch-0",
		root: join(directory, "attempts"),
		workflowAttempt: 1,
		job: "bench",
		open: async () => opened,
		journal: {
			read: async () => records,
			append: async (record: AccountRecord) => {
				records.push(record);
				events.push(record.kind);
			},
		},
		store: {
			upload: async (_name: string, path: string) => {
				readExperimentAttempt(path);
				events.push("upload");
			},
		},
	};
	return { options, records, events, present, peak: () => peak };
}

test("planned batch crosses the real harness, raw collector, normalizer and publication evaluator", async () => {
	const f = await fixture("complete");
	const attempts = await executeExperimentBatch(f.options);
	expect(attempts).toHaveLength(2);
	expect(f.peak()).toBeLessThanOrEqual(2);
	expect(f.present.size).toBe(0);
	expect(f.records.filter((record) => record.kind === "released")).toHaveLength(2);
	expect(batchIsComplete(plan, f.options.root, attempts)).toBe(true);
	expect(
		evaluateExperiment(
			plan,
			attempts.map((attempt) => readExperimentAttempt(join(f.options.root, attempt.id))),
		).complete,
	).toBe(true);
});

test("cleanup failure retains account ownership and blocks publication", async () => {
	const f = await fixture("cleanup", true);
	const attempts = await executeExperimentBatch(f.options);
	expect(
		attempts.every((attempt) => attempt.cleanup === "unresolved" && attempt.outcome === "failed"),
	).toBe(true);
	expect(f.records.filter((record) => record.kind === "released")).toHaveLength(0);
	expect(batchIsComplete(plan, f.options.root, attempts)).toBe(false);
});

test("rolling admission stops after uncertain cleanup and preserves every pending cell", async () => {
	const f = await fixture("rolling-cleanup", true);
	const constrained = rollingPlan("rolling-cleanup");
	expect(constrained.batches[0]?.cells).toHaveLength(2);
	const attempts = await executeExperimentBatch({ ...f.options, plan: constrained });
	expect(f.peak()).toBe(1);
	expect(f.events.filter((event) => event === "create")).toHaveLength(1);
	expect(attempts).toHaveLength(2);
	expect(attempts.map((attempt) => attempt.cleanup)).toEqual(["unresolved", "not-allocated"]);
	expect(attempts[1]?.diagnostic).toContain("admission stopped");
	expect(f.records.filter((record) => record.kind === "intent")).toHaveLength(1);
});

test("ambiguous creates and unacknowledged releases stop rolling admission", async () => {
	const { DriverError, FailedCreateCleanupError } = await import("@sandbox-benchmarks/driver");
	for (const kind of ["create", "release"] as const) {
		const f = await fixture(`rolling-${kind}`);
		const constrained = rollingPlan(`rolling-${kind}`);
		let creates = 0;
		const open = f.options.open;
		f.options.open = async () => {
			const opened = await open();
			return {
				...opened,
				driver: {
					...opened.driver,
					create: async (request, options) => {
						creates += 1;
						if (kind === "create")
							throw new FailedCreateCleanupError(
								new Error("cleanup unknown"),
								new DriverError("create-failed", "boot interrupted", { provider: "tama" }),
								{
									provider: "tama",
									locator: { kind: "name", value: "bench-unknown" },
									cleanup: async () => {
										throw new Error("cleanup unknown");
									},
								},
							);
						return opened.driver.create(request, options);
					},
				},
			};
		};
		const append = f.options.journal.append;
		f.options.journal.append = async (record) => {
			if (kind === "release" && record.kind === "released")
				throw new Error("release not acknowledged");
			await append(record);
		};
		const attempts = await executeExperimentBatch({ ...f.options, plan: constrained });
		expect(creates).toBe(1);
		expect(attempts).toHaveLength(2);
		expect(attempts[1]?.cleanup).toBe("not-allocated");
		expect(attempts[1]?.diagnostic).toContain("admission stopped");
		expect(f.records.filter((record) => record.kind === "intent")).toHaveLength(1);
	}
});

test("successful cleanup refills slots and a stopped account still releases healthy peers", async () => {
	const clean = await fixture("rolling-success");
	const successful = await executeExperimentBatch({
		...clean.options,
		plan: rollingPlan("rolling-success"),
	});
	expect(successful.every((attempt) => attempt.outcome === "completed")).toBe(true);
	expect(clean.peak()).toBe(1);
	expect(clean.events.filter((event) => event === "create")).toHaveLength(2);
	expect(clean.present.size).toBe(0);

	const f = await fixture("rolling-peer");
	const firstFinished = Promise.withResolvers<void>();
	const open = f.options.open;
	f.options.open = async () => {
		const opened = await open();
		return {
			...opened,
			driver: {
				...opened.driver,
				create: async (request, options) => {
					const session = await opened.driver.create(request, options);
					const first = session.sandboxRef.id === "sandbox-1";
					return {
						...session,
						exec: async (command, options) => {
							if (!first && command.includes("mise run benchmark:cpu:node"))
								await firstFinished.promise;
							return session.exec(command, options);
						},
						destroy: async (options) => {
							if (first) throw new Error("cleanup uncertain");
							await session.destroy(options);
						},
					};
				},
			},
		};
	};
	const upload = f.options.store.upload;
	f.options.store.upload = async (name, path) => {
		await upload(name, path);
		if (readExperimentAttempt(path).evidence.cellId.endsWith("-r0")) firstFinished.resolve();
	};
	const attempts = await executeExperimentBatch({
		...f.options,
		plan: rollingPlan("rolling-peer", 3, 2),
	});
	expect(attempts.map((attempt) => attempt.cleanup)).toEqual([
		"unresolved",
		"confirmed",
		"not-allocated",
	]);
	expect(attempts[1]?.outcome).toBe("completed");
	expect(f.events.filter((event) => event === "create")).toHaveLength(2);
	expect(f.records.filter((record) => record.kind === "released")).toHaveLength(1);
	expect(f.present.size).toBe(1);
});

test("a vendor concurrent limit stops refill while accepted peers finish and release", async () => {
	const { DriverError } = await import("@sandbox-benchmarks/driver");
	const f = await fixture("rolling-capacity");
	const rejectionRecorded = Promise.withResolvers<void>();
	const open = f.options.open;
	let creates = 0;
	f.options.open = async () => {
		const opened = await open();
		return {
			...opened,
			driver: {
				...opened.driver,
				create: async (request, options) => {
					if (++creates > 1)
						throw new DriverError("create-failed", "vendor refused allocation", {
							provider: "tama",
							vendorHttpStatus: 429,
							vendorMessage: "concurrent sandbox resource limit reached",
						});
					const session = await opened.driver.create(request, options);
					return {
						...session,
						exec: async (command, options) => {
							if (command.includes("mise run benchmark:cpu:node")) await rejectionRecorded.promise;
							return session.exec(command, options);
						},
					};
				},
			},
		};
	};
	const upload = f.options.store.upload;
	f.options.store.upload = async (name, path) => {
		await upload(name, path);
		if (readExperimentAttempt(path).evidence.cellId.endsWith("-r1")) rejectionRecorded.resolve();
	};
	const attempts = await executeExperimentBatch({
		...f.options,
		plan: rollingPlan("rolling-capacity", 3, 2),
	});
	expect(creates).toBe(2);
	expect(attempts).toHaveLength(3);
	expect(attempts[0]?.outcome).toBe("completed");
	expect(attempts.map((attempt) => attempt.cleanup)).toEqual([
		"confirmed",
		"not-allocated",
		"not-allocated",
	]);
	expect(attempts[2]?.measurementStarted).toBe(false);
	expect(attempts[2]?.diagnostic).toContain("reconcile BENCH_ACCOUNT_CAPACITY");
	expect(f.records.filter((record) => record.kind === "intent")).toHaveLength(2);
	expect(f.records.filter((record) => record.kind === "released")).toHaveLength(2);
	expect(f.present.size).toBe(0);
});

test("a journal failure blocks peer refill before the failed allocation finishes cleanup", async () => {
	const f = await fixture("journal-failure-during-cleanup");
	const cleanupEntered = Promise.withResolvers<void>();
	const finishCleanup = Promise.withResolvers<void>();
	const open = f.options.open;
	f.options.open = async () => {
		const opened = await open();
		return {
			...opened,
			driver: {
				...opened.driver,
				create: async (request, options) => {
					const session = await opened.driver.create(request, options);
					const first = session.sandboxRef.id === "sandbox-1";
					return {
						...session,
						exec: async (command, options) => {
							if (!first) await cleanupEntered.promise;
							return session.exec(command, options);
						},
						destroy: async (options) => {
							if (first) {
								cleanupEntered.resolve();
								await finishCleanup.promise;
							}
							await session.destroy(options);
						},
					};
				},
			},
		};
	};
	const append = f.options.journal.append;
	f.options.journal.append = async (record) => {
		if (record.kind === "allocated" && record.ref.id === "sandbox-1")
			throw new Error("allocation journal unavailable");
		await append(record);
	};
	const upload = f.options.store.upload;
	f.options.store.upload = async (name, path) => {
		await upload(name, path);
		if (readExperimentAttempt(path).evidence.cellId.endsWith("-r2")) finishCleanup.resolve();
	};
	try {
		const attempts = await executeExperimentBatch({
			...f.options,
			plan: rollingPlan("journal-failure-during-cleanup", 3, 2),
		});
		expect(f.events.filter((event) => event === "create")).toHaveLength(2);
		expect(attempts.map((attempt) => attempt.cleanup)).toEqual([
			"unresolved",
			"confirmed",
			"not-allocated",
		]);
		expect(attempts[1]?.outcome).toBe("completed");
		expect(attempts[2]?.diagnostic).toContain("admission stopped");
		expect(f.records.filter((record) => record.kind === "intent")).toHaveLength(2);
		expect(f.present.size).toBe(0);
	} finally {
		finishCleanup.resolve();
	}
});

test("a cell waiting for its intent cannot create after a peer disproves capacity", async () => {
	const { DriverError } = await import("@sandbox-benchmarks/driver");
	const f = await fixture("quota-during-intent");
	const rejected = Promise.withResolvers<void>();
	const open = f.options.open;
	let creates = 0;
	f.options.open = async () => {
		const opened = await open();
		return {
			...opened,
			driver: {
				...opened.driver,
				create: async () => {
					creates += 1;
					throw new DriverError("create-failed", "quota refused", {
						provider: "tama",
						vendorHttpStatus: 429,
						vendorMessage: "concurrent sandbox resource limit reached",
					});
				},
			},
		};
	};
	const append = f.options.journal.append;
	f.options.journal.append = async (record) => {
		if (record.kind === "intent" && record.cellId.endsWith("-r1")) await rejected.promise;
		await append(record);
	};
	const upload = f.options.store.upload;
	f.options.store.upload = async (name, path) => {
		await upload(name, path);
		if (readExperimentAttempt(path).evidence.cellId.endsWith("-r0")) rejected.resolve();
	};
	try {
		const attempts = await executeExperimentBatch(f.options);
		expect(creates).toBe(1);
		expect(attempts).toHaveLength(2);
		expect(attempts.every((attempt) => attempt.cleanup === "not-allocated")).toBe(true);
		expect(attempts[1]?.measurementStarted).toBe(false);
		expect(attempts[1]?.diagnostic).toContain("reconcile BENCH_ACCOUNT_CAPACITY");
		expect(f.records.filter((record) => record.kind === "released")).toHaveLength(2);
	} finally {
		rejected.resolve();
	}
});

test("Modal variants execute simultaneously through one account journal and pool", async () => {
	const f = await fixture("modal-pool");
	const mixed = workflowExperiment(
		{
			GITHUB_RUN_ID: "modal-pool",
			GITHUB_SHA: plan.sha,
			BENCH_PROVIDERS: "modal-gvisor,modal-vm",
			BENCH_SUITES: "cpu-node",
			BENCH_REPLICAS: "1",
			BENCH_ACCOUNT_CAPACITY: '{"modal":{"sandboxes":2}}',
		},
		"2026-09-13",
	);
	const entered = new Set<ProviderId>();
	const gate = Promise.withResolvers<void>();
	const opened = await f.options.open();
	const attempts = await executeExperimentBatch({
		...f.options,
		plan: mixed,
		open: async (provider) => {
			const module = await loadDriverModule(provider === "modal-vm" ? "modal-vm" : "modal-gvisor");
			const artifact = resolveDriverArtifact(provider);
			return {
				...opened,
				artifact,
				module: { ...opened.module, id: provider, provenance: module.provenance },
				driver: {
					...opened.driver,
					create: async (request, options) => {
						const session = await opened.driver.create(request, options);
						return {
							...session,
							artifact,
							sandboxRef: { ...session.sandboxRef, provider },
							exec: async (command, options) => {
								if (command.includes("mise run benchmark:cpu:node")) {
									entered.add(provider);
									if (entered.size === 2) gate.resolve();
									await gate.promise;
								}
								return session.exec(command, options);
							},
						};
					},
				},
			};
		},
	});
	expect(entered).toEqual(new Set(["modal-gvisor", "modal-vm"]));
	expect(f.peak()).toBe(2);
	expect(f.present.size).toBe(0);
	expect(f.records.filter((record) => record.kind === "released")).toHaveLength(2);
	expect(attempts.every((attempt) => attempt.outcome === "completed")).toBe(true);
	expect(batchIsComplete(mixed, f.options.root, attempts)).toBe(true);
});

test("missing inventory fails each planned replicate without creating", async () => {
	const f = await fixture("admission");
	const opened = await f.options.open();
	const attempts = await executeExperimentBatch({
		...f.options,
		open: async () => ({ ...opened, driver: { create: opened.driver.create } }),
	});
	expect(
		attempts.every(
			(attempt) => attempt.outcome === "failed" && attempt.cleanup === "not-allocated",
		),
	).toBe(true);
	expect(f.events).not.toContain("create");
});

test("workflow reruns cannot silently measure a planned sample again", async () => {
	const f = await fixture("rerun");
	await executeExperimentBatch(f.options);
	const creates = f.events.filter((event) => event === "create").length;
	const rerun = await executeExperimentBatch({ ...f.options, workflowAttempt: 2 });
	expect(f.events.filter((event) => event === "create")).toHaveLength(creates);
	expect(
		rerun.every((attempt) => attempt.outcome === "failed" && !attempt.measurementStarted),
	).toBe(true);
});

test("a failed terminal upload does not discard its local immutable evidence or repeat allocation", async () => {
	const f = await fixture("upload-failure");
	await expect(
		executeExperimentBatch({
			...f.options,
			store: {
				upload: async () => {
					throw new Error("upload unavailable");
				},
			},
		}),
	).rejects.toThrow("upload unavailable");
	expect(f.present.size).toBe(0);
	expect(f.records.filter((record) => record.kind === "released")).toHaveLength(2);
	const retry = await executeExperimentBatch({ ...f.options, workflowAttempt: 2 });
	expect(retry.every((attempt) => !attempt.measurementStarted)).toBe(true);
});

test("a create-failed releases its intent while a failed-create cleanup keeps ownership", async () => {
	const { DriverError, FailedCreateCleanupError } = await import("@sandbox-benchmarks/driver");
	for (const clean of [true, false]) {
		const f = await fixture(`create-refusal-${clean}`);
		const open = f.options.open;
		const primary = new DriverError("create-failed", "boot interrupted", { provider: "tama" });
		const failure = clean
			? primary
			: new FailedCreateCleanupError(new Error("destroy unavailable"), primary, {
					provider: "tama",
					locator: { kind: "name", value: "bench-orphan" },
					cleanup: async () => {
						throw new Error("destroy unavailable");
					},
				});
		f.options.open = async () => {
			const opened = await open();
			return {
				...opened,
				driver: {
					...opened.driver,
					create: async () => {
						throw failure;
					},
				},
			};
		};
		const attempts = await executeExperimentBatch(f.options);
		expect(
			attempts.every((attempt) => attempt.cleanup === (clean ? "not-allocated" : "unresolved")),
		).toBe(true);
		expect(f.records.filter((record) => record.kind === "released")).toHaveLength(clean ? 2 : 0);
		expect(
			attempts.every((attempt) => attempt.outcome === "failed" && !attempt.measurementStarted),
		).toBe(true);
	}
});

test("different suites enter measurement together and retain independent attempt identities", async () => {
	const f = await fixture("mixed-suites");
	const mixed = workflowExperiment(
		{
			GITHUB_RUN_ID: "mixed",
			GITHUB_SHA: plan.sha,
			BENCH_PROVIDERS: "tama",
			BENCH_SUITES: "cpu-node,memory",
			BENCH_REPLICAS: "1",
			BENCH_ACCOUNT_CAPACITY: '{"tama":{"sandboxes":2}}',
		},
		"2026-09-10",
	);
	const opened = await f.options.open();
	const started = new Set<string>();
	const gate = Promise.withResolvers<void>();
	const timeout = setTimeout(() => gate.reject(new Error("suites did not overlap")), 2000);
	try {
		const attempts = await executeExperimentBatch({
			...f.options,
			plan: mixed,
			open: async () => ({
				...opened,
				driver: {
					...opened.driver,
					create: async (...args) => {
						const session = await opened.driver.create(...args);
						return {
							...session,
							exec: async (command, options) => {
								if (command.includes("benchmark:cpu") || command.includes("benchmark:memory")) {
									started.add(session.sandboxRef.id);
									if (started.size === 2) gate.resolve();
									await gate.promise;
								}
								return session.exec(command, options);
							},
						};
					},
				},
			}),
		});
		expect(started.size).toBe(2);
		expect(f.peak()).toBe(2);
		expect(attempts.map((attempt) => attempt.cellId)).toEqual(mixed.cells.map((cell) => cell.id));
		expect(
			attempts.every((attempt) => attempt.measurementStarted && attempt.cleanup === "confirmed"),
		).toBe(true);
		// The CPU-only fixture cannot fabricate the missing memory metrics.
		expect(batchIsComplete(mixed, f.options.root, attempts)).toBe(false);
		expect(f.present.size).toBe(0);
	} finally {
		clearTimeout(timeout);
	}
});

test("a rejected allocation journal append retains recovery identity without admitting measurement", async () => {
	const f = await fixture("allocation-journal-failure");
	const attempts = await executeExperimentBatch({
		...f.options,
		journal: {
			...f.options.journal,
			append: async (record) => {
				if (record.kind === "allocated") throw new Error("journal allocation rejected");
				await f.options.journal.append(record);
			},
		},
	});
	expect(attempts).toHaveLength(2);
	expect(
		attempts.every(
			(attempt) =>
				!attempt.measurementStarted &&
				attempt.cleanup === "unresolved" &&
				attempt.outcome === "failed",
		),
	).toBe(true);
	expect(f.records.every((record) => record.kind === "intent")).toBe(true);
	expect(f.present.size).toBe(0);
	for (const attempt of attempts) {
		const allocation = JSON.parse(
			readFileSync(join(f.options.root, attempt.id, "raw", "allocation.json"), "utf8"),
		);
		expect(allocation).toMatchObject({
			kind: "allocated",
			attempt: attempt.id,
			cellId: attempt.cellId,
			planDigest: plan.digest,
			account: "tama",
			ref: { provider: "tama" },
		});
		expect(allocation.ref.id).toMatch(/^sandbox-[12]$/);
		expect(readExperimentAttempt(join(f.options.root, attempt.id)).evidence.rawDigest).toBe(
			attempt.rawDigest,
		);
	}
});

test("operator recovery reclaims the leaked sandbox and readmits the account", async () => {
	const f = await fixture("allocation-journal-recovery", true);
	const attempts = await executeExperimentBatch({
		...f.options,
		journal: {
			...f.options.journal,
			append: async (record) => {
				if (record.kind === "allocated") throw new Error("journal allocation rejected");
				await f.options.journal.append(record);
			},
		},
	});
	// The account is wedged: unresolved intents, and the sandboxes really did leak.
	expect(f.records.every((record) => record.kind === "intent")).toBe(true);
	expect(f.present.size).toBe(2);
	await expect(
		recoverAccount(
			"tama",
			new Map([["tama", (await f.options.open()).driver]]),
			f.options.journal,
			AbortSignal.timeout(1000),
		),
	).rejects.toThrow("no durable sandbox identity");

	for (const attempt of attempts) {
		expect(
			await recoverAllocatedIntent({
				directory: join(f.options.root, attempt.id),
				openDriver: async () => (await f.options.open()).driver,
				journal: f.options.journal,
				assertQuiescent: async () => {},
				signal: AbortSignal.timeout(10_000),
			}),
		).toMatchObject({ provider: "tama" });
	}
	// Every leaked sandbox is gone, the journal is consistent, and admission passes again.
	expect(f.present.size).toBe(0);
	expect(f.records.filter((record) => record.kind === "allocated")).toHaveLength(2);
	expect(f.records.filter((record) => record.kind === "released")).toHaveLength(2);
	await recoverAccount(
		"tama",
		new Map([["tama", (await f.options.open()).driver]]),
		f.options.journal,
		AbortSignal.timeout(1000),
	);
	// The original attempts stay failed; recovery never makes them publishable.
	expect(attempts.every((attempt) => attempt.outcome === "failed")).toBe(true);
});

test("cellStartupDeadline is bounded by cell startup and by remaining batch budget", () => {
	const cell = {
		startupMinutes: 40,
		workloadMinutes: 80,
		finishMinutes: 15,
	};
	const takenAt = 1_000_000;
	expect(cellStartupDeadline(cell, takenAt, takenAt + 330 * 60_000)).toBe(takenAt + 40 * 60_000);
	expect(cellStartupDeadline(cell, takenAt, takenAt + 100 * 60_000)).toBe(
		takenAt + 100 * 60_000 - (80 + 15) * 60_000,
	);
});
