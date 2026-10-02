// The driver authoring module, tested once at its interface: defineVendorDriver over the in-memory
// vendor. These cover the kit-derived behaviour every provider package inherits (readiness,
// cleanup confirmation, inventory, recovery, request proof), the typed passthroughs, the port
// contract, and end-to-end sessions — including ADR-0008's kit tier run against memoryVendor.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import {
	describeDriverFailure,
	FailedCreateCleanupError,
	isRetryableDriverCreate,
	launchDetached,
	nvidiaAccelerator,
	readTextFile,
	writeTextFile,
} from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { admissionFailures, runConformance } from "@sandbox-benchmarks/driver/conformance";
import type { Vendor, VendorDriverSpec, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	coverage,
	DISK_PROBE,
	defineVendorDriver,
	drainPages,
	instanceOfAny,
	MARKER_PREFIX,
	mapped,
	markerSpelling,
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
		expect(calls).toEqual(["create", "remove", "get"]); // no readiness get; then teardown
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

describe("readiness, continued", () => {
	test("a sandbox that fails during readiness is torn down", async () => {
		const { driver, calls, allocations } = bind({
			readyAfterGets: 1,
			faults: { failsDuringReadiness: true },
		});
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(calls).toContain("remove");
		expect(allocations()).toBe(0);
	});

	test("a boot failure carries the vendor's detail; one its host gave up on is retryable once torn down", async () => {
		for (const retryCreate of [false, true]) {
			const world = memoryVendor({ readyAfterGets: 1, faults: { failsDuringReadiness: true } });
			const vendor: Vendor<MemoryRow, MemoryRow> = {
				...world.vendor,
				control: {
					...world.vendor.control,
					get: async (id, op) => {
						const record = await world.vendor.control.get(id, op);
						return record?.phase === "failed"
							? { ...record, detail: "rootfs build corrupted", retryCreate }
							: record;
					},
				},
			};
			const failure = await moduleOver(() => vendor)
				.driver(context)
				.create(request)
				.catch((caught) => caught);
			expect(failure).toMatchObject({ code: "create-failed" });
			expect(describeDriverFailure(failure)).toContain("rootfs build corrupted");
			expect(isRetryableDriverCreate(failure)).toBe(retryCreate);
			expect(world.allocations()).toBe(0);
		}
	});

	test("a held sandbox observed gone during readiness is never sent a delete", async () => {
		const world = memoryVendor({ readyAfterGets: 1 });
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: { ...world.vendor.control, get: async () => null },
		};
		const driver = moduleOver(() => vendor).driver(context);
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(world.calls).not.toContain("remove");
	});

	test("does not accept readiness observed beyond its deadline", async () => {
		const { driver, allocations } = bind(
			{ readyAfterGets: 1, latencyMs: 30 },
			{ timing: { pollMs: 0, readyTimeoutMs: 5, deleteTimeoutMs: 1_000 } },
		);
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(allocations()).toBe(0);
	});

	test("the caller's cancellation ends a readiness wait and the allocation is still removed", async () => {
		const { driver, allocations } = bind(
			{ readyAfterGets: 1_000 },
			{ timing: { pollMs: 5, readyTimeoutMs: 10_000, deleteTimeoutMs: 1_000 } },
		);
		const control = new AbortController();
		setTimeout(() => control.abort(new Error("caller gave up")), 20);
		const started = performance.now();
		const failure = await driver.create(request, { signal: control.signal }).catch((e) => e);
		expect(failure).toBeInstanceOf(Error);
		expect(performance.now() - started).toBeLessThan(5_000);
		expect(allocations()).toBe(0);
	});
});

describe("server-side readiness wait", () => {
	test("replaces the readiness poll: readiness is observed when the vendor reports it", async () => {
		const { driver, calls } = bind(
			{ readyAfterGets: 1_000, settles: true },
			// A poll interval no test could wait out: only the server-side wait can observe readiness.
			{ timing: { pollMs: 60_000, readyTimeoutMs: 120_000, deleteTimeoutMs: 1_000 } },
		);
		const session = await driver.create(request);
		expect(calls).toEqual(["create", "settle"]);
		expect((await session.exec("sh -c 'echo out'")).stdout).toBe("out\n");
		await session.destroy();
	});

	test("a wait that settles on a failure is classified and torn down", async () => {
		const { driver, calls, allocations } = bind({
			readyAfterGets: 1,
			settles: true,
			faults: { failsDuringReadiness: true },
		});
		const failure = await driver.create(request).catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(describeDriverFailure(failure)).toContain("entered failed before readiness");
		expect(calls).toContain("remove");
		expect(allocations()).toBe(0);
	});

	test("a wait that ends early is asked again", async () => {
		const world = memoryVendor({ readyAfterGets: 3 });
		let waits = 0;
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				// The server-side hold expires twice before the sandbox runs.
				settle: (id, op) => {
					waits += 1;
					return world.vendor.control.get(id, op);
				},
			},
		};
		await (
			await moduleOver(() => vendor)
				.driver(context)
				.create(request)
		).destroy();
		expect(waits).toBe(3);
	});

	test("the kit's readiness deadline bounds a wait the vendor never ends", async () => {
		const world = memoryVendor({ readyAfterGets: 1_000 });
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: { ...world.vendor.control, settle: () => new Promise(() => {}) },
		};
		const driver = moduleOver(() => vendor, {
			timing: { pollMs: 0, readyTimeoutMs: 30, deleteTimeoutMs: 1_000 },
		}).driver(context);
		const failure = await driver.create(request).catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(describeDriverFailure(failure)).toContain("not ready within 30ms");
		expect(world.allocations()).toBe(0);
	});
});

describe("allocation before attach", () => {
	class QuotaError extends Error {}
	const refusing = (
		world: ReturnType<typeof memoryVendor>,
		attach: Vendor<MemoryRow, MemoryRow>["data"]["attach"],
	) => ({
		...world.vendor,
		control: {
			...world.vendor.control,
			refused: (error: unknown) =>
				instanceOfAny(QuotaError)(error) ? { retryable: true } : undefined,
		},
		data: { ...world.vendor.data, attach },
	});

	test("an attach failure the vendor would call a refusal still tears the allocation down", async () => {
		const world = memoryVendor();
		const driver = moduleOver(() =>
			refusing(world, () => {
				throw new QuotaError("quota exceeded while attaching");
			}),
		).driver(context);
		const failure = await driver.create(request).catch((e) => e);
		expect(failure).toMatchObject({ code: "create-failed" });
		// Never classified as a refusal: something was allocated.
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect(world.calls).toContain("remove");
		expect(world.allocations()).toBe(0);
	});

	test("an attempt aborted right after create tears the allocation down", async () => {
		const world = memoryVendor();
		const control = new AbortController();
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				create: async (attempt, op) => {
					const created = await world.vendor.control.create(attempt, op);
					control.abort(new Error("caller gave up"));
					return created;
				},
			},
		};
		const driver = moduleOver(() => vendor).driver(context);
		await expect(driver.create(request, { signal: control.signal })).rejects.toBeInstanceOf(Error);
		expect(world.allocations()).toBe(0);
	});
});

describe("cleanup confirmation", () => {
	test("a held session is sent its delete first, and an acknowledged delete is not removal", async () => {
		const { driver, calls, allocations } = bind({ removalAfterGets: 1 });
		const session = await driver.create(request);
		calls.length = 0;
		await session.destroy();
		expect(calls).toEqual(["remove", "get", "get"]);
		expect(allocations()).toBe(0);
		calls.length = 0;
		await session.destroy(); // convergent: never deleted again
		expect(calls).not.toContain("remove");
	});

	test("destroy-by-id observes before it deletes", async () => {
		const { driver, calls, allocations } = bind();
		const session = await driver.create(request);
		calls.length = 0;
		await driver.destroyById?.(session.sandboxRef);
		expect(calls).toEqual(["get", "remove", "get"]);
		expect(allocations()).toBe(0);
	});

	test("a delete that proves removal ends teardown without further polling", async () => {
		const { driver, calls } = bind({ removal: "removed" });
		const session = await driver.create(request);
		calls.length = 0;
		await session.destroy();
		expect(calls).toEqual(["remove"]);
	});

	test("removal is read at the module's own cleanup interval, apart from readiness", async () => {
		const { driver } = bind(
			{ readyAfterGets: 3, removalAfterGets: 2 },
			{ timing: { pollMs: 0, deletePollMs: 40, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 } },
		);
		const booting = performance.now();
		const session = await driver.create(request);
		expect(performance.now() - booting).toBeLessThan(40);
		const deleting = performance.now();
		await session.destroy();
		expect(performance.now() - deleting).toBeGreaterThanOrEqual(75);
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

describe("cleanup confirmation, continued", () => {
	test("a sandbox already deleting is observed to removal, never deleted again", async () => {
		const { driver, vendor, calls } = bind({ removalAfterGets: 1 });
		const session = await driver.create(request);
		await vendor.control.remove(session.sandboxRef.id, { signal: new AbortController().signal });
		calls.length = 0;
		await driver.destroyById?.(session.sandboxRef);
		expect(calls).toEqual(["get", "get"]);
	});

	test("bounds deletion from the first control request", async () => {
		const { driver, calls } = bind(
			{ latencyMs: 30 },
			{ timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 5 } },
		);
		const session = await driver.create(request);
		calls.length = 0;
		await expect(driver.destroyById?.(session.sandboxRef)).rejects.toThrow();
		expect(calls).not.toContain("remove");
	});

	test("rejects a removal response beyond the budget before the timeout callback runs", async () => {
		const world = memoryVendor({ removal: "removed" });
		const busy: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				get: async (id, op) => {
					// Block the event loop past the budget, so the timer cannot fire first.
					const until = Date.now() + 20;
					while (Date.now() < until) {}
					return world.vendor.control.get(id, op);
				},
			},
		};
		const driver = moduleOver(() => busy, {
			timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 5 },
		}).driver(context);
		const session = await driver.create(request);
		await world.vendor.control.remove(session.sandboxRef.id, {
			signal: new AbortController().signal,
		});
		await expect(driver.destroyById?.(session.sandboxRef)).rejects.toThrow();
	});
});

describe("a refused removal request", () => {
	class ConflictError extends Error {}
	/** The memory vendor whose deletes are refused `refusals` times with `error` first. */
	const refusingDeletes = (refusals: number, error: () => Error, extra: Partial<Spec> = {}) => {
		const world = memoryVendor();
		let left = refusals;
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				remove: async (id, op) => {
					world.calls.push("remove");
					if (left-- > 0) throw error();
					return world.vendor.control.remove(id, op);
				},
				transient: instanceOfAny(ConflictError),
			},
		};
		return { ...world, driver: moduleOver(() => vendor, extra).driver(context) };
	};

	test("a transient refusal is asked again after the next read, at the cleanup cadence", async () => {
		const { driver, calls, allocations } = refusingDeletes(
			2,
			() => new ConflictError("snapshot in progress"),
			{ timing: { pollMs: 0, deletePollMs: 20, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 } },
		);
		const session = await driver.create(request);
		calls.length = 0;
		const started = performance.now();
		await session.destroy();
		expect(performance.now() - started).toBeGreaterThanOrEqual(35);
		// The memory vendor's own remove logs a second "remove" for the accepted request.
		expect(calls).toEqual(["remove", "get", "get", "remove", "get", "remove", "remove", "get"]);
		expect(allocations()).toBe(0);
	});

	test("a definitive refusal ends teardown at once", async () => {
		const { driver, calls, allocations } = refusingDeletes(1, () => new Error("forbidden"));
		const session = await driver.create(request);
		calls.length = 0;
		const failure = await session.destroy().catch((caught: unknown) => caught);
		expect(failure).toMatchObject({ code: "destroy-failed" });
		expect(describeDriverFailure(failure)).toContain("forbidden");
		expect(calls).toEqual(["remove"]);
		expect(allocations()).toBe(1);
	});

	test("a budget that ends on a transient refusal reports the vendor's refusal", async () => {
		const { driver, allocations } = refusingDeletes(
			1_000,
			() => new ConflictError("snapshot in progress"),
			{ timing: { pollMs: 0, deletePollMs: 5, readyTimeoutMs: 1_000, deleteTimeoutMs: 40 } },
		);
		const session = await driver.create(request);
		const failure = await session.destroy().catch((caught: unknown) => caught);
		expect(describeDriverFailure(failure)).toContain("snapshot in progress");
		expect(allocations()).toBe(1);
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

	test("a sandbox listed twice fails closed: the listing shifted under its cursor", async () => {
		const world = memoryVendor({ pageSize: 1, foreign: 2 });
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				page: async (cursor, op) => {
					const page = await world.vendor.control.page(cursor, op);
					return { ...page, records: page.records.map((record) => ({ ...record, id: "mem-1" })) };
				},
			},
		};
		const op = { signal: new AbortController().signal };
		await expect(
			moduleOver(() => vendor)
				.driver(context)
				.inventory?.list(),
		).rejects.toThrow();
		await expect(
			drainPages("novita", (cursor) => vendor.control.page(cursor, op), op),
		).rejects.toThrow("novita listing returned a duplicate sandbox id");
	});

	test("a listing longer than the vendor's page cap fails closed", async () => {
		const { driver } = bind({ pageSize: 1, foreign: 3 }, { pageCap: 2 });
		await expect(driver.inventory?.list()).rejects.toThrow();
		const { driver: wider } = bind({ pageSize: 1, foreign: 3 }, { pageCap: 3 });
		expect((await wider.inventory?.list())?.foreignCount).toBe(3);
	});

	test("a stopped foreign sandbox is not capacity; a stopped owned one is still a leftover", async () => {
		const world = memoryVendor({ foreign: 2 });
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				page: async (cursor, op) => {
					const page = await world.vendor.control.page(cursor, op);
					return {
						...page,
						records: page.records.map((record) => ({ ...record, stopped: record.id !== "mem-2" })),
					};
				},
			},
		};
		const driver = moduleOver(() => vendor).driver(context);
		const session = await driver.create(request);
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef],
			foreignCount: 1,
		});
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

	test("an allocation that becomes visible only after a delay is still found and removed", async () => {
		const { driver, calls, allocations } = bind(
			{ faults: { createAmbiguous: true, ambiguousHiddenForListings: 1 } },
			{ recovery: { absenceConfirmationMs: 20 } },
		);
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(calls.filter((call) => call === "page").length).toBeGreaterThanOrEqual(2);
		expect(allocations()).toBe(0);
	});

	test("recovery tears down every attributed sandbox together and surfaces every failure", async () => {
		const world = memoryVendor();
		const op = { signal: new AbortController().signal };
		const marker = `${MARKER_PREFIX}twice`;
		await world.vendor.control.create({ request, marker }, op);
		await world.vendor.control.create({ request, marker }, op);
		const refusing: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				remove: async (id) => {
					throw new Error(`delete of ${id} refused`);
				},
			},
		};
		const spec = moduleOver(() => refusing).specFor(context);
		const failure = await spec.createRecovery
			?.cleanup(spec.compute, { kind: "marker", key: "novita-marker", value: marker }, {})
			.catch((e) => e);
		expect(failure).toBeInstanceOf(AggregateError);
		expect((failure as AggregateError).errors.map((error: Error) => error.message).sort()).toEqual([
			"delete of mem-1 refused",
			"delete of mem-2 refused",
		]);
	});

	test("a listed allocation already gone at teardown contradicts the prior absence", async () => {
		const world = memoryVendor();
		const marker = `${MARKER_PREFIX}vanished`;
		const vanishing: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				page: async () => ({
					records: [{ id: "mem-9", phase: "ready", marker, raw: {} as MemoryRow }],
				}),
				get: async () => null,
			},
		};
		const spec = moduleOver(() => vanishing).specFor(context);
		expect(
			await spec.createRecovery?.cleanup(
				spec.compute,
				{ kind: "marker", key: "novita-marker", value: marker },
				{},
			),
		).toEqual({ status: "absent", contradictedPriorAbsence: true });
	});

	test("recovery refuses a differently marked or unparseable record, even on a dedicated account", async () => {
		const world = memoryVendor({ account: "dedicated" });
		const marker = `${MARKER_PREFIX}mine`;
		const answering = (
			records: { id: string; marker?: string }[],
		): Vendor<MemoryRow, MemoryRow> => ({
			...world.vendor,
			control: {
				...world.vendor.control,
				find: async () => ({
					records: records.map((record) => ({ ...record, phase: "ready", raw: {} as MemoryRow })),
				}),
			},
		});
		const cleanup = (vendor: Vendor<MemoryRow, MemoryRow>) => {
			const spec = moduleOver(() => vendor, { account: "dedicated" }).specFor(context);
			return spec.createRecovery?.cleanup(
				spec.compute,
				{ kind: "marker", key: "novita-marker", value: marker },
				{},
			);
		};
		await expect(
			cleanup(answering([{ id: "mem-1", marker: `${MARKER_PREFIX}other` }])),
		).rejects.toThrow(/unrelated/);
		await expect(cleanup(answering([{ id: "not a sandbox id" }]))).rejects.toThrow();
		expect(world.calls).not.toContain("remove");
	});

	test("a dedicated account without a marker lookup is refused when bound", () => {
		const world = memoryVendor();
		const module = moduleOver(() => world.vendor, { account: "dedicated" });
		expect(() => module.specFor(context)).toThrow(/needs control.find/);
		expect(() => module.driver(context)).toThrow(
			expect.objectContaining({ code: "vendor-contract-violation" }),
		);
	});

	test("where a lookup cannot prove absence, an ambiguous create no lookup finds stays held", async () => {
		const hidden = { faults: { createAmbiguous: true, ambiguousHiddenForListings: 1_000 } };
		const unproven = { recovery: { absenceConfirmationMs: 1, provesAbsence: false } };
		// The default reads an empty lookup as absence; a vendor that cannot prove it keeps the attempt.
		await expect(bind(hidden).driver.create(request)).rejects.toMatchObject({
			code: "create-failed",
		});
		await expect(bind(hidden, unproven).driver.create(request)).rejects.toBeInstanceOf(
			FailedCreateCleanupError,
		);
		// An allocation the lookup does find is torn down, which resolves the attempt.
		const found = bind({ faults: { createAmbiguous: true } }, unproven);
		await expect(found.driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(found.allocations()).toBe(0);
		// A refusal before allocation proves there is nothing to find.
		const refused = bind({ faults: { createRefused: { retryable: false } } }, unproven);
		await expect(refused.driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(refused.calls).toEqual(["create"]);
	});

	test("a step after create whose teardown also fails keeps its cleanup by the vendor's id", async () => {
		// Attach is what would make the allocation findable (a rename), so no marker lookup can.
		for (const step of ["attach", "admit", "prepare"] as const) {
			const world = memoryVendor();
			let refuseDeletes = true;
			const vendor: Vendor<MemoryRow, MemoryRow> = {
				control: {
					...world.vendor.control,
					remove: async (id, op) => {
						if (refuseDeletes) throw new Error("delete refused");
						return world.vendor.control.remove(id, op);
					},
					page: async () => ({ records: [] }),
					...(step === "admit" && { admit: () => "wrong revision" }),
				},
				data: {
					...world.vendor.data,
					attach: (record, op) => {
						if (step === "attach") throw new Error("rename failed");
						return world.vendor.data.attach(record, op);
					},
					...(step === "prepare" && {
						prepare: async () => {
							throw new Error("keepalive never started");
						},
					}),
				},
			};
			const failure = await moduleOver(() => vendor, {
				recovery: { absenceConfirmationMs: 1, provesAbsence: false },
			})
				.driver(context)
				.create(request)
				.catch((caught) => caught);
			expect(failure).toBeInstanceOf(FailedCreateCleanupError);
			expect(failure.locator).toEqual({ kind: "id", value: "mem-1" });
			expect(isRetryableDriverCreate(failure)).toBe(false);
			expect(world.allocations()).toBe(1);
			refuseDeletes = false;
			await (failure as FailedCreateCleanupError).cleanup();
			expect(world.allocations()).toBe(0);
		}
	});

	test("a boot the host gave up on whose teardown fails is a held cleanup, not a retry", async () => {
		const world = memoryVendor({ readyAfterGets: 1, faults: { failsDuringReadiness: true } });
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				get: async (id, op) => {
					const record = await world.vendor.control.get(id, op);
					return record?.phase === "failed" ? { ...record, retryCreate: true } : record;
				},
				remove: async () => {
					throw new Error("delete refused");
				},
			},
		};
		const failure = await moduleOver(() => vendor)
			.driver(context)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toBeInstanceOf(FailedCreateCleanupError);
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect(world.allocations()).toBe(1);
	});

	test("a refusal before allocation skips recovery and carries retryability", async () => {
		const { driver, calls } = bind({ faults: { createRefused: { retryable: true } } });
		const error = await driver.create(request).catch((caught) => caught);
		expect(isRetryableDriverCreate(error)).toBe(true);
		expect(calls).toEqual(["create"]);
	});

	test("a transient failure is reconciled before it is marked retryable", async () => {
		class GatewayError extends Error {}
		const world = memoryVendor({ faults: { createAmbiguous: true } });
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				create: (attempt, op) =>
					world.vendor.control.create(attempt, op).catch((cause: unknown) => {
						throw new GatewayError("502 after acceptance", { cause });
					}),
				refused: undefined,
				transient: instanceOfAny(GatewayError),
			},
		};
		const driver = moduleOver(() => vendor).driver(context);
		const error = await driver.create(request).catch((caught) => caught);
		expect(isRetryableDriverCreate(error)).toBe(true);
		expect(world.calls).toContain("page"); // reconciled, not treated as a refusal
		expect(world.allocations()).toBe(0);
		const retried = await driver.create(request);
		expect(world.allocations()).toBe(1); // the retry allocates exactly once
		await retried.destroy();
	});

	test("the recovery locator carries the vendor's own marker key", async () => {
		const world = memoryVendor({ faults: { createAmbiguous: true } });
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				// Recovery cannot list the account, so the double fault exposes the locator it held.
				page: async () => {
					throw new Error("listing unavailable");
				},
			},
		};
		const driver = moduleOver(() => vendor, { markerKey: "attempt-label" }).driver(context);
		const failure = await driver.create(request).catch((caught) => caught);
		expect(failure.locator).toMatchObject({
			kind: "marker",
			key: "attempt-label",
			value: expect.stringMatching(new RegExp(`^${MARKER_PREFIX}`)),
		});
	});

	test("the recovery locator prints the marker as the vendor spells it, and recovers by it", async () => {
		const spelling = markerSpelling("bench:");
		const world = memoryVendor({ faults: { createAmbiguous: true } });
		// The vendor stores the spelled value; the adapter reads its records back through the spelling.
		const spelled = (records: readonly VendorRecord<MemoryRow>[]) =>
			records.map(({ marker, ...record }) => {
				const read = marker === undefined ? undefined : spelling.fromVendor(marker);
				return { ...record, ...(read && { marker: read }) };
			});
		const vendor = (listing: boolean): Vendor<MemoryRow, MemoryRow> => ({
			...world.vendor,
			control: {
				...world.vendor.control,
				create: (attempt, op) =>
					world.vendor.control.create(
						{ ...attempt, marker: spelling.toVendor(attempt.marker) },
						op,
					),
				page: async (cursor, op) => {
					if (!listing) throw new Error("listing unavailable");
					const page = await world.vendor.control.page(cursor, op);
					return { ...page, records: spelled(page.records) };
				},
			},
		});
		const failing = moduleOver(() => vendor(false), { markerSpelling: spelling });
		const failure = await failing
			.driver(context)
			.create(request)
			.catch((caught) => caught);
		const { locator } = failure;
		expect(locator).toEqual({
			kind: "marker",
			key: "novita-marker",
			value: expect.stringMatching(/^bench:[0-9a-f-]{36}$/),
		});
		expect(failure.message).toContain(`by marker novita-marker=${locator.value} `);
		expect(world.live().map((row) => row.marker)).toEqual([locator.value]);
		// The held cleanup reads the spelled locator back to the kit marker and finds the record.
		const recovering = moduleOver(() => vendor(true), { markerSpelling: spelling }).specFor(
			context,
		);
		expect(await recovering.createRecovery?.cleanup(recovering.compute, locator, {})).toEqual({
			status: "destroyed",
		});
		expect(world.live()).toHaveLength(0);
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

	test("the vendor's preparation runs after readiness; its refusal or failure tears down", async () => {
		const prepared: string[] = [];
		for (const [verdict, code] of [
			[{ status: "unsupported", detail: "reports 4096 MB" }, "invalid-create-request"],
			[new Error("keepalive never started"), "create-failed"],
		] as const) {
			const world = memoryVendor({ readyAfterGets: 1 });
			const driver = moduleOver(() => ({
				...world.vendor,
				data: {
					...world.vendor.data,
					prepare: async ({ record }, input) => {
						prepared.push(`${record.phase} ${input.spec.memoryGb}`);
						if (verdict instanceof Error) throw verdict;
						return verdict;
					},
				},
			})).driver(context);
			const failure = await driver.create(request).catch((caught) => caught);
			expect(failure).toMatchObject({ code });
			if (code === "invalid-create-request")
				expect(describeDriverFailure(failure)).toContain("reports 4096 MB");
			expect(world.allocations()).toBe(0);
		}
		expect(prepared).toEqual(["ready 8", "ready 8"]);
	});

	test("a declared disk proof covers a mapped disk at its mount, within the allowance", async () => {
		const withProof = (allowanceGb?: number) =>
			bind(
				{ diskGb: 10, mounts: { "/mnt/benchmark-volume": 39.6 } },
				{
					coverage: mapped(),
					diskProof: { path: "/mnt/benchmark-volume", ...(allowanceGb && { allowanceGb }) },
				},
			);
		const honored = withProof(1);
		await (await honored.driver.create(request)).destroy();
		const short = withProof();
		await expect(short.driver.create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
		});
		expect(short.allocations()).toBe(0);
		// The allowance can scale with the request instead (1% of 40 GiB covers the 0.4 GiB gap).
		const relative = (allowanceRatio: number) =>
			bind(
				{ mounts: { "/mnt/benchmark-volume": 39.6 } },
				{ coverage: mapped(), diskProof: { path: "/mnt/benchmark-volume", allowanceRatio } },
			);
		await (await relative(0.01).driver.create(request)).destroy();
		await expect(relative(0.005).driver.create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
		});
		// A mapped disk without a declared proof is trusted to the create, whatever the root reports.
		await (await bind({ diskGb: 10 }, { coverage: mapped() }).driver.create(request)).destroy();
	});

	test("a reported disk proof is the vendor's preparation, with no guest df", async () => {
		const commands: string[] = [];
		const reported = (reportsGb: number) => {
			const world = memoryVendor({ diskGb: 1 });
			const driver = moduleOver(
				() => ({
					...world.vendor,
					data: {
						...world.vendor.data,
						exec: (native, command, options) => {
							commands.push(command);
							return world.vendor.data.exec(native, command, options);
						},
						prepare: async (_handle, input) =>
							reportsGb >= (input.spec.diskGb ?? 0)
								? { status: "honored" }
								: { status: "unsupported", detail: `reports ${reportsGb} GiB` },
					},
				}),
				{ diskProof: "reported" },
			).driver(context);
			return { world, driver };
		};
		const honored = reported(40);
		await (await honored.driver.create(request)).destroy();
		expect(commands).not.toContain(DISK_PROBE);
		const short = reported(30);
		await expect(short.driver.create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
		});
		expect(short.world.allocations()).toBe(0);
		// Only a vendor that prepares can report its disk.
		expect(() =>
			moduleOver(() => memoryVendor().vendor, { diskProof: "reported" }).specFor(context),
		).toThrow(/reported disk proof is proven by data.prepare/);
	});

	test("the vendor's reported artifact reaches the session after the disk proof", async () => {
		const world = memoryVendor();
		const driver = moduleOver(() => ({
			...world.vendor,
			data: {
				...world.vendor.data,
				prepare: async () => ({ status: "honored", reportedArtifact: resolvedArtifact }),
			},
		})).driver(context);
		const session = await driver.create(request);
		expect(session.reportedArtifact).toEqual(resolvedArtifact);
		await session.destroy();
		// A disk the guest does not expose still refuses the allocation the vendor reported.
		const small = memoryVendor({ diskGb: 10 });
		const refused = moduleOver(() => ({
			...small.vendor,
			data: {
				...small.vendor.data,
				prepare: async () => ({ status: "honored", reportedArtifact: resolvedArtifact }),
			},
		})).driver(context);
		await expect(refused.create(request)).rejects.toMatchObject({ code: "invalid-create-request" });
	});

	test("a zero capacity reading is a broken probe, not a small disk", async () => {
		const { driver, allocations } = bind({ diskGb: 0 });
		const failure = await driver.create(request).catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(describeDriverFailure(failure)).toContain("disk capacity probe failed");
		expect(allocations()).toBe(0);
	});

	test("an exit the vendor never reported stays unknown", async () => {
		const world = memoryVendor();
		const driver = moduleOver(() => ({
			...world.vendor,
			data: {
				...world.vendor.data,
				exec: async (native, command) => {
					const { exitCode, ...output } = await world.vendor.data.exec(native, command);
					return command === "killed" ? output : { exitCode, ...output };
				},
			},
		})).driver(context);
		const session = await driver.create(request);
		expect((await session.exec("killed")).exit.kind).toBe("unknown");
		await session.destroy();
	});

	test("a module's cross-axis refusal rejects the shape before any vendor call", async () => {
		const { driver, calls } = bind(
			{},
			{
				unsupported: ({ spec }) =>
					spec.memoryGb === spec.vcpus * 2 ? undefined : "memory is coupled to 2 GiB per vCPU",
			},
		);
		const failure = await driver
			.create({ ...request, spec: { ...request.spec, memoryGb: 16 } })
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "invalid-create-request" });
		expect(describeDriverFailure(failure)).toContain("coupled to 2 GiB per vCPU");
		expect(calls).toEqual([]);
		await (await driver.create(request)).destroy();
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

	test("an uncapped execution policy with no durable route passes through unchanged", async () => {
		const { module, driver } = bind({}, { execution: { syncCapMs: null, durable: "none" } });
		expect(module.execution).toEqual({ syncCapMs: null, durable: "none" });
		const session = await driver.create(request);
		expect((await session.exec("sh -c 'exit 0'")).exit).toEqual({ kind: "exited", code: 0 });
		await session.destroy();
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

	test("cost evidence and a harness-owned budget reach the policy as checked snapshots", async () => {
		const captured: string[] = [];
		const sdk = { ...provenance };
		const costEvidence = {
			sdk,
			captureAfterTeardown: async (input: { sandboxId: string }) => {
				captured.push(input.sandboxId);
				return { status: "unavailable", reason: "memory vendor has no billing" } as never;
			},
		};
		const { module } = bind(
			{},
			{ createBudget: { owner: "harness", timeoutMs: 300_000 }, costEvidence },
		);
		// The harness reads the module's policy, which the driver boundary snapshotted and froze:
		// a later mutation of the author's record cannot change it.
		sdk.version = "mutated-after-definition";
		expect(module.costEvidence).not.toBe(costEvidence);
		expect(Object.isFrozen(module.costEvidence)).toBe(true);
		expect(module.costEvidence?.sdk).toEqual(provenance);
		expect(module.createBudget).toEqual({ owner: "harness", timeoutMs: 300_000 });
		await module.costEvidence?.captureAfterTeardown({ sandboxId: "mem-1" } as never);
		expect(captured).toEqual(["mem-1"]);
		// …and the boundary refuses a capability the harness could not invoke.
		expect(() =>
			moduleOver(() => memoryVendor().vendor, { costEvidence: { sdk: provenance } as never }),
		).toThrow(/cost evidence/);
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

describe("bounded control calls", () => {
	test("a hung control plane cannot stall a probe or a snapshot past its bound", async () => {
		const world = memoryVendor();
		const hung: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: { ...world.vendor.control, get: () => new Promise(() => {}) },
			snapshots: { create: () => new Promise(() => {}), delete: () => new Promise(() => {}) },
		};
		const driver = moduleOver(() => hung, {
			timing: {
				pollMs: 0,
				readyTimeoutMs: 1_000,
				deleteTimeoutMs: 1_000,
				controlTimeoutMs: 20,
				snapshotTimeoutMs: 20,
			},
		}).driver(context);
		const ref = { provider: "novita" as const, id: "mem-1" };
		const started = performance.now();
		await expect(driver.probes?.observe(ref)).rejects.toThrow();
		await expect(driver.probes?.describe?.(ref)).rejects.toThrow();
		await expect(driver.snapshots?.delete("sh-1")).rejects.toThrow();
		expect(performance.now() - started).toBeLessThan(1_000);
	});
});

describe("the data plane without native files", () => {
	test("files fall back to the kit's shell and the filesystem is not claimed", async () => {
		const world = memoryVendor();
		const { attach, exec } = world.vendor.data;
		const driver = moduleOver(() => ({ ...world.vendor, data: { attach, exec } })).driver(context);
		const session = await driver.create(request);
		expect(session.files).toBeUndefined();
		await writeTextFile(session, "/tmp/through-the-shell", "fallback payload");
		expect(await readTextFile(session, "/tmp/through-the-shell")).toBe("fallback payload");
		await session.destroy();
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
	vendorContract("memoryVendor (shared, with a marker lookup)", () => ({
		vendor: memoryVendor({ lookup: true, readyAfterGets: 2 }).vendor,
		account: "shared",
	}));
	vendorContract("memoryVendor (shared, with a server-side readiness wait)", () => ({
		vendor: memoryVendor({ settles: true, readyAfterGets: 2 }).vendor,
		account: "shared",
	}));

	test("memoryVendor's dedicated replay is idempotent, even once the resource is gone", async () => {
		const { vendor } = memoryVendor({ account: "dedicated" });
		const op = { signal: new AbortController().signal };
		const marker = `${MARKER_PREFIX}replay`;
		const first = await vendor.control.find?.(marker, undefined, op);
		const id = first?.records[0]?.id ?? "";
		expect((await vendor.control.find?.(marker, undefined, op))?.records.map((r) => r.id)).toEqual([
			id,
		]);
		await vendor.control.remove(id, op);
		await vendor.control.get(id, op);
		const replayed = await vendor.control.find?.(marker, undefined, op);
		expect(replayed?.records.map((record) => [record.id, record.phase])).toEqual([[id, "gone"]]);
	});
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
