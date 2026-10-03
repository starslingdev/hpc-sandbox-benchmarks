import { describe, expect, it } from "bun:test";
import type { ExecOptions as NativeExecOptions, Sandbox, SandboxState } from "@run-cloud/sdk";
import { RunCloudError } from "@run-cloud/sdk";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { sandboxRef } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import type { RuncloudSpecOptions } from "./index.ts";
import {
	RUNCLOUD_CLEANUP_RETRY_MS,
	RUNCLOUD_RECOVERY_NAME_PREFIX,
	RUNCLOUD_REMOVAL_DEADLINE_MS,
	RUNCLOUD_SANDBOX_LIFETIME_SECS,
	runcloudObservation,
	runcloudSpec,
} from "./index.ts";

type NativeClient = NonNullable<RuncloudSpecOptions["client"]>;

const context = {
	env: { RUN_CLOUD_API_KEY: "rc_test-key" },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v1" },
} as const;

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};

function nativeSandbox(state: SandboxState = "running", overrides: Partial<Sandbox> = {}): Sandbox {
	return {
		id: "sb-test",
		state,
		image: context.resolvedArtifact.ref,
		region: "us-west",
		sizeClass: "custom",
		milliCpu: 4_000,
		memMb: 8_192,
		warmStart: false,
		timeoutSeconds: RUNCLOUD_SANDBOX_LIFETIME_SECS,
		createdAt: "2026-08-03T00:00:00.000Z",
		...overrides,
	};
}

/** The df probe answers 80 GiB unless a test overrides exec; everything else exits 0 silently. */
function nativeClient(overrides: Partial<NativeClient> = {}): NativeClient {
	const removed = new Set<string>();
	return {
		create: async () => nativeSandbox(),
		get: async (id) => nativeSandbox(removed.has(id) ? "destroyed" : "running", { id }),
		list: async () => [],
		exec: async (_id, command) => ({
			stdout: String(command).startsWith("df -Pk") ? `${80 * 1024 * 1024}\n` : "",
			stderr: "",
			exit_code: 0,
			exitCode: 0,
		}),
		...overrides,
		destroy: async (id) => {
			await overrides.destroy?.(id);
			removed.add(id);
		},
	} as NativeClient;
}

/** A simulated clock that each sleep advances (by at least 1 ms, so a zero-interval poll still
 *  moves time and a deadline loop terminates). */
function simulatedClock() {
	let now = 0;
	return {
		now: () => now,
		sleep: async (ms: number) => {
			now += Math.max(1, ms);
		},
	};
}

/** Fast seams: no real sleeps, tight bounds, and no absence-confirmation wait in the bridge. The
 *  removal watch runs on a simulated clock, so a sandbox that never leaves `destroying` exhausts a
 *  short simulated deadline instead of spinning in real time. */
function fast(client: NativeClient, seams: RuncloudSpecOptions = {}): RuncloudSpecOptions {
	return {
		client,
		readyPollMs: 0,
		reconcileRetryMs: 0,
		cleanupRetryMs: 0,
		removalDeadlineMs: 10,
		recoveryAbsenceConfirmationMs: 1,
		...simulatedClock(),
		...seams,
	};
}

/** The production removal cadence and deadline, on a simulated clock the test can read. */
function productionRemoval() {
	const clock = simulatedClock();
	return {
		clock,
		seams: {
			...clock,
			cleanupRetryMs: RUNCLOUD_CLEANUP_RETRY_MS,
			removalDeadlineMs: RUNCLOUD_REMOVAL_DEADLINE_MS,
		},
	};
}

function driver(client: NativeClient, seams: RuncloudSpecOptions = {}) {
	return driverFromComputeSpec(
		"runcloud",
		runcloudSpec(context, fast(client, seams)),
		context.resolvedArtifact,
		[context.env.RUN_CLOUD_API_KEY],
	);
}

/** The exact create options the module maps for the benchmark request. */
function _mapped(seams: RuncloudSpecOptions = {}) {
	return runcloudSpec(context, fast(nativeClient(), seams)).createOptions.map(request, (detail) => {
		throw new Error(detail);
	});
}

describe("run.cloud commands, lifecycle, and account inventory", () => {
	it("enumerates the raw SDK envelope with encoded cursors and a separate total scan budget", async () => {
		let now = 0;
		const urls: URL[] = [];
		const fetchImpl: typeof fetch = Object.assign(
			async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
				urls.push(new URL(String(input)));
				expect(init?.method).toBe("GET");
				now += 20_000;
				return Response.json(
					urls.length === 1
						? { items: [{ id: "gone", state: "destroyed" }], nextCursor: "older+/=?&" }
						: {
								items: [
									{
										id: "old-owned",
										state: "stopped",
										name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-old`,
									},
								],
								nextCursor: null,
							},
				);
			},
			{ preconnect: fetch.preconnect },
		);
		const d = driverFromComputeSpec(
			"runcloud",
			runcloudSpec(context, { fetch: fetchImpl, now: () => now }),
			context.resolvedArtifact,
			[context.env.RUN_CLOUD_API_KEY],
		);
		expect(await d.inventory?.list()).toEqual({
			owned: [sandboxRef("runcloud", "old-owned")],
			foreignCount: 0,
		});
		expect(urls.map((url) => url.pathname)).toEqual([
			"/run-cloud/sandboxes",
			"/run-cloud/sandboxes",
		]);
		expect(urls.map((url) => url.searchParams.get("limit"))).toEqual(["200", "200"]);
		expect(urls.map((url) => url.searchParams.get("cursor"))).toEqual([null, "older+/=?&"]);
	});

	it("aborts the in-flight inventory HTTP request when admission is cancelled", async () => {
		const controller = new AbortController();
		let entered!: () => void;
		const started = new Promise<void>((resolve) => {
			entered = resolve;
		});
		let socketAborted = false;
		const fetchImpl: typeof fetch = Object.assign(
			async (_input: Parameters<typeof fetch>[0], init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener(
						"abort",
						() => {
							socketAborted = true;
							reject(init.signal?.reason);
						},
						{ once: true },
					);
					entered();
				}),
			{ preconnect: fetch.preconnect },
		);
		const d = driverFromComputeSpec(
			"runcloud",
			runcloudSpec(context, { fetch: fetchImpl }),
			context.resolvedArtifact,
			[context.env.RUN_CLOUD_API_KEY],
		);
		const result = d.inventory
			?.list({ signal: controller.signal })
			.catch((error: unknown) => error);
		await started;
		controller.abort(new Error("cancel admission"));
		expect(await result).toMatchObject({ code: "probe-failed" });
		expect(socketAborted).toBe(true);
	});

	it("finds an older owned sandbox beyond pages of destroyed tombstones", async () => {
		const tombstones = Array.from({ length: 50 }, (_, i) =>
			nativeSandbox("destroyed", {
				id: `gone-${i}`,
				name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-${i}`,
			}),
		);
		const cursors: (string | undefined)[] = [];
		const client = nativeClient({ list: async () => tombstones });
		const d = driver(client, {
			inventoryPage: async (cursor) => {
				cursors.push(cursor);
				return cursor === undefined
					? { items: tombstones, nextCursor: "older" }
					: {
							items: [
								nativeSandbox("stopped", {
									id: "old-owned",
									name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-old`,
								}),
								nativeSandbox("paused", { id: "foreign", name: "dev-box" }),
							],
							nextCursor: null,
						};
			},
		});
		expect(await d.inventory?.list()).toEqual({
			owned: [sandboxRef("runcloud", "old-owned")],
			foreignCount: 1,
		});
		expect(cursors).toEqual([undefined, "older"]);
	});

	it("fails account inventory closed when a later page fails or cannot prove completion", async () => {
		const owned = nativeSandbox("stopped", {
			id: "old-owned",
			name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-old`,
		});
		for (const nextPage of [
			async () => {
				throw new RunCloudError(503, "inventory unavailable");
			},
			async () => ({ items: [], nextCursor: "older" }),
			async () => ({ items: [], nextCursor: "" }),
			async () => ({ items: [] }),
			async () => ({ items: [owned], nextCursor: null }),
		]) {
			let pages = 0;
			const d = driver(nativeClient(), {
				inventoryPage: async (cursor) => {
					pages++;
					return cursor === undefined ? { items: [owned], nextCursor: "older" } : nextPage();
				},
			});
			await expect(d.inventory?.list()).rejects.toMatchObject({
				code: "probe-failed",
				provider: "runcloud",
			});
			expect(pages).toBe(2);
		}
	});

	it("uses one deadline for the entire inventory rather than resetting it for every page", async () => {
		let now = 0;
		let pages = 0;
		const d = driver(nativeClient(), {
			controlPlaneTimeoutMs: 100,
			inventoryTimeoutMs: 100,
			now: () => now,
			inventoryPage: async () => {
				pages++;
				now += 100;
				return { items: [], nextCursor: "older" };
			},
		});
		await expect(d.inventory?.list()).rejects.toMatchObject({ code: "probe-failed" });
		expect(pages).toBe(1);
	});

	it("stops paginated inventory on cancellation before requesting another page", async () => {
		const controller = new AbortController();
		let pages = 0;
		const d = driver(nativeClient(), {
			inventoryPage: async () => {
				pages++;
				controller.abort(new Error("stop inventory"));
				return { items: [], nextCursor: "older" };
			},
		});
		await expect(d.inventory?.list({ signal: controller.signal })).rejects.toMatchObject({
			code: "probe-failed",
		});
		expect(pages).toBe(1);
	});

	it("passes commands straight to the native exec and preserves non-zero exits", async () => {
		const execCalls: Array<{ command: string; options: NativeExecOptions }> = [];
		const client = nativeClient({
			exec: async (_id, command, options = {}) => {
				execCalls.push({ command: String(command), options });
				if (String(command).startsWith("df -Pk"))
					return { stdout: `${80 * 1024 * 1024}\n`, stderr: "", exit_code: 0, exitCode: 0 };
				return { stdout: "out", stderr: "err", exit_code: 7, exitCode: 7 };
			},
		});
		const session = await driver(client).create(request);
		const result = await session.exec("printf test");
		expect(result).toMatchObject({
			exit: { kind: "exited", code: 7 },
			stdout: "out",
			stderr: "err",
		});
		// The first exec was the disk probe issued during create verification.
		expect(execCalls.at(-1)?.command).toBe("printf test");
	});

	it("does not release a destroying allocation that returns to running before removal", async () => {
		const states = ["destroying", "running", "destroyed"];
		let observations = 0;
		const client = nativeClient({
			get: async () => nativeSandbox(states[observations++] ?? "running"),
		});
		await driver(client).destroyById?.(sandboxRef("runcloud", "sb-revived"));
		expect(observations).toBe(3);
		expect(runcloudObservation("destroying")).toEqual({ state: "running" });
	});

	it("keeps pending deletions in inventory so admission cannot overlook them", async () => {
		const client = nativeClient({
			list: async () => [
				nativeSandbox("destroying", {
					id: "sb-pending",
					name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-pending`,
				}),
			],
		});
		expect(await driver(client).inventory?.list()).toEqual({
			owned: [sandboxRef("runcloud", "sb-pending")],
			foreignCount: 0,
		});
	});

	it("waits for an accepted DELETE to stop running and refuses unconfirmed removal", async () => {
		let observations = 0;
		const delayed = nativeClient({
			get: async () => nativeSandbox(++observations < 3 ? "destroying" : "destroyed"),
		});
		await driver(delayed).destroyById?.(sandboxRef("runcloud", "sb-delayed"));
		expect(observations).toBe(3);
		const stuck = nativeClient({ get: async () => nativeSandbox("running") });
		await expect(
			driver(stuck).destroyById?.(sandboxRef("runcloud", "sb-stuck")),
		).rejects.toMatchObject({ code: "destroy-failed" });
	});

	it("confirms a DELETE that run.cloud takes longer than a few polls to finish", async () => {
		// Run 36356024651: runcloud-pgbench-r2 and runcloud-realworld-better-auth-r2 measured, then
		// failed cleanup with "has not confirmed removal after destroy". Both were observed absent at
		// recovery minutes later, so the DELETE landed; the driver stopped watching too early.
		const { clock, seams } = productionRemoval();
		const client = nativeClient({
			get: async () => nativeSandbox(clock.now() < 20_000 ? "destroying" : "destroyed"),
		});
		await expect(
			driver(client, seams).destroyById?.(sandboxRef("runcloud", "sb-slow-delete")),
		).resolves.toBeUndefined();
		expect(clock.now()).toBeGreaterThanOrEqual(20_000);
	});

	it("gives up on unconfirmed removal inside the harness's 60 s destroy timeout", async () => {
		const { clock, seams } = productionRemoval();
		const client = nativeClient({ get: async () => nativeSandbox("destroying") });
		await expect(
			driver(client, seams).destroyById?.(sandboxRef("runcloud", "sb-never")),
		).rejects.toMatchObject({ code: "destroy-failed" });
		expect(clock.now()).toBeLessThan(60_000);
		expect(clock.now()).toBeGreaterThanOrEqual(
			RUNCLOUD_REMOVAL_DEADLINE_MS - RUNCLOUD_CLEANUP_RETRY_MS,
		);
	});

	it("destroys by canonical id, converges on 404, and reads tombstones as absence", async () => {
		const destroyed: string[] = [];
		const client = nativeClient({
			destroy: async (id) => {
				destroyed.push(id);
				if (id === "sb-gone") throw new RunCloudError(404, "gone");
				if (id === "sb-broken") throw new RunCloudError(503, "control plane unavailable");
			},
			get: async (id) => {
				if (id === "sb-gone") throw new RunCloudError(404, "gone");
				return nativeSandbox(id === "sb-going" ? "destroying" : "destroyed", { id });
			},
		});
		const d = driver(client);
		await d.destroyById?.(sandboxRef("runcloud", "sb-leftover"));
		await d.destroyById?.(sandboxRef("runcloud", "sb-gone"));
		await expect(d.destroyById?.(sandboxRef("runcloud", "sb-broken"))).rejects.toMatchObject({
			code: "destroy-failed",
			provider: "runcloud",
		});
		expect(destroyed).toEqual(["sb-leftover", "sb-gone", "sb-broken"]);
		expect(await d.probes?.observe(sandboxRef("runcloud", "sb-gone"))).toEqual({ state: "absent" });
		expect(await d.probes?.observe(sandboxRef("runcloud", "sb-tombstone"))).toEqual({
			state: "absent",
		});
		expect(await d.probes?.observe(sandboxRef("runcloud", "sb-going"))).toEqual({
			state: "running",
		});
		expect(runcloudObservation("running")).toEqual({ state: "running" });
		expect(runcloudObservation("building_image")).toEqual({ state: "running" });
		expect(runcloudObservation("stopped")).toEqual({ state: "terminal" });
	});

	it("owns sandboxes by the benchmark name prefix and skips tombstones in the account sweep", async () => {
		const client = nativeClient({
			list: async () => [
				nativeSandbox("running", { id: "ours-1", name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-a` }),
				nativeSandbox("paused", { id: "ours-2", name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-b` }),
				nativeSandbox("destroyed", { id: "gone", name: `${RUNCLOUD_RECOVERY_NAME_PREFIX}-c` }),
				nativeSandbox("running", { id: "theirs", name: "dev-box" }),
				nativeSandbox("stopped", { id: "unnamed", name: null }),
			],
		});
		expect(await driver(client).inventory?.list()).toEqual({
			owned: [sandboxRef("runcloud", "ours-1"), sandboxRef("runcloud", "ours-2")],
			foreignCount: 2,
		});
		const broken = nativeClient({ list: async () => ({ sandboxes: [] }) as never });
		await expect(driver(broken).inventory?.list()).rejects.toMatchObject({
			code: "probe-failed",
			provider: "runcloud",
		});
	});
});
