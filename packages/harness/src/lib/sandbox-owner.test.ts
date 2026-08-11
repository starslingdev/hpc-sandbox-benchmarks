import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanupOwnedSandboxes, createOwnedSandbox, withOwnedSandbox } from "./sandbox-owner.ts";

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

async function waitForFile(path: string): Promise<void> {
	const deadline = Date.now() + 2_000;
	while (!existsSync(path)) {
		if (Date.now() >= deadline) throw new Error("signal fixture did not become ready");
		await Bun.sleep(10);
	}
}

describe("sandbox process ownership", () => {
	it("preserves the provider surface and destroys only once", async () => {
		let destroys = 0;
		const sandbox = await createOwnedSandbox(async () => ({
			sandboxId: "sb-1",
			value: 42,
			read(this: { value: number }): number {
				return this.value;
			},
			async destroy() {
				destroys++;
			},
		}));

		expect(sandbox.read()).toBe(42);
		await Promise.all([sandbox.destroy(), sandbox.destroy()]);
		expect(destroys).toBe(1);
		expect(await cleanupOwnedSandboxes()).toEqual([]);
	});

	it("owns a create before it resolves and drains the late handle", async () => {
		const creation = deferred<{ sandboxId: string; destroy(): Promise<void> }>();
		let destroys = 0;
		const sandboxPromise = createOwnedSandbox(() => creation.promise);
		const cleanup = cleanupOwnedSandboxes();

		creation.resolve({
			sandboxId: "sb-late",
			async destroy() {
				destroys++;
			},
		});

		await cleanup;
		expect((await sandboxPromise).sandboxId).toBe("sb-late");
		expect(destroys).toBe(1);
	});

	it("keeps a failed destroy owned so cleanup can retry it", async () => {
		let destroys = 0;
		const sandbox = await createOwnedSandbox(async () => ({
			sandboxId: "sb-retry",
			async destroy() {
				destroys++;
				if (destroys === 1) throw new Error("transient teardown failure");
			},
		}));

		await expect(sandbox.destroy()).rejects.toThrow("transient teardown failure");
		expect(await cleanupOwnedSandboxes()).toEqual([]);
		expect(destroys).toBe(2);
	});

	it("scopes a successful operation to one owned sandbox", async () => {
		let destroys = 0;
		const result = await withOwnedSandbox(
			async () => ({
				sandboxId: "sb-scoped",
				value: 42,
				async destroy() {
					destroys++;
				},
			}),
			async (sandbox) => sandbox.value,
		);

		expect(result).toBe(42);
		expect(destroys).toBe(1);
		expect(await cleanupOwnedSandboxes()).toEqual([]);
	});

	it("preserves the operation error and retains a failed teardown for the exit drain", async () => {
		let destroys = 0;
		await expect(
			withOwnedSandbox(
				async () => ({
					sandboxId: "sb-scoped-retry",
					async destroy() {
						destroys++;
						if (destroys === 1) throw new Error("teardown failed");
					},
				}),
				async () => {
					throw new Error("operation failed");
				},
				"test sandbox",
			),
		).rejects.toThrow("operation failed");
		expect(await cleanupOwnedSandboxes()).toEqual([]);
		expect(destroys).toBe(2);
	});

	it("bounds cleanup while a create is still pending", async () => {
		const creation = deferred<{ sandboxId: string; destroy(): Promise<void> }>();
		const sandboxPromise = createOwnedSandbox(() => creation.promise);
		const startedAt = Date.now();
		const failures = await cleanupOwnedSandboxes({ attempts: 1, timeoutMs: 20 });
		expect(Date.now() - startedAt).toBeLessThan(250);
		expect(failures).toHaveLength(1);
		expect(String(failures[0])).toContain("timed out");

		creation.resolve({ sandboxId: "sb-eventual", async destroy() {} });
		await sandboxPromise;
		expect(await cleanupOwnedSandboxes()).toEqual([]);
	});

	it("retries teardown before SIGTERM exits the process", async () => {
		const dir = mkdtempSync(join(tmpdir(), "sandbox-owner-signal-"));
		const logFile = join(dir, "lifecycle.log");
		const fixture = join(import.meta.dir, "sandbox-owner.signal.fixture.ts");
		const proc = Bun.spawn(["bun", fixture, logFile], { stdout: "pipe", stderr: "pipe" });
		try {
			await waitForFile(logFile);
			proc.kill("SIGTERM");
			expect(await proc.exited).toBe(143);
			expect(readFileSync(logFile, "utf8").trim().split("\n")).toEqual([
				"ready",
				"destroy",
				"destroy",
			]);
		} finally {
			proc.kill();
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("drains before an explicit CLI exit", async () => {
		const dir = mkdtempSync(join(tmpdir(), "sandbox-owner-exit-"));
		const logFile = join(dir, "lifecycle.log");
		const fixture = join(import.meta.dir, "sandbox-owner.signal.fixture.ts");
		const proc = Bun.spawn(["bun", fixture, logFile, "exit"], { stdout: "pipe", stderr: "pipe" });
		try {
			expect(await proc.exited).toBe(7);
			expect(readFileSync(logFile, "utf8").trim().split("\n")).toEqual(["ready", "destroy"]);
		} finally {
			proc.kill();
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("retries a failed teardown before natural process exit", async () => {
		const dir = mkdtempSync(join(tmpdir(), "sandbox-owner-natural-"));
		const logFile = join(dir, "lifecycle.log");
		const fixture = join(import.meta.dir, "sandbox-owner.signal.fixture.ts");
		const proc = Bun.spawn(["bun", fixture, logFile, "natural"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		try {
			expect(await proc.exited).toBe(0);
			expect(readFileSync(logFile, "utf8").trim().split("\n")).toEqual([
				"ready",
				"destroy",
				"end",
				"destroy",
			]);
		} finally {
			proc.kill();
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
