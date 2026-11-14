// Spawnbox tested at the vendor seam: the adapter's translation, the port contract over a fake REST
// router, and sessions through the package's own module. Kit behaviour is tested in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { restStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import spawnbox from "./index.ts";
import {
	SPAWNBOX_MARKER_LABEL,
	spawnboxPhase,
	spawnboxTemplateName,
	spawnboxVendor,
} from "./vendor.ts";

const IMAGE = "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8";
const TEMPLATE = "sandbox-benchmarks-toolchain-v8";
const context: DriverContext<"spawnbox"> = {
	env: { SPAWNBOX_API_KEY: "sbx_org_test", SPAWNBOX_URL: "http://spawnbox.test/" },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: IMAGE },
};
const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "image", ref: IMAGE },
	deadlineMs: 300_000,
};

const json = (value: unknown, status = 200) => Response.json(value, { status });
const notFound = () => json({ error: { code: "not_found", message: "no such sandbox" } }, 404);

interface Row {
	readonly id: string;
	state: string;
	template: string;
	build: string;
	labels: Record<string, string>;
}

/** A fake `/v1` API: creates answer `running`; a DELETE leaves a `deleted` record, as Spawnbox does. */
function spawnboxServer(
	options: {
		readonly base?: string;
		readonly resources?: { vcpus: number; memory_mib: number; disk_gib: number };
		readonly truncate?: boolean;
		readonly latestBuild?: string;
	} = {},
) {
	const view = ({ id, state, template, labels, build }: Row) => ({
		id,
		state,
		template,
		labels,
		build,
	});
	return restStub<Row>(
		{
			"POST /v1/sandboxes": ({ body, add }) =>
				json(
					view(
						add({
							state: "running",
							template: body.template,
							build: "bld_1",
							labels: body.labels ?? {},
						}),
					),
					201,
				),
			"GET /v1/sandboxes": ({ rows, url }) => {
				const all = [...rows.values()];
				const start = Number(url.searchParams.get("cursor") ?? 0);
				const limit = 1;
				const next = start + limit < all.length ? String(start + limit) : null;
				return { sandboxes: all.slice(start, start + limit).map(view), next_cursor: next };
			},
			"GET /v1/sandboxes/:id": ({ row }) => view(row),
			"DELETE /v1/sandboxes/:id": ({ row }) => {
				row.state = "deleted";
				return undefined;
			},
			"POST /v1/sandboxes/:id/exec": ({ body, run }) => {
				if (body.cmd === "fixture")
					return { stdout: "out\n", stderr: "err\n", exit_code: 7, timed_out: false };
				const { stdout, stderr, exitCode } = run(body.cmd);
				return {
					stdout,
					stderr,
					exit_code: exitCode,
					...(options.truncate && { stdout_truncated: true }),
				};
			},
			"GET /v1/sandboxes/:id/files": ({ url, files }) => {
				const text = files.get(url.searchParams.get("path") ?? "");
				return text === undefined ? notFound() : new Response(text);
			},
			"PUT /v1/sandboxes/:id/files": ({ url, files, body }) => {
				files.set(url.searchParams.get("path") ?? "", String(body));
				return undefined;
			},
			"GET /v1/templates/:name": ({ params }) =>
				params.name === TEMPLATE
					? {
							name: TEMPLATE,
							base: options.base ?? IMAGE,
							resources: options.resources ?? { vcpus: 4, memory_mib: 8192, disk_gib: 40 },
							current_build: "bld_1",
							latest_build: { id: options.latestBuild ?? "bld_1", state: "ready" },
						}
					: notFound(),
		},
		{ newId: (n) => `sbx_${n}`, missing: notFound },
	);
}

const FAST: Partial<VendorTiming> = { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 };
const vendorOver = (server: ReturnType<typeof spawnboxServer>) =>
	spawnboxVendor(context, server.fetch);
const driverOver = (server: ReturnType<typeof spawnboxServer>) =>
	vendorDriver(spawnbox, context, { vendor: vendorOver(server), timing: FAST });

vendorContract("spawnbox adapter", spawnbox, () => vendorOver(spawnboxServer()));

test("the template name is derived from the image ref within Spawnbox's name rules", () => {
	expect(spawnboxTemplateName(IMAGE)).toBe(TEMPLATE);
	expect(spawnboxTemplateName("ghcr.io/org/Toolchain:sha-abc@sha256:00")).toBe("toolchain-sha-abc");
	expect(spawnboxTemplateName("ghcr.io/org/9tool:v1")).toBe("tool-v1");
});

test("a paused sandbox resumes on its next call, and a deleted record is gone", () => {
	expect(spawnboxPhase("paused")).toBe("ready");
	expect(spawnboxPhase("starting")).toBe("pending");
	expect(spawnboxPhase("deleted")).toBe("gone");
});

describe("Spawnbox end to end through its module", () => {
	test("a session boots the image's template as root, executes, and is deleted", async () => {
		const server = spawnboxServer();
		const session = await driverOver(server).create(request);
		const create = server.calls.find(
			(call) => call.method === "POST" && call.path === "/v1/sandboxes",
		);
		expect(create?.headers.get("authorization")).toBe("Bearer sbx_org_test");
		expect(create?.body).toMatchObject({ template: TEMPLATE, idle_pause_s: 0 });
		const labels = (create?.body as { labels: Record<string, string> }).labels;
		expect(labels[SPAWNBOX_MARKER_LABEL]).toMatch(/^benchmark-[0-9a-f-]{36}$/);

		const result = await session.exec("fixture");
		expect(result.exit).toEqual({ kind: "exited", code: 7 });
		expect([result.stdout, result.stderr]).toEqual(["out\n", "err\n"]);
		const exec = server.calls.find((call) => call.path.endsWith("/exec"));
		expect(exec?.body).toMatchObject({ user: "root" });
		await session.destroy();
		expect([...server.rows.values()].map((row) => row.state)).toEqual(["deleted"]);
	});

	test("a template built from another image is refused and torn down", async () => {
		const server = spawnboxServer({ base: "debian:bookworm" });
		await expect(driverOver(server).create(request)).rejects.toThrow();
		expect([...server.rows.values()].map((row) => row.state)).toEqual(["deleted"]);
	});

	test("a sandbox from an older build is refused", async () => {
		const server = spawnboxServer({ latestBuild: "bld_2" });
		await expect(driverOver(server).create(request)).rejects.toThrow();
		expect([...server.rows.values()].map((row) => row.state)).toEqual(["deleted"]);
	});

	test("file reads preserve empty and JSON text exactly", async () => {
		const server = spawnboxServer();
		const vendor = vendorOver(server);
		const { raw } = await vendor.control.create(
			{ request, marker: "benchmark-00000000-0000-4000-8000-000000000001" },
			{ signal: new AbortController().signal },
		);
		for (const value of ["", "0", "null", '{"x":1}', '"quoted"']) {
			const response = new Response(value);
			const reader = spawnboxVendor(
				context,
				Object.assign(async () => response, { preconnect() {} }) as typeof fetch,
			);
			expect(await reader.data.files?.read(raw, "/file")).toBe(value);
		}
	});

	test("a template of another shape is refused", async () => {
		const server = spawnboxServer({ resources: { vcpus: 2, memory_mib: 4096, disk_gib: 40 } });
		await expect(driverOver(server).create(request)).rejects.toThrow();
		expect([...server.rows.values()].map((row) => row.state)).toEqual(["deleted"]);
	});

	test("truncated output is never returned as a result", async () => {
		const vendor = vendorOver(spawnboxServer({ truncate: true }));
		const { raw } = await vendor.control.create(
			{ request, marker: "benchmark-00000000-0000-4000-8000-000000000001" },
			{ signal: new AbortController().signal },
		);
		await expect(vendor.data.exec(raw, "echo hi")).rejects.toThrow("truncated");
	});
});
