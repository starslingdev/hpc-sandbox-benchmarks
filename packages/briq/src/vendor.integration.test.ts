// briq tested at the vendor seam: the adapter's translation, the port contract over a fake REST
// router, and sessions through the package's own module. Kit behaviour (convergence, deadlines,
// the inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { restStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import briq from "./index.ts";
import { briqName, briqPhase, briqVendor, coveringSize } from "./vendor.ts";

const IMAGE = "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8";
const MARKER = "benchmark-00000000-0000-4000-8000-000000000001";
const context: DriverContext<"briq"> = {
	env: { BRIQ_API_KEY: "bk_test", BRIQ_API_URL: "https://briq.test" },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: IMAGE },
};
const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "image", ref: IMAGE },
	deadlineMs: 300_000,
};
const op = { signal: new AbortController().signal };

const json = (value: unknown, status = 200) => Response.json(value, { status });
const failure = (status: number, code: string, message: string) =>
	json({ error: { code, message } }, status);

interface Row {
	readonly id: string;
	readonly name: string;
	state: string;
	size: string;
	labels: Record<string, string>;
	gets: number;
}

/**
 * A fake briq API: a create answers `creating` and a later GET reaches `running`; a repeated
 * `Idempotency-Key` repeats the first answer; a DELETE destroys at once, and a destroyed briq stays
 * listed (`all=true`) and readable.
 */
function briqServer(
	options: {
		readonly readyAfterGets?: number;
		/** The first create makes its briq and then loses its answer. */
		readonly ambiguousFirstCreate?: boolean;
		/** The API reports this size whatever was asked. */
		readonly allocates?: string;
		readonly truncate?: boolean;
		readonly timedOut?: boolean;
		/** Creates are refused with this status and code. */
		readonly refuseCreate?: { status: number; code: string };
	} = {},
) {
	let firstCreate = true;
	const replays = new Map<string, Row>();
	const view = ({ id, name, state, size, labels }: Row) => ({ id, name, state, size, labels });
	const stub = restStub<Row>(
		{
			"POST /v1/briqs": ({ body, headers, add }) => {
				if (options.refuseCreate)
					return failure(options.refuseCreate.status, options.refuseCreate.code, "refused");
				const key = headers.get("idempotency-key") ?? "";
				const replayed = replays.get(key);
				if (replayed)
					return { briqs: [{ ...view(replayed), state: "creating" }], outputs: {}, costLine: "" };
				const row = add({
					name: body.spec.name,
					state: (options.readyAfterGets ?? 0) > 0 ? "creating" : "running",
					size: options.allocates ?? body.spec.size,
					labels: body.spec.labels ?? {},
					gets: 0,
				});
				replays.set(key, row);
				const first = firstCreate;
				firstCreate = false;
				if (first && options.ambiguousFirstCreate)
					throw new TypeError("connection closed after remote acceptance");
				return { briqs: [view(row)], outputs: {}, recipe: null, costLine: "" };
			},
			"GET /v1/briqs": ({ rows }) => ({ briqs: [...rows.values()].map(view), costLine: "" }),
			"GET /v1/briqs/:id": ({ row }) => {
				row.gets += 1;
				if (row.state === "creating" && row.gets >= (options.readyAfterGets ?? 0))
					row.state = "running";
				return { briq: view(row), costLine: "" };
			},
			"DELETE /v1/briqs/:id": ({ row }) => {
				row.state = "destroyed";
				return { briq: view(row) };
			},
			"POST /v1/briqs/:id/exec": ({ body, run }): unknown => {
				const shell = (body.cmd as string[]).at(-1) ?? "";
				if (shell === "fixture")
					return {
						stdout: "out\n",
						stderr: "err\n",
						exitCode: 7,
						timedOut: false,
						truncated: false,
					};
				// The volume the create asked for, as the guest's df reports it (ext4 keeps back a little).
				const proof = /^df -Pk '?([^' ]+)/.exec(shell);
				if (proof) {
					const create = stub.calls.find((c) => c.method === "POST" && c.path === "/v1/briqs");
					const gb = (create?.body as { spec: { volume?: { gb: number } } } | undefined)?.spec
						.volume?.gb;
					const kb =
						proof[1] === "/" || gb === undefined ? 8_160_000 : Math.floor(gb * 0.97 * 1024 * 1024);
					return {
						stdout: `${kb}\n`,
						stderr: "",
						exitCode: 0,
						timedOut: false,
						truncated: false,
						costLine: "",
					};
				}
				const { stdout, stderr, exitCode } = run(shell);
				return {
					stdout,
					stderr,
					exitCode,
					timedOut: options.timedOut ?? false,
					truncated: options.truncate ?? false,
					costLine: "",
				};
			},
		},
		{
			newId: (n) => `bq_${String(n).padStart(12, "0")}`,
			missing: () => failure(404, "not_found", "briq not found"),
		},
	);
	return {
		...stub,
		creates: () => stub.calls.filter((call) => call.method === "POST" && call.path === "/v1/briqs"),
	};
}

const FAST: Partial<VendorTiming> = { pollMs: 0, readyTimeoutMs: 2_000, deleteTimeoutMs: 2_000 };
const vendorOver = (server: ReturnType<typeof briqServer>) => briqVendor(context, server.fetch);
const driverOver = (server: ReturnType<typeof briqServer>) =>
	vendorDriver(briq, context, { vendor: vendorOver(server), timing: FAST });

vendorContract("briq adapter", briq, () => vendorOver(briqServer()));

test("a request maps to the smallest size covering both axes", () => {
	expect(coveringSize(TARGET_SPEC)?.name).toBe("large");
	expect(coveringSize({ vcpus: 2, memoryGb: 4 })?.name).toBe("medium");
	expect(coveringSize({ vcpus: 1, memoryGb: 8 })?.name).toBe("large");
	expect(coveringSize({ vcpus: 32, memoryGb: 64 })).toBeUndefined();
});

test("a briq name is a DNS label of at most 32 characters, unique per marker", () => {
	const name = briqName(MARKER);
	expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	expect(name.length).toBeLessThanOrEqual(32);
	expect(briqName("benchmark-00000000-0000-4000-8000-000000000002")).not.toBe(name);
});

test("phases: sleeping keeps its disk and wakes on use; an exited process does not", () => {
	expect(briqPhase({ state: "creating" })).toBe("pending");
	expect(briqPhase({ state: "running" })).toBe("ready");
	expect(briqPhase({ state: "sleeping", stoppedReason: "idle" })).toBe("ready");
	expect(briqPhase({ state: "stopped", stoppedReason: "exited" })).toBe("failed");
	expect(briqPhase({ state: "destroying" })).toBe("deleting");
	expect(briqPhase({ state: "destroyed" })).toBe("gone");
	expect(briqPhase({ state: "error" })).toBe("failed");
});

test("a request that reached no HTTP status is transient, so a teardown asks again", () => {
	const { transient } = vendorOver(briqServer()).control;
	expect(transient?.(new TypeError("connection reset"))).toBe(true);
	expect(transient?.(new DOMException("bound expired", "TimeoutError"))).toBe(true);
	expect(transient?.(new DOMException("caller cancelled", "AbortError"))).toBe(false);
});

describe("briq end to end through its module", () => {
	test("a session creates the large size from the image, executes, and is destroyed", async () => {
		const server = briqServer({ readyAfterGets: 2 });
		const session = await driverOver(server).create(request);
		const call = server.creates()[0];
		expect(call?.headers.get("authorization")).toBe("Bearer bk_test");
		const body = call?.body as { stack: string; wait: boolean; spec: Record<string, unknown> };
		expect(body).toMatchObject({
			stack: "sandbox-benchmarks",
			wait: false,
			spec: {
				image: IMAGE,
				size: "large",
				cmd: ["sleep", "infinity"],
				// The image's own disk is small: the 40 GB target is a volume where the toolchain keeps its state.
				volume: { mount: "/var/lib/phoronix-test-suite", gb: 40 },
			},
		});
		const marker = (body.spec.labels as Record<string, string>)["benchmark-marker"];
		expect(marker).toMatch(/^benchmark-[0-9a-f-]{36}$/);
		// The marker is the create's Idempotency-Key, so a repeat is the same briq.
		expect(call?.headers.get("idempotency-key")).toBe(marker as string);
		expect(body.spec.name).toBe(briqName(marker as string));

		const result = await session.exec("fixture");
		expect(result.exit).toEqual({ kind: "exited", code: 7 });
		expect([result.stdout, result.stderr]).toEqual(["out\n", "err\n"]);
		// No file API: the kit serves files over exec.
		expect(session.files).toBeUndefined();
		await session.destroy();
		expect([...server.rows.values()].every((row) => row.state === "destroyed")).toBe(true);
	});

	test("a request no size covers is refused before any vendor call", async () => {
		const server = briqServer();
		await expect(
			driverOver(server).create({ ...request, spec: { ...TARGET_SPEC, vcpus: 32, memoryGb: 64 } }),
		).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(server.calls).toEqual([]);
	});

	test("an allocation reporting another size is refused and torn down", async () => {
		const server = briqServer({ allocates: "medium" });
		await expect(driverOver(server).create(request)).rejects.toThrow();
		expect([...server.rows.values()].every((row) => row.state === "destroyed")).toBe(true);
	});

	test("a refusal by the API's limits is a refusal, not an allocation", () => {
		const { refused } = vendorOver(briqServer()).control;
		return vendorOver(briqServer({ refuseCreate: { status: 403, code: "quota_exceeded" } }))
			.control.create({ request, marker: MARKER }, op)
			.then(
				() => {
					throw new Error("expected a refusal");
				},
				(error: unknown) => {
					expect(refused?.(error)).toEqual({ retryable: false });
				},
			);
	});

	test("truncated output is never returned as a result", async () => {
		const vendor = vendorOver(briqServer({ truncate: true }));
		const { raw } = await vendor.control.create({ request, marker: MARKER }, op);
		await expect(vendor.data.exec(raw, "echo hi")).rejects.toThrow("truncated");
	});

	test("a timed-out command reports no exit status, never zero", async () => {
		const vendor = vendorOver(briqServer({ timedOut: true }));
		const { raw } = await vendor.control.create({ request, marker: MARKER }, op);
		expect((await vendor.data.exec(raw, "echo hi")).exitCode).toBeUndefined();
	});

	test("an ambiguous create is replayed under its marker and the briq deleted", async () => {
		const server = briqServer({ ambiguousFirstCreate: true });
		const session = await driverOver(server)
			.create(request)
			.catch(() => undefined);
		// Whether recovery adopted the briq or failed the create, nothing is left running.
		if (session) await session.destroy();
		expect(server.rows.size).toBe(1);
		expect([...server.rows.values()].every((row) => row.state === "destroyed")).toBe(true);
	});
});
