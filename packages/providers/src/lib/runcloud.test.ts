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
			// A caller-supplied name is kept as a readable prefix; the unique suffix is what makes it a
			// recovery handle a later lookup can resolve to exactly one allocation.
			name: expect.stringMatching(/^benchmark-[0-9a-f-]+$/),
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

	it("adopts the allocation when the create response is lost", async () => {
		let createCalls = 0;
		let requestedName: string | undefined;
		const listedNames: Array<string | undefined> = [];
		const destroyed: string[] = [];
		const client = nativeClient({
			create: (input) => {
				createCalls++;
				requestedName = input?.name;
				// The control plane allocated the sandbox; only the response never came back.
				return new Promise<Sandbox>(() => {});
			},
			list: async (options) => {
				listedNames.push(options?.name);
				return [nativeSandbox("running", { name: requestedName })];
			},
			destroy: async (id) => {
				destroyed.push(id);
			},
		});

		const sandbox = await runcloudCompute({
			client,
			controlPlaneTimeoutMs: 5,
			readyPollMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		expect(sandbox.sandboxId).toBe("sb-test");
		// Recovery is a READ: replaying the create POST is what could allocate a second sandbox.
		expect(createCalls).toBe(1);
		expect(listedNames).toEqual([requestedName]);
		// Adopted rather than torn down — the sandbox is healthy, so destroying it to honour a lost
		// HTTP response would throw away the allocation and fail the cell for no reason.
		expect(destroyed).toEqual([]);
	});

	it("adopts the allocation after an ambiguous create 5xx", async () => {
		let requestedName: string | undefined;
		const destroyed: string[] = [];
		const client = nativeClient({
			create: async (input) => {
				requestedName = input?.name;
				throw new RunCloudError(503, "response lost after allocation");
			},
			list: async () => [nativeSandbox("running", { name: requestedName })],
			destroy: async (id) => {
				destroyed.push(id);
			},
		});

		const sandbox = await runcloudCompute({
			client,
			readyPollMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		expect(sandbox.sandboxId).toBe("sb-test");
		expect(destroyed).toEqual([]);
	});

	it("rethrows the original error once reconciliation proves nothing was allocated", async () => {
		let createCalls = 0;
		let listCalls = 0;
		const client = nativeClient({
			create: () => {
				createCalls++;
				return new Promise<Sandbox>(() => {});
			},
			list: async () => {
				listCalls++;
				return [];
			},
		});

		const create = runcloudCompute({
			client,
			controlPlaneTimeoutMs: 5,
			reconcileAttempts: 3,
			reconcileRetryMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		await expect(create).rejects.toThrow("run.cloud create did not settle within 5ms");
		// Nothing carries the name, so nothing leaked — the caller gets the plain original error rather
		// than a manual-cleanup warning it can do nothing about.
		await expect(create).rejects.not.toThrow(/manual cleanup/);
		expect(createCalls).toBe(1);
		expect(listCalls).toBe(3);
	});

	it("keeps asking when a reconciliation lookup fails or the allocation is not yet visible", async () => {
		let requestedName: string | undefined;
		let listCalls = 0;
		const client = nativeClient({
			create: async (input) => {
				requestedName = input?.name;
				throw new RunCloudError(503, "response lost after allocation");
			},
			list: async () => {
				listCalls++;
				// A lookup that fails is not proof of absence, and an allocation can take a moment to
				// become visible. Either one, taken as "nothing was allocated", strands a sandbox.
				if (listCalls === 1) throw new Error("control plane unavailable");
				if (listCalls === 2) return [];
				return [nativeSandbox("running", { name: requestedName })];
			},
		});

		const sandbox = await runcloudCompute({
			client,
			readyPollMs: 0,
			reconcileAttempts: 4,
			reconcileRetryMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		expect(sandbox.sandboxId).toBe("sb-test");
		expect(listCalls).toBe(3);
	});

	it("confirms a definitive 4xx with one reconciliation pass, then rethrows", async () => {
		const clientError = new RunCloudError(422, "invalid image");
		let createCalls = 0;
		let listCalls = 0;
		const client = nativeClient({
			create: async () => {
				createCalls++;
				throw clientError;
			},
			list: async () => {
				listCalls++;
				return [];
			},
		});

		try {
			await runcloudCompute({
				client,
				reconcileRetryMs: 0,
				sleep: async () => {},
			}).sandbox.create();
			expect.unreachable();
		} catch (error) {
			expect(error).toBe(clientError);
		}
		expect(createCalls).toBe(1);
		// A 4xx says no allocation was accepted, so this does not spend the full polling window — but it
		// still asks once, because a conflict response can sit on top of a real allocation.
		expect(listCalls).toBe(1);
	});

	it("adopts an allocation that a conflict response was hiding", async () => {
		let requestedName: string | undefined;
		const client = nativeClient({
			create: async (input) => {
				requestedName = input?.name;
				throw new RunCloudError(409, "idempotency key already in use");
			},
			list: async () => [nativeSandbox("running", { name: requestedName })],
		});

		const sandbox = await runcloudCompute({
			client,
			readyPollMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		expect(sandbox.sandboxId).toBe("sb-test");
	});

	it("ignores tombstones and other callers' sandboxes when reconciling", async () => {
		let requestedName: string | undefined;
		let listCalls = 0;
		const client = nativeClient({
			create: async (input) => {
				requestedName = input?.name;
				throw new RunCloudError(503, "response lost after allocation");
			},
			list: async () => {
				listCalls++;
				return [
					nativeSandbox("destroyed", { id: "sb-tombstone", name: requestedName }),
					nativeSandbox("destroying", { id: "sb-going", name: requestedName }),
					// Guards against a server-side prefix/fuzzy name match.
					nativeSandbox("running", { id: "sb-other", name: `${requestedName}-different` }),
				];
			},
		});

		await expect(
			runcloudCompute({
				client,
				reconcileAttempts: 2,
				reconcileRetryMs: 0,
				sleep: async () => {},
			}).sandbox.create(),
		).rejects.toThrow("response lost after allocation");
		expect(listCalls).toBe(2);
	});

	it("adopts the oldest match so a duplicate allocation cannot orphan the original", async () => {
		let requestedName: string | undefined;
		const client = nativeClient({
			create: async (input) => {
				requestedName = input?.name;
				throw new RunCloudError(503, "response lost after allocation");
			},
			list: async () => [
				nativeSandbox("running", {
					id: "sb-newer",
					name: requestedName,
					createdAt: "2026-08-03T00:00:05.000Z",
				}),
				nativeSandbox("running", {
					id: "sb-older",
					name: requestedName,
					createdAt: "2026-08-03T00:00:00.000Z",
				}),
			],
		});

		const sandbox = await runcloudCompute({
			client,
			readyPollMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		expect(sandbox.sandboxId).toBe("sb-older");
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
