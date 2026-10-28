// Munito Sandboxes tested at the vendor seam: the adapter's translation over a fake REST API, the
// port contract, and sessions through the package's own module. Kit behaviour (convergence,
// deadlines, the inventory partition, recovery mechanics) is tested once in the driver package.
// The live smoke at the end runs only when MUNITO_API_KEY is set.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { parseDriverEnv } from "@sandbox-benchmarks/driver/env";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { DISK_PROBE, isMintedMarker, MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { restStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import munito, { MUNITO_CREATE_CEILING_MS } from "./index.ts";
import {
	execOutcome,
	MUNITO_API_BASE,
	MUNITO_DISK_GIB,
	MUNITO_MARKER_KEY,
	MUNITO_TEMPLATE_DISK_GIB,
	MunitoError,
	munitoClassifiers,
	munitoPhase,
	munitoSize,
	munitoVendor,
} from "./vendor.ts";

const KEY = "munito_test-key";
const API = new URL(MUNITO_API_BASE).pathname;
const context: DriverContext<"munito"> = {
	env: { MUNITO_API_KEY: KEY },
	artifact: { kind: "none" },
	resolvedArtifact: { kind: "none" },
};
/** The benchmark's 4 vCPU / 8 GiB target with its 40 GB disk. */
const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "none" },
	deadlineMs: 300_000,
};

const problem = (status: number, code?: string, retryAfter?: number) =>
	Response.json(
		{ type: "about:blank", title: "Refused", status, ...(code && { code, detail: `${code}.` }) },
		{
			status,
			headers: {
				"Content-Type": "application/problem+json",
				...(retryAfter !== undefined && { "Retry-After": String(retryAfter) }),
			},
		},
	);
const ndjson = (...events: object[]) =>
	new Response(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`, {
		headers: { "Content-Type": "application/x-ndjson" },
	});

interface Row {
	readonly id: string;
	status: string;
	vcpus: number;
	memory_mib: number;
	disk_gib: number;
	metadata: Record<string, string>;
	end_reason: string | null;
	key: string | null;
	gets: number;
}

/**
 * A fake `/sandboxes/v1` API for one workspace. A create answers `running` (or `pending` until the
 * given number of reads), and the same Idempotency-Key answers the first sandbox again. A delete
 * answers `stopped`, and the record stays readable. Exec streams NDJSON from each sandbox's guest.
 */
function munitoApi(
	options: {
		readonly pageSize?: number;
		/** Reads before a pending sandbox runs. */
		readonly readyAfterGets?: number;
		/** The first read after create reports `failed`. */
		readonly failsStart?: boolean;
		/** The size the API reports, whatever was asked. */
		readonly allocates?: {
			readonly vcpus: number;
			readonly memory_mib: number;
			readonly disk_gib?: number;
		};
		/** The guest's root disk, in GiB (a 40 GiB ext4 disk shows about 38.75, a 10 GiB one 9.68). */
		readonly diskGb?: number;
		/**
		 * One fault per create, in order: `lost` allocates and drops the answer, `unknown` allocates and
		 * answers 503 start_unknown, and a Response answers without allocating.
		 */
		readonly createFaults?: Array<"lost" | "unknown" | Response>;
	} = {},
) {
	const faults = [...(options.createFaults ?? [])];
	const view = (row: Row) => ({
		id: row.id,
		object: "sandbox",
		status: row.status,
		template: "base",
		size: "large",
		vcpus: row.vcpus,
		memory_mib: row.memory_mib,
		disk_gib: row.disk_gib,
		reserved: false,
		internet: true,
		metadata: row.metadata,
		created_at: 1_793_016_000,
		started_at: row.status === "pending" ? null : 1_793_016_000,
		expires_at: 1_793_026_800,
		ended_at: row.end_reason === null ? null : 1_793_016_060,
		end_reason: row.end_reason,
	});
	const stub = restStub<Row>(
		{
			[`POST ${API}/sandboxes`]: ({ body, headers, rows, add }) => {
				const key = headers.get("Idempotency-Key");
				const fault = faults.shift();
				if (fault instanceof Response) return fault;
				const replay = [...rows.values()].find((row) => key !== null && row.key === key);
				const row =
					replay ??
					add({
						status:
							fault === "unknown" || options.failsStart || options.readyAfterGets
								? "pending"
								: "running",
						vcpus: options.allocates?.vcpus ?? (body.size === "large" ? 4 : body.vcpus),
						memory_mib:
							options.allocates?.memory_mib ?? (body.size === "large" ? 8192 : body.memory_mib),
						disk_gib: options.allocates?.disk_gib ?? body.disk_gib ?? MUNITO_TEMPLATE_DISK_GIB,
						metadata: body.metadata ?? {},
						end_reason: null,
						key,
						gets: 0,
					});
				if (fault === "lost")
					throw new TypeError("connection closed after the API took the create");
				if (fault === "unknown") return problem(503, "start_unknown", 2);
				return Response.json(view(row), { status: 201 });
			},
			[`GET ${API}/sandboxes`]: ({ url, rows }) => {
				const after = url.searchParams.get("after");
				const limit = options.pageSize ?? Number(url.searchParams.get("limit") ?? 20);
				const newestFirst = [...rows.values()]
					.filter((row) => after === null || row.id < after)
					.sort((a, b) => (a.id < b.id ? 1 : -1));
				return {
					object: "list",
					data: newestFirst.slice(0, limit).map(view),
					has_more: newestFirst.length > limit,
				};
			},
			[`GET ${API}/sandboxes/:id`]: ({ row }) => {
				row.gets += 1;
				if (row.status === "pending" && options.failsStart) {
					row.status = "failed";
					row.end_reason = "error";
				} else if (row.status === "pending" && row.gets >= (options.readyAfterGets ?? 0))
					row.status = "running";
				return view(row);
			},
			[`DELETE ${API}/sandboxes/:id`]: ({ row }) => {
				if (row.status === "pending" || row.status === "running") {
					row.status = "stopped";
					row.end_reason = "deleted";
				}
				return view(row);
			},
			[`POST ${API}/sandboxes/:id/exec`]: ({ body, row, run }) => {
				if (row.status !== "running") return problem(409, "sandbox_not_running");
				if (body.command === "fixture")
					return ndjson(
						{ type: "stdout", data: "out\n" },
						{ type: "stderr", data: "err\n" },
						{ type: "exit", exit_code: 7, duration_ms: 3, timed_out: false },
					);
				const { exitCode, stdout, stderr } = run(body.command);
				return ndjson(
					...(stdout ? [{ type: "stdout", data: stdout }] : []),
					...(stderr ? [{ type: "stderr", data: stderr }] : []),
					{ type: "exit", exit_code: exitCode, duration_ms: 1, timed_out: false },
				);
			},
			[`GET ${API}/sandboxes/:id/files/content`]: ({ url, files }) => {
				const text = files.get(url.searchParams.get("path") ?? "");
				return text === undefined ? problem(404, "file_not_found") : new Response(text);
			},
			[`PUT ${API}/sandboxes/:id/files/content`]: ({ url, body, files }) => {
				const path = url.searchParams.get("path") ?? "";
				files.set(path, String(body));
				return { name: path, path, type: "file", size: String(body).length, mode: 420 };
			},
		},
		{
			newId: (n) => `sbx_${String(n).padStart(26, "0")}`,
			diskGb: options.diskGb ?? 38.75,
			missing: () => problem(404, "sandbox_not_found"),
		},
	);
	return {
		...stub,
		creates: () =>
			stub.calls.filter((call) => call.method === "POST" && call.path === `${API}/sandboxes`),
		/** Another tenant's sandbox, or an ended one, in the same workspace. */
		place: (status: string, metadata: Record<string, string> = {}) =>
			stub.add({
				status,
				vcpus: 4,
				memory_mib: 8192,
				disk_gib: MUNITO_TEMPLATE_DISK_GIB,
				metadata,
				end_reason: status === "stopped" ? "deleted" : null,
				key: null,
				gets: 0,
			}),
	};
}

const delays: number[] = [];
const vendorOver = (api: ReturnType<typeof munitoApi>) =>
	munitoVendor(context, api.fetch, {
		delay: async (ms) => {
			delays.push(ms);
		},
	});
const FAST: Partial<VendorTiming> = {
	pollMs: 0,
	deletePollMs: 0,
	removeRetryMs: 0,
	readyTimeoutMs: 1_000,
	deleteTimeoutMs: 1_000,
};
const driverOver = (api: ReturnType<typeof munitoApi>) =>
	vendorDriver(munito, context, { vendor: vendorOver(api), timing: FAST });

vendorContract("munito adapter", munito, () => vendorOver(munitoApi({ pageSize: 1 })));

test("a shape maps to a preset by its ceiling, or to a custom size inside the API's limits", () => {
	expect(munitoSize(TARGET_SPEC)).toEqual({ size: "large", disk_gib: 40 });
	expect(munitoSize({ vcpus: 1, memoryGb: 1 })).toEqual({ size: "small" });
	expect(munitoSize({ vcpus: 8, memoryGb: 16 })).toEqual({ vcpus: 8, memory_mib: 16_384 });
	// A disk up to the template's needs no field; a larger one goes up to whole GiB.
	expect(munitoSize({ vcpus: 1, memoryGb: 1, diskGb: 10 })).toEqual({ size: "small" });
	expect(munitoSize({ vcpus: 8, memoryGb: 16, diskGb: 40.2 })).toEqual({
		vcpus: 8,
		memory_mib: 16_384,
		disk_gib: 41,
	});
	expect(munitoSize({ ...TARGET_SPEC, diskGb: MUNITO_DISK_GIB })).toEqual({
		size: "large",
		disk_gib: 100,
	});
	expect(munitoSize({ ...TARGET_SPEC, diskGb: MUNITO_DISK_GIB + 1 })).toBe(
		"a Munito sandbox has a root disk of 10 to 100 GiB, not 101 GiB",
	);
	expect(munitoSize({ vcpus: 2, memoryGb: 0.5 })).toEqual(
		"a Munito sandbox has at least 512 MiB of memory for each vCPU",
	);
	for (const spec of [
		{ vcpus: 16, memoryGb: 32 },
		{ vcpus: 2, memoryGb: 1.1 },
		{ vcpus: 1, memoryGb: 32 },
	])
		expect(typeof munitoSize(spec)).toBe("string");
});

test("ended sandboxes read as gone, and an unknown status as still starting", () => {
	expect(munitoPhase("running")).toBe("ready");
	expect(munitoPhase("stopped")).toBe("gone");
	expect(munitoPhase("failed")).toBe("gone");
	expect(munitoPhase("pending")).toBe("pending");
	expect(munitoPhase("paused")).toBe("pending");
});

test("only the sandbox's own not-found is removal", () => {
	const { absent } = munitoClassifiers;
	expect(absent(new MunitoError(404, "sandbox_not_found", "The sandbox does not exist."))).toBe(
		true,
	);
	// No preview switch, or a key without access: the path itself answers 404, with no code.
	expect(absent(new MunitoError(404, undefined, "Not Found"))).toBe(false);
	expect(absent(new MunitoError(404, "file_not_found", "The path does not exist."))).toBe(false);
});

test("a refusal allocated nothing, and only a capacity or rate refusal is retryable", () => {
	const { refused, transient } = munitoClassifiers;
	expect(refused(new MunitoError(503, "no_capacity", "x"))).toEqual({ retryable: true });
	expect(refused(new MunitoError(429, "sandbox_limit_reached", "x"))).toEqual({ retryable: true });
	expect(refused(new MunitoError(422, "invalid_request", "x"))).toEqual({ retryable: false });
	expect(refused(new MunitoError(402, "credits_used_up", "x"))).toEqual({ retryable: false });
	// The start did not answer in time: the sandbox can still start, so nothing is refused.
	expect(refused(new MunitoError(503, "start_unknown", "x"))).toBeUndefined();
	expect(transient(new MunitoError(503, "start_unknown", "x"))).toBe(true);
	expect(transient(new TypeError("connection reset"))).toBe(true);
	expect(transient(new DOMException("bound expired", "TimeoutError"))).toBe(true);
	expect(transient(new DOMException("caller cancelled", "AbortError"))).toBe(false);
});

test("a command's outcome comes only from its exit event", () => {
	const lines = (...events: object[]) => events.map((event) => JSON.stringify(event)).join("\n");
	const exit = (exit_code: number, timed_out = false) => ({
		type: "exit",
		exit_code,
		duration_ms: 1,
		timed_out,
	});
	expect(
		execOutcome(
			lines(
				{ type: "stdout", data: "a" },
				{ type: "stderr", data: "b" },
				{ type: "stdout", data: "c" },
				exit(0),
			),
		),
	).toEqual({ exitCode: 0, stdout: "ac", stderr: "b" });
	// The host reported no exit code: unknown, never zero.
	expect(execOutcome(lines(exit(-1)))).toEqual({ stdout: "", stderr: "" });
	expect(() => execOutcome(lines({ type: "stdout", data: "cut" }))).toThrow("without an exit");
	expect(() =>
		execOutcome(lines({ type: "error", error: { code: "sandbox_unavailable", message: "x" } })),
	).toThrow("sandbox_unavailable");
	expect(() => execOutcome(lines(exit(137, true)))).toThrow("300 s limit");
});

describe("Munito end to end through its module", () => {
	test("a session is created, executes, round-trips a file, inventories and is deleted", async () => {
		const api = munitoApi({ pageSize: 2 });
		api.place("running"); // another tenant's live sandbox
		api.place("stopped", { [MUNITO_MARKER_KEY]: `${MARKER_PREFIX}${crypto.randomUUID()}` });
		const driver = driverOver(api);
		const session = await driver.create(request);

		const [create] = api.creates();
		const marker = (create?.body as { metadata: Record<string, string> }).metadata[
			MUNITO_MARKER_KEY
		];
		expect(isMintedMarker(marker ?? "")).toBe(true);
		expect(create?.body).toEqual({
			template: "base",
			size: "large",
			disk_gib: 40,
			timeout: 3 * 60 * 60,
			metadata: { [MUNITO_MARKER_KEY]: marker },
			internet: true,
		});
		expect(create?.headers.get("Authorization")).toBe(`Bearer ${KEY}`);
		expect(create?.headers.get("Idempotency-Key")).toBe(marker ?? "");
		// The kit proved the disk with df inside create.
		expect(
			api.calls.some((call) => (call.body as { command?: string })?.command === DISK_PROBE),
		).toBe(true);

		const result = await session.exec("fixture");
		expect(result.exit).toEqual({ kind: "exited", code: 7 });
		expect([result.stdout, result.stderr]).toEqual(["out\n", "err\n"]);
		expect(api.calls.at(-1)?.body).toEqual({ command: "fixture", timeout: 300, stream: true });

		await session.files?.writeText("/workspace/notes.txt", "round trip\n");
		expect(await session.files?.readFile("/workspace/notes.txt")).toBe("round trip\n");
		const write = api.calls.find((call) => call.method === "PUT");
		expect(write?.path).toBe(
			`${API}/sandboxes/${session.sandboxRef.id}/files/content?path=%2Fworkspace%2Fnotes.txt`,
		);
		expect(write?.headers.get("Content-Type")).toBe("application/octet-stream");

		// The ended sandbox holds no VM, so only the live ones count.
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef],
			foreignCount: 1,
		});
		const before = api.calls.length;
		await session.destroy();
		// The delete answers `stopped`, which is the end that every later read repeats.
		expect(api.calls.slice(before).map((call) => call.method)).toEqual(["DELETE"]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.probes?.describe?.(session.sandboxRef)).toMatchObject({
			status: "stopped",
			end_reason: "deleted",
		});
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("a disk over the API's largest, or a shape the API refuses, sends no request", async () => {
		const api = munitoApi();
		for (const spec of [
			{ ...TARGET_SPEC, diskGb: MUNITO_DISK_GIB + 1 },
			{ vcpus: 16, memoryGb: 32, diskGb: 10 },
		])
			await expect(driverOver(api).create({ ...request, spec })).rejects.toMatchObject({
				code: "invalid-create-request",
			});
		expect(api.calls).toEqual([]);
	});

	test("a sandbox that reports another size, or a smaller disk, is refused and deleted", async () => {
		for (const api of [
			munitoApi({ allocates: { vcpus: 2, memory_mib: 4096 } }),
			munitoApi({ allocates: { vcpus: 4, memory_mib: 8192, disk_gib: 10 } }),
			munitoApi({ diskGb: 37 }),
		]) {
			await expect(driverOver(api).create(request)).rejects.toMatchObject({
				code: "invalid-create-request",
				provider: "munito",
			});
			expect([...api.rows.values()].map((row) => row.status)).toEqual(["stopped"]);
		}
	});

	test("an ambiguous create is asked again with the same key and keeps one sandbox", async () => {
		delays.length = 0;
		const api = munitoApi({ createFaults: ["lost", "unknown"], readyAfterGets: 1 });
		const session = await driverOver(api).create(request);
		const keys = api.creates().map((call) => call.headers.get("Idempotency-Key"));
		expect(keys).toHaveLength(3);
		expect(new Set(keys).size).toBe(1);
		expect(api.rows.size).toBe(1);
		expect(session.sandboxRef.id).toBe([...api.rows.keys()][0] ?? "");
		// The dropped answer waits the default 2 s; start_unknown asks for 2 s too.
		expect(delays).toEqual([2_000, 2_000]);
		await session.destroy();
	});

	test("a refusal is not asked again, allocates nothing, and is retryable only for capacity", async () => {
		for (const [answer, retryable] of [
			[problem(503, "no_capacity", 5), true],
			[problem(429, "sandbox_limit_reached"), true],
			[problem(422, "invalid_request"), false],
		] as const) {
			const api = munitoApi({ createFaults: [answer] });
			const error = await driverOver(api)
				.create(request)
				.catch((caught: unknown) => caught);
			expect(isRetryableDriverCreate(error)).toBe(retryable);
			expect(api.creates()).toHaveLength(1);
			expect(api.rows.size).toBe(0);
		}
	});

	test("a start that fails is a retryable create, and its ended record needs no delete", async () => {
		const api = munitoApi({ failsStart: true });
		const error = await driverOver(api)
			.create(request)
			.catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "create-failed" });
		expect(String(error)).toContain("failed with end reason error");
		expect(isRetryableDriverCreate(error)).toBe(true);
		expect(api.calls.filter((call) => call.method === "DELETE")).toEqual([]);
	});
});

// The live smoke: one `large` sandbox through the module, against the API that MUNITO_API_KEY
// reaches. It never prints the key, and it sends one request at a time.
const LIVE = Boolean(process.env.MUNITO_API_KEY);

describe.skipIf(!LIVE)("Munito live smoke", () => {
	test(
		"creates a large sandbox, runs a command, writes and reads a file, and deletes it",
		async () => {
			const live: DriverContext<"munito"> = {
				env: parseDriverEnv("munito", process.env),
				artifact: { kind: "none" },
				resolvedArtifact: { kind: "none" },
			};
			const base = live.env.MUNITO_SANDBOXES_URL ?? MUNITO_API_BASE;
			// Each request's method, path, status and time, never its headers; and each create's marker.
			const requests: Array<{ call: string; status: number; ms: number }> = [];
			const markers = new Set<string>();
			const timedFetch = Object.assign(
				async (...[input, init]: Parameters<typeof fetch>) => {
					const call = `${init?.method ?? "GET"} ${new URL(String(input)).pathname.replace(/sbx_[0-9a-z]+/, ":id")}`;
					const key = new Headers(init?.headers).get("Idempotency-Key");
					if (key !== null) markers.add(key);
					const started = performance.now();
					const response = await fetch(input, init);
					requests.push({
						call,
						status: response.status,
						ms: Math.round(performance.now() - started),
					});
					return response;
				},
				{ preconnect: fetch.preconnect },
			);
			const driver = vendorDriver(munito, live, { vendor: munitoVendor(live, timedFetch) });
			const timings: Record<string, number> = {};
			const timed = async <T>(label: string, work: () => Promise<T>): Promise<T> => {
				const started = performance.now();
				try {
					return await work();
				} finally {
					timings[label] = Math.round(performance.now() - started);
				}
			};
			let id: string | undefined;
			let facts: string[] = [];
			const leftovers: string[] = [];
			try {
				const session = await timed("sessionCreateMs", () =>
					driver.create({ ...request, deadlineMs: MUNITO_CREATE_CEILING_MS }),
				);
				id = session.sandboxRef.id;
				try {
					const probe = await timed("execMs", () =>
						session.exec(
							"uname -r; nproc; awk '/^MemTotal:/ {print $2}' /proc/meminfo; df -Pk / | awk 'NR==2 {print $2}'; . /etc/os-release && echo \"$PRETTY_NAME\"; id -u; getent hosts github.com >/dev/null && echo dns-ok || echo dns-failed",
						),
					);
					facts = probe.stdout.trim().split("\n");
					expect(probe.exit).toEqual({ kind: "exited", code: 0 });
					expect(facts[1]).toBe("4");
					expect(facts[5]).toBe("0");
					const files = session.files;
					if (files === undefined) throw new Error("the session has no files API");
					const text = `written by the munito live smoke at ${new Date().toISOString()}\n`;
					await timed("writeMs", () => files.writeText("/workspace/smoke.txt", text));
					expect(await timed("readMs", () => files.readFile("/workspace/smoke.txt"))).toBe(text);
				} finally {
					await timed("deleteMs", () => session.destroy());
				}
				expect(await driver.probes?.describe?.(session.sandboxRef)).toMatchObject({
					status: "stopped",
					end_reason: "deleted",
				});
			} finally {
				// Any live sandbox that carries a marker this test sent is a leftover, and is deleted.
				for (const status of ["pending", "running"]) {
					const listed = (await (
						await timedFetch(`${base}/sandboxes?status=${status}&limit=100`, {
							headers: { Authorization: `Bearer ${live.env.MUNITO_API_KEY}` },
						})
					).json()) as { data: Array<{ id: string; metadata: Record<string, string> }> };
					for (const row of listed.data)
						if (markers.has(row.metadata[MUNITO_MARKER_KEY] ?? "")) leftovers.push(row.id);
				}
				for (const leftover of leftovers)
					await driver.destroyById?.({ provider: "munito", id: leftover });
				console.log(
					JSON.stringify(
						{
							sandbox: id,
							kernel: facts[0],
							vcpus: facts[1],
							memTotalKiB: facts[2],
							rootDiskKiB: facts[3],
							os: facts[4],
							uid: facts[5],
							dns: facts[6],
							timings,
							requests,
							leftovers,
						},
						null,
						2,
					),
				);
			}
			expect(leftovers).toEqual([]);
		},
		5 * 60_000,
	);
});
