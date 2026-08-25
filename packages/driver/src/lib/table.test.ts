import { describe, expect, test } from "bun:test";
import { DriverError, FailedCreateCleanupError } from "./errors.ts";
import type { CreateRequest } from "./port.ts";
import { sandboxRef } from "./port.ts";
import { okExec } from "./session.fixture.ts";
import type { MethodTable } from "./table.ts";
import { DeferredTeardownError, driverFromTable } from "./table.ts";

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8 },
	artifact: { kind: "image", ref: "im-abc123" },
	deadlineMs: 60_000,
};

const baseTable: MethodTable<string, null> = {
	create: async () => ({ handle: "h", sandboxRef: sandboxRef("tama", "m-1") }),
	exec: async () => okExec,
	destroy: async () => {},
};

describe("driverFromTable", () => {
	test("a later owner signal cancels an already-running failed-create cleanup", async () => {
		let attempts = 0;
		const failure = new FailedCreateCleanupError(
			new Error("initial cleanup failed"),
			new Error("create failed"),
			{
				provider: "tama",
				locator: { kind: "name", value: "bench-cancel" },
				cleanup: async ({ signal } = {}) => {
					attempts++;
					if (attempts > 1) return;
					await new Promise<never>((_resolve, reject) => {
						const aborted = () => reject(signal?.reason);
						if (signal?.aborted) aborted();
						else signal?.addEventListener("abort", aborted, { once: true });
					});
				},
			},
		);
		const first = failure.cleanup();
		const cancellation = new AbortController();
		const joined = failure.cleanup({ signal: cancellation.signal });
		const reason = new Error("shutdown deadline");
		cancellation.abort(reason);
		await expect(first).rejects.toBe(reason);
		await expect(joined).rejects.toBe(reason);
		await failure.cleanup();
		expect(attempts).toBe(2);
	});

	test("assembles a session over the table with the request's tagged artifact", async () => {
		const driver = driverFromTable(baseTable, async () => null);
		const session = await driver.create(request);
		expect(session.sandboxRef).toEqual({ provider: "tama", id: "m-1" });
		expect(session.artifact).toEqual({ kind: "image", ref: "im-abc123" });
		expect(session.native).toBe("h");
		expect(session.files).toBeUndefined();
		expect(session.launch).toBeUndefined();
	});

	test("forwards cooperative cancellation to create, session destroy, and bare-ref destroy", async () => {
		const createCancellation = new AbortController();
		const destroyCancellation = new AbortController();
		const bareCancellation = new AbortController();
		const observed: AbortSignal[] = [];
		const driver = driverFromTable(
			{
				...baseTable,
				create: async (_ctx, _request, options) => {
					if (options?.signal) observed.push(options.signal);
					return { handle: "h", sandboxRef: sandboxRef("tama", "m-cancel") };
				},
				destroy: async (_ctx, _handle, options) => {
					if (options?.signal) observed.push(options.signal);
				},
				destroyById: async (_ctx, _ref, options) => {
					if (options?.signal) observed.push(options.signal);
				},
			},
			async () => null,
		);
		const session = await driver.create(request, { signal: createCancellation.signal });
		await session.destroy({ signal: destroyCancellation.signal });
		await driver.destroyById?.(sandboxRef("tama", "m-cancel"), {
			signal: bareCancellation.signal,
		});
		expect(observed).toEqual([
			createCancellation.signal,
			destroyCancellation.signal,
			bareCancellation.signal,
		]);
	});

	test("a transient context failure is retried, not memoized forever", async () => {
		let attempts = 0;
		const driver = driverFromTable(baseTable, async () => {
			attempts += 1;
			if (attempts === 1) throw new Error("transient plumbing failure");
			return null;
		});
		await expect(driver.create(request)).rejects.toThrow("transient plumbing failure");
		// Before the memo-clear rule this replayed the memoized rejection and bricked the driver.
		const session = await driver.create(request);
		expect(session.sandboxRef.id).toBe("m-1");
		expect(attempts).toBe(2);
	});

	test("a driver-reported artifact contradiction fails create (typed) and tears down the orphan", async () => {
		let destroyed = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({
					handle: "h",
					sandboxRef: sandboxRef("tama", "m-2"),
					artifact: { kind: "image" as const, ref: "im-OTHER" },
				}),
				destroy: async () => {
					destroyed += 1;
				},
			},
			async () => null,
		);
		const error = await driver.create(request).catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("artifact-mismatch");
		expect(destroyed).toBe(1);
	});

	test("a mismatch whose orphan teardown fails retains retryable process ownership", async () => {
		let destroys = 0;
		let initialSignal: AbortSignal | undefined;
		let retrySignal: AbortSignal | undefined;
		let noteRetryStarted!: () => void;
		const retryStarted = new Promise<void>((resolve) => {
			noteRetryStarted = resolve;
		});
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({
					handle: "h",
					sandboxRef: sandboxRef("tama", "m-2"),
					artifact: { kind: "image" as const, ref: "im-OTHER" },
				}),
				destroy: async (_ctx, _handle, options) => {
					destroys++;
					if (destroys === 1) {
						initialSignal = options?.signal;
						throw new Error("teardown exploded");
					}
					retrySignal = options?.signal;
					noteRetryStarted();
					await new Promise<void>((resolve) => {
						if (options?.signal?.aborted) resolve();
						else options?.signal?.addEventListener("abort", () => resolve(), { once: true });
					});
				},
			},
			async () => null,
		);
		const createCancellation = new AbortController();
		const error = (await driver
			.create(request, { signal: createCancellation.signal })
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(String(error.error)).toContain("teardown exploded");
		expect((error.suppressed as DriverError).code).toBe("artifact-mismatch");
		expect(error.locator).toEqual({ kind: "id", value: "m-2" });
		expect(initialSignal).toBe(createCancellation.signal);
		const cancellation = new AbortController();
		const cleanup = error.cleanup({ signal: cancellation.signal });
		await retryStarted;
		const cancellationReason = new Error("shutdown deadline");
		cancellation.abort(cancellationReason);
		await cleanup;
		expect(retrySignal?.aborted).toBe(true);
		expect(retrySignal?.reason).toBe(cancellationReason);
		expect(destroys).toBe(2);
	});

	test("a driver-reported ref that matches is recorded on the session", async () => {
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({
					handle: "h",
					sandboxRef: sandboxRef("tama", "m-3"),
					artifact: { kind: "image" as const, ref: "im-abc123" },
				}),
			},
			async () => null,
		);
		const session = await driver.create(request);
		expect(session.artifact).toEqual({ kind: "image", ref: "im-abc123" });
	});

	test("artifact kinds are part of identity, including explicit none", async () => {
		const noneRequest: CreateRequest = { ...request, artifact: { kind: "none" } };
		const noneSession = await driverFromTable(baseTable, async () => null).create(noneRequest);
		expect(noneSession.artifact).toEqual({ kind: "none" });

		const wrongKind = driverFromTable(
			{
				...baseTable,
				create: async () => ({
					handle: "h",
					sandboxRef: sandboxRef("tama", "m-kind"),
					artifact: { kind: "baked" as const, ref: "im-abc123" },
				}),
			},
			async () => null,
		);
		const error = await wrongKind.create(request).catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("artifact-mismatch");
	});

	test("files and launch pass through only when the table declares them", async () => {
		const writes: string[] = [];
		const seenOptions: unknown[] = [];
		const driver = driverFromTable(
			{
				...baseTable,
				launch: async (_ctx, _handle, command, options) => {
					writes.push(`launch:${command}`);
					seenOptions.push(options);
				},
				files: {
					readFile: async (_ctx, _handle, path) => `read:${path}`,
					exists: async () => true,
					writeText: async (_ctx, _handle, path, text) => {
						writes.push(`${path}=${text}`);
					},
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		expect(await session.files?.readFile("/etc/os-release")).toBe("read:/etc/os-release");
		await session.files?.writeText("/bench/a", "1");
		await session.launch?.("sleep 1", { maxOutputBytes: 17 });
		expect(writes).toEqual(["/bench/a=1", "launch:sleep 1"]);
		expect(seenOptions).toEqual([{ maxOutputBytes: 17 }]);
	});

	test("the kit applies byte caps centrally; a table cannot ignore them", async () => {
		const seenOptions: unknown[] = [];
		const driver = driverFromTable(
			{
				...baseTable,
				exec: async (_ctx, _handle, _command, options) => {
					seenOptions.push(options);
					return { ...okExec, stdout: "x".repeat(100) };
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		const capped = await session.exec("noisy", { maxOutputBytes: 10 });
		expect(capped.stdout).toBe("x".repeat(10));
		expect(capped.truncated).toBe(true);
		const uncapped = await session.exec("noisy");
		expect(uncapped.stdout).toHaveLength(100);
		expect(uncapped.truncated).toBe(false);
		expect(seenOptions).toEqual([{ maxOutputBytes: 10 }, undefined]);
	});

	test("snapshots the byte cap before a hostile table mutates the forwarded options", async () => {
		const options = { maxOutputBytes: 10 };
		let seenOptions: unknown;
		const driver = driverFromTable(
			{
				...baseTable,
				exec: async (_ctx, _handle, _command, forwarded) => {
					seenOptions = forwarded;
					Reflect.deleteProperty(forwarded as { maxOutputBytes?: number }, "maxOutputBytes");
					return { ...okExec, stdout: "x".repeat(100) };
				},
			},
			async () => null,
		);
		const result = await (await driver.create(request)).exec("noisy", options);
		expect(seenOptions).toBe(options);
		expect(options).not.toHaveProperty("maxOutputBytes");
		expect(result.stdout).toBe("x".repeat(10));
		expect(result.truncated).toBe(true);
	});

	test("rejects an invalid byte cap before invoking provider code", async () => {
		let execCalls = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				exec: async () => {
					execCalls += 1;
					return okExec;
				},
			},
			async () => null,
		);
		const error = await (await driver.create(request))
			.exec("noisy", { maxOutputBytes: -1 })
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "invalid-exec-options" });
		expect(execCalls).toBe(0);
	});

	test("destroy is idempotent and every operation after it is a typed use-after-destroy error", async () => {
		let destroys = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				destroy: async () => {
					destroys += 1;
				},
				files: {
					readFile: async () => "x",
					exists: async () => true,
					writeText: async () => {},
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		await session.destroy();
		await session.destroy(); // idempotent — a second destroy is a no-op, not an error
		expect(destroys).toBe(1);
		const execError = (await session
			.exec("echo")
			.catch((caught: unknown) => caught)) as DriverError;
		expect(execError).toBeInstanceOf(DriverError);
		expect(execError.code).toBe("use-after-destroy");
		const readError = (await (
			session.files?.readFile("/x") ?? Promise.reject(new Error("no files"))
		).catch((caught: unknown) => caught)) as DriverError;
		expect(readError.code).toBe("use-after-destroy");
	});

	test("normalizes a synchronous table throw into the session's promise contract", async () => {
		const driver = driverFromTable(
			{
				...baseTable,
				files: {
					readFile: () => {
						throw new DriverError("vendor-contract-violation", "filesystem disappeared");
					},
					exists: async () => true,
					writeText: async () => {},
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		const pending = session.files?.readFile("/bench/a");
		expect(pending).toBeInstanceOf(Promise);
		const error = await pending?.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "vendor-contract-violation" });
	});

	test("starts an accepted operation before a following destroy can begin", async () => {
		const events: string[] = [];
		let finishExec!: () => void;
		const execFinished = new Promise<void>((resolve) => {
			finishExec = resolve;
		});
		const driver = driverFromTable(
			{
				...baseTable,
				exec: async () => {
					events.push("exec:start");
					await execFinished;
					events.push("exec:end");
					return okExec;
				},
				destroy: async () => {
					events.push("destroy:start");
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		const executing = session.exec("slow");
		const destroying = session.destroy();
		expect(events).toEqual(["exec:start"]);
		finishExec();
		await executing;
		await destroying;
		expect(events).toEqual(["exec:start", "exec:end", "destroy:start"]);
	});

	test("concurrent destroys share one attempt and a failed attempt can be retried", async () => {
		let destroys = 0;
		let release!: () => void;
		const firstAttempt = new Promise<void>((resolve) => {
			release = resolve;
		});
		const driver = driverFromTable(
			{
				...baseTable,
				destroy: async () => {
					destroys += 1;
					if (destroys === 1) {
						await firstAttempt;
						throw new Error("transient teardown failure");
					}
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		const first = session.destroy();
		const concurrent = session.destroy();
		expect(destroys).toBe(1);
		const firstFailure = first.catch((caught: unknown) => caught);
		const concurrentFailure = concurrent.catch((caught: unknown) => caught);
		release();
		expect(await firstFailure).toEqual(new Error("transient teardown failure"));
		expect(await concurrentFailure).toEqual(new Error("transient teardown failure"));

		await session.destroy();
		await session.destroy();
		expect(destroys).toBe(2);
	});

	test("a later concurrent destroy signal cancels the shared provider teardown", async () => {
		let destroys = 0;
		let observedSignal: AbortSignal | undefined;
		const driver = driverFromTable(
			{
				...baseTable,
				destroy: async (_ctx, _handle, options) => {
					destroys++;
					observedSignal = options?.signal;
					if (destroys > 1) return;
					await new Promise<never>((_resolve, reject) => {
						const aborted = () => reject(options?.signal?.reason);
						if (options?.signal?.aborted) aborted();
						else options?.signal?.addEventListener("abort", aborted, { once: true });
					});
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		const first = session.destroy();
		const cancellation = new AbortController();
		const joined = session.destroy({ signal: cancellation.signal });
		const firstFailure = first.catch((caught: unknown) => caught);
		const joinedFailure = joined.catch((caught: unknown) => caught);
		const reason = new Error("shutdown deadline");
		cancellation.abort(reason);

		expect(await firstFailure).toBe(reason);
		expect(await joinedFailure).toBe(reason);
		expect(observedSignal?.aborted).toBe(true);
		await session.destroy();
		expect(destroys).toBe(2);
	});

	test("a synchronous destroy throw resets lifecycle state and can be retried", async () => {
		let destroys = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				destroy: () => {
					destroys += 1;
					if (destroys === 1) throw new Error("synchronous teardown failure");
					return Promise.resolve();
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		await expect(session.destroy()).rejects.toThrow("synchronous teardown failure");
		await session.destroy();
		expect(destroys).toBe(2);
	});

	test("a stalled operation returns a bounded error but keeps safe teardown scheduled", async () => {
		const events: string[] = [];
		let finishExec!: () => void;
		const stalled = new Promise<void>((resolve) => {
			finishExec = resolve;
		});
		let noteDestroy!: () => void;
		const providerDestroyed = new Promise<void>((resolve) => {
			noteDestroy = resolve;
		});
		const driver = driverFromTable(
			{
				...baseTable,
				operationDrainTimeoutMs: 5,
				exec: async () => {
					events.push("exec:start");
					await stalled;
					return okExec;
				},
				destroy: async () => {
					events.push("destroy:start");
					noteDestroy();
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		const executing = session.exec("stalled");
		const destroyError = (await session
			.destroy()
			.catch((caught: unknown) => caught)) as DriverError;
		expect(destroyError).toBeInstanceOf(DriverError);
		expect(destroyError).toMatchObject({ code: "destroy-failed", ref: session.sandboxRef });
		expect(events).toEqual(["exec:start"]);
		const useWhileDeferred = (await session
			.exec("too late")
			.catch((caught: unknown) => caught)) as DriverError;
		expect(useWhileDeferred).toMatchObject({ code: "use-after-destroy" });
		finishExec();
		await executing;
		await providerDestroyed;
		expect(events).toEqual(["exec:start", "destroy:start"]);
		// The first caller already received its bounded failure, and no retry was needed to start the
		// teardown once the accepted operation settled. A later destroy is simply idempotent.
		await session.destroy();
		expect(events).toEqual(["exec:start", "destroy:start"]);
	});

	test("a deferred provider failure remains observable and async-disposable for retry", async () => {
		let finishExec!: () => void;
		const stalled = new Promise<void>((resolve) => {
			finishExec = resolve;
		});
		let destroys = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				operationDrainTimeoutMs: 5,
				exec: async () => {
					await stalled;
					return okExec;
				},
				destroy: async () => {
					destroys++;
					if (destroys === 1) throw new Error("deferred provider teardown failed");
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		const executing = session.exec("stalled");
		const error = (await session
			.destroy()
			.catch((caught: unknown) => caught)) as DeferredTeardownError;
		expect(error).toBeInstanceOf(DeferredTeardownError);

		finishExec();
		await executing;
		await expect(error.completion).rejects.toThrow("deferred provider teardown failed");
		expect(error.deferredFailure).toEqual(new Error("deferred provider teardown failed"));

		await error[Symbol.asyncDispose]();
		expect(destroys).toBe(2);
		await session.destroy();
	});

	test("destroyById, probes and snapshots pass through exactly when the table declares them", async () => {
		const reaped: string[] = [];
		const bare = driverFromTable(baseTable, async () => null);
		expect(bare.destroyById).toBeUndefined();
		expect(bare.probes).toBeUndefined();
		expect(bare.snapshots).toBeUndefined();

		const listed: string[] = [];
		const full = driverFromTable(
			{
				...baseTable,
				destroyById: async (_ctx, ref) => {
					reaped.push(ref.id);
				},
				probes: {
					observe: async () => ({ state: "absent" as const }),
					list: async (ctx) => {
						listed.push(String(ctx));
					},
				},
				snapshots: {
					create: async () => ({ snapshotId: "snap-1" }),
					delete: async () => {},
				},
			},
			async () => null,
		);
		await full.destroyById?.(sandboxRef("tama", "m-gone"));
		expect(reaped).toEqual(["m-gone"]);
		await full.probes?.list?.();
		expect(listed).toEqual(["null"]);
		expect(await full.probes?.observe(sandboxRef("tama", "m-gone"))).toEqual({
			state: "absent",
		});
		expect(full.probes?.describe).toBeUndefined(); // absent, not a no-op stub
		const session = await full.create(request);
		expect(await full.snapshots?.create(session)).toEqual({
			snapshotId: "snap-1",
		});
	});
});
