// Modal tested at the vendor seam: the adapter's translation over a fake control plane, Modal's
// own deadline and process-result quirks, the port contract, and sessions through each variant's
// module. Kit behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is
// tested once in the driver package.

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import {
	detachedShellCommand,
	FailedCreateCleanupError,
	isRetryableDriverCreate,
} from "@sandbox-benchmarks/driver";
import type { CreateAttempt } from "@sandbox-benchmarks/driver/vendor";
import { DISK_PROBE, MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { kitPort, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import type { ModalClient } from "modal";
import type { ClientMiddleware, ServiceDefinition } from "nice-grpc";
import { ClientError, createServer, Status } from "nice-grpc";
import { MODAL_COST_SDK_PROVENANCE } from "./cost.ts";
import modalGvisor from "./gvisor.ts";
import { defineModalDriver, MODAL_EXECUTION, modalAllocate } from "./shared.ts";
import type { ModalBackend, ModalControlPlane, ModalControlSandbox } from "./vendor.ts";
import {
	createModalControlRunner,
	isModalRetryableCreate,
	MODAL_APP_NAME,
	MODAL_CONTROL_TIMEOUT_MS,
	MODAL_DESTROY_TIMEOUT_MS,
	MODAL_V1_SANDBOX_ID,
	MODAL_V2_SANDBOX_ID,
	modalControlPlane,
	modalControlTimeoutMessage,
	modalProcessResult,
	modalVendor,
} from "./vendor.ts";
import modalVm from "./vm.ts";

const IMAGE = "registry.example/toolchain:version";
const context: DriverContext<"modal-vm"> = {
	env: { MODAL_TOKEN_ID: "test-token", MODAL_TOKEN_SECRET: "test-secret" },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: IMAGE },
};
const request = (overrides: Partial<CreateRequest> = {}): CreateRequest => ({
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: { kind: "image", ref: IMAGE },
	deadlineMs: 300_000,
	env: { BENCHMARK_MODE: "true" },
	...overrides,
});
const op = () => ({ signal: new AbortController().signal });
const NAME = `${MARKER_PREFIX}12345678-1234-1234-1234-123456789abc`;
const V1 = "sb-rxWrDWGgOCJXeCSavkiDL6";
const V2 = "sb-01M0BXHCKJJHRYBN29EC21NMW4";
const notFound = (rpc: string) =>
	new ClientError(`/modal.client.ModalClient/${rpc}`, Status.NOT_FOUND, "not found");

interface Row {
	readonly id: string;
	readonly appId: string;
	readonly name: string;
	readonly createdAt: number;
	readonly v2: boolean;
	exitCode: number | null;
}

/**
 * A whole Modal environment: Apps holding V1 and V2 sandboxes, named lookups of running sandboxes,
 * a waited terminate that leaves an exit code, raw listings two rows a page newest first, and a
 * guest that answers exit codes and the kit's disk probe.
 */
function modalAccount(options: { readonly appExists?: boolean; readonly diskGb?: number } = {}) {
	const apps = new Map<string, string>([["other-app", "ap-foreign"]]);
	if (options.appExists ?? true) apps.set(MODAL_APP_NAME, "ap-bench");
	const rows = new Map<string, Row>();
	const calls: string[] = [];
	let clock = 0;
	const add = (row: Omit<Row, "createdAt" | "exitCode">) => {
		rows.set(row.id, { ...row, createdAt: ++clock, exitCode: null });
		return row.id;
	};
	const allocate = (v2: boolean, name: string, appId = "ap-bench") =>
		add({
			id: v2
				? `sb-0${String(clock + 1).padStart(25, "0")}`
				: `sb-${String(clock + 1).padStart(22, "A")}`,
			appId,
			name,
			v2,
		});
	const handle = (id: string, rpc: "Wait" | "Terminate" = "Wait"): ModalControlSandbox => ({
		sandboxId: id,
		poll: async () => {
			calls.push(`poll ${id}`);
			const row = rows.get(id);
			if (!row) throw notFound(`Sandbox${rpc}`);
			return row.exitCode;
		},
		terminate: async () => {
			calls.push(`terminate ${id}`);
			const row = rows.get(id);
			if (!row) throw notFound("SandboxTerminate");
			row.exitCode = 0;
			return 0;
		},
		exec: async (command) => {
			calls.push(`exec ${command[2]}`);
			const script = command[2] ?? "";
			const exit = /^sh -c 'exit (\d+)'$/.exec(script);
			const stdout =
				script === DISK_PROBE ? `${Math.round((options.diskGb ?? 64) * 1024 * 1024)}\n` : "";
			return {
				stdout: { readText: async () => stdout },
				stderr: { readText: async () => "" },
				wait: async () => (exit ? Number(exit[1]) : 0),
			};
		},
		detach: () => {},
	});
	const running =
		(v2: boolean, filter: (row: Row) => boolean) =>
		async ({ beforeTimestamp }: { readonly beforeTimestamp?: number }) =>
			[...rows.values()]
				.filter((row) => row.v2 === v2 && row.exitCode === null && filter(row))
				.filter((row) => beforeTimestamp === undefined || row.createdAt < beforeTimestamp)
				.sort((a, b) => b.createdAt - a.createdAt)
				.slice(0, 2);
	const byName = (v2: boolean) => async (appName: string, name: string) => {
		calls.push(`${v2 ? "v2" : "v1"} name ${name}`);
		const row = [...rows.values()].find(
			(candidate) =>
				candidate.v2 === v2 &&
				candidate.name === name &&
				candidate.appId === apps.get(appName) &&
				candidate.exitCode === null,
		);
		if (!row) throw notFound(v2 ? "SandboxGetFromNameV2" : "SandboxGetFromName");
		return handle(row.id);
	};
	const control: ModalControlPlane = {
		apps: {
			fromName: async (name) => {
				const appId = apps.get(name);
				return appId === undefined ? undefined : { appId };
			},
			list: async () => [...apps.values()].map((appId) => ({ appId })),
		},
		sandboxes: {
			fromId: async (id) => handle(id),
			fromName: byName(false),
			experimentalFromName: byName(true),
			list: (params) =>
				running(false, (row) => !params.appId || row.appId === params.appId)(params),
			experimentalList: (params) => running(true, (row) => row.appId === params.appId)(params),
		},
	};
	const vendor = (backend: ModalBackend) =>
		modalVendor({
			backend,
			appName: MODAL_APP_NAME,
			control: () => control,
			allocate: async ({ marker }: CreateAttempt) => {
				calls.push(`create ${marker}`);
				return { sandboxId: allocate(backend === "v2", marker) };
			},
		});
	return { rows, calls, control, allocate, vendor };
}

/** Each variant's own module, lowered over a fake environment instead of the real SDK. */
function driverOver(account: ReturnType<typeof modalAccount>, module = modalVm) {
	return vendorDriver(module as typeof modalVm, context, {
		vendor: account.vendor(module === modalVm ? "v1" : "v2") as never,
		timing: { pollMs: 0, deleteTimeoutMs: 1_000 },
	});
}

/** The version of `packageName` as this package resolves it — the copy the driver actually loads. */
function installedVersion(packageName: string): string {
	let directory = dirname(fileURLToPath(import.meta.resolve(packageName)));
	for (;;) {
		const manifest = join(directory, "package.json");
		try {
			const parsed: unknown = JSON.parse(readFileSync(manifest, "utf8"));
			if (parsed !== null && typeof parsed === "object" && "version" in parsed) {
				const { name, version } = parsed as { name?: unknown; version?: unknown };
				if (name === packageName && typeof version === "string") return version;
			}
		} catch {
			// Keep walking: dist directories often have no manifest of their own.
		}
		const parent = dirname(directory);
		if (parent === directory) throw new Error(`could not resolve an installed ${packageName}`);
		directory = parent;
	}
}

describe("Modal modules", () => {
	it("attaches the shared implementation only through the two literal modules", () => {
		expect([modalGvisor.id, modalVm.id]).toEqual(["modal-gvisor", "modal-vm"]);
		expect(modalGvisor.execution).toEqual({ syncCapMs: 30 * 60_000, durable: "shell-detach" });
		expect(modalVm.execution).toEqual(MODAL_EXECUTION);
		const invalidAttachmentsAreCompileOnly = () => {
			// @ts-expect-error — identity and backend are selected by one closed provider literal
			defineModalDriver("e2b");
		};
		expect(invalidAttachmentsAreCompileOnly).toBeFunction();
	});

	it("pins cost-evidence provenance to the native SDK this driver actually loads", () => {
		expect(MODAL_COST_SDK_PROVENANCE.packageName).toBe("modal");
		expect(String(MODAL_COST_SDK_PROVENANCE.version)).toBe(installedVersion("modal"));
	});

	it("wires Modal costEvidence on both DriverModule variants", async () => {
		const capture = modalGvisor.costEvidence?.captureAfterTeardown;
		const completed = await capture?.({
			cell: { runId: "run-1", providerId: "modal-gvisor", suite: "cpu-node" },
			providerId: "modal-gvisor",
			sandboxId: "sb-123",
			teardown: {
				completed: true,
				attemptedAt: "2026-08-08T00:00:00.000Z",
				completedAt: "2026-08-08T00:00:01.000Z",
			},
		});
		expect(completed).toMatchObject({
			kind: "missing",
			reason: "unsupported_public_api",
			subject: { kind: "sandbox", sandboxId: "sb-123", appName: MODAL_APP_NAME },
		});
		if (completed?.kind !== "missing") throw new Error("Modal hook returned observed evidence");
		expect(completed.detail).toContain("was not invoked");
		expect(
			await modalVm.costEvidence?.captureAfterTeardown({
				cell: { runId: "run-1", providerId: "modal-vm", suite: "cpu-node" },
				providerId: "modal-vm",
				sandboxId: "sb-123",
				teardown: { completed: false, attemptedAt: "2026-08-08T00:00:00.000Z" },
			}),
		).toMatchObject({ kind: "missing", reason: "sandbox_teardown_unconfirmed" });
	});

	it("binds VM to V1 ids and gVisor to V2 ids", () => {
		expect(MODAL_V1_SANDBOX_ID.assert(V1)).toBe(V1);
		expect(MODAL_V2_SANDBOX_ID.assert(V2)).toBe(V2);
		expect(() => MODAL_V1_SANDBOX_ID.assert(V2)).toThrow();
		expect(() => MODAL_V2_SANDBOX_ID.assert(V1)).toThrow();
		expect(() => MODAL_V1_SANDBOX_ID.assert("sb-too-short")).toThrow();
		expect(() => MODAL_V1_SANDBOX_ID.assert(`${V1}/escape`)).toThrow();
		for (const malformed of [
			`sb-${"a".repeat(21)}`,
			`sb-${"a".repeat(23)}`,
			"sb-01m0bxhckjjhrybn29ec21nmw4",
			"sb-01M0BXHCKJJHRYBN29EC21NMI4",
			"sb-01M0BXHCKJJHRYBN29EC21NMO4",
			"sb-81M0BXHCKJJHRYBN29EC21NMW4",
			"sb-91M0BXHCKJJHRYBN29EC21NMW4",
		])
			expect(() => MODAL_V2_SANDBOX_ID.assert(malformed)).toThrow();
	});

	it("creates lazily in the benchmark App, at the canonical shape, on each variant's backend", async () => {
		for (const provider of ["modal-vm", "modal-gvisor"] as const) {
			let lookups = 0;
			const calls: unknown[] = [];
			const refusal = new ClientError(
				"/modal.client.ModalClient/SandboxCreate",
				Status.RESOURCE_EXHAUSTED,
				"capacity",
			);
			const backend = async (...args: unknown[]) => {
				calls.push(args);
				throw refusal;
			};
			const wrong = async () => {
				throw new Error("wrong backend");
			};
			const allocate = modalAllocate(
				provider,
				IMAGE,
				() =>
					({
						apps: {
							fromName: async (name: string, params: unknown) => {
								lookups++;
								expect([name, params]).toEqual([MODAL_APP_NAME, { createIfMissing: true }]);
								return "app";
							},
						},
						images: { fromRegistry: (image: string) => image },
						sandboxes: {
							create: provider === "modal-vm" ? backend : wrong,
							experimentalCreate: provider === "modal-gvisor" ? backend : wrong,
						},
					}) as never,
			);
			expect(lookups).toBe(0);
			const error = await allocate({ request: request(), marker: NAME }, op()).catch(
				(caught: unknown) => caught,
			);
			expect(error).toBe(refusal);
			expect(isModalRetryableCreate(error)).toBe(true);
			expect(lookups).toBe(1);
			expect(calls[0]).toEqual([
				"app",
				IMAGE,
				{
					name: NAME,
					timeoutMs: 3 * 60 * 60_000,
					cpu: 4,
					cpuLimit: 4,
					memoryMiB: 8192,
					memoryLimitMiB: 8192,
					env: { BENCHMARK_MODE: "true" },
					// The stable service plus vm_runtime is the VM config; gVisor adds nothing.
					...(provider === "modal-vm" && { experimentalOptions: { vm_runtime: true } }),
				},
			]);
		}
	});

	it("treats native RESOURCE_EXHAUSTED and control-budget aborts as retryable, never prose", () => {
		const exhausted = new ClientError(
			"/modal.client.ModalClient/SandboxCreate",
			Status.RESOURCE_EXHAUSTED,
			"quota",
		);
		expect(isModalRetryableCreate(new Error("wrapper", { cause: exhausted }))).toBe(true);
		expect(
			isModalRetryableCreate(
				new ClientError("/modal.client.ModalClient/SandboxCreate", Status.UNAVAILABLE, "retry"),
			),
		).toBe(false);
		for (const prose of ["429 Too Many Requests", "quota|rate limit|capacity"])
			expect(isModalRetryableCreate(new Error(prose))).toBe(false);
		expect(
			isModalRetryableCreate(
				new Error("create failed", {
					cause: new Error(modalControlTimeoutMessage(MODAL_DESTROY_TIMEOUT_MS)),
				}),
			),
		).toBe(true);
		expect(modalAccount().vendor("v1").control.transient?.(exhausted)).toBe(true);
	});

	it("sizes waited destroy under the harness ceiling and above the short control budget", () => {
		expect(MODAL_DESTROY_TIMEOUT_MS).toBeGreaterThan(MODAL_CONTROL_TIMEOUT_MS);
		expect(MODAL_DESTROY_TIMEOUT_MS).toBeLessThan(60_000);
	});
});

describe("Modal translation", () => {
	it("reads a running sandbox as ready, an exited one as gone, and only a sandbox-RPC miss as absent", async () => {
		const account = modalAccount();
		const { control } = kitPort(account.vendor("v1"));
		const id = account.allocate(false, NAME);
		expect(await control.get(id, op())).toMatchObject({ id, phase: "ready" });
		Object.assign(account.rows.get(id) ?? {}, { exitCode: 137 });
		expect(await control.get(id, op())).toMatchObject({ id, phase: "gone" });
		expect(await control.get(V1, op())).toBeNull();
		for (const poll of [
			async () => {
				throw notFound("AuthTokenGet");
			},
			async () => 1.5,
			async () => undefined,
		]) {
			account.control.sandboxes.fromId = async () => ({ poll, detach: () => {} }) as never;
			await expect(control.get(V1, op())).rejects.toThrow();
		}
	});

	it("terminates and waits, converging only on a sandbox-RPC not-found", async () => {
		const account = modalAccount();
		const { control } = kitPort(account.vendor("v1"));
		const id = account.allocate(false, NAME);
		expect(await control.remove(id, op())).toBe("removed");
		expect(account.calls).toEqual([`terminate ${id}`]);
		expect(await control.remove(V1, op())).toBe("removed");
		for (const failure of [notFound("AuthTokenGet"), new Error("control plane unavailable")]) {
			account.control.sandboxes.fromId = async () =>
				({
					terminate: async () => {
						throw failure;
					},
					detach: () => {},
				}) as never;
			await expect(control.remove(id, op())).rejects.toBe(failure);
		}
	});

	it("looks a lost create up by name on both generations, its own first", async () => {
		const account = modalAccount();
		const v1 = account.allocate(false, NAME);
		const v2 = account.allocate(true, NAME);
		account.allocate(false, NAME, "ap-foreign"); // the same name in another App is not ours
		for (const backend of ["v2", "v1"] as const) {
			account.calls.length = 0;
			const found = await account.vendor(backend).control.find?.(NAME, undefined, op());
			expect(found?.records.map((record) => [record.id, record.marker])).toEqual(
				backend === "v2"
					? [
							[v2, NAME],
							[v1, NAME],
						]
					: [
							[v1, NAME],
							[v2, NAME],
						],
			);
			expect(account.calls).toEqual(
				backend === "v2"
					? [`v2 name ${NAME}`, `v1 name ${NAME}`]
					: [`v1 name ${NAME}`, `v2 name ${NAME}`],
			);
		}
		account.control.sandboxes.fromName = async () => {
			throw notFound("AuthTokenGet");
		};
		await expect(account.vendor("v1").control.find?.(NAME, undefined, op())).rejects.toThrow();
	});

	it("rejects cross-generation ids returned by each name endpoint", async () => {
		const client = {
			environmentName: () => "",
			cpClient: {
				sandboxGetFromName: async () => ({ sandboxId: V2 }),
				sandboxGetFromNameV2: async () => ({ sandboxId: V1 }),
			},
		} as unknown as ModalClient;
		const control = modalControlPlane(client);
		await expect(control.sandboxes.fromName(MODAL_APP_NAME, "wrong-v1")).rejects.toThrow();
		await expect(
			control.sandboxes.experimentalFromName(MODAL_APP_NAME, "wrong-v2"),
		).rejects.toThrow();
	});

	it("owns the App's own generation by name and counts both generations outside the App as foreign", async () => {
		const account = modalAccount();
		const v1Owned = account.allocate(false, `${MARKER_PREFIX}v1`);
		const v2Owned = account.allocate(true, `${MARKER_PREFIX}v2`);
		account.allocate(false, "dev-box", "ap-foreign");
		account.allocate(true, "dev-v2", "ap-foreign");
		for (let i = 0; i < 3; i++) account.allocate(false, `${MARKER_PREFIX}old-${i}`); // pages
		const inventory = async (backend: ModalBackend) => {
			const { control } = account.vendor(backend);
			const first = await control.page(undefined, op());
			const second = await control.page(first.next, op());
			expect(second.next).toBeUndefined();
			return {
				owned: first.records.map((record) => [record.id, record.marker]),
				foreign: second.records.length,
			};
		};
		const vm = await inventory("v1");
		expect(vm.owned).toContainEqual([v1Owned, `${MARKER_PREFIX}v1`]);
		expect(vm.owned).toHaveLength(4);
		expect(vm.foreign).toBe(2);
		expect(await inventory("v2")).toEqual({ owned: [[v2Owned, `${MARKER_PREFIX}v2`]], foreign: 2 });
		// No App yet: nothing can be owned, and every V1 sandbox in the environment is foreign.
		const fresh = modalAccount({ appExists: false });
		fresh.allocate(false, "dev-box", "ap-foreign");
		const { control } = fresh.vendor("v1");
		const first = await control.page(undefined, op());
		expect(first.records).toEqual([]);
		expect((await control.page(first.next, op())).records).toHaveLength(1);
	});

	it("fails closed on an unavailable App listing or a listing that does not advance", async () => {
		const account = modalAccount();
		const { control } = account.vendor("v2");
		const { next } = await control.page(undefined, op());
		account.control.apps.list = async () => {
			throw new Error("App listing unavailable");
		};
		await expect(control.page(next, op())).rejects.toThrow("App listing unavailable");
		const stuck = modalAccount();
		stuck.allocate(false, "a", "ap-foreign");
		stuck.control.sandboxes.list = async () => [
			{ id: V1, appId: "ap-foreign", name: "a", createdAt: 1 },
		];
		await expect(stuck.vendor("v1").control.page(undefined, op())).rejects.toThrow(
			"did not advance",
		);
	});
});

describe("Modal enforced control deadline", () => {
	type CallOptions = { retries?: number; timeoutMs?: number; signal?: AbortSignal };
	/** A control plane whose chosen RPC reaches the runner's middleware and never answers. */
	function hanging(phase: "lookup" | "poll" | "terminate" | "exec") {
		const callOptions: CallOptions[] = [];
		let settled = 0;
		let detached = 0;
		const control = (middleware: ClientMiddleware) => {
			const hang = async (): Promise<never> => {
				const generator = middleware(
					{
						method: { path: "/modal.client.ModalClient/Test" },
						requestStream: false,
						responseStream: false,
						request: {},
						next: async function* (_request: unknown, options: CallOptions) {
							callOptions.push(options);
							await new Promise<never>((_resolve, reject) => {
								const abort = () => {
									settled += 1;
									reject(options.signal?.reason ?? new Error("cancelled"));
								};
								if (options.signal?.aborted) abort();
								else options.signal?.addEventListener("abort", abort, { once: true });
							});
							return {};
						},
					} as never,
					{},
				);
				await generator.next();
				throw new Error("unreachable");
			};
			const sandbox = {
				sandboxId: V1,
				poll: phase === "poll" ? hang : async () => null,
				terminate: phase === "terminate" ? hang : async () => 0,
				exec: phase === "exec" ? hang : hang,
				detach: () => {
					detached += 1;
				},
			};
			return {
				sandboxes: {
					fromId: phase === "lookup" ? hang : async () => sandbox,
					fromName: hang,
					experimentalFromName: hang,
				},
			} as never;
		};
		const vendor = modalVendor({
			backend: "v1",
			appName: MODAL_APP_NAME,
			control,
			allocate: async () => ({ sandboxId: V1 }),
		});
		return { vendor, callOptions, settled: () => settled, detached: () => detached };
	}

	it("cancels and settles a hanging lookup, poll, terminate, exec start, and name lookup", async () => {
		const cases = [
			["lookup", MODAL_CONTROL_TIMEOUT_MS, (v: Hanging) => v.control.get(V1, cancelled())],
			["poll", MODAL_CONTROL_TIMEOUT_MS, (v: Hanging) => v.control.get(V1, cancelled())],
			[
				"terminate",
				MODAL_DESTROY_TIMEOUT_MS,
				(v: Hanging) => v.control.remove(V1, { ...cancelled(), current: async () => null }),
			],
			[
				"exec",
				MODAL_CONTROL_TIMEOUT_MS,
				(v: Hanging) => v.data.exec({ sandboxId: V1 }, "sleep 1", cancelled()),
			],
			[
				"lookup",
				MODAL_DESTROY_TIMEOUT_MS,
				(v: Hanging) => v.control.find?.(NAME, undefined, cancelled()),
			],
		] as const;
		for (const [phase, budget, operation] of cases) {
			const state = hanging(phase);
			await expect(operation(state.vendor)).rejects.toThrow(/caller cancelled/);
			expect(state.settled()).toBe(1);
			expect(state.callOptions).toHaveLength(1);
			expect(state.callOptions[0]).toMatchObject({ retries: 1, timeoutMs: budget });
			expect(state.callOptions[0]?.signal?.aborted).toBeTrue();
			if (phase !== "lookup") expect(state.detached()).toBeGreaterThanOrEqual(1);
		}
	});

	it("aborts the transaction at its own budget with the retryable timeout message", async () => {
		// An RPC that answers only its signal, as the SDK's transport does.
		const runner = createModalControlRunner(
			(middleware) => () =>
				middleware(
					{
						request: {},
						next: async function* (_request: unknown, options: CallOptions) {
							await new Promise((_resolve, reject) =>
								options.signal?.addEventListener("abort", () => reject(options.signal?.reason)),
							);
							return {};
						},
					} as never,
					{},
				).next(),
			10,
		);
		const pending = runner.run({}, (rpc) => rpc());
		await expect(pending).rejects.toThrow(modalControlTimeoutMessage(10));
		expect(isModalRetryableCreate(await pending.catch((caught: unknown) => caught))).toBe(true);
	});

	it("carries cancellation through Modal 0.9's actual timeout and retry chain", async () => {
		const encodeStringField = (value: string): Uint8Array => {
			const bytes = new TextEncoder().encode(value);
			if (bytes.length >= 128) throw new Error("test protobuf string is too long");
			return Uint8Array.of(10, bytes.length, ...bytes);
		};
		const service = {
			authTokenGet: {
				path: "/modal.client.ModalClient/AuthTokenGet",
				requestStream: false,
				responseStream: false,
				requestSerialize: () => new Uint8Array(),
				requestDeserialize: () => ({}),
				responseSerialize: (response: { token: string }) => encodeStringField(response.token),
				responseDeserialize: () => ({ token: "" }),
				options: {},
			},
			sandboxGetFromName: {
				path: "/modal.client.ModalClient/SandboxGetFromName",
				requestStream: false,
				responseStream: false,
				requestSerialize: () => new Uint8Array(),
				requestDeserialize: () => ({}),
				responseSerialize: () => new Uint8Array(),
				responseDeserialize: () => ({ sandboxId: "" }),
				options: {},
			},
		} as const satisfies ServiceDefinition;
		const server = createServer();
		let transportSettled = 0;
		// Both signals come from the server handler, so this test waits on real transport events
		// rather than on wall-clock budgets a loaded runner cannot honor: `handlerEntered` proves the
		// RPC actually reached the server, and `transportSettledOnce` proves the deadline's
		// cancellation propagated all the way back to it.
		let markHandlerEntered: () => void = () => {};
		const handlerEntered = new Promise<void>((resolve) => {
			markHandlerEntered = resolve;
		});
		let markTransportSettled: () => void = () => {};
		const transportSettledOnce = new Promise<void>((resolve) => {
			markTransportSettled = resolve;
		});
		server.add(service, {
			authTokenGet: async () => ({
				// A syntactically valid JWT with an expiry in 2100 avoids another auth RPC.
				token: "e30.eyJleHAiOjQxMDI0NDQ4MDB9.signature",
			}),
			sandboxGetFromName: async (_request, context) => {
				markHandlerEntered();
				await new Promise<void>((resolve) => {
					if (context.signal.aborted) resolve();
					else context.signal.addEventListener("abort", () => resolve(), { once: true });
				});
				transportSettled += 1;
				markTransportSettled();
				return { sandboxId: "" };
			},
		});
		const port = await server.listen("127.0.0.1:0");
		const previousServer = process.env.MODAL_SERVER_URL;
		process.env.MODAL_SERVER_URL = `http://127.0.0.1:${port}`;
		let client: ModalClient | undefined;
		let runner: ReturnType<typeof createModalControlRunner<ModalControlPlane>>;
		try {
			const { ModalClient } = await import("modal");
			runner = createModalControlRunner((middleware) => {
				client = new ModalClient({
					tokenId: "test-token-id",
					tokenSecret: "test-token-secret",
					grpcMiddleware: [middleware],
				});
				return modalControlPlane(client);
			}, MODAL_TEST_CONTROL_TIMEOUT_MS);
		} finally {
			if (previousServer === undefined) delete process.env.MODAL_SERVER_URL;
			else process.env.MODAL_SERVER_URL = previousServer;
		}
		try {
			const bounded = runner.run({}, (control) =>
				control.sandboxes.fromName(MODAL_APP_NAME, "benchmark-timeout"),
			);
			// Gate on arrival first: a ceiling that expired before the RPC reached the server would
			// prove nothing about cancellation reaching the transport.
			await awaitStage("the guarded RPC never reached the test gRPC server", handlerEntered);
			await expect(bounded).rejects.toThrow();
			await awaitStage(
				"the deadline's cancellation never reached the server handler",
				transportSettledOnce,
			);
			// Exactly one server invocation: the bounded retry must not re-issue an already-cancelled RPC.
			expect(transportSettled).toBe(1);
		} finally {
			client?.close();
			server.forceShutdown();
		}
	}, 30_000);
});

type Hanging = ReturnType<typeof modalVendor<{ readonly sandboxId: string }>>;
const cancelled = () => {
	const controller = new AbortController();
	setTimeout(() => controller.abort(new Error("caller cancelled")), 10);
	return { signal: controller.signal };
};

// Long enough that a loopback connection, the auth RPC, and the guarded call all reach the test
// server on a loaded CI runner before the ceiling expires. The test gates on the handler
// actually being entered, so this bounds the run rather than defining what is asserted.
const MODAL_TEST_CONTROL_TIMEOUT_MS = 2_000;
const MODAL_TEST_STAGE_TIMEOUT_MS = 10_000;

/** Await a transport milestone with a named failure rather than an anonymous test timeout. */
async function awaitStage(label: string, reached: Promise<void>): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			reached,
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(
					() => reject(new Error(`${label} within ${MODAL_TEST_STAGE_TIMEOUT_MS}ms`)),
					MODAL_TEST_STAGE_TIMEOUT_MS,
				);
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

describe("Modal command results", () => {
	/** A vendor over a fake control plane whose exec records what the SDK was asked. */
	const vendorOver = (
		process: Parameters<typeof modalProcessResult>[0],
		seen: unknown[] = [],
		onDetach = () => {},
	) =>
		modalVendor({
			backend: "v1",
			appName: MODAL_APP_NAME,
			control: () =>
				({
					sandboxes: {
						fromId: async () => ({
							exec: async (command: unknown, options: unknown) => {
								seen.push({ command, options });
								return process;
							},
							detach: onDetach,
						}),
					},
				}) as never,
			allocate: async () => ({ sandboxId: V1 }),
		});
	const execOver = (...args: Parameters<typeof vendorOver>) =>
		vendorOver(...args).data.exec({ sandboxId: V1 }, "exit 7");
	const text = (value: unknown) => ({ readText: async () => value });

	it("preserves the real nonzero exit and split streams, leaving the duration open", async () => {
		const seen: unknown[] = [];
		expect(
			await execOver({ stdout: text("out"), stderr: text("err"), wait: async () => 7 }, seen),
		).toEqual({ stdout: "out", stderr: "err", exitCode: 7 });
		// Modal 0.9 rejects a defined timeoutMs <= 0. Omission means the foreground
		// process owns its duration after the bounded attachment/start transaction.
		expect(seen).toEqual([
			{ command: ["sh", "-c", "exit 7"], options: { stdout: "pipe", stderr: "pipe" } },
		]);
	});

	it("launches the kit's 50ms detached-acceptance shell and bounds the process", async () => {
		const seen: unknown[] = [];
		const accepted = { stdout: text(""), stderr: text(""), wait: async () => 0 };
		await expect(
			vendorOver(accepted, seen).data.launch?.({ sandboxId: V1 }, "sleep 1"),
		).resolves.toBeUndefined();
		expect(seen).toEqual([
			{
				command: ["sh", "-c", detachedShellCommand("sleep 1")],
				options: { stdout: "pipe", stderr: "pipe", timeoutMs: MODAL_CONTROL_TIMEOUT_MS },
			},
		]);
		const missing = { stdout: text(""), stderr: text("command not found"), wait: async () => 127 };
		await expect(vendorOver(missing).data.launch?.({ sandboxId: V1 }, "missing")).rejects.toThrow(
			/exited 127: command not found/,
		);
	});

	it("bounds the whole launch, result read included, inside the cancellable control runner", async () => {
		// A result read that never settles until detach cancels its stream, as the SDK's does.
		let cancel: (() => void) | undefined;
		const hung = {
			stdout: text(""),
			stderr: text(""),
			wait: () =>
				new Promise<number>((_, reject) => {
					cancel = () => reject(new Error("stream closed"));
				}),
		};
		const launch = vendorOver(hung, [], () => cancel?.()).data.launch?.(
			{ sandboxId: V1 },
			"sleep 1",
			{ signal: AbortSignal.timeout(20) },
		);
		// Only the runner's abort detaches here, so the cancelled read is the proof of the bound.
		await expect(launch).rejects.toThrow("stream closed");
	});

	it("detaches an accepted control channel when exec-start rejects", async () => {
		const primary = new Error("Modal exec-start rejected");
		let detached = 0;
		const vendor = modalVendor({
			backend: "v1",
			appName: MODAL_APP_NAME,
			control: () =>
				({
					sandboxes: {
						fromId: async () => ({
							exec: async () => Promise.reject(primary),
							detach: () => {
								detached += 1;
							},
						}),
					},
				}) as never,
			allocate: async () => ({ sandboxId: V1 }),
		});
		await expect(vendor.data.exec({ sandboxId: V1 }, "true")).rejects.toBe(primary);
		expect(detached).toBe(1);
	});

	it("joins every process result operation before surfacing the primary failure", async () => {
		const primary = new Error("stdout transport failed");
		let stderrSettled = false;
		let detached = 0;
		await expect(
			modalProcessResult(
				{
					stdout: { readText: async () => Promise.reject(primary) },
					stderr: {
						readText: async () => {
							await Bun.sleep(5);
							stderrSettled = true;
							return "";
						},
					},
					wait: async () => 0,
				},
				() => {
					detached += 1;
				},
			),
		).rejects.toBe(primary);
		expect(stderrSettled).toBe(true);
		expect(detached).toBe(1);
	});

	it("detaches on the first process failure before joining cancellation-bound siblings", async () => {
		const primary = new Error("stdout transport failed");
		let detached = false;
		const settled = { stderr: false, wait: false };
		const releases: Array<() => void> = [];
		// Like the SDK's command-router streams, these siblings settle only once detach cancels them.
		const cancellationBound = (stream: keyof typeof settled) =>
			new Promise<string>((resolve) => {
				const release = () => {
					settled[stream] = true;
					resolve("");
				};
				if (detached) release();
				else releases.push(release);
			});
		const detach = () => {
			detached = true;
			for (const release of releases.splice(0)) release();
		};
		const operation = modalProcessResult(
			{
				stdout: { readText: async () => Promise.reject(primary) },
				stderr: { readText: () => cancellationBound("stderr") },
				wait: () => cancellationBound("wait").then(() => 0),
			},
			detach,
		);
		const outcome = await Promise.race([
			operation.then(
				() => ({ kind: "success" as const }),
				(error: unknown) => ({ kind: "error" as const, error }),
			),
			Bun.sleep(50).then(() => ({ kind: "pending" as const })),
		]);
		if (outcome.kind === "pending") {
			detach();
			await operation.catch(() => undefined);
		}
		expect(outcome).toEqual({ kind: "error", error: primary });
		expect({ detached, ...settled }).toEqual({ detached: true, stderr: true, wait: true });
	});

	it("joins started siblings when a later process accessor throws synchronously", async () => {
		const primary = new Error("wait accessor failed");
		let stdoutSettled = false;
		await expect(
			modalProcessResult(
				{
					stdout: {
						readText: async () => {
							await Bun.sleep(5);
							stdoutSettled = true;
							return "";
						},
					},
					stderr: text(""),
					wait: () => {
						throw primary;
					},
				},
				() => {},
			),
		).rejects.toBe(primary);
		expect(stdoutSettled).toBe(true);
	});

	it("rejects malformed command envelopes instead of canonicalizing them", async () => {
		for (const [stdout, stderr, exitCode] of [
			[{}, "", 0],
			["", {}, 0],
			["", "", 1.5],
			["", "", 2 ** 53],
		] as const)
			await expect(
				execOver({ stdout: text(stdout), stderr: text(stderr), wait: async () => exitCode }),
			).rejects.toThrow(/malformed result/);
	});
});

vendorContract("modal-vm adapter", modalVm, () => modalAccount().vendor("v1"));
vendorContract("modal-gvisor adapter", modalGvisor, () => modalAccount().vendor("v2"));

describe("Modal end to end through each variant's module", () => {
	it("a session boots, proves its disk, runs, launches, inventories and is terminated once", async () => {
		for (const module of [modalVm, modalGvisor]) {
			const account = modalAccount();
			account.allocate(false, "dev-box", "ap-foreign");
			const driver = driverOver(account, module as typeof modalVm);
			const session = await driver.create(request());
			expect(account.calls).toContain(`exec ${DISK_PROBE}`);
			expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
			// No native launch: the kit's shell detach runs through the same exec.
			await session.launch?.("sleep 600");
			expect(account.calls.at(-1)).toStartWith("exec nohup /bin/sh -lc 'sleep 600'");
			expect(await driver.inventory?.list()).toEqual({
				owned: [session.sandboxRef],
				foreignCount: 1,
			});
			account.calls.length = 0;
			await session.destroy();
			expect(account.calls).toEqual([`terminate ${session.sandboxRef.id}`]);
			expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		}
	});

	it("an allocation short of the requested disk is refused and terminated", async () => {
		const account = modalAccount({ diskGb: 30 });
		await expect(driverOver(account).create(request())).rejects.toMatchObject({
			code: "invalid-create-request",
			provider: "modal-vm",
		});
		expect([...account.rows.values()].map((row) => row.exitCode)).toEqual([0]);
	});

	it("a lost create response is recovered by its name and the allocation terminated", async () => {
		const account = modalAccount();
		const vendor = account.vendor("v1");
		const lost = {
			...vendor,
			control: {
				...vendor.control,
				create: async (attempt: CreateAttempt, o: { signal: AbortSignal }) => {
					await vendor.control.create(attempt, o);
					throw new ClientError(
						"/modal.client.ModalClient/SandboxCreate",
						Status.UNAVAILABLE,
						"lost",
					);
				},
			},
		};
		const driver = vendorDriver(modalVm, context, { vendor: lost as never, timing: { pollMs: 0 } });
		const failure = await driver.create(request()).catch((caught: unknown) => caught);
		expect(failure).not.toBeInstanceOf(FailedCreateCleanupError);
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect([...account.rows.values()].map((row) => row.exitCode)).toEqual([0]);
	});

	it("a cross-generation create is terminated by name before the id is rejected", async () => {
		const account = modalAccount();
		const vendor = account.vendor("v2");
		const crossed = {
			...vendor,
			control: {
				...vendor.control,
				create: async (attempt: CreateAttempt) => {
					const id = account.allocate(false, attempt.marker);
					return {
						id,
						phase: "ready" as const,
						marker: attempt.marker,
						raw: { id, native: { sandboxId: id } },
					};
				},
			},
		};
		const driver = vendorDriver(modalGvisor, context as never, {
			vendor: crossed as never,
			timing: { pollMs: 0 },
		});
		const error = await driver.create(request()).catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "invalid-sandbox-ref", provider: "modal-gvisor" });
		expect([...account.rows.values()].map((row) => row.exitCode)).toEqual([0]);
	});

	it("the default module refuses artifact, accelerator, and request drift before any call", async () => {
		const driver = modalVm.driver(context);
		for (const invalid of [
			request({ artifact: { kind: "image", ref: "registry.example/toolchain:candidate" } }),
			request({ gpu: { model: "H100", count: 1 } }),
		])
			await expect(driver.create(invalid)).rejects.toMatchObject({
				code: "invalid-create-request",
				provider: "modal-vm",
			});
	});
});
