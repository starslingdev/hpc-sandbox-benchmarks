import { describe, expect, test } from "bun:test";
import type { E2BSandbox } from "@computesdk/e2b";
import { e2b } from "@computesdk/e2b";
import type { CreateRequest, SandboxDriver } from "@sandbox-benchmarks/driver";
import { DriverError, FailedCreateCleanupError } from "@sandbox-benchmarks/driver";
import { type } from "arktype";
import type {
	ComputeSdkCreateRequestCoverage,
	ComputeSdkCreateRequestMapper,
	ComputeSdkDriverSpec,
	ComputeSdkLike,
	ComputeSdkNativeOf,
	ComputeSdkSandboxLike,
} from "./_computesdk.ts";
import { computeSdkSpec, defineComputeSdkDriver } from "./_computesdk.ts";

type Equal<Left, Right> =
	(<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
		? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
			? true
			: false
		: false;
type Expect<T extends true> = T;

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: { kind: "baked", ref: "template-1" },
	deadlineMs: 30_000,
};

function fakeCompute<TSandbox extends ComputeSdkSandboxLike>(sandbox: TSandbox, withList = false) {
	const createOptionsSeen: Array<Record<string, unknown>> = [];
	const compute: ComputeSdkLike<TSandbox> = {
		sandbox: {
			create: async (options) => {
				createOptionsSeen.push(options ?? {});
				return sandbox;
			},
			...(withList ? { list: async () => ["sb-1"] } : {}),
		},
	};
	return { compute, createOptionsSeen };
}

const nativeSandbox = { commands: { run: async () => "native-result" } };

const baseSandbox: ComputeSdkSandboxLike<typeof nativeSandbox> = {
	sandboxId: "i2f3k4abc",
	getInstance: () => nativeSandbox,
	runCommand: async () => ({ exitCode: 0, stdout: "ok", stderr: "" }),
	destroy: async () => {},
};

const e2bSandboxId = type(/^i[a-z0-9]+$/);

const mappedCoverage = {
	spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: "mapped" },
	artifact: "context",
	deadlineMs: "harness",
	gpu: { model: "mapped", count: "mapped" },
	env: "mapped",
} as const satisfies ComputeSdkCreateRequestCoverage;

const artifactCoverage = {
	spec: { vcpus: "artifact", memoryGb: "artifact", diskGb: "artifact" },
	artifact: "context",
	deadlineMs: "harness",
	gpu: { model: "unsupported", count: "unsupported" },
	env: "unsupported",
} as const satisfies ComputeSdkCreateRequestCoverage;

const createRequestMapper = (
	map: ComputeSdkCreateRequestMapper["map"] = () => ({}),
	coverage: ComputeSdkCreateRequestCoverage = mappedCoverage,
): ComputeSdkCreateRequestMapper => ({ coverage, map });

function expectRedacted(error: unknown, code?: DriverError["code"]): void {
	const typed = error as DriverError;
	if (code !== undefined) expect(typed.code).toBe(code);
	expect(typed.message).not.toContain("test-key");
	expect(typed.vendorMessage ?? "").not.toContain("test-key");
	expect(String(typed.cause ?? "")).not.toContain("test-key");
	expect(`${typed.message} ${typed.vendorMessage ?? ""}`).toContain("[REDACTED]");
}

function bridge<TSandbox extends ComputeSdkSandboxLike>(
	compute: ComputeSdkLike<TSandbox>,
	options: Partial<
		Omit<ComputeSdkDriverSpec<ComputeSdkLike<TSandbox>>, "compute" | "sandboxId" | "createOptions">
	> & {
		readonly createOptions?: ComputeSdkCreateRequestMapper["map"];
		readonly requestCoverage?: ComputeSdkCreateRequestCoverage;
		readonly sandboxId?: ComputeSdkDriverSpec<ComputeSdkLike<TSandbox>>["sandboxId"];
	} = {},
): SandboxDriver<ComputeSdkNativeOf<TSandbox>> {
	return defineComputeSdkDriver("e2b", {
		spec: ({ env, artifact, resolvedArtifact }) => {
			expect(env.E2B_API_KEY).toBe("test-key");
			expect(artifact).toEqual({ kind: "baked" });
			expect(resolvedArtifact).toEqual({ kind: "baked", ref: "template-1" });
			const { createOptions, requestCoverage, sandboxId, ...rest } = options;
			return {
				compute,
				sandboxId: sandboxId ?? e2bSandboxId,
				createOptions: createRequestMapper(createOptions, requestCoverage),
				hasWorkingFilesystem: false,
				...rest,
			};
		},
	}).driver({
		env: { E2B_API_KEY: "test-key" },
		artifact: { kind: "baked" },
		resolvedArtifact: { kind: "baked", ref: "template-1" },
	});
}

describe("computeSdkDriver", () => {
	test("infers session.native as the installed wrapper's vendored SDK instance", () => {
		const module_ = defineComputeSdkDriver("e2b", {
			spec: ({ env }) => ({
				compute: e2b({ apiKey: env.E2B_API_KEY }),
				sandboxId: e2bSandboxId,
				createOptions: createRequestMapper(undefined, artifactCoverage),
				hasWorkingFilesystem: true,
			}),
		});
		type Driver = ReturnType<(typeof module_)["driver"]>;
		type Session = Awaited<ReturnType<Driver["create"]>>;
		type _native = Expect<Equal<Session["native"], E2BSandbox>>;
		expect(module_.id).toBe("e2b");
	});

	test("preserves the installed wrapper type inside capability callbacks", () => {
		const module_ = defineComputeSdkDriver("e2b", {
			spec: ({ env }) =>
				computeSdkSpec(e2b({ apiKey: env.E2B_API_KEY }), {
					sandboxId: e2bSandboxId,
					createOptions: createRequestMapper(undefined, artifactCoverage),
					hasWorkingFilesystem: true,
					probes: {
						observe: async (compute, ref) => {
							const found = await compute.sandbox.getById(ref.id);
							return found === undefined ? { state: "absent" } : { state: "running" };
						},
					},
				}),
		});
		expect(module_.id).toBe("e2b");
	});

	test("keeps the first compute argument authoritative when an extracted spec has excess state", () => {
		const { compute: authoritative } = fakeCompute(baseSandbox);
		const { compute: accidental } = fakeCompute({ ...baseSandbox, sandboxId: "iaccidental" });
		const extracted = {
			compute: accidental,
			sandboxId: e2bSandboxId,
			createOptions: createRequestMapper(),
			hasWorkingFilesystem: false,
		};
		const joined = computeSdkSpec(authoritative, extracted);
		expect(joined.compute).toBe(authoritative);
	});

	test("the joined helper has one provider id and contextually types its exact env slice", () => {
		const { compute } = fakeCompute(baseSandbox);
		const module_ = defineComputeSdkDriver("e2b", {
			createBudget: { owner: "harness", timeoutMs: 45_000 },
			spec: ({ env, resolvedArtifact }) => ({
				compute,
				sandboxId: e2bSandboxId,
				createOptions: createRequestMapper(() => ({
					apiKeyWasResolved: env.E2B_API_KEY.length > 0,
					snapshotId: resolvedArtifact.ref,
				})),
				hasWorkingFilesystem: false,
			}),
		});
		expect(module_.id).toBe("e2b");
		expect(module_.createBudget).toEqual({ owner: "harness", timeoutMs: 45_000 });

		const driverOwnedBudget = () =>
			defineComputeSdkDriver("e2b", {
				// @ts-expect-error — the wrapper exposes no cancellable hard attempt ceiling
				createBudget: { owner: "driver", attemptCeilingMs: 45_000 },
				spec: () => ({
					compute,
					sandboxId: e2bSandboxId,
					createOptions: createRequestMapper(),
					hasWorkingFilesystem: false,
				}),
			});
		void driverOwnedBudget;
		expect(() =>
			defineComputeSdkDriver("e2b", {
				createBudget: { owner: "driver", attemptCeilingMs: 45_000 } as never,
				spec: () => ({
					compute,
					sandboxId: e2bSandboxId,
					createOptions: createRequestMapper(),
					hasWorkingFilesystem: false,
				}),
			}),
		).toThrow(expect.objectContaining({ code: "vendor-contract-violation", provider: "e2b" }));

		const uncheckedParser = () =>
			defineComputeSdkDriver("e2b", {
				spec: () => ({
					compute,
					// @ts-expect-error — module-owned ids must cross an arktype trust boundary
					sandboxId: (value: string) => value,
					createOptions: createRequestMapper(),
					hasWorkingFilesystem: false,
				}),
			});
		void uncheckedParser;

		const missingRequestMapper = () =>
			defineComputeSdkDriver("e2b", {
				// @ts-expect-error — every provider must explicitly validate/map the canonical request
				spec: () => ({
					compute,
					sandboxId: e2bSandboxId,
					hasWorkingFilesystem: false,
				}),
			});
		void missingRequestMapper;

		const missingTargetAxis = () =>
			createRequestMapper(undefined, {
				// @ts-expect-error — every TargetSpec key is an explicit review decision
				spec: { vcpus: "mapped", memoryGb: "mapped" },
				artifact: "context",
				deadlineMs: "harness",
				gpu: { model: "mapped", count: "mapped" },
				env: "mapped",
			});
		void missingTargetAxis;

		const missingOptionalAxis = () =>
			createRequestMapper(undefined, {
				spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: "mapped" },
				artifact: "context",
				deadlineMs: "harness",
				// @ts-expect-error — GPU model and count cannot drift independently
				gpu: { model: "mapped" },
				env: "mapped",
			});
		void missingOptionalAxis;

		const missingTopLevelAxis = () =>
			createRequestMapper(
				undefined,
				// @ts-expect-error — every current and future top-level CreateRequest key is required
				{
					spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: "mapped" },
					artifact: "context",
					deadlineMs: "harness",
					gpu: { model: "mapped", count: "mapped" },
				},
			);
		void missingTopLevelAxis;
	});

	test("types and redacts wrapper construction failures before an SDK escapes", () => {
		const module_ = defineComputeSdkDriver<"e2b", ComputeSdkLike>("e2b", {
			spec: ({ env }): ComputeSdkDriverSpec<ComputeSdkLike> => {
				throw new Error(`SDK constructor echoed ${env.E2B_API_KEY}`);
			},
		});
		let error: unknown;
		try {
			module_.driver({
				env: { E2B_API_KEY: "test-key" },
				artifact: { kind: "baked" },
				resolvedArtifact: { kind: "baked", ref: "template-1" },
			});
		} catch (caught) {
			error = caught;
		}
		expect(error).toMatchObject({ code: "vendor-contract-violation", provider: "e2b" });
		expectRedacted(error);
	});

	test("passes composition-resolved create options without confusing deadline with lifetime", async () => {
		const { compute, createOptionsSeen } = fakeCompute(baseSandbox);
		const driver = bridge(compute, {
			createOptions: ({ spec, gpu, env }) => ({
				snapshotId: "template-1",
				cpu: spec.vcpus,
				memoryMiB: spec.memoryGb * 1024,
				diskGb: spec.diskGb,
				gpuModel: gpu?.model,
				gpuCount: gpu?.count,
				guestEnv: env,
			}),
			hasWorkingFilesystem: false,
		});
		const session = await driver.create({
			...request,
			gpu: { model: "H100", count: 2 },
			env: { BENCH_RUN_ID: "run-1" },
		});
		expect(session.sandboxRef).toEqual({ provider: "e2b", id: "i2f3k4abc" });
		expect(session.artifact).toEqual({ kind: "baked", ref: "template-1" });
		expect(session.native).toBe(nativeSandbox);
		expect(await session.native.commands.run()).toBe("native-result");
		expect(createOptionsSeen).toEqual([
			{
				snapshotId: "template-1",
				cpu: 4,
				memoryMiB: 8192,
				diskGb: 40,
				gpuModel: "H100",
				gpuCount: 2,
				guestEnv: { BENCH_RUN_ID: "run-1" },
			},
		]);
	});

	test("preserves an explicitly undefined wrapper native value", async () => {
		const { compute } = fakeCompute({ ...baseSandbox, getInstance: () => undefined });
		const session = await bridge(compute).create(request);
		expect(session.native).toBeUndefined();
	});

	test("preflights create-option mapping before the wrapper can allocate", async () => {
		let createCalls = 0;
		const compute: ComputeSdkLike<typeof baseSandbox> = {
			sandbox: {
				create: async () => {
					createCalls += 1;
					return baseSandbox;
				},
			},
		};
		const error = await bridge(compute, {
			createOptions: () => {
				throw new Error("capacity mapping missing");
			},
		})
			.create({ ...request, gpu: { model: "unsupported", count: 1 } })
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "vendor-contract-violation", provider: "e2b" });
		expect(createCalls).toBe(0);
	});

	test("rejects an unsupported canonical axis as terminal input before allocation", async () => {
		let createCalls = 0;
		const compute: ComputeSdkLike<typeof baseSandbox> = {
			sandbox: {
				create: async () => {
					createCalls += 1;
					return baseSandbox;
				},
			},
		};
		const error = await bridge(compute, {
			requestCoverage: artifactCoverage,
		})
			.create({ ...request, gpu: { model: "H100", count: 2 } })
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "invalid-create-request", provider: "e2b" });
		expect((error as Error).message).toContain("GPU H100 x2 is unsupported");
		expect(createCalls).toBe(0);
	});

	test("rejects simulated future top-level and GPU axes generically before allocation", async () => {
		let createCalls = 0;
		const compute: ComputeSdkLike<typeof baseSandbox> = {
			sandbox: {
				create: async () => {
					createCalls += 1;
					return baseSandbox;
				},
			},
		};
		const futureCoverage = {
			...mappedCoverage,
			network: "unsupported",
			gpu: { ...mappedCoverage.gpu, partition: "unsupported" },
		} as unknown as ComputeSdkCreateRequestCoverage;
		const driver = bridge(compute, { requestCoverage: futureCoverage });
		const networkError = await driver
			.create({ ...request, network: { egress: false } } as unknown as CreateRequest)
			.catch((caught: unknown) => caught);
		expect(networkError).toMatchObject({ code: "invalid-create-request", provider: "e2b" });
		expect((networkError as Error).message).toContain("request axis network is unsupported");

		const gpuError = await driver
			.create({
				...request,
				gpu: { model: "H100", count: 1, partition: "whole" },
			} as unknown as CreateRequest)
			.catch((caught: unknown) => caught);
		expect(gpuError).toMatchObject({ code: "invalid-create-request", provider: "e2b" });
		expect((gpuError as Error).message).toContain("axis partition");
		expect(createCalls).toBe(0);
	});

	test("reports the configured artifact so the shared mismatch guard destroys a wrong boot", async () => {
		let destroys = 0;
		const { compute, createOptionsSeen } = fakeCompute({
			...baseSandbox,
			destroy: async () => {
				destroys += 1;
			},
		});
		const module_ = defineComputeSdkDriver("e2b", {
			spec: ({ resolvedArtifact }) => ({
				compute,
				sandboxId: e2bSandboxId,
				createOptions: createRequestMapper(
					() => ({ snapshotId: resolvedArtifact.ref }),
					artifactCoverage,
				),
				hasWorkingFilesystem: false,
			}),
		});
		const driver = module_.driver({
			env: { E2B_API_KEY: "test-key" },
			artifact: { kind: "baked" },
			resolvedArtifact: { kind: "baked", ref: "template-context" },
		});
		const error = await driver
			.create({ ...request, artifact: { kind: "baked", ref: "template-request" } })
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "artifact-mismatch" });
		expect(createOptionsSeen).toEqual([{ snapshotId: "template-context" }]);
		expect(destroys).toBe(1);
	});

	test("an artifact-mismatch cleanup fault retains the validated wrapper allocation", async () => {
		let destroys = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			destroy: async () => {
				destroys += 1;
				if (destroys === 1) throw new Error("transient destroy failure");
			},
		});
		const module_ = defineComputeSdkDriver("e2b", {
			spec: ({ resolvedArtifact }) => ({
				compute,
				sandboxId: e2bSandboxId,
				createOptions: createRequestMapper(
					() => ({ snapshotId: resolvedArtifact.ref }),
					artifactCoverage,
				),
				hasWorkingFilesystem: false,
			}),
		});
		const driver = module_.driver({
			env: { E2B_API_KEY: "test-key" },
			artifact: { kind: "baked" },
			resolvedArtifact: { kind: "baked", ref: "template-context" },
		});
		const error = (await driver
			.create({ ...request, artifact: { kind: "baked", ref: "template-request" } })
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error.locator).toEqual({ kind: "id", value: "i2f3k4abc" });
		expect(error.suppressed).toMatchObject({ code: "artifact-mismatch" });
		await error[Symbol.asyncDispose]();
		expect(destroys).toBe(2);
	});

	test("an invalid unparsed id never masquerades as a stable cleanup locator", async () => {
		const invalidId = "wrong-id";
		const { compute } = fakeCompute({
			...baseSandbox,
			sandboxId: invalidId,
			destroy: async () => {
				throw new Error("cleanup unavailable");
			},
		});
		const error = (await bridge(compute)
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error.locator).toEqual({ kind: "native-handle" });
		expect(error.message).not.toContain(invalidId);
	});

	test("redacts a credential-shaped invalid id from ArkType summaries before rollback returns", async () => {
		let destroys = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			sandboxId: "test-key",
			destroy: async () => {
				destroys += 1;
			},
		});
		const error = (await bridge(compute)
			.create(request)
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "invalid-sandbox-ref", provider: "e2b" });
		expect(error.message).not.toContain("test-key");
		expect(String(error.cause ?? "")).not.toContain("test-key");
		expect(error.message).toContain("[REDACTED]");
		expect(error.ref).toBeUndefined();
		expect(destroys).toBe(1);
	});

	test("types and redacts a throwing id parser through a failed rollback", async () => {
		let destroys = 0;
		const throwingSchema = type("string").narrow(() => {
			throw new Error("validator echoed test-key");
		});
		const { compute } = fakeCompute({
			...baseSandbox,
			destroy: async () => {
				destroys += 1;
				if (destroys === 1) throw new Error("cleanup echoed test-key");
			},
		});
		const error = (await bridge(compute, { sandboxId: throwingSchema })
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error.locator).toEqual({ kind: "native-handle" });
		expect(error.suppressed).toMatchObject({
			code: "vendor-contract-violation",
			provider: "e2b",
		});
		expectRedacted(error.suppressed);
		expectRedacted(error.error, "destroy-failed");
		await error.cleanup();
		expect(destroys).toBe(2);
	});

	test("types and redacts a throwing id parser after a successful rollback", async () => {
		let destroys = 0;
		const throwingSchema = type("string").narrow(() => {
			throw new Error("validator echoed test-key");
		});
		const { compute } = fakeCompute({
			...baseSandbox,
			destroy: async () => {
				destroys += 1;
			},
		});
		const error = await bridge(compute, { sandboxId: throwingSchema })
			.create(request)
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "vendor-contract-violation", provider: "e2b" });
		expectRedacted(error);
		expect(destroys).toBe(1);
	});

	test("rejects an empty transformed id before constructing a session or stable locator", async () => {
		let destroys = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			destroy: async () => {
				destroys += 1;
			},
		});
		const error = await bridge(compute, {
			sandboxId: {
				fromVendor: type("string").pipe(() => ""),
				canonical: type("string >= 1"),
			},
		})
			.create(request)
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "invalid-sandbox-ref", provider: "e2b" });
		expect((error as Error).message).toContain("empty canonical id");
		expect(destroys).toBe(1);
	});

	test("types null and wrong-typed runtime sandbox ids before schema evaluation", async () => {
		for (const malformedId of [null, 42]) {
			let destroys = 0;
			const malformed = {
				...baseSandbox,
				sandboxId: malformedId,
				destroy: async () => {
					destroys += 1;
				},
			} as unknown as ComputeSdkSandboxLike;
			const { compute } = fakeCompute(malformed);
			const error = await bridge(compute)
				.create(request)
				.catch((caught: unknown) => caught);
			expect(error).toMatchObject({ code: "vendor-contract-violation", provider: "e2b" });
			expect((error as Error).message).toContain("nonempty string sandboxId");
			expect(destroys).toBe(1);
		}
	});

	test("redacts a throwing sandbox-id accessor and retains cleanup after a double fault", async () => {
		let destroys = 0;
		const malformed = {
			...baseSandbox,
			destroy: async () => {
				destroys += 1;
				if (destroys === 1) throw new Error("cleanup echoed test-key");
			},
		};
		Object.defineProperty(malformed, "sandboxId", {
			get: () => {
				throw new Error("sandboxId getter echoed test-key");
			},
		});
		const { compute } = fakeCompute(malformed);
		const error = (await bridge(compute)
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expectRedacted(error.suppressed);
		expectRedacted(error.error, "destroy-failed");
		await error.cleanup();
		expect(destroys).toBe(2);
	});

	test("a withheld exit code becomes the representable unknown arm, never a forged number", async () => {
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => ({ stdout: "partial", stderr: "" }),
		});
		const session = await bridge(compute, {
			hasWorkingFilesystem: false,
		}).create(request);
		const result = await session.exec("true");
		expect(result.exit).toEqual({
			kind: "unknown",
			detail: "computesdk adapter reported no exit code",
		});
		expect(result.stdout).toBe("partial");
	});

	test("rejects malformed resolved command envelopes for exec and launch", async () => {
		for (const malformed of [null, [], { exitCode: "0", stdout: "", stderr: "" }]) {
			const { compute } = fakeCompute({
				...baseSandbox,
				runCommand: async () => malformed as never,
			});
			const session = await bridge(compute).create(request);
			await expect(session.exec("true")).rejects.toMatchObject({
				code: "vendor-contract-violation",
				provider: "e2b",
				ref: session.sandboxRef,
			});
			await expect(session.launch?.("task")).rejects.toMatchObject({
				code: "vendor-contract-violation",
				provider: "e2b",
				ref: session.sandboxRef,
			});
		}
	});

	test("types and redacts a throwing background-result diagnostic accessor", async () => {
		const malformed = { exitCode: 9, stdout: "" };
		Object.defineProperty(malformed, "stderr", {
			get: () => {
				throw new Error("stderr getter echoed test-key");
			},
		});
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => malformed,
		});
		const session = await bridge(compute).create(request);
		const error = await session.launch?.("task").catch((caught: unknown) => caught);
		expectRedacted(error, "exec-failed");
		expect(error).toMatchObject({ ref: session.sandboxRef });
	});

	test("the filesystem stub never escapes: files exists only when declared working AND present", async () => {
		const throwingStub = {
			readFile: async () => {
				throw new Error("filesystem not supported by this sandbox environment");
			},
			exists: async () => {
				throw new Error("filesystem not supported by this sandbox environment");
			},
			writeFile: async () => {
				throw new Error("filesystem not supported by this sandbox environment");
			},
		};
		const { compute: stubbed } = fakeCompute({ ...baseSandbox, filesystem: throwingStub });
		const withoutTrust = await bridge(stubbed, {
			hasWorkingFilesystem: false,
		}).create(request);
		expect(withoutTrust.files).toBeUndefined();

		const reads: string[] = [];
		const { compute: working } = fakeCompute({
			...baseSandbox,
			filesystem: {
				readFile: async (path) => {
					reads.push(path);
					return "content";
				},
				exists: async () => true,
				writeFile: async () => {},
			},
		});
		const withTrust = await bridge(working, {
			hasWorkingFilesystem: true,
		}).create(request);
		expect(await withTrust.files?.readFile("/bench/a")).toBe("content");
		expect(reads).toEqual(["/bench/a"]);

		let missingDestroyed = 0;
		const { compute: missing } = fakeCompute({
			...baseSandbox,
			filesystem: undefined,
			destroy: async () => {
				missingDestroyed += 1;
			},
		});
		const missingError = await bridge(missing, {
			hasWorkingFilesystem: true,
		})
			.create(request)
			.catch((caught: unknown) => caught);
		expect(missingError).toBeInstanceOf(DriverError);
		expect(missingError).toMatchObject({ code: "vendor-contract-violation" });
		expect(missingDestroyed).toBe(1);

		const transientSandbox: ComputeSdkSandboxLike = {
			...baseSandbox,
			filesystem: {
				readFile: async () => "content",
				exists: async () => true,
				writeFile: async () => {},
			},
		};
		const { compute: transient } = fakeCompute(transientSandbox);
		const transientSession = await bridge(transient, {
			hasWorkingFilesystem: true,
		}).create(request);
		Object.defineProperty(transientSandbox, "filesystem", { value: undefined });
		const withdrawn = await transientSession.files
			?.readFile("/bench/a")
			.catch((caught: unknown) => caught);
		const withdrawnExists = await transientSession.files
			?.exists("/bench/a")
			.catch((caught: unknown) => caught);
		expect(withdrawn).toBeInstanceOf(DriverError);
		expect(withdrawn).toMatchObject({ code: "vendor-contract-violation" });
		expect(withdrawnExists).toMatchObject({ code: "vendor-contract-violation" });
	});

	test("types and redacts a filesystem accessor that starts throwing after create", async () => {
		const workingFilesystem = {
			readFile: async () => "content",
			exists: async () => true,
			writeFile: async () => {},
		};
		let accesses = 0;
		const sandbox = { ...baseSandbox };
		Object.defineProperty(sandbox, "filesystem", {
			get: () => {
				accesses += 1;
				if (accesses > 1) throw new Error("filesystem getter echoed test-key");
				return workingFilesystem;
			},
		});
		const { compute } = fakeCompute(sandbox as ComputeSdkSandboxLike);
		const session = await bridge(compute, { hasWorkingFilesystem: true }).create(request);
		const error = await session.files?.readFile("/bench/a").catch((caught: unknown) => caught);
		expectRedacted(error, "vendor-contract-violation");
		expect(error).toMatchObject({ ref: session.sandboxRef });
	});

	test("rejects an incomplete filesystem capability during create and rolls back", async () => {
		let destroys = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			filesystem: {} as never,
			destroy: async () => {
				destroys += 1;
			},
		});
		const error = await bridge(compute, { hasWorkingFilesystem: true })
			.create(request)
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({
			code: "vendor-contract-violation",
			provider: "e2b",
		});
		expect((error as Error).message).toContain("every required callable method");
		expect(destroys).toBe(1);
	});

	test("retains cleanup when the initial filesystem accessor and rollback both fail", async () => {
		let destroys = 0;
		const sandbox = {
			...baseSandbox,
			destroy: async () => {
				destroys += 1;
				if (destroys === 1) throw new Error("cleanup echoed test-key");
			},
		};
		Object.defineProperty(sandbox, "filesystem", {
			get: () => {
				throw new Error("filesystem getter echoed test-key");
			},
		});
		const { compute } = fakeCompute(sandbox as ComputeSdkSandboxLike);
		const error = (await bridge(compute, { hasWorkingFilesystem: true })
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expectRedacted(error.suppressed, "vendor-contract-violation");
		expectRedacted(error.error, "destroy-failed");
		await error.cleanup();
		expect(destroys).toBe(2);
	});

	test("launch rides the wrapper's background convention", async () => {
		const commands: Array<[string, boolean | undefined]> = [];
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async (command, options) => {
				commands.push([command, options?.background]);
				return { exitCode: 0, stdout: "", stderr: "" };
			},
		});
		const session = await bridge(compute, {
			hasWorkingFilesystem: false,
		}).create(request);
		await session.launch?.("bash task.sh");
		expect(commands).toEqual([["bash task.sh", true]]);
	});

	test("launch rejects a background command that the wrapper reports as failed", async () => {
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => ({ exitCode: 9, stdout: "", stderr: "launch rejected" }),
		});
		const session = await bridge(compute, {
			hasWorkingFilesystem: false,
		}).create(request);
		const error = await session.launch?.("bash task.sh").catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(DriverError);
		expect(error).toMatchObject({
			code: "exec-failed",
			vendorExitCode: 9,
			vendorMessage: "launch rejected",
		});
	});

	test("an opaque list is not misrepresented as a per-sandbox lifecycle probe", () => {
		const { compute: withList } = fakeCompute(baseSandbox, true);
		expect(bridge(withList, { hasWorkingFilesystem: false }).probes).toBeUndefined();
		const { compute: withoutList } = fakeCompute(baseSandbox, false);
		expect(bridge(withoutList, { hasWorkingFilesystem: false }).probes).toBeUndefined();
		expect(bridge(withoutList, { hasWorkingFilesystem: false }).snapshots).toBeUndefined();
	});

	test("projects explicitly implemented probes and snapshots without inventing absent ones", async () => {
		const { compute } = fakeCompute(baseSandbox, true);
		const calls: string[] = [];
		const driver = bridge(compute, {
			probes: {
				observe: async (_compute, ref) => {
					calls.push(`observe:${ref.id}`);
					return { state: "running" };
				},
				list: async (provider) => provider.sandbox.list?.(),
				describe: async (_compute, ref) => ({ id: ref.id }),
			},
			snapshots: {
				create: async (_compute, session) => {
					expect(session.native).toBe(nativeSandbox);
					calls.push(`snapshot:${session.sandboxRef.id}`);
					return { snapshotId: "snap-1" };
				},
				delete: async (_compute, snapshotId) => {
					calls.push(`delete:${snapshotId}`);
				},
			},
		});
		const session = await driver.create(request);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "running" });
		expect(await driver.probes?.list?.()).toEqual(["sb-1"]);
		expect(await driver.probes?.describe?.(session.sandboxRef)).toEqual({ id: "i2f3k4abc" });
		await expect(
			driver.probes?.observe({ provider: "daytona-vm", id: "i2f3k4abc" }),
		).rejects.toMatchObject({ code: "invalid-sandbox-ref", provider: "e2b" });
		await expect(driver.probes?.observe({ provider: "e2b", id: "wrong-id" })).rejects.toMatchObject(
			{ code: "invalid-sandbox-ref", provider: "e2b" },
		);
		const snapshot = await driver.snapshots?.create(session);
		expect(snapshot).toEqual({ snapshotId: "snap-1" });
		await expect(
			driver.snapshots?.create({
				...session,
				sandboxRef: { provider: "daytona-vm", id: "bad" },
			}),
		).rejects.toMatchObject({ code: "invalid-sandbox-ref", provider: "e2b" });
		await driver.snapshots?.delete("snap-1");
		expect(calls).toEqual(["observe:i2f3k4abc", "snapshot:i2f3k4abc", "delete:snap-1"]);
	});

	test("decodes a raw wrapper id once and validates the stable canonical id thereafter", async () => {
		const { compute } = fakeCompute({ ...baseSandbox, sandboxId: "raw-I2F3K4ABC" });
		let receivedId = "";
		let observedId = "";
		const driver = bridge(compute, {
			sandboxId: {
				fromVendor: type(/^raw-/).pipe((id) => id.slice(4).toLowerCase()),
				canonical: e2bSandboxId,
			},
			probes: {
				observe: async (_compute, ref) => {
					observedId = ref.id;
					return { state: "running" };
				},
			},
			snapshots: {
				create: async (_compute, session) => {
					receivedId = session.sandboxRef.id;
					return { snapshotId: "snapshot-1" };
				},
				delete: async () => {},
			},
		});
		const session = await driver.create(request);
		expect(session.sandboxRef).toEqual({ provider: "e2b", id: "i2f3k4abc" });
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "running" });
		expect(observedId).toBe("i2f3k4abc");
		await driver.snapshots?.create(session);
		expect(receivedId).toBe("i2f3k4abc");
		await expect(
			driver.snapshots?.create({
				...session,
				sandboxRef: { provider: "e2b", id: "raw-I2F3K4ABC" },
			}),
		).rejects.toMatchObject({ code: "invalid-sandbox-ref", provider: "e2b" });
	});

	test("types and redacts a canonical-id validator throw before capability callbacks", async () => {
		const canonical = type("string").narrow((id) => {
			if (id === "test-key") throw new Error("canonical validator echoed test-key");
			return /^i[a-z0-9]+$/.test(id);
		});
		const { compute } = fakeCompute(baseSandbox);
		let observations = 0;
		const driver = bridge(compute, {
			sandboxId: { fromVendor: e2bSandboxId, canonical },
			probes: {
				observe: async () => {
					observations += 1;
					return { state: "running" };
				},
			},
		});
		await driver.create(request);
		const error = (await driver.probes
			?.observe({ provider: "e2b", id: "test-key" })
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "vendor-contract-violation", provider: "e2b" });
		expect(error.message).not.toContain("test-key");
		expect(String(error.cause ?? "")).not.toContain("test-key");
		expect(error.message).toContain("[REDACTED]");
		expect(error.ref).toBeUndefined();
		expect(observations).toBe(0);
	});

	test("types native extraction failures and retains cleanup ownership on a double fault", async () => {
		let destroys = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			getInstance: () => {
				throw new Error("native unwrap failed with test-key");
			},
			destroy: async () => {
				destroys += 1;
				if (destroys === 1) throw new Error("cleanup echoed test-key");
			},
		});
		const error = (await bridge(compute)
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error.locator).toEqual({ kind: "id", value: "i2f3k4abc" });
		expect(error.suppressed).toMatchObject({
			code: "vendor-contract-violation",
			provider: "e2b",
		});
		expect(error.error).toMatchObject({ code: "destroy-failed", provider: "e2b" });
		expect(String((error.suppressed as Error).message)).not.toContain("test-key");
		expect(String((error.error as Error).message)).not.toContain("test-key");
		await error.cleanup();
		expect(destroys).toBe(2);
	});

	test("types a native extraction failure before returning after successful rollback", async () => {
		let destroys = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			getInstance: () => {
				throw new Error("native unwrap failed");
			},
			destroy: async () => {
				destroys += 1;
			},
		});
		const error = await bridge(compute)
			.create(request)
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(DriverError);
		expect(error).toMatchObject({ code: "vendor-contract-violation", provider: "e2b" });
		expect(destroys).toBe(1);
	});

	test("redacts registry credentials from every wrapper diagnostic path", async () => {
		const leaked = "test-key";

		const createError = await bridge({
			sandbox: { create: async () => Promise.reject(new Error(`create echoed ${leaked}`)) },
		})
			.create(request)
			.catch((caught: unknown) => caught);
		expectRedacted(createError);

		const wrapper = (overrides: Partial<ComputeSdkSandboxLike> = {}) =>
			fakeCompute({ ...baseSandbox, ...overrides }).compute;
		const execSession = await bridge(
			wrapper({ runCommand: async () => Promise.reject(new Error(`exec echoed ${leaked}`)) }),
		).create(request);
		expectRedacted(await execSession.exec("true").catch((caught: unknown) => caught));

		const launchSession = await bridge(
			wrapper({
				runCommand: async () => ({ exitCode: 7, stderr: `launch echoed ${leaked}` }),
			}),
		).create(request);
		expectRedacted(await launchSession.launch?.("task").catch((caught: unknown) => caught));

		const destroySession = await bridge(
			wrapper({ destroy: async () => Promise.reject(new Error(`destroy echoed ${leaked}`)) }),
		).create(request);
		expectRedacted(await destroySession.destroy().catch((caught: unknown) => caught));
	});

	test("types and redacts every projected filesystem, probe, and snapshot failure", async () => {
		const rejected = (operation: string) =>
			Promise.reject(new Error(`${operation} echoed test-key`));
		const { compute } = fakeCompute({
			...baseSandbox,
			filesystem: {
				readFile: () => rejected("read"),
				exists: () => rejected("exists"),
				writeFile: () => rejected("write"),
			},
		});
		const driver = bridge(compute, {
			hasWorkingFilesystem: true,
			probes: {
				observe: () => rejected("observe"),
				list: () => rejected("list"),
				describe: () => rejected("describe"),
			},
			snapshots: {
				create: () => rejected("snapshot create"),
				delete: () => rejected("snapshot delete"),
			},
		});
		const session = await driver.create(request);
		const attempts = [
			session.files?.readFile("/secret"),
			session.files?.exists("/secret"),
			session.files?.writeText("/secret", "text"),
			driver.probes?.observe(session.sandboxRef),
			driver.probes?.list?.(),
			driver.probes?.describe?.(session.sandboxRef),
			driver.snapshots?.create(session),
			driver.snapshots?.delete("snapshot-1"),
		];
		const codes = [
			"filesystem-failed",
			"filesystem-failed",
			"filesystem-failed",
			"probe-failed",
			"probe-failed",
			"probe-failed",
			"snapshot-failed",
			"snapshot-failed",
		] as const;
		const errors = await Promise.all(
			attempts.map((attempt) => attempt?.catch((caught: unknown) => caught)),
		);
		for (const [index, error] of errors.entries()) expectRedacted(error, codes[index]);
	});

	test("does not redact ordinary one-character guest environment values", async () => {
		const error = await bridge({
			sandbox: {
				create: async () => {
					throw new Error("HTTP 401 after 1 attempt");
				},
			},
		})
			.create({ ...request, env: { BENCH_ATTEMPT: "1" } })
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({
			code: "create-failed",
			vendorMessage: "HTTP 401 after 1 attempt",
		});
	});

	test("uses stdout when empty stderr cannot explain a missing background status", async () => {
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => ({ stderr: "", stdout: "launch failed without status" }),
		});
		const session = await bridge(compute).create(request);
		await expect(session.launch?.("task")).rejects.toMatchObject({
			code: "exec-failed",
			provider: "e2b",
			vendorMessage: "launch failed without status",
		});
	});

	test("supplies a nonempty fallback when a failed background launch has no diagnostic", async () => {
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => ({ exitCode: 9, stderr: "", stdout: "" }),
		});
		const session = await bridge(compute).create(request);
		await expect(session.launch?.("task")).rejects.toMatchObject({
			code: "exec-failed",
			provider: "e2b",
			vendorMessage: "exit 9 with no diagnostic",
		});
	});

	test("a vendor id in the wrong format for the provider fails ref construction", async () => {
		let destroyed = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			sandboxId: "totally wrong id!",
			destroy: async () => {
				destroyed += 1;
			},
		});
		const error = (await bridge(compute, { hasWorkingFilesystem: false })
			.create(request)
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("invalid-sandbox-ref");
		expect(error.message).toMatch(/id must be matched by/);
		expect(destroyed).toBe(1);
	});

	test("the kit's central byte cap reaches a computesdk session (was ignored before)", async () => {
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => ({ exitCode: 0, stdout: "y".repeat(100), stderr: "" }),
		});
		const session = await bridge(compute, {
			hasWorkingFilesystem: false,
		}).create(request);
		const capped = await session.exec("noisy", { maxOutputBytes: 10 });
		expect(capped.stdout).toHaveLength(10);
		expect(capped.truncated).toBe(true);
	});

	test("a sandbox without an id fails create loudly", async () => {
		let destroyed = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			sandboxId: undefined,
			destroy: async () => {
				destroyed += 1;
			},
		});
		const error = (await bridge(compute, { hasWorkingFilesystem: false })
			.create(request)
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("vendor-contract-violation");
		expect(error.message).toContain("without a nonempty string sandboxId");
		expect(destroyed).toBe(1);
	});

	test("a malformed resolved wrapper handle fails through the typed boundary", async () => {
		const compute = {
			sandbox: { create: async () => null },
		} as unknown as ComputeSdkLike;
		const error = await bridge(compute)
			.create(request)
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(DriverError);
		expect(error).toMatchObject({
			code: "vendor-contract-violation",
			provider: "e2b",
		});
		expect((error as Error).message).toContain("non-object sandbox handle");
	});

	test("an already-aborted create never invokes the wrapper", async () => {
		let createCalls = 0;
		const compute: ComputeSdkLike = {
			sandbox: {
				create: async () => {
					createCalls += 1;
					return baseSandbox;
				},
			},
		};
		const cancellation = new AbortController();
		cancellation.abort(new Error("shutdown"));
		const error = await bridge(compute)
			.create(request, { signal: cancellation.signal })
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "create-failed", provider: "e2b" });
		expect(createCalls).toBe(0);
	});

	test("an abort during an uncancellable wrapper create reconciles the accepted handle first", async () => {
		let releaseCreate!: (sandbox: ComputeSdkSandboxLike) => void;
		const createResult = new Promise<ComputeSdkSandboxLike>((resolve) => {
			releaseCreate = resolve;
		});
		let noteCreateStarted!: () => void;
		const createStartedResult = new Promise<void>((resolve) => {
			noteCreateStarted = resolve;
		});
		let releaseDestroy!: () => void;
		const destroyResult = new Promise<void>((resolve) => {
			releaseDestroy = resolve;
		});
		let noteDestroyStarted!: () => void;
		const destroyStartedResult = new Promise<void>((resolve) => {
			noteDestroyStarted = resolve;
		});
		let destroyStarted = false;
		const accepted: ComputeSdkSandboxLike = {
			...baseSandbox,
			destroy: async () => {
				destroyStarted = true;
				noteDestroyStarted();
				await destroyResult;
			},
		};
		const compute: ComputeSdkLike = {
			sandbox: {
				create: async () => {
					noteCreateStarted();
					return createResult;
				},
			},
		};
		const cancellation = new AbortController();
		let settled = false;
		const creating = bridge(compute)
			.create(request, { signal: cancellation.signal })
			.catch((caught: unknown) => caught)
			.finally(() => {
				settled = true;
			});

		await createStartedResult;
		cancellation.abort(new Error("shutdown"));
		releaseCreate(accepted);
		await destroyStartedResult;
		expect(destroyStarted).toBe(true);
		expect(settled).toBe(false);
		releaseDestroy();

		const error = await creating;
		expect(error).toMatchObject({ code: "create-failed", provider: "e2b" });
		expect(settled).toBe(true);
	});

	test("a validation/cleanup double fault preserves both failures and retryable ownership", async () => {
		let destroyCalls = 0;
		const { compute } = fakeCompute({
			...baseSandbox,
			sandboxId: undefined,
			destroy: async () => {
				destroyCalls++;
				if (destroyCalls === 1) throw new Error("cleanup exploded");
			},
		});
		const error = (await bridge(compute, {
			hasWorkingFilesystem: false,
		})
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error).toBeInstanceOf(SuppressedError);
		expect((error.error as DriverError).code).toBe("destroy-failed");
		expect((error.suppressed as DriverError).code).toBe("vendor-contract-violation");
		expect(error).toMatchObject({ provider: "e2b", locator: { kind: "native-handle" } });

		await error[Symbol.asyncDispose]();
		await error[Symbol.asyncDispose]();
		expect(destroyCalls).toBe(2);
	});

	test("wrapper rejections use the shared typed error family", async () => {
		const retained = new FailedCreateCleanupError(
			new Error("wrapper cleanup failed"),
			new Error("wrapper create failed"),
			{
				provider: "e2b",
				locator: { kind: "id", value: "i-retained" },
				cleanup: async () => {},
			},
		);
		const retainedCompute: ComputeSdkLike = {
			sandbox: {
				create: async () => {
					throw retained;
				},
			},
		};
		expect(
			await bridge(retainedCompute)
				.create(request)
				.catch((caught: unknown) => caught),
		).toBe(retained);

		const createFailure: ComputeSdkLike = {
			sandbox: {
				create: async () => {
					throw new Error("provider unavailable");
				},
			},
		};
		const createError = await bridge(createFailure, {
			hasWorkingFilesystem: false,
		})
			.create(request)
			.catch((caught: unknown) => caught);
		expect(createError).toMatchObject({
			code: "create-failed",
			provider: "e2b",
			vendorMessage: "provider unavailable",
		});

		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => {
				throw new Error("transport closed");
			},
		});
		const session = await bridge(compute, {
			hasWorkingFilesystem: false,
		}).create(request);
		const execError = await session.exec("true").catch((caught: unknown) => caught);
		expect(execError).toMatchObject({
			code: "exec-failed",
			provider: "e2b",
			vendorMessage: "transport closed",
		});
	});

	test("never preserves a foreign provider ref from an already-typed wrapper error", async () => {
		const foreign = new DriverError("destroy-failed", "wrong wrapper channel", {
			provider: "daytona-vm",
			ref: { provider: "daytona-vm", id: "wrong-id" },
		});
		const error = (await bridge({
			sandbox: {
				create: async () => {
					throw foreign;
				},
			},
		})
			.create(request)
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "create-failed", provider: "e2b" });
		expect(error.ref).toBeUndefined();
	});

	test("normalizes foreign typed-error codes to the current operation boundary", async () => {
		const wrongChannel = () =>
			new DriverError("create-failed", "wrapper chose the create channel", {
				provider: "daytona-vm",
			});
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => {
				throw wrongChannel();
			},
			filesystem: {
				readFile: async () => {
					throw wrongChannel();
				},
				exists: async () => true,
				writeFile: async () => {},
			},
		});
		const session = await bridge(compute, { hasWorkingFilesystem: true }).create(request);
		await expect(session.exec("true")).rejects.toMatchObject({
			code: "exec-failed",
			provider: "e2b",
		});
		await expect(session.files?.readFile("/tmp/file")).rejects.toMatchObject({
			code: "filesystem-failed",
			provider: "e2b",
			ref: session.sandboxRef,
		});
	});
});
