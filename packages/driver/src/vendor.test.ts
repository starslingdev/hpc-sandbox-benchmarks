import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import {
	describeDriverFailure,
	isFailedCreateCleanupError,
	launchDetached,
	readTextFile,
	writeTextFile,
} from "@sandbox-benchmarks/driver";
import { admissionFailures, runConformance } from "@sandbox-benchmarks/driver/conformance";
import type { Vendor, VendorDriverSpec } from "@sandbox-benchmarks/driver/vendor";
import { defineVendorDriver, MARKER_PREFIX, mapped } from "@sandbox-benchmarks/driver/vendor";
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

describe("end to end through the module's entry point", () => {
	test("a create resolving after cancellation retains its marker until the allocation is visible", async () => {
		for (const provesAbsence of [undefined, true]) {
			const world = memoryVendor();
			const cancel = new AbortController();
			let visible = false;
			const vendor = {
				...world.vendor,
				control: {
					...world.vendor.control,
					create: async (...args: Parameters<typeof world.vendor.control.create>) => {
						const record = await world.vendor.control.create(...args);
						cancel.abort(new Error("deadline elapsed while create was in flight"));
						return record;
					},
					page: (...args: Parameters<typeof world.vendor.control.page>) =>
						visible ? world.vendor.control.page(...args) : Promise.resolve({ records: [] }),
				},
			};
			const driver = moduleOver(() => vendor, {
				recovery: { absenceConfirmationMs: 1, provesAbsence },
			}).driver(context);
			const failure = await driver
				.create(request, { signal: cancel.signal })
				.catch((error: unknown) => error);
			if (!isFailedCreateCleanupError(failure)) throw new Error("late create has no cleanup owner");
			await expect(failure.cleanup()).rejects.toThrow();
			expect(world.allocations()).toBe(1);
			visible = true;
			await failure.cleanup();
			expect(world.allocations()).toBe(0);
		}
	});

	test("a timed-out create stays owned while the server accepts it after empty recovery scans", async () => {
		const world = memoryVendor();
		let accept: (() => Promise<unknown>) | undefined;
		const vendor = {
			...world.vendor,
			control: {
				...world.vendor.control,
				create: async (...args: Parameters<typeof world.vendor.control.create>) => {
					accept = () => world.vendor.control.create(...args);
					throw new TypeError("create response timed out before acceptance became visible");
				},
			},
		};
		const driver = moduleOver(() => vendor).driver(context);
		const failure = await driver.create(request).catch((error: unknown) => error);
		if (!isFailedCreateCleanupError(failure)) throw new Error("lost create has no cleanup owner");
		await expect(failure.cleanup()).rejects.toThrow();
		expect(world.allocations()).toBe(0);
		await accept?.();
		expect(world.allocations()).toBe(1);
		await failure.cleanup();
		expect(world.allocations()).toBe(0);
		expect(world.calls.filter((call) => call === "create")).toHaveLength(1);
	});

	test("a session lives its whole lifecycle, after recovering an ambiguous create", async () => {
		const { module, calls, allocations, live } = bind({
			readyAfterGets: 2,
			pageSize: 1,
			foreign: 1,
			faults: { createAmbiguous: true },
		});
		const driver = module.driver(context);

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

vendorContract(
	"memory vendor",
	moduleOver(() => memoryVendor().vendor),
	() => memoryVendor().vendor,
);
