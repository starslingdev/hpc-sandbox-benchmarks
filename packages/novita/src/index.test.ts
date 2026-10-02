// Novita tested at the vendor seam: the adapter's translation, the port contract over a stub SDK,
// and a few sessions through the package's own module. Kit behaviour (convergence, deadlines, the
// inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, spyOn, test } from "bun:test";
import { createRequire } from "node:module";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate, launchDetached, readTextFile } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { E2B_ATTEMPT_KEY } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import novita, { NOVITA_DOMAIN, NOVITA_SANDBOX_ID } from "./index.ts";
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
const op = () => ({ signal: new AbortController().signal });

class SandboxNotFoundError extends Error {}
class AuthenticationError extends Error {}
class InvalidArgumentError extends Error {}
class RateLimitError extends Error {}
class CommandExitError extends Error {
	override readonly name = "CommandExitError";
	constructor(
		readonly exitCode: number,
		readonly stdout = "",
		readonly stderr = "",
	) {
		super(`exit ${exitCode}`);
	}
}

interface StubRow {
	sandboxId: string;
	/** `snapshotting` stands in for a state the adapter does not know. */
	state: "running" | "paused" | "snapshotting";
	metadata: Record<string, string>;
	files: Map<string, string>;
}

/**
 * A whole-account stand-in for the novita-sandbox statics the adapter uses. Every call records its
 * options, so tests can see which channel the credential rode.
 */
function stubNovita(
	options: {
		readonly pageSize?: number;
		/** The first create allocates and then loses its response. */
		readonly ambiguousFirstCreate?: boolean;
		/** The metadata query is ignored: a lookup returns every live row (a loose filter). */
		readonly looseLookup?: boolean;
		/** The launch handle's process id. */
		readonly launchPid?: number;
	} = {},
) {
	const rows = new Map<string, StubRow>();
	const calls: Array<{ name: string; options: unknown }> = [];
	let next = 0;
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (metadata: Record<string, string>, state: StubRow["state"] = "running") => {
		const sandboxId = `i${++next}`;
		rows.set(sandboxId, { sandboxId, state, metadata, files: new Map() });
		return sandboxId;
	};
	const reachable = (id: string) => {
		const found = rows.get(id);
		if (found?.state !== "running") throw new Error(`sandbox ${id} is not running`);
		return found;
	};
	const native = (sandboxId: string) => ({
		sandboxId,
		commands: {
			run: async (command: string, runOptions: { background: boolean }) => {
				calls.push({ name: "commands.run", options: runOptions });
				const guest = reachable(sandboxId);
				if (runOptions.background) {
					const echo = /echo (\S+) > ([^\s']+)/.exec(command);
					if (echo) guest.files.set(echo[2] ?? "", `${echo[1]}\n`);
					return { pid: options.launchPid ?? 42 };
				}
				if (command.startsWith("df -Pk"))
					return { exitCode: 0, stdout: `${80 * 1024 * 1024}\n`, stderr: "" };
				const exit = /^sh -c 'exit (\d+)'$/.exec(command);
				if (exit) throw new CommandExitError(Number(exit[1]));
				return { exitCode: 0, stdout: "out\n", stderr: "err\n" };
			},
		},
		files: {
			read: async (path: string, fileOptions: unknown) => {
				calls.push({ name: "files.read", options: fileOptions });
				const text = reachable(sandboxId).files.get(path);
				if (text === undefined) throw new Error(`${path}: no such file`);
				return text;
			},
			write: async (path: string, text: string, fileOptions: unknown) => {
				calls.push({ name: "files.write", options: fileOptions });
				reachable(sandboxId).files.set(path, text);
				return { path };
			},
			exists: async (path: string, fileOptions: unknown) => {
				calls.push({ name: "files.exists", options: fileOptions });
				return reachable(sandboxId).files.has(path);
			},
		},
	});
	const Sandbox = {
		create: async (template: string, createOptions: { metadata: Record<string, string> }) => {
			calls.push({ name: "create", options: { template, ...createOptions } });
			const sandboxId = allocate(createOptions.metadata);
			if (ambiguous) {
				ambiguous = false;
				throw new TypeError("connection reset after the vendor accepted the create");
			}
			return native(sandboxId);
		},
		getInfo: async (id: string, getOptions: unknown) => {
			calls.push({ name: "getInfo", options: getOptions });
			const found = rows.get(id);
			if (!found) throw new SandboxNotFoundError(id);
			return {
				sandboxId: found.sandboxId,
				templateId: "toolchain-test",
				state: found.state,
				metadata: found.metadata,
				cpuCount: 4,
			};
		},
		kill: async (id: string, killOptions: unknown) => {
			calls.push({ name: "kill", options: killOptions });
			if (!rows.delete(id)) throw new SandboxNotFoundError(id);
			return true;
		},
		list: (listOptions: {
			query: { state?: string[]; metadata?: Record<string, string> };
			nextToken?: string;
		}) => {
			calls.push({ name: "list", options: listOptions });
			const { state, metadata } = listOptions.query;
			const items = [...rows.values()]
				.filter((value) => !state || state.includes(value.state))
				.filter(
					(value) =>
						options.looseLookup ||
						!metadata ||
						Object.entries(metadata).every(([key, wanted]) => value.metadata[key] === wanted),
				)
				.map(({ sandboxId, state: live, metadata: labels }) => ({
					sandboxId,
					state: live,
					metadata: labels,
				}));
			// Stateless like the SDK's paginator: a token resumes a fresh listing at its offset, and
			// `hasNext` is true exactly while a token is held.
			const size = options.pageSize ?? 100;
			let token = listOptions.nextToken;
			let fetched = false;
			return {
				get hasNext() {
					return !fetched || token !== undefined;
				},
				get nextToken() {
					return token;
				},
				nextItems: async () => {
					const from = Number(token?.replace("token-", "") ?? 0);
					fetched = true;
					token = from + size < items.length ? `token-${from + size}` : undefined;
					return items.slice(from, from + size);
				},
			};
		},
	};
	const sdk = {
		Sandbox,
		SandboxNotFoundError,
		AuthenticationError,
		InvalidArgumentError,
		RateLimitError,
	} as unknown as NovitaSdk;
	return {
		sdk,
		rows,
		calls,
		allocate,
		count: (name: string) => calls.filter((c) => c.name === name).length,
	};
}

/** The package's own module, lowered over a stub SDK instead of the real one. */
function driverOver(stub: ReturnType<typeof stubNovita>) {
	return vendorDriver(novita, context, {
		vendor: novitaVendor(stub.sdk, context),
		timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
	});
}

describe("Novita translation", () => {
	test("a create is ready and carries its marker; a paused sandbox is live but not ready", async () => {
		const stub = stubNovita();
		const { control } = novitaVendor(stub.sdk, context);
		const created = await control.create({ request, marker: "benchmark-x" }, op());
		expect(created).toMatchObject({ phase: "ready", marker: "benchmark-x" });
		expect(stub.calls[0]?.options).toMatchObject({
			template: "toolchain-test",
			metadata: { [E2B_ATTEMPT_KEY]: "benchmark-x" },
		});
		const paused = stub.allocate({ [E2B_ATTEMPT_KEY]: "benchmark-y" }, "paused");
		expect(await control.get(paused, op())).toMatchObject({
			phase: "pending",
			marker: "benchmark-y",
		});
		// The SDK's typed not-found is what the adapter declares absent (the kit reads it as null).
		expect(control.absent?.(await control.get("missing", op()).catch((error) => error))).toBe(true);
		// A state the adapter does not know still owns resources: failed, never released.
		const unknown = stub.allocate({}, "snapshotting");
		expect(await control.get(unknown, op())).toMatchObject({ phase: "failed" });
	});

	test("classifies refusals by the SDK's typed errors only; a rate limit is retryable", () => {
		const { refused } = novitaVendor(stubNovita().sdk, context).control;
		expect(refused?.(new AuthenticationError())).toEqual({ retryable: false });
		expect(refused?.(new InvalidArgumentError())).toEqual({ retryable: false });
		expect(refused?.(new RateLimitError())).toEqual({ retryable: true });
		expect(refused?.(new Error("lost", { cause: new RateLimitError() }))).toEqual({
			retryable: true,
		});
		expect(refused?.(new Error("HTTP 429 response lost"))).toBeUndefined();
		expect(refused?.(new SandboxNotFoundError())).toBeUndefined();
	});

	test("lists live states for inventory and queries the marker server-side for recovery", async () => {
		const stub = stubNovita();
		const { control } = novitaVendor(stub.sdk, context);
		await control.page(undefined, op());
		await control.find?.("benchmark-z", undefined, op());
		expect(stub.calls.map((call) => call.options)).toMatchObject([
			{ apiKey: KEY, domain: NOVITA_DOMAIN, query: { state: ["running", "paused"] } },
			{
				apiKey: KEY,
				domain: NOVITA_DOMAIN,
				query: { metadata: { [E2B_ATTEMPT_KEY]: "benchmark-z" } },
			},
		]);
	});

	test("the SDK takes no signal: guest calls are bounded by request timeouts", async () => {
		const stub = stubNovita();
		const { control, data } = novitaVendor(stub.sdk, context);
		const native = await data.attach(await control.create({ request, marker: "m" }, op()), op());
		await data.exec(native, "id -u", op());
		await data.launch?.(native, "daemon", op());
		await data.files?.read(native, "/tmp/missing").catch(() => undefined);
		const guest = { user: "root", requestTimeoutMs: 5_000 };
		expect(stub.calls.map(({ name, options }) => ({ name, options }))).toEqual([
			{
				name: "create",
				options: {
					template: "toolchain-test",
					apiKey: KEY,
					domain: NOVITA_DOMAIN,
					requestTimeoutMs: 300_000,
					timeoutMs: 3 * 60 * 60_000,
					metadata: { [E2B_ATTEMPT_KEY]: "m" },
				},
			},
			{ name: "commands.run", options: { ...guest, background: false, timeoutMs: 60_000 } },
			{ name: "commands.run", options: { ...guest, background: true, timeoutMs: 0 } },
			{ name: "files.read", options: guest },
		]);
	});

	test("a native launch is accepted only with a positive process id", async () => {
		const { control, data } = novitaVendor(stubNovita({ launchPid: 0 }).sdk, context);
		const native = await data.attach(await control.create({ request, marker: "m" }, op()), op());
		await expect(data.launch?.(native, "sleep 1")).rejects.toThrow("no positive process id");
	});
});

vendorContract("novita adapter", novita, () =>
	novitaVendor(stubNovita({ pageSize: 1 }).sdk, context),
);

describe("Novita end to end through its module", () => {
	test("declares identity, native-launch durability, and the SDK provenance", () => {
		expect(novita.id).toBe("novita");
		expect(novita.execution).toEqual({ syncCapMs: 60_000, durable: "native-launch" });
		expect(novita.provenance.packageName).toBe("novita-sandbox");
		expect(NOVITA_SANDBOX_ID.allows("i1abc")).toBe(true);
		expect(NOVITA_SANDBOX_ID.allows("bad id")).toBe(false);
	});

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

	test("a sandbox in an unknown state is observed running, described in full, and killed", async () => {
		const stub = stubNovita();
		const driver = driverOver(stub);
		const id = stub.allocate({ [E2B_ATTEMPT_KEY]: `${MARKER_PREFIX}odd` }, "snapshotting");
		const ref = { provider: "novita" as const, id };
		expect(await driver.probes?.observe(ref)).toEqual({ state: "running" });
		expect(await driver.probes?.describe?.(ref)).toMatchObject({
			sandboxId: id,
			templateId: "toolchain-test",
			cpuCount: 4,
		});
		await driver.destroyById?.(ref);
		expect(stub.count("kill")).toBe(1);
		expect(await driver.probes?.observe(ref)).toEqual({ state: "absent" });
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

	test("recovery rejects a row another attempt owns and never kills it", async () => {
		const stub = stubNovita({ ambiguousFirstCreate: true, looseLookup: true });
		const other = stub.allocate({ [E2B_ATTEMPT_KEY]: `${MARKER_PREFIX}other-attempt` });
		const failure = await driverOver(stub)
			.create(request)
			.catch((caught) => caught);
		// The double fault keeps the locator under Novita's own metadata key.
		expect(failure.locator).toMatchObject({ kind: "marker", key: E2B_ATTEMPT_KEY });
		expect(stub.count("kill")).toBe(0);
		expect(stub.rows.has(other)).toBe(true);
	});
});

describe("Novita's production binding", () => {
	// The same CJS module instance the package loader binds, so its statics can be spied.
	const { Sandbox, AuthenticationError } = createRequire(import.meta.url)(
		"novita-sandbox",
	) as typeof import("novita-sandbox");

	test("the default module keeps the account key in the regional control plane's apiKey", async () => {
		const create = spyOn(Sandbox, "create").mockRejectedValueOnce(
			new AuthenticationError("invalid test key"),
		);
		try {
			const failure = await novita
				.driver(context)
				.create(request)
				.catch((caught) => caught);
			expect(failure).toMatchObject({ code: "create-failed" });
			expect(create).toHaveBeenCalledTimes(1); // a refusal: never reconciled
			const [template, options] = create.mock.calls[0] ?? [];
			expect(template).toBe("toolchain-test");
			expect(options).toMatchObject({ apiKey: KEY, domain: NOVITA_DOMAIN });
			expect(options).not.toHaveProperty("headers");
			expect(options).not.toHaveProperty("envs");
		} finally {
			create.mockRestore();
		}
	});

	test("the pinned 4 vCPU / 8 GiB template refuses other requests before any create call", async () => {
		const create = spyOn(Sandbox, "create");
		try {
			const driver = novita.driver(context);
			for (const input of [
				{ ...request, spec: { vcpus: 8, memoryGb: 8 } },
				{ ...request, env: { OVERRIDE: "yes" } },
				{ ...request, artifact: { kind: "baked" as const, ref: "other" } },
			])
				await expect(driver.create(input)).rejects.toMatchObject({
					code: "invalid-create-request",
				});
			expect(create).not.toHaveBeenCalled();
		} finally {
			create.mockRestore();
		}
	});
});
