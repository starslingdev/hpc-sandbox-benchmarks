// E2B tested at the vendor seam: the adapter's translation, the port contract over a stub SDK, and
// a few sessions through the package's own module. Kit behaviour (convergence, deadlines, the
// inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, spyOn, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate, launchDetached, readTextFile } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import {
	E2B_ATTEMPT_KEY,
	E2B_CONTROL_TIMEOUT_MS,
	E2B_LIVE_STATES,
} from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import type { E2bProtocolStubOptions } from "@sandbox-benchmarks/driver/vendor/testing";
import {
	e2bProtocolStub,
	vendorContract,
	vendorDriver,
} from "@sandbox-benchmarks/driver/vendor/testing";
import {
	AuthenticationError,
	CommandExitError,
	InvalidArgumentError,
	RateLimitError,
	Sandbox,
	SandboxNotFoundError,
	TimeoutError,
} from "e2b";
import e2b, { E2B_PROVENANCE, E2B_SANDBOX_ID } from "./index.ts";
import type { E2bSdk } from "./vendor.ts";
import { e2bVendor } from "./vendor.ts";

const KEY = "e2b_test-key";
const context: DriverContext<"e2b"> = {
	env: { E2B_API_KEY: KEY },
	artifact: { kind: "baked" },
	resolvedArtifact: { kind: "baked", ref: "sandbox-benchmarks-e2b-v1" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};
const op = () => ({ signal: new AbortController().signal });

/** The shared E2B-protocol stand-in, carrying the e2b SDK's own error classes and envelope. */
const stubE2b = ({
	foreignExit,
	...options
}: E2bProtocolStubOptions & {
	/** A nonzero exit arrives as a same-shaped error from another copy of the SDK. */
	readonly foreignExit?: boolean;
} = {}) =>
	e2bProtocolStub<E2bSdk>({
		info: { templateId: "tpl" },
		// Like the SDK: false for a sandbox E2B no longer knows.
		killMissing: "false",
		errors: { SandboxNotFoundError, AuthenticationError, InvalidArgumentError, RateLimitError },
		exitError: (exitCode) =>
			foreignExit
				? { name: "CommandExitError", exitCode, stdout: "foreign", stderr: "" }
				: new CommandExitError({ exitCode, stdout: "", stderr: "failed", error: "exit" }),
		...options,
	});

/** The package's own module, lowered over a stub SDK instead of the real one. */
function driverOver(stub: ReturnType<typeof stubE2b>) {
	return vendorDriver(e2b, context, {
		vendor: e2bVendor(stub.sdk, context),
		timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
	});
}

describe("E2B translation", () => {
	test("creates the resolved template for a suite-length lifetime, stamped with its marker", async () => {
		const stub = stubE2b();
		const { control } = e2bVendor(stub.sdk, context);
		const signal = new AbortController().signal;
		const created = await control.create({ request, marker: "benchmark-x" }, { signal });
		expect(created).toMatchObject({ phase: "ready", marker: "benchmark-x" });
		expect(stub.calls[0]?.options).toEqual({
			template: context.resolvedArtifact.ref,
			apiKey: KEY,
			timeoutMs: 3 * 60 * 60_000,
			metadata: { [E2B_ATTEMPT_KEY]: "benchmark-x" },
			signal,
		});
	});

	test("a paused sandbox is live but not ready; an unknown state still owns resources", async () => {
		const stub = stubE2b();
		const { control } = e2bVendor(stub.sdk, context);
		const paused = stub.allocate({ [E2B_ATTEMPT_KEY]: "benchmark-y" }, "paused");
		expect(await control.get(paused, op())).toMatchObject({
			phase: "pending",
			marker: "benchmark-y",
		});
		expect(await control.get(stub.allocate({}, "snapshotting"), op())).toMatchObject({
			phase: "failed",
		});
		// The SDK's typed not-found is what the adapter declares absent (the kit reads it as null).
		expect(control.absent?.(await control.get("imissing", op()).catch((error) => error))).toBe(
			true,
		);
		expect(await control.remove("imissing", { ...op(), current: async () => null })).toBe(
			"removed",
		);
	});

	test("lists live states for inventory and queries the marker server-side, each bounded", async () => {
		const stub = stubE2b();
		const { control } = e2bVendor(stub.sdk, context);
		const signal = new AbortController().signal;
		await control.page(undefined, { signal });
		await control.find?.("benchmark-z", undefined, { signal });
		const bound = { apiKey: KEY, requestTimeoutMs: E2B_CONTROL_TIMEOUT_MS };
		expect(stub.calls.map((call) => call.options)).toEqual([
			{ ...bound, query: { state: [...E2B_LIVE_STATES] } },
			{ ...bound, signal },
			{ ...bound, query: { metadata: { [E2B_ATTEMPT_KEY]: "benchmark-z" } } },
			{ ...bound, signal },
		]);
	});

	test("a listing that reports more pages without a token fails closed", async () => {
		const stub = stubE2b({ pageSize: 1, omitsToken: true });
		stub.allocate({});
		stub.allocate({});
		await expect(driverOver(stub).inventory?.list()).rejects.toMatchObject({
			code: "probe-failed",
		});
	});

	test("classifies refusals by the SDK's typed errors only; a rate limit is retryable", () => {
		const { refused } = e2bVendor(stubE2b().sdk, context).control;
		expect(refused?.(new AuthenticationError("invalid api key"))).toEqual({ retryable: false });
		expect(refused?.(new InvalidArgumentError("bad template"))).toEqual({ retryable: false });
		expect(refused?.(new RateLimitError("too many sandboxes"))).toEqual({ retryable: true });
		expect(
			refused?.(new Error("wrapped", { cause: new RateLimitError("too many sandboxes") })),
		).toEqual({ retryable: true });
		// A lost response after remote acceptance is exactly what recovery exists for; prose and
		// imitations prove nothing.
		for (const unproven of [
			new TimeoutError("request timed out"),
			new Error("429 Too Many Requests"),
			Object.assign(new Error("wrapper copy"), { name: "RateLimitError" }),
			Object.assign(new Error("throttled"), { status: 429 }),
		])
			expect(refused?.(unproven)).toBeUndefined();
	});

	test("a nonzero exit keeps its envelope, from this SDK copy or another", async () => {
		for (const foreignExit of [false, true]) {
			const stub = stubE2b({ foreignExit });
			const { control, data } = e2bVendor(stub.sdk, context);
			const native = await data.attach(await control.create({ request, marker: "m" }, op()), op());
			expect(await data.exec(native, "sh -c 'exit 23'")).toMatchObject({ exitCode: 23 });
		}
	});

	test("background acceptance needs a positive pid and leaves the deadline to the harness", async () => {
		const stub = stubE2b({ launchPid: 0 });
		const { control, data } = e2bVendor(stub.sdk, context);
		const native = await data.attach(await control.create({ request, marker: "m" }, op()), op());
		await expect(data.launch?.(native, "daemon")).rejects.toThrow("no positive process id");
		await data.exec(native, "id -u");
		expect(stub.calls.filter((call) => call.name === "commands.run").map((c) => c.options)).toEqual(
			[
				{ user: "root", background: true, timeoutMs: 0 },
				{ user: "root", background: false },
			],
		);
	});
});

vendorContract("e2b adapter", e2b, () => e2bVendor(stubE2b({ pageSize: 1 }).sdk, context));

describe("E2B end to end through its module", () => {
	test("declares identity, native-launch durability, and the SDK provenance", () => {
		expect(e2b.id).toBe("e2b");
		expect(e2b.provenance).toEqual(E2B_PROVENANCE);
		expect(e2b.execution).toEqual({ syncCapMs: 60_000, durable: "native-launch" });
		expect(e2b.readiness).toEqual({ startup: "create-returns-ready" });
		expect(e2b.createBudget).toBeUndefined();
		expect(E2B_SANDBOX_ID.allows("i2f3k4abc")).toBe(true);
		expect(E2B_SANDBOX_ID.allows("sandbox-123")).toBe(false);
	});

	test("a session proves disk, runs as root, launches, inventories, and is killed once", async () => {
		const stub = stubE2b({ pageSize: 1 });
		stub.allocate({}); // another tenant's sandbox
		const driver = driverOver(stub);
		const session = await driver.create(request);

		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		expect((await session.exec("echo")).stdout).toBe("out\n");
		await session.files?.writeText("/tmp/item", "saved");
		expect(await session.files?.exists("/tmp/item")).toBe(true);
		expect(await session.files?.readFile("/tmp/item")).toBe("saved");
		await launchDetached(session, "sh -c 'echo done > /tmp/done'");
		expect(await readTextFile(session, "/tmp/done")).toBe("done\n");

		// A paused benchmark sandbox is still an allocation: inventoried and torn down.
		const paused = stub.allocate({ [E2B_ATTEMPT_KEY]: `${MARKER_PREFIX}p` }, "paused");
		expect(await driver.probes?.observe({ provider: "e2b", id: paused })).toEqual({
			state: "running",
		});
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef, { provider: "e2b", id: paused }],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "e2b", id: paused });
		// The held session's teardown is a single kill, as before the port.
		const before = stub.calls.length;
		await session.destroy();
		expect(stub.calls.slice(before)).toEqual([
			{
				name: "kill",
				options: {
					apiKey: KEY,
					requestTimeoutMs: E2B_CONTROL_TIMEOUT_MS,
					signal: expect.any(AbortSignal),
				},
			},
		]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
		for (const call of stub.calls.filter((c) => c.name.includes(".")))
			expect(call.options).toMatchObject({ user: "root" });
	});

	test("an allocation whose disk is short of the request is refused and killed", async () => {
		const stub = stubE2b({ diskGb: 24 });
		const failure = await driverOver(stub)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "invalid-create-request", provider: "e2b" });
		expect(stub.count("kill")).toBe(1);
		expect(stub.rows.size).toBe(0);
	});

	test("an ambiguous create is found by its exact marker and killed", async () => {
		const stub = stubE2b({ ambiguousFirstCreate: true });
		const other = stub.allocate({ [E2B_ATTEMPT_KEY]: `${MARKER_PREFIX}other` });
		const failure = await driverOver(stub)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect([...stub.rows.keys()]).toEqual([other]);
	});
});

describe("E2B's production binding", () => {
	test("a typed refusal is classified before any recovery lookup", async () => {
		const create = spyOn(Sandbox, "create").mockRejectedValue(new RateLimitError("rate limited"));
		const list = spyOn(Sandbox, "list");
		try {
			const failure = await e2b
				.driver(context)
				.create(request)
				.catch((caught) => caught);
			expect(failure).toMatchObject({ code: "create-failed", retryable: true });
			expect(list).not.toHaveBeenCalled();
		} finally {
			create.mockRestore();
			list.mockRestore();
		}
	});

	test("a teardown transport failure surfaces typed and redacted", async () => {
		const stub = stubE2b();
		const create = spyOn(Sandbox, "create").mockImplementation(((template: string, options) =>
			stub.sdk.Sandbox.create(template, options)) as typeof Sandbox.create);
		const kill = spyOn(Sandbox, "kill").mockRejectedValue(new Error(`network failed for ${KEY}`));
		try {
			const session = await e2b.driver(context).create(request);
			const failure = await session.destroy().catch((caught: unknown) => caught);
			expect(failure).toMatchObject({ code: "destroy-failed", provider: "e2b" });
			expect((failure as Error).message).not.toContain(KEY);
			expect(kill).toHaveBeenCalledWith(session.sandboxRef.id, {
				apiKey: KEY,
				requestTimeoutMs: E2B_CONTROL_TIMEOUT_MS,
				signal: expect.any(AbortSignal),
			});
		} finally {
			create.mockRestore();
			kill.mockRestore();
		}
	});

	test("the pinned template refuses artifact, hardware, accelerator and env drift before any call", async () => {
		const create = spyOn(Sandbox, "create");
		try {
			const driver = e2b.driver(context);
			for (const invalid of [
				{ ...request, artifact: { kind: "baked" as const, ref: "some-other-template" } },
				{ ...request, spec: { ...request.spec, vcpus: 8 } },
				{ ...request, spec: { ...request.spec, memoryGb: 16 } },
				{ ...request, gpu: { model: "H100", count: 2 } },
				{ ...request, env: { SHOULD_EXIST: "yes" } },
			])
				await expect(driver.create(invalid)).rejects.toMatchObject({
					code: "invalid-create-request",
					provider: "e2b",
				});
			expect(create).not.toHaveBeenCalled();
		} finally {
			create.mockRestore();
		}
	});
});
