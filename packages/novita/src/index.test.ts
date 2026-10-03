// Novita tested at the vendor seam: the adapter's translation, the port contract over a stub SDK,
// and a few sessions through the package's own module. Kit behaviour (convergence, deadlines, the
// inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate, launchDetached, readTextFile } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { E2B_ATTEMPT_KEY } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import type { E2bProtocolStubOptions } from "@sandbox-benchmarks/driver/vendor/testing";
import {
	e2bProtocolStub,
	vendorContract,
	vendorDriver,
} from "@sandbox-benchmarks/driver/vendor/testing";
import novita, { NOVITA_DOMAIN } from "./index.ts";
import type { NovitaSdk } from "./vendor.ts";
import { novitaVendor } from "./vendor.ts";

const KEY = "nvta_sentinel-credential";
const context: DriverContext<"novita"> = {
	env: { NOVITA_API_KEY: KEY },
	artifact: { kind: "baked" },
	resolvedArtifact: { kind: "baked", ref: "toolchain-test" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 20 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};

class SandboxNotFoundError extends Error {}
class AuthenticationError extends Error {}
class InvalidArgumentError extends Error {}
class RateLimitError extends Error {}

/** The shared E2B-protocol stand-in, carrying Novita's typed errors and info fields. */
const stubNovita = (options: E2bProtocolStubOptions = {}) =>
	e2bProtocolStub<NovitaSdk>({
		info: { templateId: "toolchain-test", cpuCount: 4 },
		errors: { SandboxNotFoundError, AuthenticationError, InvalidArgumentError, RateLimitError },
		...options,
	});

/** The package's own module, lowered over a stub SDK instead of the real one. */
function driverOver(stub: ReturnType<typeof stubNovita>) {
	return vendorDriver(novita, context, {
		vendor: novitaVendor(stub.sdk, context),
		timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
	});
}

vendorContract("novita adapter", novita, () =>
	novitaVendor(stubNovita({ pageSize: 1 }).sdk, context),
);

describe("Novita end to end through its module", () => {
	test("a session runs as root, launches natively, inventories, and is destroyed; the key stays in apiKey", async () => {
		const stub = stubNovita({ pageSize: 1 });
		stub.allocate({}, "running"); // another tenant's sandbox
		const driver = driverOver(stub);
		const session = await driver.create(request);

		const seven = await session.exec("sh -c 'exit 7'");
		expect(seven.exit).toEqual({ kind: "exited", code: 7 });
		expect((await session.exec("echo")).stdout).toBe("out\n");
		await session.files?.writeText("/tmp/item", "saved");
		expect(await session.files?.exists("/tmp/item")).toBe(true);
		expect(await session.files?.readFile("/tmp/item")).toBe("saved");
		await launchDetached(session, "sh -c 'echo done > /tmp/done'");
		expect(await readTextFile(session, "/tmp/done")).toBe("done\n");

		// A paused benchmark sandbox still owns resources: it is inventoried and torn down.
		const paused = stub.allocate({ [E2B_ATTEMPT_KEY]: `${MARKER_PREFIX}paused` }, "paused");
		expect(await driver.probes?.observe({ provider: "novita", id: paused })).toEqual({
			state: "running",
		});
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef, { provider: "novita", id: paused }],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "novita", id: paused });
		// The held session's teardown is a single kill, which proves removal.
		const before = stub.calls.length;
		await session.destroy();
		expect(stub.calls.slice(before).map((call) => call.name)).toEqual(["kill"]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });

		// The account key reaches the control plane only through the SDK's apiKey option.
		const create = stub.calls.find((call) => call.name === "create")?.options;
		expect(create).toMatchObject({ apiKey: KEY, domain: NOVITA_DOMAIN });
		expect(create).not.toHaveProperty("headers");
		expect(create).not.toHaveProperty("envs");
		const guest = stub.calls.filter((call) => call.name.includes("."));
		expect(guest.length).toBeGreaterThan(0);
		for (const call of guest) {
			expect(call.options).toMatchObject({ user: "root" });
			expect(JSON.stringify(call.options)).not.toContain(KEY);
		}
	});

	test("an ambiguous create is found by its marker and killed", async () => {
		const stub = stubNovita({ ambiguousFirstCreate: true });
		const error = await driverOver(stub)
			.create(request)
			.catch((caught) => caught);
		expect(error).toMatchObject({ code: "create-failed" });
		expect(isRetryableDriverCreate(error)).toBe(false);
		expect(stub.count("kill")).toBe(1);
		expect(stub.rows.size).toBe(0);
	});
});
