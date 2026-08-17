import { describe, expect, test } from "bun:test";
import type { ComputeSdkLike, ComputeSdkSandboxLike } from "./computesdk.ts";
import { computeSdkDriver } from "./computesdk.ts";
import type { CreateRequest, DriverError } from "./index.ts";

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8 },
	artifactRef: "template-1",
	deadlineMs: 30_000,
};

function fakeCompute(sandbox: ComputeSdkSandboxLike, withList = false) {
	const createOptionsSeen: Array<Record<string, unknown>> = [];
	const compute: ComputeSdkLike = {
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

const baseSandbox: ComputeSdkSandboxLike = {
	sandboxId: "i2f3k4abc",
	runCommand: async () => ({ exitCode: 0, stdout: "ok", stderr: "" }),
	destroy: async () => {},
};

describe("computeSdkDriver", () => {
	test("passes create options through with the request deadline", async () => {
		const { compute, createOptionsSeen } = fakeCompute(baseSandbox);
		const driver = computeSdkDriver(compute, {
			provider: "e2b",
			createOptions: { snapshotId: "template-1" },
			hasWorkingFilesystem: false,
		});
		const session = await driver.create(request);
		expect(session.sandboxRef).toEqual({ provider: "e2b", id: "i2f3k4abc" });
		expect(session.artifactRef).toBe("template-1");
		expect(createOptionsSeen).toEqual([{ snapshotId: "template-1", timeout: 30_000 }]);
	});

	test("a withheld exit code becomes the representable unknown arm, never a forged number", async () => {
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => ({ stdout: "partial", stderr: "" }),
		});
		const session = await computeSdkDriver(compute, {
			provider: "e2b",
			hasWorkingFilesystem: false,
		}).create(request);
		const result = await session.exec("true");
		expect(result.exit).toEqual({
			kind: "unknown",
			detail: "computesdk adapter reported no exit code",
		});
		expect(result.stdout).toBe("partial");
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
		const withoutTrust = await computeSdkDriver(stubbed, {
			provider: "e2b",
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
		const withTrust = await computeSdkDriver(working, {
			provider: "e2b",
			hasWorkingFilesystem: true,
		}).create(request);
		expect(await withTrust.files?.readFile("/bench/a")).toBe("content");
		expect(reads).toEqual(["/bench/a"]);
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
		const session = await computeSdkDriver(compute, {
			provider: "e2b",
			hasWorkingFilesystem: false,
		}).create(request);
		await session.launch?.("bash task.sh");
		expect(commands).toEqual([["bash task.sh", true]]);
	});

	test("probes exist exactly when the wrapper exposes list", async () => {
		const { compute: withList } = fakeCompute(baseSandbox, true);
		expect(
			computeSdkDriver(withList, { provider: "e2b", hasWorkingFilesystem: false }).probes,
		).toBeDefined();
		const { compute: withoutList } = fakeCompute(baseSandbox, false);
		expect(
			computeSdkDriver(withoutList, { provider: "e2b", hasWorkingFilesystem: false }).probes,
		).toBeUndefined();
	});

	test("a vendor id in the wrong format for the provider fails ref construction", async () => {
		const { compute } = fakeCompute({ ...baseSandbox, sandboxId: "totally wrong id!" });
		const error = (await computeSdkDriver(compute, { provider: "e2b", hasWorkingFilesystem: false })
			.create(request)
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("invalid-sandbox-ref");
		expect(error.message).toMatch(/id must be matched by/);
	});

	test("the kit's central byte cap reaches a computesdk session (was ignored before)", async () => {
		const { compute } = fakeCompute({
			...baseSandbox,
			runCommand: async () => ({ exitCode: 0, stdout: "y".repeat(100), stderr: "" }),
		});
		const session = await computeSdkDriver(compute, {
			provider: "e2b",
			hasWorkingFilesystem: false,
		}).create(request);
		const capped = await session.exec("noisy", { maxOutputBytes: 10 });
		expect(capped.stdout).toHaveLength(10);
		expect(capped.truncated).toBe(true);
	});

	test("a sandbox without an id fails create loudly", async () => {
		const { compute } = fakeCompute({ ...baseSandbox, sandboxId: undefined });
		const error = (await computeSdkDriver(compute, { provider: "e2b", hasWorkingFilesystem: false })
			.create(request)
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("vendor-contract-violation");
		expect(error.message).toContain("without a sandboxId");
	});
});
