import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import type { ClientMiddleware } from "nice-grpc";
import { ClientError, Status } from "nice-grpc";
import type { ModalControlRunner } from "./shared.ts";
import {
	createModalControlRunner,
	execModalCommand,
	launchModalCommand,
	MODAL_APP_NAME,
	MODAL_CONTROL_TIMEOUT_MS,
	modalDestroyById,
	modalDetachedCommand,
	modalInventory,
	modalProbes,
	verifyModalDiskCapacity,
} from "./shared.ts";

const request = (overrides: Partial<CreateRequest> = {}): CreateRequest => ({
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: { kind: "image", ref: "registry.example/toolchain:version" },
	deadlineMs: 300_000,
	env: { BENCHMARK_MODE: "true" },
	...overrides,
});

const modalRef = { provider: "modal-vm", id: "sb-rxWrDWGgOCJXeCSavkiDL6" } as const;

function directRunner(control: unknown): ModalControlRunner {
	return {
		run: async (options, operation) => {
			options.signal?.throwIfAborted();
			const result = await operation(control as never);
			options.signal?.throwIfAborted();
			return result;
		},
	};
}

function _unsupported(detail: string): never {
	throw new Error(detail);
}

/** The version of `packageName` as this package resolves it — the copy the driver actually loads. */
function _installedVersion(packageName: string): string {
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

describe("Modal shared driver factory", () => {});

// Long enough that a loopback connection, the auth RPC, and the guarded call all reach the test
// server on a loaded CI runner before the ceiling expires. The test gates on the handler
// actually being entered, so this bounds the run rather than defining what is asserted.
const _MODAL_TEST_CONTROL_TIMEOUT_MS = 2_000;
const MODAL_TEST_STAGE_TIMEOUT_MS = 10_000;

/**
 * Await a transport milestone with a named failure. A bare await surfaces a slow or absent
 * milestone as an anonymous test timeout, which cannot distinguish "the RPC never arrived" from
 * "cancellation never came back" — the two failures this test exists to tell apart.
 */
async function _awaitStage(label: string, reached: Promise<void>): Promise<void> {
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

describe("Modal enforced control deadline", () => {
	function _neverSettlingRunner(phase: "lookup" | "poll" | "terminate" | "exec") {
		const callOptions: Array<{
			readonly retries?: number;
			readonly timeoutMs?: number;
			readonly signal?: AbortSignal;
		}> = [];
		let settled = 0;
		let detached = 0;
		const runner = createModalControlRunner((middleware: ClientMiddleware) => {
			const hang = async (): Promise<never> => {
				const generator = middleware(
					{
						method: { path: "/modal.client.ModalClient/Test" },
						requestStream: false,
						responseStream: false,
						request: {},
						next: async function* (
							_request: unknown,
							options: {
								readonly retries?: number;
								readonly timeoutMs?: number;
								readonly signal?: AbortSignal;
							},
						) {
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
				poll: phase === "poll" ? hang : async () => null,
				terminate: phase === "terminate" ? hang : async () => 0,
				exec:
					phase === "exec"
						? hang
						: async () => {
								throw new Error("unused");
							},
				detach: () => {
					detached += 1;
				},
			};
			return {
				sandboxes: {
					fromId: phase === "lookup" ? hang : async () => sandbox,
					fromName: phase === "lookup" ? hang : async () => sandbox,
					experimentalFromName: phase === "lookup" ? hang : async () => sandbox,
				},
			} as never;
		}, 10);
		return { runner, callOptions, settled: () => settled, detached: () => detached };
	}
});

describe("Modal truthful lifecycle and recovery projections", () => {
	it("reports real gRPC not-found from poll as an absence observation", async () => {
		const control = {
			sandboxes: {
				fromId: async () => ({
					poll: async () => {
						throw new ClientError(
							"/modal.client.ModalClient/SandboxWait",
							Status.NOT_FOUND,
							"gone",
						);
					},
					terminate: async () => 0,
					detach: () => {},
				}),
				fromName: async () => {
					throw new Error("unused");
				},
				experimentalFromName: async () => {
					throw new Error("unused");
				},
			},
		};
		expect(
			await modalProbes(directRunner(control)).observe({} as never, {
				provider: "modal-vm",
				id: "sb-rxWrDWGgOCJXeCSavkiDL6",
			}),
		).toEqual({ state: "absent" });
	});

	it("accepts only null or safe-integer poll results", async () => {
		for (const malformed of [undefined, "0", 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
			const control = {
				sandboxes: {
					fromId: async () => ({
						poll: async () => malformed,
						terminate: async () => 0,
						detach: () => {},
					}),
					fromName: async () => {
						throw new Error("unused");
					},
					experimentalFromName: async () => {
						throw new Error("unused");
					},
				},
			};
			await expect(
				modalProbes(directRunner(control)).observe({} as never, {
					provider: "modal-vm",
					id: "sb-rxWrDWGgOCJXeCSavkiDL6",
				}),
			).rejects.toThrow(/malformed exit code/);
		}
	});
});

describe("Modal post-create verification", () => {
	it("accepts sufficient disk, rejects insufficient disk, and bounds the probe", async () => {
		const optionsSeen: unknown[] = [];
		const idsSeen: string[] = [];
		let wrapperIdReads = 0;
		const control = (kilobytes: unknown) => ({
			sandboxes: {
				fromId: async (id: string) => {
					idsSeen.push(id);
					return {
						poll: async () => null,
						terminate: async () => 0,
						exec: async (_command: unknown, options: unknown) => {
							optionsSeen.push(options);
							return {
								stdout: { readText: async () => `${kilobytes}\n` },
								stderr: { readText: async () => "" },
								wait: async () => 0,
							};
						},
						detach: () => {},
					};
				},
			},
		});
		const sandbox = {
			get sandboxId() {
				wrapperIdReads += 1;
				return "sb-01M0BXHCKJJHRYBN29EC21NMW4";
			},
		};
		expect(
			await verifyModalDiskCapacity(
				directRunner(control(50 * 1024 * 1024)),
				sandbox as never,
				request(),
				{},
				modalRef,
			),
		).toEqual({ status: "honored" });
		expect(
			await verifyModalDiskCapacity(
				directRunner(control(20 * 1024 * 1024)),
				sandbox as never,
				request(),
				{},
				modalRef,
			),
		).toMatchObject({ status: "unsupported" });
		expect(idsSeen).toEqual(["sb-rxWrDWGgOCJXeCSavkiDL6", "sb-rxWrDWGgOCJXeCSavkiDL6"]);
		expect(optionsSeen).toEqual([
			{ stdout: "pipe", stderr: "pipe", timeoutMs: MODAL_CONTROL_TIMEOUT_MS },
			{ stdout: "pipe", stderr: "pipe", timeoutMs: MODAL_CONTROL_TIMEOUT_MS },
		]);
		await expect(
			verifyModalDiskCapacity(
				directRunner(control(`${Number.MAX_SAFE_INTEGER}0`)),
				sandbox as never,
				request(),
				{},
				modalRef,
			),
		).rejects.toThrow(/invalid capacity/);
		expect(wrapperIdReads).toBe(0);
	});

	it("settles a bounded disk probe before observing a mid-flight abort", async () => {
		const controller = new AbortController();
		let settled = false;
		const control = {
			sandboxes: {
				fromId: async () => ({
					poll: async () => null,
					terminate: async () => 0,
					exec: async () => ({
						stdout: { readText: async () => `${50 * 1024 * 1024}\n` },
						stderr: { readText: async () => "" },
						wait: async () => {
							controller.abort();
							settled = true;
							return 0;
						},
					}),
					detach: () => {},
				}),
			},
		};
		await expect(
			verifyModalDiskCapacity(
				directRunner(control),
				{ sandboxId: "sb-rxWrDWGgOCJXeCSavkiDL6" } as never,
				request(),
				{ signal: controller.signal },
				modalRef,
			),
		).rejects.toThrow();
		expect(settled).toBeTrue();
	});
});

describe("Modal command projection", () => {
	function commandControl(
		stdout: unknown,
		stderr: unknown,
		exitCode: unknown,
		seen: Array<{ command: unknown; options: unknown }> = [],
	) {
		return {
			sandboxes: {
				fromId: async () => ({
					poll: async () => null,
					terminate: async () => 0,
					exec: async (command: unknown, options: unknown) => {
						seen.push({ command, options });
						return {
							stdout: { readText: async () => stdout },
							stderr: { readText: async () => stderr },
							wait: async () => exitCode,
						};
					},
					detach: () => {},
				}),
			},
		};
	}

	it("detaches an accepted control channel when foreground exec-start rejects", async () => {
		const primary = new Error("Modal exec-start rejected");
		let detachCalls = 0;
		const control = {
			sandboxes: {
				fromId: async () => ({
					poll: async () => null,
					terminate: async () => 0,
					exec: async () => Promise.reject(primary),
					detach: () => {
						detachCalls += 1;
					},
				}),
			},
		};
		await expect(
			execModalCommand(directRunner(control), {} as never, "true", modalRef),
		).rejects.toBe(primary);
		expect(detachCalls).toBe(1);
	});

	it("preserves the real nonzero exit and split streams", async () => {
		const seen: Array<{ command: unknown; options: unknown }> = [];
		expect(
			await execModalCommand(
				directRunner(commandControl("out", "err", 7, seen)),
				{} as never,
				"exit 7",
				modalRef,
			),
		).toEqual({
			stdout: "out",
			stderr: "err",
			exitCode: 7,
		});
		expect(seen).toEqual([
			{
				command: ["sh", "-c", "exit 7"],
				// Modal 0.9 rejects a defined timeoutMs <= 0. Omission means the foreground
				// process owns its duration after the bounded attachment/start transaction.
				options: { stdout: "pipe", stderr: "pipe" },
			},
		]);
	});

	it("uses the harness 50ms detached-acceptance contract and bounds the process", async () => {
		const seen: Array<{ command: unknown; options: unknown }> = [];
		await expect(
			launchModalCommand(
				directRunner(commandControl("", "", 0, seen)),
				{} as never,
				"sleep 1",
				modalRef,
			),
		).resolves.toBeUndefined();
		expect(seen).toEqual([
			{
				command: ["sh", "-c", modalDetachedCommand("sleep 1")],
				options: { stdout: "pipe", stderr: "pipe", timeoutMs: MODAL_CONTROL_TIMEOUT_MS },
			},
		]);
		expect(seen[0]?.command).toEqual([
			"sh",
			"-c",
			'nohup /bin/sh -lc \'sleep 1\' </dev/null >/dev/null 2>&1 & child=$!; finish() { wait "$child"; exit $?; }; sleep 0.05; if ! kill -0 "$child" 2>/dev/null; then finish; fi; if command -v ps >/dev/null 2>&1; then state=$(ps -o state= -p "$child" 2>/dev/null || :); case "$state" in *Z*) finish ;; "") if ! kill -0 "$child" 2>/dev/null; then finish; fi ;; esac; fi; exit 0',
		]);
		await expect(
			launchModalCommand(
				directRunner(commandControl("", "command not found", 127)),
				{} as never,
				"missing",
				modalRef,
			),
		).rejects.toThrow(/exited 127: command not found/);
	});

	it("joins every process result operation before surfacing the primary failure", async () => {
		const primary = new Error("stdout transport failed");
		let stderrSettled = false;
		let waitSettled = false;
		const control = {
			sandboxes: {
				fromId: async () => ({
					poll: async () => null,
					terminate: async () => 0,
					exec: async () => ({
						stdout: { readText: async () => Promise.reject(primary) },
						stderr: {
							readText: async () => {
								await Bun.sleep(5);
								stderrSettled = true;
								return "";
							},
						},
						wait: async () => {
							await Bun.sleep(10);
							waitSettled = true;
							return 0;
						},
					}),
					detach: () => {},
				}),
			},
		};
		await expect(
			launchModalCommand(directRunner(control), {} as never, "true", modalRef),
		).rejects.toBe(primary);
		expect({ stderrSettled, waitSettled }).toEqual({ stderrSettled: true, waitSettled: true });
	});

	it("joins started siblings when a later process accessor throws synchronously", async () => {
		const primary = new Error("stderr accessor is unreadable");
		let stdoutSettled = false;
		let waitSettled = false;
		const control = {
			sandboxes: {
				fromId: async () => ({
					poll: async () => null,
					terminate: async () => 0,
					exec: async () => ({
						stdout: {
							readText: async () => {
								await Bun.sleep(10);
								stdoutSettled = true;
								return "";
							},
						},
						get stderr(): never {
							throw primary;
						},
						wait: async () => {
							waitSettled = true;
							return 0;
						},
					}),
					detach: () => {},
				}),
			},
		};
		await expect(
			execModalCommand(directRunner(control), {} as never, "true", modalRef),
		).rejects.toBe(primary);
		expect({ stdoutSettled, waitSettled }).toEqual({ stdoutSettled: true, waitSettled: true });
	});

	it("detaches on the first process failure before joining cancellation-bound siblings", async () => {
		const primary = new Error("stdout transport failed");
		let detached = false;
		let stderrSettled = false;
		let waitSettled = false;
		let releaseStderr: (() => void) | undefined;
		let releaseWait: (() => void) | undefined;
		const cancellationBound = (settled: () => void, install: (release: () => void) => void) => {
			if (detached) {
				settled();
				return Promise.resolve("");
			}
			return new Promise<string>((resolve) => {
				install(() => {
					settled();
					resolve("");
				});
			});
		};
		const control = {
			sandboxes: {
				fromId: async () => ({
					poll: async () => null,
					terminate: async () => 0,
					exec: async () => ({
						stdout: { readText: async () => Promise.reject(primary) },
						stderr: {
							readText: () =>
								cancellationBound(
									() => {
										stderrSettled = true;
									},
									(release) => {
										releaseStderr = release;
									},
								),
						},
						wait: () =>
							cancellationBound(
								() => {
									waitSettled = true;
								},
								(release) => {
									releaseWait = release;
								},
							).then(() => 0),
					}),
					detach: () => {
						detached = true;
						releaseStderr?.();
						releaseWait?.();
					},
				}),
			},
		};
		const operation = execModalCommand(directRunner(control), {} as never, "true", modalRef);
		const outcome = await Promise.race([
			operation.then(
				() => ({ kind: "success" as const }),
				(error: unknown) => ({ kind: "error" as const, error }),
			),
			Bun.sleep(50).then(() => ({ kind: "pending" as const })),
		]);
		if (outcome.kind === "pending") {
			detached = true;
			releaseStderr?.();
			releaseWait?.();
			await operation.catch(() => undefined);
		}
		expect(outcome).toEqual({ kind: "error", error: primary });
		expect({ detached, stderrSettled, waitSettled }).toEqual({
			detached: true,
			stderrSettled: true,
			waitSettled: true,
		});
	});

	it("rejects malformed command envelopes instead of canonicalizing them", async () => {
		for (const [stdout, stderr, exitCode] of [
			[{}, "", 0],
			["", {}, 0],
			["", "", 1.5],
			["", "", 2 ** 53],
		] as const) {
			await expect(
				execModalCommand(
					directRunner(commandControl(stdout, stderr, exitCode)),
					{} as never,
					"true",
					modalRef,
				),
			).rejects.toThrow(/malformed result/);
		}
	});
});

describe("Modal account inventory and recovery", () => {
	const v1Owned = "sb-rxWrDWGgOCJXeCSavkiDL6";
	const v1Foreign = "sb-AAAAAAAAAAAAAAAAAAAAAA";
	const v2Foreign = "sb-01ARZ3NDEKTSV4RRFFQ69G5FAW";
	const v2Owned = "sb-01ARZ3NDEKTSV4RRFFQ69G5FAV";
	function control(appExists: boolean) {
		return {
			apps: {
				list: async () => [...(appExists ? [{ appId: "ap-bench" }] : []), { appId: "ap-foreign" }],
				fromName: async (name: string) =>
					appExists && name === MODAL_APP_NAME ? { appId: "ap-bench" } : undefined,
			},
			sandboxes: {
				list: async function* ({ appId }: { appId?: string }) {
					if (appId === "ap-bench") {
						yield { sandboxId: v1Owned };
						return;
					}
					if (appId !== undefined) return;
					yield { sandboxId: v1Owned };
					yield { sandboxId: v1Foreign };
				},
				experimentalList: async function* ({ appId }: { appId: string }) {
					if (appId === "ap-bench") yield { sandboxId: v2Owned };
					if (appId === "ap-foreign") yield { sandboxId: v2Foreign };
				},
				fromId: async () => {
					throw new Error("unused");
				},
				fromName: async () => {
					throw new Error("unused");
				},
				experimentalFromName: async () => {
					throw new Error("unused");
				},
			},
		};
	}

	it("scopes ownership to the benchmark App per generation and counts both generations outside it as foreign", async () => {
		const runner = directRunner(control(true));
		expect(await modalInventory("vm", runner).list({} as never, {})).toEqual({
			owned: [v1Owned],
			foreignCount: 2,
		});
		expect(await modalInventory("gvisor", runner).list({} as never, {})).toEqual({
			owned: [v2Owned],
			foreignCount: 2,
		});
		// No App yet: nothing can be owned, and every v1 sandbox in the environment is foreign.
		const fresh = directRunner(control(false));
		expect(await modalInventory("vm", fresh).list({} as never, {})).toEqual({
			owned: [],
			foreignCount: 3,
		});
		expect(await modalInventory("gvisor", fresh).list({} as never, {})).toEqual({
			owned: [],
			foreignCount: 3,
		});
	});

	it("rejects incomplete App enumeration instead of declaring the account clean", async () => {
		const fake = control(true);
		fake.apps.list = async () => {
			throw new Error("App listing unavailable");
		};
		await expect(
			modalInventory("gvisor", directRunner(fake)).list({} as never, {}),
		).rejects.toThrow("App listing unavailable");
	});

	it("destroys by id with a waited terminate and converges only on sandbox not-found", async () => {
		const terminated: string[] = [];
		const detached: string[] = [];
		let failure: unknown;
		const runner = directRunner({
			sandboxes: {
				fromId: async (id: string) => ({
					terminate: async ({ wait }: { wait: true }) => {
						if (failure !== undefined) throw failure;
						terminated.push(`${id}:${wait}`);
						return 0;
					},
					detach: () => detached.push(id),
				}),
			},
		});
		await modalDestroyById(runner)({} as never, modalRef, {});
		expect(terminated).toEqual([`${modalRef.id}:true`]);
		failure = new ClientError(
			"/modal.client.ModalClient/SandboxTerminate",
			Status.NOT_FOUND,
			"gone",
		);
		await modalDestroyById(runner)({} as never, modalRef, {});
		failure = new ClientError("/modal.client.ModalClient/AppGetByName", Status.NOT_FOUND, "gone");
		await expect(modalDestroyById(runner)({} as never, modalRef, {})).rejects.toThrow(/gone/);
		failure = new Error("control plane unavailable");
		await expect(modalDestroyById(runner)({} as never, modalRef, {})).rejects.toThrow(
			/control plane unavailable/,
		);
	});
});
