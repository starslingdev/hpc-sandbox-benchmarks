import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { APIError, Sandbox } from "@vercel/sandbox";
import { VercelTransportError, vercelCompute } from "./vercel.ts";

const config = {
	image: `vcr.vercel.com/starsling-dev/sandbox-benchmarks/toolchain@sha256:${"a".repeat(64)}`,
	vcpus: 4,
};

function nativeSandbox(overrides: Record<string, unknown> = {}): Sandbox {
	return {
		name: "sandbox-benchmarks-test",
		status: "running",
		createdAt: new Date("2026-07-31T00:00:00Z"),
		timeout: 60_000,
		tags: { "sandbox-benchmarks": "vercel" },
		image: config.image,
		region: "iad1",
		vcpus: 4,
		memory: 8192,
		...overrides,
	} as unknown as Sandbox;
}

const restores: Array<() => void> = [];
afterEach(() => {
	for (const restore of restores.reverse()) restore();
	restores.length = 0;
});

function restore<T extends { mockRestore(): void }>(mock: T): T {
	restores.push(() => mock.mockRestore());
	return mock;
}

function mockCreate(native: Sandbox, capture?: (input: Record<string, unknown>) => void) {
	return restore(
		spyOn(Sandbox, "create").mockImplementation((async (input) => {
			capture?.(input as unknown as Record<string, unknown>);
			return native;
		}) as typeof Sandbox.create),
	);
}

function notFound(): APIError<unknown> {
	return new APIError(new Response(null, { status: 404 }), { message: "not found" });
}

describe("Vercel ComputeSDK adapter", () => {
	it("forwards image, timeout, env, resources, persistence, and at most five tags", async () => {
		let params: Record<string, unknown> | undefined;
		const native = nativeSandbox();
		mockCreate(native, (input) => {
			params = input;
		});

		const provider = vercelCompute(config);
		const sandbox = await provider.sandbox.create({
			name: native.name,
			timeout: 123_456,
			envs: { BENCH: "1" },
			metadata: { a: 1, b: 2, c: 3, d: 4, ignored: 5 },
		});

		expect(sandbox.sandboxId).toBe(native.name);
		expect(params).toMatchObject({
			name: native.name,
			image: config.image,
			timeout: 123_456,
			persistent: false,
			resources: { vcpus: 4 },
			env: { BENCH: "1" },
			tags: {
				"sandbox-benchmarks": "vercel",
				"meta.a": "1",
				"meta.b": "2",
				"meta.c": "3",
				"meta.d": "4",
			},
		});
		expect(Object.keys(params?.tags as object)).toHaveLength(5);
		expect(params?.tags).not.toHaveProperty("meta.ignored");
		expect(params).not.toHaveProperty("token");
		expect(params).not.toHaveProperty("teamId");
		expect(params).not.toHaveProperty("projectId");
		expect(provider.snapshot).toBeUndefined();
	});

	it("gets by name with resume explicitly disabled", async () => {
		let params: Record<string, unknown> | undefined;
		restore(
			spyOn(Sandbox, "get").mockImplementation((async (input) => {
				params = input as unknown as Record<string, unknown>;
				return nativeSandbox();
			}) as typeof Sandbox.get),
		);
		const found = await vercelCompute(config).sandbox.getById("sandbox-benchmarks-test");
		expect(found?.sandboxId).toBe("sandbox-benchmarks-test");
		expect(params).toEqual({
			name: "sandbox-benchmarks-test",
			resume: false,
		});
	});

	it("uses a candidate VCR templateId as the native image override", async () => {
		let params: Record<string, unknown> | undefined;
		mockCreate(nativeSandbox(), (input) => {
			params = input;
		});
		const candidate = `vcr.vercel.com/starsling-dev/sandbox-benchmarks/toolchain@sha256:${"b".repeat(64)}`;
		await vercelCompute(config).sandbox.create({ templateId: candidate });
		expect(params?.image).toBe(candidate);
	});

	it("lists the authoritative name prefix and reconnects every record with resume false", async () => {
		let listParams: Record<string, unknown> | undefined;
		const getParams: Record<string, unknown>[] = [];
		restore(
			spyOn(Sandbox, "list").mockImplementation((async (input) => {
				listParams = input as Record<string, unknown>;
				return {
					toArray: async () => [
						{ name: "sandbox-benchmarks-one" },
						{ name: "sandbox-benchmarks-two" },
					],
				};
			}) as typeof Sandbox.list),
		);
		restore(
			spyOn(Sandbox, "get").mockImplementation((async (input) => {
				getParams.push(input as unknown as Record<string, unknown>);
				return nativeSandbox({ name: (input as { name: string }).name });
			}) as typeof Sandbox.get),
		);
		const listed = await vercelCompute(config).sandbox.list();
		expect(listParams).toMatchObject({ namePrefix: "sandbox-benchmarks-" });
		expect(listed.map((sandbox) => sandbox.sandboxId)).toEqual([
			"sandbox-benchmarks-one",
			"sandbox-benchmarks-two",
		]);
		expect(getParams).toHaveLength(2);
		for (const params of getParams) expect(params.resume).toBe(false);
	});

	it("permanently deletes running and stopped sandboxes, and treats 404 as clean", async () => {
		let deleteCalls = 0;
		const natives = [
			nativeSandbox({ delete: async () => deleteCalls++ }),
			nativeSandbox({ status: "stopped", delete: async () => deleteCalls++ }),
		];
		restore(
			spyOn(Sandbox, "get").mockImplementation((async () => {
				const next = natives.shift();
				if (next) return next;
				throw notFound();
			}) as typeof Sandbox.get),
		);
		const provider = vercelCompute(config);
		await provider.sandbox.destroy("running");
		await provider.sandbox.destroy("stopped");
		await expect(provider.sandbox.destroy("gone")).resolves.toBeUndefined();
		expect(deleteCalls).toBe(2);
	});

	it("maps real getInfo fields and refreshes with resume false", async () => {
		mockCreate(nativeSandbox());
		let getParams: Record<string, unknown> | undefined;
		restore(
			spyOn(Sandbox, "get").mockImplementation((async (input) => {
				getParams = input as unknown as Record<string, unknown>;
				return nativeSandbox({ status: "stopped", timeout: undefined });
			}) as typeof Sandbox.get),
		);
		const sandbox = await vercelCompute(config).sandbox.create();
		expect(await sandbox.getInfo()).toEqual({
			id: "sandbox-benchmarks-test",
			provider: "vercel",
			status: "stopped",
			createdAt: new Date("2026-07-31T00:00:00Z"),
			timeout: 0,
			metadata: {
				"sandbox-benchmarks": "vercel",
				image: config.image,
				region: "iad1",
				vcpus: 4,
				memoryMb: 8192,
			},
		});
		expect(getParams?.resume).toBe(false);
	});

	it("maps command options and results through the current session without auto-resume", async () => {
		let commandParams: Record<string, unknown> | undefined;
		let outerCommandCalls = 0;
		const provider = vercelCompute(config);
		mockCreate(
			nativeSandbox({
				runCommand: async () => outerCommandCalls++,
				currentSession: () => ({
					runCommand: async (input: Record<string, unknown>) => {
						commandParams = input;
						return {
							stdout: async () => "out",
							stderr: async () => "err",
							exitCode: 7,
							durationMs: 42,
						};
					},
				}),
			}),
		);
		const sandbox = await provider.sandbox.create();
		await expect(
			sandbox.runCommand("printf test", {
				cwd: "/work",
				env: { BENCH: "1" },
				timeout: 1234,
			}),
		).resolves.toEqual({
			stdout: "out",
			stderr: "err",
			exitCode: 7,
			durationMs: 42,
		});
		expect(commandParams).toMatchObject({
			cmd: "/bin/sh",
			args: ["-lc", "printf test"],
			cwd: "/work",
			env: { BENCH: "1" },
			timeoutMs: 1234,
		});
		expect(outerCommandCalls).toBe(0);
	});

	it("maps detached execution and throws when launch transport fails", async () => {
		let commandParams: Record<string, unknown> | undefined;
		const provider = vercelCompute(config);
		mockCreate(
			nativeSandbox({
				currentSession: () => ({
					runCommand: async (input: Record<string, unknown>) => {
						commandParams = input;
						return {};
					},
				}),
			}),
		);
		const sandbox = await provider.sandbox.create();
		await expect(sandbox.runCommand("sleep 10", { background: true })).resolves.toMatchObject({
			exitCode: 0,
		});
		expect(commandParams).toMatchObject({ detached: true });
		mockCreate(
			nativeSandbox({
				currentSession: () => ({
					runCommand: async () => Promise.reject(new Error("offline")),
				}),
			}),
		);
		const failedSandbox = await provider.sandbox.create();
		await expect(failedSandbox.runCommand("true", { background: true })).rejects.toBeInstanceOf(
			VercelTransportError,
		);
	});
});
