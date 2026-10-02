// The driver authoring module, tested once at its interface: defineVendorDriver over the in-memory
// vendor. These cover the kit-derived behaviour every provider package inherits (readiness,
// cleanup confirmation, inventory, recovery, request proof), the typed passthroughs, the port
// contract, and end-to-end sessions — including ADR-0008's kit tier run against memoryVendor.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import {
	describeDriverFailure,
	isRetryableDriverCreate,
	launchDetached,
	nvidiaAccelerator,
	readTextFile,
	writeTextFile,
} from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { admissionFailures, runConformance } from "@sandbox-benchmarks/driver/conformance";
import type { Vendor, VendorDriverSpec } from "@sandbox-benchmarks/driver/vendor";
import {
	coverage,
	DISK_PROBE,
	defineVendorDriver,
	instanceOfAny,
	MARKER_PREFIX,
	mapped,
	pinned,
} from "@sandbox-benchmarks/driver/vendor";
import type { MemoryRow, MemoryVendorOptions } from "@sandbox-benchmarks/driver/vendor/testing";
import { memoryVendor, vendorContract } from "@sandbox-benchmarks/driver/vendor/testing";
import { type } from "arktype";

const SECRET = "nvta_sentinel-credential";
const resolvedArtifact = { kind: "baked", ref: "tpl" } as const;
const context: DriverContext<"novita"> = {
	env: { NOVITA_API_KEY: SECRET },
	artifact: { kind: "baked" },
	resolvedArtifact,
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: resolvedArtifact,
	deadlineMs: 300_000,
};
const provenance = { packageName: "memory-vendor", version: "0.0.0" };

type Spec = VendorDriverSpec<"novita", MemoryRow, MemoryRow>;

function moduleOver(
	vendor: (bound: DriverContext<"novita">) => Vendor<MemoryRow, MemoryRow>,
	extra: Partial<Spec> = {},
) {
	return defineVendorDriver("novita", {
		provenance,
		sandboxId: type(/^mem-\d+$/),
		coverage: mapped("runtime-verified"),
		timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
		recovery: { absenceConfirmationMs: 1 },
		...extra,
		vendor,
	});
}

/** One in-memory vendor account and the module's driver bound to it through its real entry point. */
function bind(options: MemoryVendorOptions = {}, extra: Partial<Spec> = {}, admit?: string) {
	const world = memoryVendor(options);
	const vendor: Vendor<MemoryRow, MemoryRow> = admit
		? { ...world.vendor, control: { ...world.vendor.control, admit: () => admit } }
		: world.vendor;
	const module = moduleOver(() => vendor, {
		...(options.account && { account: options.account }),
		...extra,
	});
	return { ...world, module, driver: module.driver(context) };
}

describe("readiness", () => {
	test("polls a pending sandbox until ready, then proves disk and executes", async () => {
		const { driver, calls } = bind({ readyAfterGets: 3 });
		const session = await driver.create(request);
		expect(calls.filter((call) => call === "get")).toHaveLength(3);
		expect((await session.exec("sh -c 'echo out'")).stdout).toBe("out\n");
		await session.destroy();
	});

	test("a create response that proves readiness skips the poll", async () => {
		const { driver, calls } = bind();
		await (await driver.create(request)).destroy();
		expect(calls.slice(0, 2)).toEqual(["create", "get"]); // the get is teardown's observation
	});

	test("a sandbox that never becomes ready is torn down, not returned", async () => {
		const { driver, allocations } = bind(
			{ readyAfterGets: 1_000 },
			{ timing: { pollMs: 1, readyTimeoutMs: 30, deleteTimeoutMs: 1_000 } },
		);
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(allocations()).toBe(0);
	});
});

describe("cleanup confirmation", () => {
	test("an acknowledged delete is not removal: teardown observes the sandbox gone", async () => {
		const { driver, calls, allocations } = bind();
		await (await driver.create(request)).destroy();
		expect(calls.slice(-3)).toEqual(["get", "remove", "get"]);
		expect(allocations()).toBe(0);
	});

	test("a delete that proves removal ends teardown without further polling", async () => {
		const { driver, calls } = bind({ removal: "removed" });
		await (await driver.create(request)).destroy();
		expect(calls.slice(-2)).toEqual(["get", "remove"]);
	});

	test("never issues a delete for a sandbox already observed gone", async () => {
		const { driver, calls } = bind();
		const session = await driver.create(request);
		await session.destroy();
		calls.length = 0;
		await driver.destroyById?.(session.sandboxRef);
		expect(calls).toEqual(["get"]);
	});
});

describe("inventory", () => {
	test("drains every page and partitions owned from foreign sandboxes", async () => {
		const { driver } = bind({ pageSize: 1, foreign: 2 });
		await driver.create(request);
		await driver.create(request);
		const snapshot = await driver.inventory?.list();
		expect(snapshot?.owned).toHaveLength(2);
		expect(snapshot?.foreignCount).toBe(2);
	});

	test("fails closed on a repeated cursor instead of reporting a partial account", async () => {
		const { driver } = bind({ pageSize: 1, foreign: 3, faults: { pageRepeatsCursor: true } });
		await expect(driver.inventory?.list()).rejects.toThrow();
	});

	test("a dedicated account owns every live sandbox", async () => {
		const { driver } = bind({ account: "dedicated", foreign: 2 });
		expect((await driver.inventory?.list())?.owned).toHaveLength(2);
	});
});

describe("ambiguous-create recovery", () => {
	test("a lost create response is found by its marker and torn down", async () => {
		const { driver, allocations } = bind({ faults: { createAmbiguous: true } });
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(allocations()).toBe(0);
	});

	test("an unrelated sandbox from a marker lookup is rejected, never deleted", async () => {
		const { driver, live } = bind({ faults: { createAmbiguous: true, findReturnsForeign: true } });
		await expect(driver.create(request)).rejects.toThrow();
		expect(live().some((row) => row.marker === "unrelated")).toBe(true);
	});

	test("a dedicated account recovers by idempotent replay", async () => {
		const { driver, calls, live } = bind({
			account: "dedicated",
			faults: { createAmbiguous: true },
		});
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(calls).toContain("find");
		expect(live()).toHaveLength(0);
	});

	test("a dedicated account without a marker lookup is refused when bound", () => {
		const world = memoryVendor();
		const module = moduleOver(() => world.vendor, { account: "dedicated" });
		expect(() => module.specFor(context)).toThrow(/needs control.find/);
		expect(() => module.driver(context)).toThrow(
			expect.objectContaining({ code: "vendor-contract-violation" }),
		);
	});

	test("a refusal before allocation skips recovery and carries retryability", async () => {
		const { driver, calls } = bind({ faults: { createRefused: { retryable: true } } });
		const error = await driver.create(request).catch((caught) => caught);
		expect(isRetryableDriverCreate(error)).toBe(true);
		expect(calls).toEqual(["create"]);
	});

	test("instanceOfAny classifies a typed vendor error anywhere in the cause chain", () => {
		class QuotaError extends Error {}
		const refusedByQuota = instanceOfAny(QuotaError);
		expect(refusedByQuota(new Error("wrapped", { cause: new QuotaError("quota") }))).toBe(true);
		expect(refusedByQuota(new TypeError("connection reset"))).toBe(false);
	});
});

describe("request proof", () => {
	test("rejects an allocation smaller than the requested disk, and tears it down", async () => {
		const { driver, allocations } = bind({ diskGb: 10 });
		await expect(driver.create(request)).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(allocations()).toBe(0);
	});

	test("rejects an allocation the provider does not admit, and tears it down", async () => {
		const { driver, allocations } = bind({}, {}, "wrong environment revision");
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(allocations()).toBe(0);
	});

	test("refuses a request artifact other than the resolved one before any vendor call", async () => {
		const { driver, calls } = bind();
		await expect(
			driver.create({ ...request, artifact: { kind: "baked", ref: "other" } }),
		).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(calls).toEqual([]);
	});

	test("an artifact-pinned shape proves disk but never maps CPU or memory", async () => {
		const { driver } = bind({}, { coverage: pinned(4, 8) });
		const session = await driver.create(request);
		expect((await session.exec(DISK_PROBE)).stdout.trim()).toBe(String(80 * 1024 * 1024));
		await session.destroy();
		await expect(
			driver.create({ ...request, spec: { ...request.spec, vcpus: 2 } }),
		).rejects.toMatchObject({ code: "invalid-create-request" });
	});
});

describe("typed passthroughs", () => {
	test("execution defaults to a 60s cap over the kit's shell detach", () => {
		expect(bind().module.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
	});

	test("an uncapped execution policy with no durable route passes through unchanged", () => {
		const { module } = bind({}, { execution: { syncCapMs: null, durable: "none" } });
		expect(module.execution).toEqual({ syncCapMs: null, durable: "none" });
	});

	test("native launch and data.launch must be declared together", () => {
		const world = memoryVendor();
		const launching: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			data: { ...world.vendor.data, launch: async () => {} },
		};
		expect(() => moduleOver(() => launching).specFor(context)).toThrow(/declared together/);
		expect(() =>
			moduleOver(() => world.vendor, {
				execution: { syncCapMs: 60_000, durable: "native-launch" },
			}).specFor(context),
		).toThrow(/declared together/);
		expect(() => moduleOver(() => launching).driver(context)).toThrow(
			expect.objectContaining({ code: "vendor-contract-violation" }),
		);
	});

	test("a native launch reaches the vendor's background API, not the shell detach", async () => {
		const world = memoryVendor();
		const launched: string[] = [];
		const launching: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			data: {
				...world.vendor.data,
				launch: async (native, command) => {
					launched.push(command);
					await world.vendor.data.exec(native, command);
				},
			},
		};
		const module = moduleOver(() => launching, {
			execution: { syncCapMs: 30_000, durable: "native-launch" },
		});
		expect(module.execution).toEqual({ syncCapMs: 30_000, durable: "native-launch" });
		const session = await module.driver(context).create(request);
		await launchDetached(session, "sh -c 'echo done > /tmp/launched'");
		expect(launched).toEqual(["sh -c 'echo done > /tmp/launched'"]);
		expect(await readTextFile(session, "/tmp/launched")).toBe("done\n");
		await session.destroy();
	});

	test("accelerator and GPU coverage pass through to the module and the vendor request", async () => {
		const world = memoryVendor();
		const seen: CreateRequest[] = [];
		const recording: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				create: (attempt, op) => {
					seen.push(attempt.request);
					return world.vendor.control.create(attempt, op);
				},
			},
		};
		const module = moduleOver(() => recording, {
			coverage: coverage(
				{ vcpus: "mapped", memoryGb: "mapped", diskGb: "unsupported" },
				{ gpu: "mapped", env: "mapped" },
			),
			accelerator: nvidiaAccelerator,
		});
		expect(module.accelerator?.family).toBe(nvidiaAccelerator.family);
		const gpu = { model: "H100", count: 1 };
		const { diskGb: _disk, ...spec } = request.spec;
		const session = await module.driver(context).create({ ...request, spec, gpu });
		expect(seen.map((sent) => sent.gpu)).toEqual([gpu]);
		await session.destroy();
	});

	test("a harness-owned create budget and cost evidence pass through to the module", async () => {
		const captured: string[] = [];
		const costEvidence = {
			sdk: provenance,
			captureAfterTeardown: async (input: { sandboxId: string }) => {
				captured.push(input.sandboxId);
				return { status: "unavailable", reason: "memory vendor has no billing" } as never;
			},
		};
		const { module } = bind(
			{},
			{ createBudget: { owner: "harness", timeoutMs: 300_000 }, costEvidence },
		);
		expect(module.createBudget).toEqual({ owner: "harness", timeoutMs: 300_000 });
		expect(module.costEvidence?.sdk).toEqual(provenance);
		await module.costEvidence?.captureAfterTeardown({ sandboxId: "mem-1" } as never);
		expect(captured).toEqual(["mem-1"]);
	});

	test("a create budget the driver would own is refused at definition", () => {
		const world = memoryVendor();
		expect(() =>
			moduleOver(() => world.vendor, {
				createBudget: { owner: "driver", attemptCeilingMs: 1 } as never,
			}),
		).toThrow(/create budget/);
	});

	test("snapshots lower onto the driver's snapshot capability with the vendor handle", async () => {
		const world = memoryVendor();
		const taken: string[] = [];
		const deleted: string[] = [];
		const snapshotting: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			snapshots: {
				create: async (handle) => {
					taken.push(handle.record.id);
					return { snapshotId: `snap-of-${handle.native.id}` };
				},
				delete: async (snapshotId) => {
					deleted.push(snapshotId);
				},
			},
		};
		const driver = moduleOver(() => snapshotting).driver(context);
		const session = await driver.create(request);
		const created = await driver.snapshots?.create(session);
		expect(created).toEqual({ snapshotId: `snap-of-${session.sandboxRef.id}` });
		await driver.snapshots?.delete(`snap-of-${session.sandboxRef.id}`);
		expect(taken).toEqual([session.sandboxRef.id]);
		expect(deleted).toEqual([`snap-of-${session.sandboxRef.id}`]);
		await session.destroy();
		expect(bind().driver.snapshots).toBeUndefined();
	});

	test("specFor lowers the same module against another vendor and timing", async () => {
		const bound = memoryVendor();
		const stub = memoryVendor({ readyAfterGets: 2 });
		const module = moduleOver(() => bound.vendor);
		const driver = driverFromComputeSpec(
			"novita",
			module.specFor(context, { vendor: stub.vendor, timing: { pollMs: 0 } }),
			resolvedArtifact,
			[],
		);
		await (await driver.create(request)).destroy();
		expect(bound.calls).toEqual([]);
		expect(stub.calls).toContain("create");
	});
});

describe("port contract", () => {
	vendorContract("memoryVendor (shared)", () => ({
		vendor: memoryVendor().vendor,
		account: "shared",
	}));
	vendorContract("memoryVendor (dedicated)", () => ({
		vendor: memoryVendor({ account: "dedicated" }).vendor,
		account: "dedicated",
	}));
});

describe("end to end through the module's entry point", () => {
	test("a session lives its whole lifecycle, after recovering an ambiguous create", async () => {
		const { module, calls, allocations, live } = bind({
			readyAfterGets: 2,
			pageSize: 1,
			foreign: 1,
			faults: { createAmbiguous: true },
		});
		const driver = module.driver(context);

		// The first create allocates and then loses its response: the kit finds it by marker,
		// tears it down, and reports an ordinary create failure.
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(allocations()).toBe(0);

		const session = await driver.create(request);
		expect(session.sandboxRef).toEqual({ provider: "novita", id: expect.stringMatching(/^mem-/) });
		expect(session.artifact).toEqual(resolvedArtifact);
		expect(session.native.record.marker?.startsWith(MARKER_PREFIX)).toBe(true);

		const seven = await session.exec("sh -c 'exit 7'");
		expect(seven.exit).toEqual({ kind: "exited", code: 7 });
		const streams = await session.exec("sh -c 'echo out; echo err 1>&2'");
		expect([streams.stdout, streams.stderr]).toEqual(["out\n", "err\n"]);

		await writeTextFile(session, "/tmp/payload", "native write");
		expect(await readTextFile(session, "/tmp/payload")).toBe("native write");
		await session.exec("sh -c 'echo crossed > /tmp/payload'");
		expect(await session.files?.readFile("/tmp/payload")).toBe("crossed\n");
		expect(await session.files?.exists("/tmp/absent")).toBe(false);

		await launchDetached(session, "sh -c 'sleep 1; echo done > /tmp/done'");
		expect(await readTextFile(session, "/tmp/done")).toBe("done\n");

		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "running" });
		expect(await driver.probes?.describe?.(session.sandboxRef)).toMatchObject({ state: "ready" });
		expect(await driver.probes?.list?.()).toHaveLength(1); // one page, not an enumeration
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef],
			foreignCount: 1,
		});

		await session.destroy();
		await session.destroy(); // convergent
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
		const removes = calls.filter((call) => call === "remove");
		expect(removes).toHaveLength(2); // the recovered allocation and the session, once each
		expect(live()).toHaveLength(1);
	});

	test("a delete never observed as removal fails teardown and leaves the allocation findable", async () => {
		const { driver, calls, allocations } = bind(
			{ faults: { removalStalls: true } },
			{ timing: { pollMs: 1, readyTimeoutMs: 1_000, deleteTimeoutMs: 40 } },
		);
		const session = await driver.create(request);
		calls.length = 0;
		const failure = await session.destroy().catch((caught) => caught);
		expect(failure).toMatchObject({ code: "destroy-failed" });
		expect(describeDriverFailure(failure)).toContain("not observed removed");
		// Removal was requested exactly once; the rest of the budget only observed.
		expect(calls.filter((call) => call === "remove")).toHaveLength(1);
		expect(calls.filter((call) => call === "get").length).toBeGreaterThan(1);
		expect(allocations()).toBe(1);
		expect((await driver.inventory?.list())?.owned).toEqual([session.sandboxRef]);
	});

	test("ADR-0008's kit tier admits a module built over memoryVendor", async () => {
		const world = memoryVendor({ seedFiles: { "/etc/toolchain": "tpl\n" } });
		let bound: string | undefined;
		let leak = false;
		const leaky: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				create: async () => {
					throw new Error(`vendor rejected credential ${bound}`);
				},
			},
		};
		const module = moduleOver((boundContext) => {
			bound = boundContext.env.NOVITA_API_KEY;
			return leak ? leaky : world.vendor;
		});
		const report = await runConformance({
			module,
			context,
			tier: "kit",
			fingerprint: { artifact: resolvedArtifact, command: "cat /etc/toolchain", expect: "tpl" },
			gpu: { model: "H100", count: 1 },
			observeAllocations: () => world.calls.filter((call) => call === "create").length,
			secretDiagnostics: async () => {
				// A vendor failure that quotes the credential must reach every diagnostic redacted.
				leak = true;
				const failure = await module
					.driver(context)
					.create(request)
					.catch((caught: unknown) => caught);
				leak = false;
				return {
					kind: "observed",
					sensitiveValues: [SECRET],
					diagnostics: [describeDriverFailure(failure), String(failure)],
					executionReceivedSecrets: bound === SECRET,
				};
			},
			durableBudgetMs: 2_000,
			durablePollIntervalMs: 5,
		});
		expect(admissionFailures(report)).toEqual([]);
		expect(report.admissible).toBe(true);
		expect(world.allocations()).toBe(0);
	});
});
