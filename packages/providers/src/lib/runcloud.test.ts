import { describe, expect, it } from "bun:test";
import type { ExecOptions, Sandbox, SandboxState } from "@run-cloud/sdk";
import { RunCloudError } from "@run-cloud/sdk";
import { runcloudCompute, sandboxMethods } from "./runcloud.ts";

type ComputeOptions = NonNullable<Parameters<typeof runcloudCompute>[0]>;
type NativeClient = NonNullable<ComputeOptions["client"]>;

function nativeSandbox(state: SandboxState = "running", overrides: Partial<Sandbox> = {}): Sandbox {
	return {
		id: "sb-test",
		state,
		image: "ghcr.io/starslingdev/toolchain:test",
		region: "us-west",
		sizeClass: "custom",
		milliCpu: 4_000,
		memMb: 8_192,
		warmStart: false,
		timeoutSeconds: 10_800,
		createdAt: "2026-08-03T00:00:00.000Z",
		...overrides,
	};
}

function nativeClient(overrides: Partial<NativeClient> = {}): NativeClient {
	return {
		create: async () => nativeSandbox(),
		get: async (id) => nativeSandbox("running", { id }),
		list: async () => [],
		destroy: async () => {},
		exec: async () => ({ stdout: "", stderr: "", exit_code: 0, exitCode: 0 }),
		openTunnel: async (id, port) => ({
			id: "tunnel-test",
			sandboxId: id,
			hostname: "tunnel.invalid",
			url: `https://tunnel.invalid:${port}`,
			port,
			expiresAt: "2026-08-03T01:00:00.000Z",
			createdAt: "2026-08-03T00:00:00.000Z",
		}),
		...overrides,
	} as NativeClient;
}

describe("run.cloud ComputeSDK adapter", () => {
	it("forwards create policy and waits through a transitional state", async () => {
		let createInput: Record<string, unknown> | undefined;
		const states = [nativeSandbox("building_image"), nativeSandbox("running")];
		let destroyCalls = 0;
		const client = nativeClient({
			create: async (input) => {
				createInput = input as Record<string, unknown>;
				return nativeSandbox("building_image");
			},
			get: async () => states.shift() ?? nativeSandbox("running"),
			destroy: async () => {
				destroyCalls++;
			},
		});
		const provider = runcloudCompute({ client, readyPollMs: 0, sleep: async () => {} });
		const sandbox = await provider.sandbox.create({
			image: "ghcr.io/starslingdev/toolchain:candidate",
			cpu: 4,
			memory: 8_192,
			disk: 40,
			idlePauseSeconds: 10_800,
			timeoutSeconds: 10_800,
			region: "us-west",
			name: "benchmark",
		});

		expect(sandbox.sandboxId).toBe("sb-test");
		expect(createInput).toEqual({
			idempotencyKey: expect.stringMatching(/^sandbox-benchmarks-[0-9a-f-]+$/),
			image: "ghcr.io/starslingdev/toolchain:candidate",
			cpu: 4,
			memory: 8_192,
			disk: 40,
			idlePauseSeconds: 10_800,
			timeoutSeconds: 10_800,
			region: "us-west",
			name: "benchmark",
		});
		expect(destroyCalls).toBe(0);
	});

	it("destroys the allocation when readiness enters a terminal state", async () => {
		const destroyed: string[] = [];
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => nativeSandbox("failed"),
			destroy: async (id) => {
				destroyed.push(id);
			},
		});

		await expect(runcloudCompute({ client }).sandbox.create()).rejects.toThrow(
			'entered terminal state "failed"',
		);
		expect(destroyed).toEqual(["sb-test"]);
	});

	it("destroys the allocation when a readiness poll throws", async () => {
		const destroyed: string[] = [];
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => {
				throw new Error("control plane unavailable");
			},
			destroy: async (id) => {
				destroyed.push(id);
			},
		});

		await expect(runcloudCompute({ client }).sandbox.create()).rejects.toThrow(
			"control plane unavailable",
		);
		expect(destroyed).toEqual(["sb-test"]);
	});

	it("destroys the allocation when readiness reaches its own timeout", async () => {
		const destroyed: string[] = [];
		let getCalls = 0;
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => {
				getCalls++;
				return nativeSandbox("building_image");
			},
			destroy: async (id) => {
				destroyed.push(id);
			},
		});

		await expect(runcloudCompute({ client, readyTimeoutMs: 0 }).sandbox.create()).rejects.toThrow(
			"not running after 0ms",
		);
		expect(getCalls).toBe(0);
		expect(destroyed).toEqual(["sb-test"]);
	});

	it("bounds a hung readiness request and still awaits cleanup", async () => {
		const destroyed: string[] = [];
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: () => new Promise<Sandbox>(() => {}),
			destroy: async (id) => {
				destroyed.push(id);
			},
		});

		await expect(
			runcloudCompute({
				client,
				controlPlaneTimeoutMs: 5,
				cleanupAttempts: 1,
			}).sandbox.create(),
		).rejects.toThrow(/readiness get for sandbox sb-test did not settle within 5ms/);
		expect(destroyed).toEqual(["sb-test"]);
	});

	it("bounds hung cleanup calls, retries, and surfaces both failures", async () => {
		let getCalls = 0;
		let destroyCalls = 0;
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => {
				getCalls++;
				if (getCalls === 1) throw new Error("readiness failed");
				return nativeSandbox("running");
			},
			destroy: () => {
				destroyCalls++;
				return new Promise<void>(() => {});
			},
		});

		try {
			await runcloudCompute({
				client,
				controlPlaneTimeoutMs: 5,
				cleanupAttempts: 2,
				sleep: async () => {},
			}).sandbox.create();
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AggregateError);
			expect((error as AggregateError).errors[0]).toEqual(new Error("readiness failed"));
			expect((error as AggregateError).errors[1]).toMatchObject({
				message: "run.cloud destroy sandbox sb-test did not settle within 5ms",
			});
		}
		expect(destroyCalls).toBe(2);
		expect(getCalls).toBe(3);
	});

	it("recovers and destroys an allocation whose create response timed out", async () => {
		const idempotencyKeys: Array<string | undefined> = [];
		const destroyed: string[] = [];
		let createCalls = 0;
		const client = nativeClient({
			create: (input) => {
				createCalls++;
				idempotencyKeys.push(input?.idempotencyKey);
				if (createCalls === 1) return new Promise<Sandbox>(() => {});
				return Promise.resolve(nativeSandbox("building_image"));
			},
			destroy: async (id) => {
				destroyed.push(id);
			},
		});

		await expect(
			runcloudCompute({
				client,
				controlPlaneTimeoutMs: 5,
				createRecoveryAttempts: 1,
				cleanupAttempts: 1,
			}).sandbox.create(),
		).rejects.toThrow("run.cloud create did not settle within 5ms");
		expect(createCalls).toBe(2);
		expect(idempotencyKeys[0]).toBeDefined();
		expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
		expect(destroyed).toEqual(["sb-test"]);
	});

	it("fails within bounded recovery attempts when a timed-out create cannot be recovered", async () => {
		const idempotencyKeys: Array<string | undefined> = [];
		const client = nativeClient({
			create: (input) => {
				idempotencyKeys.push(input?.idempotencyKey);
				return new Promise<Sandbox>(() => {});
			},
		});

		await expect(
			runcloudCompute({
				client,
				controlPlaneTimeoutMs: 5,
				createRecoveryAttempts: 2,
				sleep: async () => {},
			}).sandbox.create(),
		).rejects.toThrow(
			/idempotent allocation could not be recovered; manual cleanup may be required/,
		);
		expect(idempotencyKeys).toHaveLength(3);
		expect(new Set(idempotencyKeys).size).toBe(1);
	});

	it("retries a transient failed-create cleanup before preserving the readiness error", async () => {
		let destroyCalls = 0;
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => {
				throw new Error("readiness failed");
			},
			destroy: async () => {
				destroyCalls++;
				if (destroyCalls === 1) throw new Error("transient cleanup failure");
			},
		});

		await expect(
			runcloudCompute({ client, cleanupAttempts: 2, sleep: async () => {} }).sandbox.create(),
		).rejects.toThrow("readiness failed");
		expect(destroyCalls).toBe(2);
	});

	it("accepts a destroying confirmation after an ambiguous cleanup response", async () => {
		let getCalls = 0;
		let destroyCalls = 0;
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => {
				getCalls++;
				if (getCalls === 1) throw new Error("readiness failed");
				return nativeSandbox("destroying");
			},
			destroy: async () => {
				destroyCalls++;
				throw new Error("response lost after request");
			},
		});

		await expect(
			runcloudCompute({ client, cleanupAttempts: 3, sleep: async () => {} }).sandbox.create(),
		).rejects.toThrow("readiness failed");
		expect(destroyCalls).toBe(1);
		expect(getCalls).toBe(2);
	});

	it("surfaces the sandbox id and both failures when failed-create cleanup exhausts retries", async () => {
		let destroyCalls = 0;
		const readinessError = new Error("readiness failed");
		const cleanupError = new Error("cleanup failed");
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => {
				throw readinessError;
			},
			destroy: async () => {
				destroyCalls++;
				throw cleanupError;
			},
		});

		try {
			await runcloudCompute({
				client,
				cleanupAttempts: 3,
				sleep: async () => {},
			}).sandbox.create();
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AggregateError);
			expect((error as AggregateError).errors).toEqual([readinessError, cleanupError]);
			expect((error as Error).message).toContain("sandbox sb-test");
			expect((error as Error).message).toContain("manual cleanup may be required");
		}
		expect(destroyCalls).toBe(3);
	});

	it("filters destroyed and destroying tombstones from list", async () => {
		const client = nativeClient({
			list: async () => [
				nativeSandbox("running", { id: "running" }),
				nativeSandbox("paused", { id: "paused" }),
				nativeSandbox("stopped", { id: "stopped" }),
				nativeSandbox("failed", { id: "failed" }),
				nativeSandbox("destroying", { id: "destroying" }),
				nativeSandbox("destroyed", { id: "destroyed" }),
			],
		});

		expect((await runcloudCompute({ client }).sandbox.list()).map((s) => s.sandboxId)).toEqual([
			"running",
			"paused",
			"stopped",
			"failed",
		]);
	});

	it("maps command options, streaming callbacks, detached launch, info, and tunnels", async () => {
		const execCalls: Array<{ command: string; options: ExecOptions }> = [];
		const client = nativeClient({
			exec: async (_id, command, options = {}) => {
				execCalls.push({ command: String(command), options });
				options.onStdout?.(new TextEncoder().encode("out"));
				options.onStderr?.(new TextEncoder().encode("err"));
				return { stdout: "out", stderr: "err", exit_code: 7, exitCode: 7 };
			},
		});
		const methods = sandboxMethods({ client });
		const sandbox = nativeSandbox();
		let stdout = "";
		let stderr = "";
		expect(
			await methods.runCommand(sandbox, "printf test", {
				cwd: "/work",
				env: { BENCH: "1" },
				timeout: 1_234,
				onStdout: (chunk) => (stdout += chunk),
				onStderr: (chunk) => (stderr += chunk),
			}),
		).toMatchObject({ stdout: "out", stderr: "err", exitCode: 7 });
		expect(stdout).toBe("out");
		expect(stderr).toBe("err");
		expect(execCalls[0]).toMatchObject({
			command: "printf test",
			options: { cwd: "/work", env: { BENCH: "1" }, timeoutSeconds: 2 },
		});

		expect(await methods.runCommand(sandbox, "printf done", { background: true })).toMatchObject({
			stdout: "",
			stderr: "",
			exitCode: 7,
		});
		expect(execCalls[1]?.command).toContain("nohup /bin/sh -lc 'printf done'");
		expect(execCalls[1]?.options).not.toHaveProperty("onStdout");

		expect(await methods.getInfo(sandbox)).toMatchObject({
			id: "sb-test",
			provider: "runcloud",
			status: "running",
			timeout: 10_800_000,
			metadata: { milliCpu: 4_000, memoryMb: 8_192 },
		});
		expect(await methods.getUrl(sandbox, { port: 8_080 })).toBe("https://tunnel.invalid:8080");
	});

	it("treats native 404s as absent or already destroyed", async () => {
		const client = nativeClient({
			get: async () => {
				throw new RunCloudError(404, "gone");
			},
			destroy: async () => {
				throw new RunCloudError(404, "gone");
			},
		});
		const provider = runcloudCompute({ client });
		await expect(provider.sandbox.getById("gone")).resolves.toBeNull();
		await expect(provider.sandbox.destroy("gone")).resolves.toBeUndefined();
	});
});
