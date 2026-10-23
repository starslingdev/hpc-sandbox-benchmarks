import { describe, expect, test } from "bun:test";
import type {
	CreateSandboxOptions,
	CreateSandboxRequest,
	ListSandboxesOptions,
	RequestOptions,
	Sandbox,
	SandboxStatus,
	SandboxView,
} from "@nodeops-createos/sandbox";
import {
	CreateosSandboxAuthError,
	CreateosSandboxConnectionError,
	CreateosSandboxNotFoundError,
	CreateosSandboxPaymentRequiredError,
	CreateosSandboxPermissionError,
	CreateosSandboxRateLimitError,
	CreateosSandboxServerError,
	CreateosSandboxTimeoutError,
	CreateosSandboxValidationError,
} from "@nodeops-createos/sandbox";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { DriverError } from "@sandbox-benchmarks/driver";
import { sdkStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import createos, {
	CREATEOS_CREATE_CEILING_MS,
	CREATEOS_PROVENANCE,
	CREATEOS_SANDBOX_ID,
} from "./index.ts";
import type { CreateosTransport } from "./vendor.ts";
import {
	CREATEOS_MARKER,
	CREATEOS_PYTHON_PREFLIGHT,
	CREATEOS_ROOTFS,
	CREATEOS_SHAPE,
	createosTransport,
	createosVendor,
} from "./vendor.ts";

const KEY = "cos_test-key";
const context: DriverContext<"createos"> = {
	env: { CREATEOS_API_KEY: KEY, CREATEOS_SANDBOX_BASE_URL: "https://api.sb.createos.sh" },
	artifact: { kind: "none" },
	resolvedArtifact: { kind: "none" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: { kind: "none" },
	deadlineMs: 300_000,
};
const MARKER = "benchmark-11111111-2222-3333-4444-555555555555";
const signal = new AbortController().signal;

const notFound = (id: string) =>
	new CreateosSandboxNotFoundError(`sandbox ${id} not found`, new Response(null, { status: 404 }));

/** One row of the stand-in account: a control-plane view minus the fields the adapter pins. */
type Row = {
	readonly id: string;
	status: SandboxStatus;
	name?: string;
	envs?: string[];
	gets: number;
};

interface AccountOptions {
	/** How many reads the host keeps reporting `destroying` before `destroyed` (default 1). */
	readonly removalAfterGets?: number;
	/** What the python preflight answers; anything but zero fails the create. */
	readonly preflight?: { readonly exitCode: number; readonly stderr?: string };
	/** The resources the allocation reports back (default the pinned 4 vCPU / 8 GiB / 40 GiB). */
	readonly shape?: { readonly vcpu?: number; readonly memMiB?: number; readonly diskMiB?: number };
	/** The list endpoint answers without `envs`, as the documented listing does (default true). */
	readonly listCarriesEnvs?: boolean;
	/** Creates to refuse or lose, consumed in order. */
	readonly creates?: { readonly lost?: boolean; readonly hidden?: boolean }[];
}

/**
 * A stand-in CreateOS account: rows keep a status the tests move between `running`, `destroying`
 * and `destroyed`, the list endpoint can hide `envs` the way the real one does, and each sandbox
 * gets the stub's guest shell so exec, the disk proof and the file fallback run for real.
 */
function createosAccount(options: AccountOptions = {}) {
	const hiddenItems = new Set<string>();
	const hiddenFromList = new Set<string>();
	const calls: { name: string; input?: unknown }[] = [];
	const account = sdkStub<CreateosTransport, Row>(
		(account) => {
			/** `carryEnvs: false` models the endpoints that answer without the env names. */
			const viewOf = (id: string, carryEnvs = true): SandboxView => {
				const row = account.row(id);
				return {
					id,
					status: row.status,
					vcpu: options.shape?.vcpu ?? 4,
					mem_mib: options.shape?.memMiB ?? 8_192,
					disk_mib: options.shape?.diskMiB ?? 40 * 1024,
					created_at: "2026-10-23T00:00:00.000Z",
					ingress_enabled: false,
					...(row.name !== undefined && { name: row.name }),
					...(carryEnvs && row.envs !== undefined && { envs: [...row.envs] }),
				};
			};
			/** A read by id: the account's own view, with the removal state machine advanced. */
			const read = (id: string): Row => {
				if (hiddenItems.has(id)) throw notFound(id);
				const row = account.row(id);
				row.gets += 1;
				if (row.status === "destroying" && row.gets > (options.removalAfterGets ?? 1))
					row.status = "destroyed";
				return row;
			};
			const handle = (id: string, snapshot: SandboxView): Sandbox => {
				let current = snapshot;
				const self = {
					id,
					get data() {
						return current;
					},
					refresh: async (_options?: RequestOptions) => {
						calls.push({ name: "refresh", input: id });
						current = viewOf(read(id).id);
						return self;
					},
					runCommand: async (cmd: string, args: string[] = []) => {
						const script = args[args.length - 1] ?? "";
						calls.push({ name: "exec", input: script });
						if (script === CREATEOS_PYTHON_PREFLIGHT) {
							const failure = options.preflight;
							return {
								result: {
									stdout: failure === undefined ? "Python 3.12.3\n" : "",
									stderr: failure?.stderr ?? "",
									exit_code: failure?.exitCode ?? 0,
								},
								exec_ms: 1,
							};
						}
						if (cmd !== "bash" || args[0] !== "-lc")
							throw new Error(`unexpected command ${cmd} ${JSON.stringify(args)}`);
						const outcome = account.run(id, script);
						return {
							result: {
								stdout: outcome.stdout,
								stderr: outcome.stderr,
								exit_code: outcome.exitCode,
							},
							exec_ms: 1,
						};
					},
					files: {
						upload: async (path: string, body: string, _options?: RequestOptions) => {
							account.files(id).set(path, body);
						},
						download: async (path: string, _options?: RequestOptions) => {
							const body = account.files(id).get(path);
							if (body === undefined) throw notFound(`${id}/${path}`);
							return new TextEncoder().encode(body).buffer;
						},
					},
					destroy: async (_options?: RequestOptions) => {
						calls.push({ name: "destroy", input: id });
						const row = account.row(id);
						if (row.status === "destroyed" || row.status === "failed") throw notFound(id);
						row.status = "destroying";
						row.gets = 0;
						return { id, status: "destroying" as const };
					},
				};
				return self as unknown as Sandbox;
			};
			const transport: CreateosTransport = {
				create: async (input: CreateSandboxRequest, _options: CreateSandboxOptions) => {
					calls.push({ name: "create", input });
					const outcome = options.creates?.shift();
					const markerKey = Object.keys(input.envs ?? {})[0];
					const row = account.add({
						status: "running",
						gets: 0,
						...(input.name !== undefined && { name: input.name }),
						...(markerKey !== undefined && { envs: [markerKey] }),
					});
					if (outcome?.hidden === true) hiddenFromList.add(row.id);
					if (outcome?.lost === true)
						throw new TypeError("socket hang up after the vendor accepted the create");
					// The create response carries no `envs`, exactly as the control plane answers a create.
					return handle(row.id, viewOf(row.id, false));
				},
				get: async (id: string, _options: RequestOptions) => {
					calls.push({ name: "get", input: id });
					return handle(id, viewOf(read(id).id));
				},
				list: async (_options: ListSandboxesOptions) => {
					calls.push({ name: "list" });
					return [...account.rows.keys()]
						.filter((id) => !hiddenFromList.has(id))
						.map((id) => handle(id, viewOf(id, options.listCarriesEnvs === true)));
				},
			};
			return transport;
		},
		{ notFound, newId: (n) => `sb-${n}test`, diskGb: 40 },
	);
	const transport = account.sdk;
	return {
		transport,
		rows: account.rows,
		calls,
		/** Take the single-sandbox read away while the account listing keeps the row. */
		hideItem: (id: string) => hiddenItems.add(id),
		revealItem: (id: string) => hiddenItems.delete(id),
		hideListing: (id: string) => hiddenFromList.add(id),
		revealListing: (id: string) => hiddenFromList.delete(id),
		names: (name: string) => calls.filter((call) => call.name === name),
	};
}

const vendorOver = (account: ReturnType<typeof createosAccount>) =>
	createosVendor(account.transport);

/** The package's own module, lowered over a fake account instead of the real SDK. */
function driverOver(account: ReturnType<typeof createosAccount>) {
	return vendorDriver(createos, context, {
		vendor: vendorOver(account),
		timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
	});
}

vendorContract("createos adapter", createos, () => vendorOver(createosAccount()));

describe("CreateOS end to end through its module", () => {
	test("creates a ready sandbox with the pinned shape, a marker env key and open egress", async () => {
		const account = createosAccount();
		const driver = driverOver(account);
		const session = await driver.create(request);
		const created = account.names("create")[0]?.input as CreateSandboxRequest;
		expect(created.shape).toBe(CREATEOS_SHAPE);
		expect(created.rootfs).toBe(CREATEOS_ROOTFS);
		expect(created.disk_mib).toBe(40 * 1024);
		expect(created.egress).toEqual(["*"]);
		expect(created.name).toMatch(/^sbbench-[0-9a-f]{14}$/);
		expect(created.name).toHaveLength(22);
		expect(created.auto_pause_after_seconds).toBeUndefined();
		const markers = Object.entries(created.envs ?? {});
		expect(markers).toHaveLength(1);
		const [key, value] = markers[0] ?? ["", ""];
		expect(key).toMatch(/^SB_BENCHMARK_[0-9a-f]{32}$/);
		expect(CREATEOS_MARKER.fromVendor(key)).toBe(value);
		expect(session.sandboxRef.provider).toBe("createos");
		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
	});

	test("inventories owned and foreign sandboxes, then reaches a tombstone", async () => {
		const account = createosAccount();
		account.rows.set("sb-foreign", {
			id: "sb-foreign",
			status: "running",
			name: "adjacent-fox",
			gets: 0,
		});
		const driver = driverOver(account);
		const session = await driver.create(request);
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef],
			foreignCount: 1,
		});
		// The listing omits `envs`; only the re-read by id can attribute the row to us.
		expect(account.names("refresh")).toHaveLength(1);
		await session.launch?.("sleep 120");
		await session.destroy();
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("a create lost after the vendor accepted it is recovered from the account listing", async () => {
		const account = createosAccount({ creates: [{ lost: true, hidden: true }] });
		const driver = driverOver(account);
		const failure = await driver.create(request).catch((error: unknown) => error);
		// The ambiguous create is still owned: the listing cannot see it yet, so cleanup must not
		// claim the account is empty.
		expect(failure).toBeInstanceOf(Error);
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
		account.revealListing("sb-1test");
		expect(await driver.inventory?.list()).toEqual({
			owned: [{ provider: "createos", id: "sb-1test" }],
			foreignCount: 0,
		});
	});
});

describe("CreateOS reads and teardown across both views", () => {
	const created = async (account: ReturnType<typeof createosAccount>) => {
		const vendor = createosVendor(account.transport);
		const record = await vendor.control.create({ request, marker: MARKER }, { signal });
		return { vendor, record };
	};

	test("a vanished item row reads as null unless this session asked for the delete", async () => {
		// The host reports `destroying` for one read before the tombstone appears.
		const account = createosAccount({ removalAfterGets: 0 });
		const { vendor, record } = await created(account);
		expect(record.phase).toBe("ready");
		expect(record.marker).toBe(MARKER);
		account.hideItem(record.id);
		expect(await vendor.control.get(record.id, { signal })).toBeNull();
		account.revealItem(record.id);
		await vendor.control.remove(record.id, {
			signal,
			current: () => vendor.control.get(record.id, { signal }),
		});
		expect(account.rows.get(record.id)?.status).toBe("destroying");
		account.hideItem(record.id);
		// The item view is gone but the account still lists it: this session's delete keeps the
		// teardown waiting instead of reporting a removal the vendor has not confirmed.
		expect((await vendor.control.get(record.id, { signal }))?.phase).toBe("deleting");
		account.revealItem(record.id);
		expect((await vendor.control.get(record.id, { signal }))?.phase).toBe("gone");
	});

	test("a delete in flight is not requested twice, and a tombstone needs no delete at all", async () => {
		const account = createosAccount();
		const { vendor, record } = await created(account);
		const remove = () =>
			vendor.control.remove(record.id, {
				signal,
				current: () => vendor.control.get(record.id, { signal }),
			});
		expect(await remove()).toBe("accepted");
		expect(await remove()).toBe("accepted");
		expect(account.names("destroy")).toHaveLength(1);
		const row = account.rows.get(record.id);
		if (row === undefined) throw new Error("the created row vanished from the account");
		row.status = "destroyed";
		expect(await remove()).toBe("removed");
		expect(account.names("destroy")).toHaveLength(1);
	});

	test("the account listing is one page, and a cursor is a contract violation", () => {
		const account = createosAccount();
		const vendor = createosVendor(account.transport);
		const page = vendor.control.page as (
			cursor: string | undefined,
			op: { signal: AbortSignal },
		) => Promise<unknown>;
		return expect(page("next", { signal })).rejects.toThrow("one page");
	});
});

describe("CreateOS allocation and error classification", () => {
	test("an allocation whose reported resources differ is unsupported, not a broken create", async () => {
		const account = createosAccount({ shape: { vcpu: 2, memMiB: 4_096 } });
		const vendor = createosVendor(account.transport);
		const record = await vendor.control.create({ request, marker: MARKER }, { signal });
		const native = await vendor.data.attach(record, { signal });
		const verification = await vendor.data.prepare?.({ record, native }, request, { signal });
		expect(verification?.status).toBe("unsupported");
		expect(account.names("exec")).toHaveLength(0);
	});

	test("a failing python preflight fails the create with the vendor's own exit code", async () => {
		const account = createosAccount({
			preflight: { exitCode: 127, stderr: "python3: command not found\n" },
		});
		const vendor = createosVendor(account.transport);
		const record = await vendor.control.create({ request, marker: MARKER }, { signal });
		const native = await vendor.data.attach(record, { signal });
		const failure = await vendor.data
			.prepare?.({ record, native }, request, { signal })
			.catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(DriverError);
		if (!(failure instanceof DriverError)) throw new Error("prepare did not fail loudly");
		expect(failure.code).toBe("create-failed");
		expect(failure.vendorExitCode).toBe(127);
		expect(failure.retryable).toBe(false);
	});

	test("refusals are the SDK's own 4xx classes, and 409 stays a reconcile case", () => {
		const vendor = createosVendor(createosAccount().transport);
		const api = (Error_: typeof CreateosSandboxAuthError, status: number) =>
			new Error_("nope", new Response(null, { status }));
		const refused = vendor.control.refused;
		const transient = vendor.control.transient;
		if (!refused || !transient) throw new Error("CreateOS declares no error classifiers");
		expect(refused(api(CreateosSandboxAuthError, 401))).toEqual({ retryable: false });
		expect(refused(api(CreateosSandboxPaymentRequiredError, 402))).toEqual({ retryable: false });
		expect(refused(api(CreateosSandboxPermissionError, 403))).toEqual({ retryable: false });
		expect(refused(api(CreateosSandboxValidationError, 422))).toEqual({ retryable: false });
		expect(refused(api(CreateosSandboxRateLimitError, 429))).toEqual({ retryable: true });
		// A 409 means the identity already exists: the create is reconciled, never refused.
		expect(refused(api(CreateosSandboxValidationError, 409))).toBeUndefined();
		for (const status of [408, 409, 429, 500, 503]) {
			expect(transient(api(CreateosSandboxServerError, status))).toBe(true);
		}
		expect(transient(api(CreateosSandboxValidationError, 400))).toBe(false);
		expect(transient(new CreateosSandboxConnectionError("socket hang up"))).toBe(true);
		expect(transient(new CreateosSandboxTimeoutError("timed out"))).toBe(true);
		expect(transient(new DOMException("caller stopped", "AbortError"))).toBe(false);
		expect(transient(new TypeError("socket hang up"))).toBe(false);
	});

	test("declares identity, the marker's carrier, the shell-detach policy and the create ceiling", () => {
		expect(createos.id).toBe("createos");
		expect(createos.provenance).toEqual(CREATEOS_PROVENANCE);
		expect(createos.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
		expect(createos.createBudget).toEqual({
			owner: "harness",
			timeoutMs: CREATEOS_CREATE_CEILING_MS,
		});
		expect(CREATEOS_CREATE_CEILING_MS).toBeGreaterThan(10 * 60_000);
		expect(createos.traits.markerKey).toBe("envs");
		expect(createos.traits.recovery?.provesAbsence).toBe(false);
		expect(createos.traits.unsupported?.(request)).toBeUndefined();
		expect(
			createos.traits.unsupported?.({
				...request,
				spec: { vcpus: 2, memoryGb: 4, diskGb: 40 },
			}),
		).toContain(CREATEOS_SHAPE);
		expect(CREATEOS_SANDBOX_ID.allows("sb-01htest000000000000000000")).toBe(true);
		expect(CREATEOS_SANDBOX_ID.allows("sb_01htest000000000000000000")).toBe(true);
		expect(CREATEOS_SANDBOX_ID.allows("other-1")).toBe(false);
	});

	test("the marker rides in an env key and reverses to exactly the kit's marker", () => {
		const key = CREATEOS_MARKER.toVendor(MARKER);
		expect(key).toBe("SB_BENCHMARK_11111111222233334444555555555555");
		expect(CREATEOS_MARKER.fromVendor(key)).toBe(MARKER);
		expect(CREATEOS_MARKER.fromVendor(MARKER)).toBeUndefined();
		expect(CREATEOS_MARKER.fromVendor("SB_BENCHMARK_short")).toBeUndefined();
		expect(CREATEOS_MARKER.fromVendor("OTHER_11111111222233334444555555555555")).toBeUndefined();
	});
});

describe("CreateOS's real transport", () => {
	test("binds the client's three calls without inventing options", async () => {
		const seen: unknown[] = [];
		const transport = createosTransport({
			createSandbox: async (input: CreateSandboxRequest, options?: CreateSandboxOptions) => {
				seen.push({ name: "create", input, options });
				return {} as Sandbox;
			},
			getSandbox: async (id: string, options?: RequestOptions) => {
				seen.push({ name: "get", id, options });
				return {} as Sandbox;
			},
			listSandboxes: async (options?: ListSandboxesOptions) => {
				seen.push({ name: "list", options });
				return [];
			},
		});
		const options = { signal, timeoutMs: 0 };
		await transport.create({ shape: CREATEOS_SHAPE, rootfs: CREATEOS_ROOTFS }, options);
		await transport.get("sb-1test", { signal });
		await transport.list({ signal });
		expect(seen).toEqual([
			{
				name: "create",
				input: { shape: CREATEOS_SHAPE, rootfs: CREATEOS_ROOTFS },
				options,
			},
			{ name: "get", id: "sb-1test", options: { signal } },
			{ name: "list", options: { signal } },
		]);
	});
});
