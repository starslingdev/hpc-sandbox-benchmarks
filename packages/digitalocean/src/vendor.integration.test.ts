// DigitalOcean MicroVMs tested at the vendor seam: the adapter's translation, the port contract over
// a fake REST router, and sessions through the package's own module. Kit behaviour (convergence,
// deadlines, the inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { restStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import digitalocean from "./index.ts";
import { coveringSize, digitalOceanPhase, digitalOceanVendor } from "./vendor.ts";

const IMAGE = "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8";
const MARKER = "benchmark-00000000-0000-4000-8000-000000000001";
const context: DriverContext<"digitalocean"> = {
	env: { DIGITAL_OCEAN_TOKEN: "dop_v1_test" },
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

interface Row {
	readonly id: string;
	readonly name: string;
	state: string;
	size: { cpu: number; memory: number };
	gets: number;
}

/**
 * A fake `/v2/microvms` API: creates answer `creating`, GETs reach `running` after `readyAfterGets`,
 * a DELETE is refused while provisioning and otherwise acknowledged with a 204 and a later 404.
 */
function doServer(
	options: {
		readonly readyAfterGets?: number;
		/** The first create allocates and then loses its response. */
		readonly ambiguousFirstCreate?: boolean;
		/** The backend reports this size whatever was asked. */
		readonly allocates?: { cpu: number; memory: number };
		/** Exec answers 429 this many times before running. */
		readonly execRateLimited?: number;
		readonly truncate?: boolean;
	} = {},
) {
	let firstCreate = true;
	let throttled = options.execRateLimited ?? 0;
	const microvm = ({ id, name, state, size }: Row) => ({ id, name, state, size });
	const stub = restStub<Row>(
		{
			"POST /v2/microvms": ({ body, add }) => {
				const row = add({
					name: body.name,
					state: (options.readyAfterGets ?? 0) > 0 ? "creating" : "running",
					size: options.allocates ?? body.size,
					gets: 0,
				});
				const first = firstCreate;
				firstCreate = false;
				if (first && options.ambiguousFirstCreate)
					throw new TypeError("connection closed after remote acceptance");
				return json({ microvm: microvm(row) }, 201);
			},
			"GET /v2/microvms": ({ rows, url }) => {
				const name = url.searchParams.get("name");
				return {
					microvms: [...rows.values()]
						.filter((row) => name === null || row.name === name)
						.map(microvm),
				};
			},
			"GET /v2/microvms/:id": ({ row, rows }) => {
				if (row.state === "terminating") {
					rows.delete(row.id);
					return json({ code: "NOT_FOUND", message: "MicroVM not found" }, 404);
				}
				row.gets += 1;
				if (row.state === "creating" && row.gets >= (options.readyAfterGets ?? 0))
					row.state = "running";
				return { microvm: microvm(row) };
			},
			"DELETE /v2/microvms/:id": ({ row }) => {
				if (row.state === "creating")
					return json({ code: "FAILED_PRECONDITION", message: "still provisioning" }, 400);
				row.state = "terminating";
				return undefined;
			},
			"POST /v2/microvms/:id/exec": ({ body, run }) => {
				if (throttled > 0) {
					throttled -= 1;
					return json({ code: "TOO_MANY_REQUESTS", message: "commands per minute" }, 429);
				}
				const shell = (body as { argv: string[] }).argv.at(-1) ?? "";
				if (shell === "fixture") return { stdout: "out\n", stderr: "err\n", exit_code: 7 };
				const { stdout, stderr, exitCode } = run(shell);
				return {
					stdout,
					stderr,
					exit_code: exitCode,
					...(options.truncate && { truncated: true }),
				};
			},
		},
		{
			newId: (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
			missing: () => json({ code: "NOT_FOUND", message: "MicroVM not found" }, 404),
		},
	);
	return {
		...stub,
		creates: () =>
			stub.calls.filter((call) => call.method === "POST" && call.path === "/v2/microvms"),
	};
}

const FAST: Partial<VendorTiming> = { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 };
const noDelay = () => Promise.resolve();
const vendorOver = (server: ReturnType<typeof doServer>) =>
	digitalOceanVendor(context, server.fetch, noDelay);
const driverOver = (server: ReturnType<typeof doServer>) =>
	vendorDriver(digitalocean, context, { vendor: vendorOver(server), timing: FAST });

// Born running: the contract removes right after create, which DigitalOcean refuses mid-provisioning.
vendorContract("digitalocean adapter", digitalocean, () => vendorOver(doServer()));

test("a request maps to the smallest offered pair covering both axes", () => {
	expect(coveringSize({ vcpus: 4, memoryGb: 8 })).toEqual({ cpu: 8, memory: 16384 });
	expect(coveringSize({ vcpus: 2, memoryGb: 4 })).toEqual({ cpu: 2, memory: 4096 });
	expect(coveringSize({ vcpus: 1, memoryGb: 8 })).toEqual({ cpu: 8, memory: 16384 });
	expect(coveringSize({ vcpus: 32, memoryGb: 64 })).toBeUndefined();
});

test("paused MicroVMs keep their resources and resume on exec, so they read as ready", () => {
	expect(digitalOceanPhase({ state: "paused" })).toBe("ready");
});

describe("DigitalOcean end to end through its module", () => {
	test("a session creates the covering size from the image, executes, and is destroyed", async () => {
		const server = doServer({ readyAfterGets: 2 });
		const session = await driverOver(server).create(request);
		const body = server.creates()[0]?.body;
		expect(body).toMatchObject({
			region: "mkc1",
			size: { cpu: 8, memory: 16384 },
			source: { oci_ref: IMAGE },
			auto_pause: { idle_timeout: "4h" },
			tags: ["sandbox-benchmarks"],
		});
		expect((body as { name: string }).name).toMatch(/^benchmark-[0-9a-f-]{36}$/);

		const result = await session.exec("fixture");
		expect(result.exit).toEqual({ kind: "exited", code: 7 });
		expect([result.stdout, result.stderr]).toEqual(["out\n", "err\n"]);
		// No file API: the harness polls done-files with `cat` over exec.
		expect(session.files).toBeUndefined();
		await session.destroy();
		expect(server.rows.size).toBe(0);
	});

	test("a request no size covers is refused before any vendor call", async () => {
		const server = doServer();
		await expect(
			driverOver(server).create({ ...request, spec: { ...TARGET_SPEC, vcpus: 32, memoryGb: 64 } }),
		).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(server.calls).toEqual([]);
	});

	test("an allocation reporting another size is refused and torn down", async () => {
		const server = doServer({ allocates: { cpu: 2, memory: 4096 } });
		await expect(driverOver(server).create(request)).rejects.toThrow();
		expect(server.rows.size).toBe(0);
	});

	test("a delete refused while provisioning is transient, so teardown asks again", async () => {
		const vendor = vendorOver(doServer({ readyAfterGets: 1_000 }));
		const { id } = await vendor.control.create({ request, marker: MARKER }, op);
		const refusal = await vendor.control
			.remove(id, { ...op, current: async () => null })
			.catch((error: unknown) => error);
		expect(String(refusal)).toContain("FAILED_PRECONDITION");
		expect(vendor.control.transient?.(refusal)).toBe(true);
		expect(vendor.control.refused?.(refusal)).toMatchObject({ retryable: false });
	});

	test("an exec rate limit is waited out", async () => {
		const session = await driverOver(doServer({ execRateLimited: 2 })).create(request);
		expect((await session.exec("fixture")).exit).toEqual({ kind: "exited", code: 7 });
		await session.destroy();
	});

	test("truncated output is never returned as a result", async () => {
		const vendor = vendorOver(doServer({ truncate: true }));
		const { raw } = await vendor.control.create({ request, marker: MARKER }, op);
		await expect(vendor.data.exec(raw, "echo hi")).rejects.toThrow("truncated");
	});

	test("an ambiguous create is found by its marker name and deleted", async () => {
		const server = doServer({ ambiguousFirstCreate: true });
		await expect(driverOver(server).create(request)).rejects.toMatchObject({
			code: "create-failed",
		});
		expect(server.rows.size).toBe(0);
	});
});
