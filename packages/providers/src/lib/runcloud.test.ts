import { describe, expect, it } from "bun:test";
import type { ExecOptions, Sandbox, SandboxState } from "@run-cloud/sdk";
import { RunCloudError } from "@run-cloud/sdk";
import { isRetryableCreateError } from "./retryable-create.ts";
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
			idempotencyKey: expect.stringMatching(/^benchmark-[0-9a-f-]+$/),
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
		// One identifier for both, so control-plane logs correlate the request with the allocation.
		expect(createInput?.idempotencyKey).toBe(createInput?.name);
		expect(destroyCalls).toBe(0);
	});

	/**
	 * A client whose create is accepted and whose readiness then lands in `state`. Its `get` reports
	 * `destroyed` once `destroy` has been called, because the real control plane does: the adapter
	 * confirms teardown there before it will claim a failed create is safe to re-issue.
	 */
	const bootingTo = (state: SandboxState, destroy: NativeClient["destroy"] = async () => {}) => {
		let torndown = false;
		return nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => nativeSandbox(torndown ? "destroyed" : state),
			destroy: async (id) => {
				// AFTER the inner destroy resolves: one that throws has not established anything.
				await destroy(id);
				torndown = true;
			},
		});
	};

	// See isRetryableBootFailure in runcloud.ts for why a host-side boot failure is worth re-issuing.
	// What matters here is the guard on it: the sandbox must be destroyed before the error escapes, or
	// the mark would claim "nothing was allocated" for a create that left one running.
	it.each([
		"interrupted",
		"failed",
		"destroying",
	] as const)("marks a host-side boot failure (%s) retryable once the allocation is confirmed gone", async (state) => {
		const destroyed: string[] = [];
		const client = bootingTo(state, async (id) => {
			destroyed.push(id);
		});

		const error = await runcloudCompute({ client })
			.sandbox.create()
			.catch((e: unknown) => e);
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain(`entered terminal state "${state}"`);
		expect(destroyed).toEqual(["sb-test"]);
		expect(isRetryableCreateError(error)).toBe(true);
	});

	it("leaves a boot failure unmarked when teardown cannot be confirmed", async () => {
		// `destroy` resolving is a request accepted, not a microVM removed (~800ms vs ~4s against the
		// live API). A control plane that will not say the sandbox is going away has not established
		// the "nothing is allocated" half of the mark, so the error must surface as itself.
		const client = nativeClient({
			create: async () => nativeSandbox("building_image"),
			get: async () => nativeSandbox("interrupted"),
			destroy: async () => {},
		});

		const error = await runcloudCompute({ client })
			.sandbox.create()
			.catch((e: unknown) => e);
		expect((error as Error).message).toContain('entered terminal state "interrupted"');
		expect(isRetryableCreateError(error)).toBe(false);
	});

	it("leaves a clean stop unmarked — it says nothing about the host giving up", async () => {
		const error = await runcloudCompute({ client: bootingTo("stopped") })
			.sandbox.create()
			.catch((e: unknown) => e);
		expect((error as Error).message).toContain('entered terminal state "stopped"');
		expect(isRetryableCreateError(error)).toBe(false);
	});

	it("leaves a boot failure unmarked when cleanup could not confirm the allocation is gone", async () => {
		const client = bootingTo("interrupted", async () => {
			throw new Error("destroy unavailable");
		});

		const error = await runcloudCompute({ client, cleanupRetryMs: 0 })
			.sandbox.create()
			.catch((e: unknown) => e);
		// Retrying a create whose predecessor may still be billable is the leak this guard prevents.
		expect(isRetryableCreateError(error)).toBe(false);
		expect((error as Error).message).toContain("manual cleanup may be required");
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
		// Established absence is what makes re-issuing the create safe, and a stall that allocated
		// nothing is this control plane reporting saturation without saying "429". Mark it so the
		// harness waits it out instead of failing the cell in seconds.
		expect(isRetryableCreateError(await create.catch((e) => e))).toBe(true);
	});

	it("does not mark a generic create failure as retryable after confirming absence", async () => {
		const clientError = new Error("client serialization failed");
		const client = nativeClient({
			create: async () => {
				throw clientError;
			},
			list: async () => [],
		});

		const rejected = await runcloudCompute({
			client,
			reconcileAttempts: 1,
			sleep: async () => {},
		})
			.sandbox.create()
			.catch((error) => error);

		expect(rejected).toBe(clientError);
		expect(isRetryableCreateError(rejected)).toBe(false);
	});

	it("does not mark an unanswered reconciliation as retryable", async () => {
		const client = nativeClient({
			create: () => new Promise<Sandbox>(() => {}),
			list: async () => {
				throw new Error("control plane unavailable");
			},
		});

		const create = runcloudCompute({
			client,
			controlPlaneTimeoutMs: 5,
			reconcileAttempts: 2,
			reconcileRetryMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		const error = await create.catch((e) => e);
		expect(error).toBeInstanceOf(AggregateError);
		expect((error as Error).message).toMatch(/every reconciliation lookup also failed/);
		// Re-issuing a create that may already have allocated is how one stranded sandbox becomes a
		// dozen. Absence was never established, so this must NOT be retried.
		expect(isRetryableCreateError(error)).toBe(false);
	});

	it("does not mark a definitive rejection as retryable", async () => {
		const client = nativeClient({
			create: async () => {
				throw new RunCloudError(422, "invalid image");
			},
			list: async () => [],
		});

		const create = runcloudCompute({
			client,
			reconcileRetryMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		// Nothing was allocated here either, but re-issuing a rejected request for an hour would only
		// delay the real error. (429 still reaches the retry through the harness's message match.)
		const rejected = await create.catch((e) => e);
		expect(rejected).toBeInstanceOf(RunCloudError);
		expect(isRetryableCreateError(rejected)).toBe(false);
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

	it("reports the recovery name when no reconciliation lookup ever answered", async () => {
		let requestedName: string | undefined;
		let listCalls = 0;
		const client = nativeClient({
			create: async (input) => {
				requestedName = input?.name;
				throw new RunCloudError(503, "response lost after allocation");
			},
			list: async () => {
				listCalls++;
				throw new Error("control plane unavailable");
			},
		});

		const create = runcloudCompute({
			client,
			reconcileAttempts: 3,
			reconcileRetryMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		// The overload that made the create ambiguous took `list` down with it, so absence was never
		// established. Reporting this as "nothing was allocated" is the guess that strands a sandbox.
		await expect(create).rejects.toThrow(/unknown whether a sandbox was allocated/);
		await expect(create).rejects.toThrow(/manual cleanup/);
		expect(listCalls).toBe(3);
		// The name is the handle an operator (or an account-wide sweep) needs to find the allocation.
		await expect(create).rejects.toThrow(new RegExp(requestedName ?? "unset"));
	});

	it("does not put a definitive 4xx back in doubt when its confirming lookup fails", async () => {
		const clientError = new RunCloudError(422, "invalid image");
		const client = nativeClient({
			create: async () => {
				throw clientError;
			},
			list: async () => {
				throw new Error("control plane unavailable");
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
			// The create endpoint itself supplied the rejection, so an unanswered lookup adds no doubt —
			// and the harness's capacity retry still sees the original error rather than an AggregateError.
			expect(error).toBe(clientError);
		}
	});

	it("keeps the recovery name when a conflict's reconciliation never answers", async () => {
		let requestedName: string | undefined;
		let listCalls = 0;
		const client = nativeClient({
			create: async (input) => {
				requestedName = input?.name;
				throw new RunCloudError(409, "idempotency key already in use");
			},
			list: async () => {
				listCalls++;
				throw new Error("control plane unavailable");
			},
		});

		const create = runcloudCompute({
			client,
			reconcileAttempts: 3,
			reconcileRetryMs: 0,
			sleep: async () => {},
		}).sandbox.create();

		// A conflict asserts that something already exists, so it is the last error whose unanswered
		// lookup may be written off as "nothing was allocated" — it gets the full window, not one pass.
		await expect(create).rejects.toThrow(/unknown whether a sandbox was allocated/);
		await expect(create).rejects.toThrow(new RegExp(requestedName ?? "unset"));
		expect(listCalls).toBe(3);
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
