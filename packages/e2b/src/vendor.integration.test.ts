// E2B tested at the vendor seam: the adapter's translation, the port contract over a stub SDK, and
// a few sessions through the package's own module. Kit behaviour (convergence, deadlines, the
// inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { launchDetached, readTextFile } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import {
	E2B_ATTEMPT_KEY,
	E2B_CONTROL_TIMEOUT_MS,
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
	SandboxNotFoundError,
} from "e2b";
import e2b from "./driver.ts";
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

vendorContract("e2b adapter", e2b, () => e2bVendor(stubE2b({ pageSize: 1 }).sdk, context));

describe("E2B end to end through its module", () => {
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
});
