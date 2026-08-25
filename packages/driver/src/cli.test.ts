import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type } from "arktype";
import type {
	CliDriverOptions,
	CliRowsSchema,
	CliRunOptions,
	CliRunResult,
	CliSpec,
} from "./cli.ts";
import {
	cliMethodTable as compileCliMethodTable,
	defineCliDriver,
	defineCliSpec,
	redactArgs,
	redactDiagnostic,
} from "./cli.ts";
import type { CreateRequest } from "./index.ts";
import { DriverError, driverFromTable, FailedCreateCleanupError, sandboxRef } from "./index.ts";

const machineRows = type("string.json.parse").to(
	type({ id: "string", name: "string", status: "string", "status_detail?": "string" }).array(),
);
const machineId = type(/^m-[1-9][0-9]*$/);
const tamaMachineId = type(/^machine-[a-z0-9]{12}$/);
type MachineRow = { id: string; name: string; status: string; status_detail?: string };

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8 },
	artifact: { kind: "image", ref: "registry.example/toolchain:1" },
	deadlineMs: 2_000,
};

function tamaLikeSpec(overrides: Partial<CliSpec<MachineRow>> = {}): CliSpec<MachineRow> {
	return {
		binary: "fake-cli",
		secretFlags: ["--token"],
		commandTimeoutMs: 1_000,
		create: (r, name) => [
			"new",
			name,
			"--token",
			"s3cret",
			"--image",
			r.artifact.kind === "none" ? "stock" : r.artifact.ref,
		],
		cleanupCreated: {
			kind: "command",
			command: (name) => ["rm-name", "-y", name],
			absenceConfirmationMs: 5,
		},
		ready: {
			poll: ["list", "--json"],
			parse: machineRows,
			select: (rows, name) => rows.find((row) => row.name === name) ?? null,
			classify: (row) => (row.status === "ready" ? "ready" : "pending"),
			pollIntervalMs: 1,
		},
		sandboxId: {
			fromRow: (row) => row.id,
			parse: machineId,
		},
		exec: (id, command) => ["exec", id, "--", "bash", "-lc", command],
		destroy: (id) => ["rm", "-y", id],
		notFound: /not found|no such machine/i,
		...overrides,
	};
}

function cliMethodTable(spec: CliSpec<MachineRow>, options: CliDriverOptions = {}) {
	return compileCliMethodTable("tama", spec, options);
}

function cliDriver(spec: CliSpec<MachineRow>, options: CliDriverOptions = {}) {
	return driverFromTable(cliMethodTable(spec, options), async () => ({}));
}

/** A scripted fake vendor CLI: create registers the machine; readiness flips after N polls. */
function fakeVendor(options: { readyAfterPolls?: number } = {}) {
	const calls: string[][] = [];
	const machines = new Map<string, MachineRow>();
	let polls = 0;
	const run = async (
		_binary: string,
		args: readonly string[],
		_options: CliRunOptions,
	): Promise<CliRunResult> => {
		calls.push([...args]);
		const [verb] = args;
		if (verb === "new") {
			const name = args[1] ?? "";
			machines.set(name, { id: `m-${machines.size + 1}`, name, status: "booting" });
			return { stdout: "", stderr: "", code: 0 };
		}
		if (verb === "list") {
			polls += 1;
			if (polls > (options.readyAfterPolls ?? 1)) {
				for (const row of machines.values()) row.status = "ready";
			}
			return { stdout: JSON.stringify([...machines.values()]), stderr: "", code: 0 };
		}
		if (verb === "exec") {
			return { stdout: "ran\n", stderr: "", code: 0 };
		}
		if (verb === "rm") {
			const id = args[2] ?? "";
			const existed = [...machines.values()].some((row) => row.id === id);
			for (const [name, row] of machines) if (row.id === id) machines.delete(name);
			return existed
				? { stdout: "", stderr: "", code: 0 }
				: { stdout: "", stderr: `machine ${id} not found`, code: 1 };
		}
		if (verb === "rm-name") {
			const name = args[2] ?? "";
			const existed = machines.delete(name);
			return existed
				? { stdout: "", stderr: "", code: 0 }
				: { stdout: "", stderr: `machine ${name} not found`, code: 1 };
		}
		return { stdout: "", stderr: `unknown verb ${verb}`, code: 2 };
	};
	return { run, calls, machines };
}

describe("cliDriver", () => {
	test("the joined module derives driver-owned budgeting from the single provider id", () => {
		const module_ = defineCliDriver("tama", {
			createAttemptCeilingMs: 60_000,
			spec: ({ env }) => {
				expect(env.TAMA_TOKEN).toBe("tok");
				return tamaLikeSpec();
			},
		});
		expect(module_.id).toBe("tama");
		expect(module_.createBudget).toEqual({ owner: "driver", attemptCeilingMs: 60_000 });
		expect(
			typeof module_.driver({
				env: { TAMA_TOKEN: "tok" },
				artifact: { kind: "image" },
				resolvedArtifact: { kind: "image", ref: "ghcr.io/example/toolchain:v1" },
			}).create,
		).toBe("function");

		const missingBudget = () =>
			defineCliDriver(
				"tama",
				// @ts-expect-error — every CLI driver must declare its hard create-attempt ceiling
				{ spec: () => tamaLikeSpec() },
			);
		void missingBudget;
	});

	test("contextually types a complete inline provider spec without row annotations", () => {
		const publicRowsSchema: CliRowsSchema<MachineRow> = machineRows;
		type _rowsInput = Expect<Equal<typeof publicRowsSchema.inferIn, string>>;
		type _rowsOutput = Expect<Equal<typeof publicRowsSchema.infer, readonly MachineRow[]>>;

		const module_ = defineCliDriver("tama", {
			createAttemptCeilingMs: 60_000,
			spec: ({ env }) =>
				defineCliSpec(machineRows, {
					binary: env.TAMA_CLI ?? "tama",
					secretFlags: ["--token"],
					commandTimeoutMs: 10_000,
					create: (_request, name) => ["new", name, "--token", env.TAMA_TOKEN],
					cleanupCreated: {
						kind: "command",
						command: (name) => ["rm", "--name", name],
						absenceConfirmationMs: 100,
					},
					ready: {
						poll: ["list", "--json"],
						select: (rows, name) => rows.find((row) => row.name === name) ?? null,
						classify: () => "ready",
					},
					sandboxId: { fromRow: (row) => row.id, parse: machineId },
					exec: (id, command) => ["exec", id, command],
					destroy: (id) => ["rm", id],
					notFound: /not found/i,
				}),
		});
		expect(module_.id).toBe("tama");

		const plainRowsParser = (raw: string): readonly MachineRow[] => JSON.parse(raw);
		// @ts-expect-error — trust boundaries must be actual arktype schemas, not unchecked functions
		const uncheckedRows: CliRowsSchema<MachineRow> = plainRowsParser;
		const plainIdParser = (raw: unknown): string => String(raw);
		const uncheckedIdSpec = () =>
			tamaLikeSpec({
				sandboxId: {
					fromRow: (row) => row.id,
					// @ts-expect-error — module-owned id validation must be an actual arktype schema
					parse: plainIdParser,
				},
			});
		void uncheckedRows;
		void uncheckedIdSpec;
	});

	test("expresses Tama's real profile auth and name-to-id failed-create reconciliation", async () => {
		const calls: string[][] = [];
		const timeouts: Array<{ verb: string; timeoutMs: number }> = [];
		let authenticated = false;
		let created: MachineRow | undefined;
		const spec = defineCliSpec(machineRows, {
			binary: "tama",
			secretFlags: ["--token"],
			commandTimeoutMs: 60_000,
			createCommandTimeoutMs: 20 * 60_000,
			prepare: {
				probe: ["list", "--json"],
				fallback: ["login", "--token", "s3cret"],
			},
			create: (_request, name) => ["new", name, "--ttl", "0", "--json"],
			cleanupCreated: {
				kind: "lookup",
				select: (rows, name) => rows.find((row) => row.name === name) ?? null,
				absenceConfirmationMs: 5,
			},
			ready: {
				poll: ["list", "--json"],
				select: (rows, name) => rows.find((row) => row.name === name) ?? null,
				classify: (row) =>
					row.status === "ready"
						? "ready"
						: /^(failed|error|terminated|deleted|gone)$/i.test(row.status)
							? {
									terminal: `status=${row.status}${row.status_detail ? ` (${row.status_detail})` : ""}`,
								}
							: "pending",
			},
			sandboxId: { fromRow: (row) => row.id, parse: tamaMachineId },
			exec: (id, command) => ["exec", id, "--", "bash", "-lc", command],
			destroy: (id) => ["rm", "-y", id],
			notFound: /not found|no such machine/i,
		});
		const driver = cliDriver(spec, {
			createAttemptCeilingMs: 25 * 60_000,
			run: async (_binary, args, options) => {
				calls.push([...args]);
				timeouts.push({ verb: args[0] ?? "", timeoutMs: options.timeoutMs });
				if (args[0] === "list" && !authenticated) {
					return { stdout: "", stderr: "not logged in", code: 1 };
				}
				if (args[0] === "login") {
					authenticated = true;
					return { stdout: "logged in", stderr: "", code: 0 };
				}
				if (args[0] === "new") {
					created = { id: "machine-obusdw8bsyw2", name: args[1] ?? "", status: "ready" };
					return { stdout: "", stderr: "client lost the success response", code: 7 };
				}
				if (args[0] === "list") {
					return {
						stdout: JSON.stringify(created === undefined ? [] : [created]),
						stderr: "",
						code: 0,
					};
				}
				if (args[0] === "rm") {
					created = undefined;
					return { stdout: "", stderr: "", code: 0 };
				}
				return { stdout: "", stderr: "unexpected command", code: 2 };
			},
		});

		const error = (await driver
			.create({ ...request, deadlineMs: 25 * 60_000 })
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "create-failed", vendorExitCode: 7, provider: "tama" });
		expect(calls.map(([verb]) => verb)).toEqual(["list", "login", "list", "new", "list", "rm"]);
		expect(calls[1]).toEqual(["login", "--token", "s3cret"]);
		expect(calls[3]).not.toContain("--token");
		expect(calls[3]).not.toContain("s3cret");
		expect(calls[5]).toEqual(["rm", "-y", "machine-obusdw8bsyw2"]);
		expect(calls[5]).not.toContain("--name");
		expect(timeouts.find(({ verb }) => verb === "new")?.timeoutMs).toBeGreaterThan(130_000);
		expect(
			timeouts.filter(({ verb }) => verb !== "new").every(({ timeoutMs }) => timeoutMs <= 60_000),
		).toBe(true);
		expect(String(error)).not.toContain("s3cret");
		expect(created).toBeUndefined();
	});

	test("classifies a real Tama failed row as terminal and cleans it up immediately", async () => {
		let createdName = "";
		const calls: string[] = [];
		const driver = cliDriver(
			tamaLikeSpec({
				create: (_request, name) => {
					createdName = name;
					return ["new", name];
				},
				cleanupCreated: {
					kind: "lookup",
					select: (rows, name) => rows.find((row) => row.name === name) ?? null,
					absenceConfirmationMs: 5,
				},
				ready: {
					poll: ["list", "--json"],
					parse: machineRows,
					select: (rows, name) => rows.find((row) => row.name === name) ?? null,
					classify: (row) =>
						row.status === "ready"
							? "ready"
							: /^(failed|error|terminated|deleted|gone)$/i.test(row.status)
								? {
										terminal: `status=${row.status}${row.status_detail ? ` (${row.status_detail})` : ""}`,
									}
								: "pending",
					pollIntervalMs: 1,
				},
			}),
			{
				run: async (_binary, args) => {
					calls.push(args[0] ?? "");
					if (args[0] === "new") return { stdout: "", stderr: "", code: 0 };
					if (args[0] === "list") {
						return {
							stdout: JSON.stringify([
								{
									id: "m-1",
									name: createdName,
									status: "failed",
									status_detail: "capacity unavailable",
								},
							]),
							stderr: "",
							code: 0,
						};
					}
					return { stdout: "", stderr: "", code: 0 };
				},
			},
		);

		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({
			code: "create-failed",
			provider: "tama",
			vendorMessage: "status=failed (capacity unavailable)",
		});
		expect(calls).toEqual(["new", "list", "list", "rm"]);
	});

	test("redacts overlapping prepare and cleanup secrets from terminal readiness detail", async () => {
		let createdName = "";
		let authenticated = false;
		let verified = false;
		const driver = cliDriver(
			tamaLikeSpec({
				prepare: {
					probe: ["list", "--json"],
					fallback: ["login", "--token", "s3cret-long"],
				},
				create: (_request, name) => {
					createdName = name;
					return ["new", name];
				},
				cleanupCreated: {
					kind: "command",
					command: (name) => ["rm-name", "--token", "s3cret", name],
					absenceConfirmationMs: 5,
				},
				ready: {
					poll: ["list", "--json"],
					parse: machineRows,
					select: (rows, name) => rows.find((row) => row.name === name) ?? null,
					classify: () => ({ terminal: "vendor rejected s3cret-long and s3cret" }),
					pollIntervalMs: 1,
				},
			}),
			{
				run: async (_binary, args) => {
					if (args[0] === "login") {
						authenticated = true;
						return { stdout: "", stderr: "", code: 0 };
					}
					if (args[0] === "list" && !authenticated) {
						return { stdout: "", stderr: "not logged in", code: 1 };
					}
					if (args[0] === "list" && !verified) {
						verified = true;
						return { stdout: "[]", stderr: "", code: 0 };
					}
					if (args[0] === "list") {
						return {
							stdout: JSON.stringify([{ id: "m-1", name: createdName, status: "failed" }]),
							stderr: "",
							code: 0,
						};
					}
					return { stdout: "", stderr: "", code: 0 };
				},
			},
		);

		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({
			code: "create-failed",
			vendorMessage: "vendor rejected *** and ***",
		});
		expect(error.message).not.toContain("s3cret-long");
		expect(error.message).not.toContain("s3cret");
	});

	test("redacts a create-only secret echoed by a failing readiness poll", async () => {
		const driver = cliDriver(
			tamaLikeSpec({
				create: (_request, name) => ["new", name, "--token", "create-only"],
			}),
			{
				run: async (_binary, args) => {
					if (args[0] === "new" || args[0] === "rm-name") {
						return { stdout: "", stderr: "", code: 0 };
					}
					return { stdout: "", stderr: "poll echoed create-only", code: 7 };
				},
			},
		);

		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({
			code: "create-failed",
			vendorMessage: "poll echoed ***",
		});
		expect(error.message).not.toContain("create-only");
	});

	test("does not overwrite a working profile when an exit-zero probe exposes schema drift", async () => {
		const calls: string[] = [];
		const driver = cliDriver(
			tamaLikeSpec({
				prepare: {
					probe: ["list", "--json"],
					fallback: ["login", "--token", "s3cret"],
				},
			}),
			{
				run: async (_binary, args) => {
					calls.push(args[0] ?? "");
					return { stdout: "not json", stderr: "", code: 0 };
				},
			},
		);

		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "vendor-output-unparseable", provider: "tama" });
		const retry = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(retry).toMatchObject({ code: "vendor-output-unparseable", provider: "tama" });
		expect(calls).toEqual(["list", "list"]);
	});

	test("memoizes successful profile preparation once per driver instance", async () => {
		const vendor = fakeVendor({ readyAfterPolls: 0 });
		const driver = cliDriver(
			tamaLikeSpec({
				prepare: {
					probe: ["list", "--json"],
					fallback: ["login", "--token", "s3cret"],
				},
			}),
			{ run: vendor.run },
		);

		const first = await driver.create(request);
		await first.destroy();
		const second = await driver.create(request);
		await second.destroy();

		expect(vendor.calls.map(([verb]) => verb)).toEqual([
			"list",
			"new",
			"list",
			"rm",
			"new",
			"list",
			"rm",
		]);
	});

	test("gives concurrent preparation waiters independent deadlines and cancellation", async () => {
		let notePrepareStarted!: () => void;
		const prepareStarted = new Promise<void>((resolve) => {
			notePrepareStarted = resolve;
		});
		let releasePrepare!: () => void;
		const prepareGate = new Promise<void>((resolve) => {
			releasePrepare = resolve;
		});
		let probes = 0;
		const driver = cliDriver(
			tamaLikeSpec({
				commandTimeoutMs: 1_000,
				prepare: {
					probe: ["list", "--json"],
					fallback: ["login", "--token", "s3cret"],
				},
			}),
			{
				run: async (_binary, args) => {
					if (args[0] === "list") {
						probes++;
						notePrepareStarted();
						await prepareGate;
						return { stdout: "[]", stderr: "", code: 0 };
					}
					if (args[0] === "new") {
						return { stdout: "", stderr: "create rejected", code: 7 };
					}
					return { stdout: "", stderr: "", code: 0 };
				},
			},
		);
		const firstCancellation = new AbortController();
		const first = driver
			.create(request, { signal: firstCancellation.signal })
			.catch((caught: unknown) => caught);
		await prepareStarted;
		const shortStarted = Date.now();
		const short = driver.create({ ...request, deadlineMs: 10 }).catch((caught: unknown) => caught);
		const survivor = driver.create(request).catch((caught: unknown) => caught);
		const cancellationReason = new Error("cancel only the first create");
		firstCancellation.abort(cancellationReason);

		const firstError = (await first) as Error;
		expect(firstError).toMatchObject({ name: "CliRunAbortedError", cause: cancellationReason });
		const shortError = (await short) as DriverError;
		expect(shortError).toMatchObject({ code: "readiness-timeout", provider: "tama" });
		expect(Date.now() - shortStarted).toBeLessThan(100);
		expect(probes).toBe(1);

		releasePrepare();
		const survivorError = (await survivor) as DriverError;
		expect(survivorError).toMatchObject({ code: "create-failed", provider: "tama" });
		expect(survivorError).not.toBe(cancellationReason);
		expect(probes).toBe(1);
	});

	test("retires and reaps an ownerless preparation before a healthy retry", async () => {
		let notePrepareStarted!: () => void;
		const prepareStarted = new Promise<void>((resolve) => {
			notePrepareStarted = resolve;
		});
		let noteAbortObserved!: () => void;
		const abortObserved = new Promise<void>((resolve) => {
			noteAbortObserved = resolve;
		});
		let finishTermination!: () => void;
		const terminationGate = new Promise<void>((resolve) => {
			finishTermination = resolve;
		});
		let probes = 0;
		const driver = cliDriver(
			tamaLikeSpec({
				commandTimeoutMs: 1_000,
				prepare: {
					probe: ["list", "--json"],
					fallback: ["login", "--token", "s3cret"],
				},
			}),
			{
				run: async (_binary, args, options) => {
					if (args[0] === "list") {
						probes++;
						if (probes > 1) return { stdout: "[]", stderr: "", code: 0 };
						notePrepareStarted();
						await new Promise<void>((resolve) => {
							const aborted = () => {
								noteAbortObserved();
								void terminationGate.then(resolve);
							};
							options.signal?.addEventListener("abort", aborted, { once: true });
							if (options.signal?.aborted) aborted();
						});
						throw options.signal?.reason;
					}
					if (args[0] === "new") {
						return { stdout: "", stderr: "create rejected", code: 7 };
					}
					return { stdout: "", stderr: "", code: 0 };
				},
			},
		);
		let firstSettled = false;
		const first = driver
			.create({ ...request, deadlineMs: 5 })
			.catch((caught: unknown) => caught)
			.finally(() => {
				firstSettled = true;
			});
		await prepareStarted;
		await abortObserved;
		expect(firstSettled).toBe(false);

		const retry = driver.create({ ...request, deadlineMs: 500 }).catch((caught: unknown) => caught);
		await Bun.sleep(1);
		expect(probes).toBe(1);
		finishTermination();

		const firstError = (await first) as DriverError;
		expect(firstError).toMatchObject({ code: "readiness-timeout", provider: "tama" });
		const retryError = (await retry) as DriverError;
		expect(retryError).toMatchObject({ code: "create-failed", provider: "tama" });
		expect(retryError.message).not.toContain("no remaining create owner");
		expect(probes).toBe(2);
	});

	test("revalidates typed list output after login before allowing create", async () => {
		const calls: string[] = [];
		let listCalls = 0;
		const driver = cliDriver(
			tamaLikeSpec({
				prepare: {
					probe: ["list", "--json"],
					fallback: ["login", "--token", "s3cret"],
				},
			}),
			{
				run: async (_binary, args) => {
					calls.push(args[0] ?? "");
					if (args[0] === "login") return { stdout: "", stderr: "", code: 0 };
					if (args[0] === "list" && listCalls++ === 0) {
						return { stdout: "", stderr: "not logged in", code: 1 };
					}
					return { stdout: "schema drift", stderr: "", code: 0 };
				},
			},
		);

		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "vendor-output-unparseable", provider: "tama" });
		expect(calls).toEqual(["list", "login", "list"]);
	});

	test("retains the generated name when lookup recovery finds an invalid module-owned id", async () => {
		let createdName = "";
		const driver = cliDriver(
			tamaLikeSpec({
				create: (_request, name) => {
					createdName = name;
					return ["new", name, "--token", "lookup-only"];
				},
				cleanupCreated: {
					kind: "lookup",
					select: (rows, name) => rows.find((row) => row.name === name) ?? null,
					absenceConfirmationMs: 5,
				},
			}),
			{
				run: async (_binary, args) =>
					args[0] === "new"
						? { stdout: "", stderr: "ambiguous failure", code: 7 }
						: {
								stdout: JSON.stringify([
									{ id: "wrong-lookup-only-shape", name: createdName, status: "ready" },
								]),
								stderr: "",
								code: 0,
							},
			},
		);

		const error = (await driver
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error.error).toMatchObject({ code: "invalid-sandbox-ref", provider: "tama" });
		expect(String(error.error)).not.toContain("lookup-only");
		expect(error.suppressed).toMatchObject({ code: "create-failed", vendorExitCode: 7 });
		expect(error.locator).toEqual({ kind: "name", value: createdName });
	});

	test("requires horizon-separated confirmation after lookup finds a row but delete says absent", async () => {
		let createdName = "";
		let listCalls = 0;
		let removeCalls = 0;
		const observations: number[] = [];
		const confirmationMs = 20;
		const driver = cliDriver(
			tamaLikeSpec({
				create: (_request, name) => {
					createdName = name;
					return ["new", name];
				},
				cleanupCreated: {
					kind: "lookup",
					select: (rows, name) => rows.find((row) => row.name === name) ?? null,
					absenceConfirmationMs: confirmationMs,
				},
			}),
			{
				run: async (_binary, args) => {
					if (args[0] === "new") return { stdout: "", stderr: "ambiguous", code: 7 };
					if (args[0] === "list") {
						listCalls++;
						observations.push(Date.now());
						return {
							stdout: JSON.stringify(
								listCalls === 1 ? [{ id: "m-1", name: createdName, status: "ready" }] : [],
							),
							stderr: "",
							code: 0,
						};
					}
					removeCalls++;
					return { stdout: "", stderr: "machine not found", code: 1 };
				},
			},
		);

		const error = (await driver
			.create({ ...request, deadlineMs: 200 })
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "create-failed", vendorExitCode: 7 });
		expect(listCalls).toBe(2);
		expect(removeCalls).toBe(1);
		expect((observations[1] ?? 0) - (observations[0] ?? 0)).toBeGreaterThanOrEqual(confirmationMs);
	});

	test("a positive lookup resets stale absence evidence before delete-not-found", async () => {
		let createdName = "";
		let listCalls = 0;
		let rowsArePresent = false;
		const confirmationMs = 20;
		const driver = cliDriver(
			tamaLikeSpec({
				create: (_request, name) => {
					createdName = name;
					return ["new", name];
				},
				cleanupCreated: {
					kind: "lookup",
					select: (rows, name) => rows.find((row) => row.name === name) ?? null,
					absenceConfirmationMs: confirmationMs,
				},
			}),
			{
				run: async (_binary, args) => {
					if (args[0] === "new") return { stdout: "", stderr: "ambiguous", code: 7 };
					if (args[0] === "list") {
						listCalls++;
						return {
							stdout: JSON.stringify(
								rowsArePresent ? [{ id: "m-1", name: createdName, status: "ready" }] : [],
							),
							stderr: "",
							code: 0,
						};
					}
					return { stdout: "", stderr: "machine not found", code: 1 };
				},
			},
		);

		const error = (await driver
			.create({ ...request, deadlineMs: 5 })
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		await Bun.sleep(confirmationMs);
		rowsArePresent = true;
		await expect(error[Symbol.asyncDispose]()).rejects.toMatchObject({ code: "destroy-failed" });
		expect(listCalls).toBe(3);

		rowsArePresent = false;
		await error[Symbol.asyncDispose]();
	});

	test("rejects an invalid joined create-attempt ceiling", () => {
		expect(() =>
			defineCliDriver("tama", {
				createAttemptCeilingMs: 0,
				spec: () => tamaLikeSpec(),
			}),
		).toThrow(expect.objectContaining({ code: "vendor-contract-violation", provider: "tama" }));
	});

	test("rejects an invalid per-command timeout as a provider contract bug", () => {
		expect(() => cliDriver(tamaLikeSpec({ commandTimeoutMs: 0 }))).toThrow(
			expect.objectContaining({ code: "vendor-contract-violation", provider: "tama" }),
		);
	});

	test("rejects an invalid create-command timeout as a provider contract bug", () => {
		expect(() => cliDriver(tamaLikeSpec({ createCommandTimeoutMs: 0 }))).toThrow(
			expect.objectContaining({ code: "vendor-contract-violation", provider: "tama" }),
		);
	});

	test("rejects invalid readiness poll intervals as provider contract bugs", () => {
		for (const pollIntervalMs of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() =>
				cliDriver(
					tamaLikeSpec({
						ready: { ...tamaLikeSpec().ready, pollIntervalMs },
					}),
				),
			).toThrow(expect.objectContaining({ code: "vendor-contract-violation", provider: "tama" }));
		}
	});

	test("rejects an invalid failed-create absence horizon as a provider contract bug", () => {
		expect(() =>
			cliDriver(
				tamaLikeSpec({
					cleanupCreated: {
						kind: "command",
						command: (name) => ["rm-name", "-y", name],
						absenceConfirmationMs: 0,
					},
				}),
			),
		).toThrow(expect.objectContaining({ code: "vendor-contract-violation", provider: "tama" }));
	});

	test("preflights failed-create cleanup argv before invoking the vendor", async () => {
		let calls = 0;
		const driver = cliDriver(
			tamaLikeSpec({
				cleanupCreated: {
					kind: "command",
					command: () => {
						throw new Error("bad cleanup template");
					},
					absenceConfirmationMs: 5,
				},
			}),
			{
				run: async () => {
					calls++;
					return { stdout: "", stderr: "", code: 0 };
				},
			},
		);
		const error = await driver.create(request).catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "vendor-contract-violation", provider: "tama" });
		expect(calls).toBe(0);
	});

	test("create polls until ready; the session's native handle IS the parsed row", async () => {
		const vendor = fakeVendor({ readyAfterPolls: 2 });
		const driver = cliDriver(tamaLikeSpec(), { run: vendor.run });
		const session = await driver.create(request);
		expect(session.sandboxRef).toEqual({ provider: "tama", id: "m-1" });
		expect(session.native.status).toBe("ready");
		const result = await session.exec("echo hi");
		expect(result.exit).toEqual({ kind: "exited", code: 0 });
		expect(result.stdout).toBe("ran\n");
		await session.destroy();
		expect(vendor.machines.size).toBe(0);
	});

	test("destroy tolerates not-found (idempotent); other failures surface with structured fields", async () => {
		const vendor = fakeVendor();
		const table = cliMethodTable(tamaLikeSpec(), { run: vendor.run });
		// destroy-of-missing MUST succeed (ADR-0008):
		await table.destroyById?.({}, sandboxRef("tama", "m-999"));
		// a genuinely different failure is not swallowed — and carries a typed code + vendor fields:
		const failing = cliMethodTable(tamaLikeSpec({ destroy: () => ["boom"] }), {
			run: async () => ({ stdout: "", stderr: "quota exceeded", code: 9 }),
		});
		const error = (await failing
			.destroyById?.({}, sandboxRef("tama", "m-1"))
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error).toBeInstanceOf(DriverError);
		expect(error.code).toBe("destroy-failed");
		expect(error.vendorExitCode).toBe(9);
		expect(error.vendorMessage).toBe("quota exceeded");
		expect(error.provider).toBe("tama");
	});

	test("destroy not-found matching is repeatable with a global regex", async () => {
		const vendor = fakeVendor();
		const table = cliMethodTable(tamaLikeSpec({ notFound: /not found/gi }), { run: vendor.run });
		const missing = sandboxRef("tama", "m-999");
		await table.destroyById?.({}, missing);
		await table.destroyById?.({}, missing);
	});

	test("bare-ref cleanup passes through the provider module's sandbox-id parser", async () => {
		let calls = 0;
		const table = cliMethodTable(tamaLikeSpec(), {
			run: async () => {
				calls++;
				return { stdout: "", stderr: "", code: 0 };
			},
		});
		const ref = sandboxRef("tama", "wrong-vendor-shape");
		const error = await table.destroyById?.({}, ref).catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "invalid-sandbox-ref", provider: "tama", ref });
		expect(calls).toBe(0);
	});

	test("bare-ref cleanup rejects a ref qualified for another provider", async () => {
		let calls = 0;
		const table = cliMethodTable(tamaLikeSpec(), {
			run: async () => {
				calls++;
				return { stdout: "", stderr: "", code: 0 };
			},
		});
		const ref = sandboxRef("e2b", "m-1");
		const error = await table.destroyById?.({}, ref).catch((caught: unknown) => caught);
		expect(error).toMatchObject({ code: "invalid-sandbox-ref", provider: "tama", ref });
		expect(calls).toBe(0);
	});

	test("unparseable vendor output produces a path-bearing report, not an undefined", async () => {
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args) =>
				args[0] === "list"
					? { stdout: '[{"id":"m-1","name":"bench"}]', stderr: "", code: 0 }
					: { stdout: "", stderr: "", code: 0 },
		});
		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("vendor-output-unparseable");
		expect(error.vendorMessage).toMatch(/status must be a string \(was missing\)/);
	});

	test("the provider module validates sandbox ids before the generic kit constructs a ref", async () => {
		let cleanupCalls = 0;
		let createdName = "";
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args) => {
				if (args[0] === "new") {
					createdName = args[1] ?? "";
					return { stdout: "", stderr: "", code: 0 };
				}
				if (args[0] === "list") {
					return {
						stdout: JSON.stringify([
							{ id: "vendor-shaped-wrong", name: createdName, status: "ready" },
						]),
						stderr: "",
						code: 0,
					};
				}
				cleanupCalls++;
				return { stdout: "", stderr: "", code: 0 };
			},
		});
		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error).toMatchObject({ code: "invalid-sandbox-ref", provider: "tama" });
		expect(error.message).toMatch(/must be matched by/);
		expect(cleanupCalls).toBe(1);
	});

	test("a create that never becomes ready reconciles inside the reserved cleanup tail", async () => {
		const vendor = fakeVendor({ readyAfterPolls: Number.POSITIVE_INFINITY });
		const driver = cliDriver(tamaLikeSpec(), { run: vendor.run });
		const started = Date.now();
		const error = (await driver
			.create({ ...request, deadlineMs: 25 })
			.catch((caught: unknown) => caught)) as DriverError;
		// Readiness stops short of the attempt ceiling, so the failed create still owns a bounded
		// window to reconcile in-line rather than deferring a billable machine to the process owner.
		expect(error).not.toBeInstanceOf(FailedCreateCleanupError);
		expect(error.code).toBe("readiness-timeout");
		expect(error.message).toMatch(/tama sandbox not ready within 25ms/);
		// The reserve is carved out of the same deadline, never added to it.
		expect(Date.now() - started).toBeLessThan(250);
		expect(vendor.machines.size).toBe(0);
	});

	test("a sub-millisecond cleanup remainder is deterministically deferred", async () => {
		let cleanupCalls = 0;
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args) => {
				if (args[0] === "new") return { stdout: "", stderr: "rejected", code: 7 };
				cleanupCalls++;
				return { stdout: "", stderr: "", code: 0 };
			},
		});
		const error = (await driver
			.create({ ...request, deadlineMs: 0.5 })
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect((error.error as DriverError).message).toMatch(/request deadline was exhausted/);
		expect(cleanupCalls).toBe(0);
		await error[Symbol.asyncDispose]();
		expect(cleanupCalls).toBe(1);
	});

	test("failed-create cleanup receives only the original request's remaining budget", async () => {
		let cleanupTimeoutMs: number | undefined;
		const driver = cliDriver(tamaLikeSpec({ commandTimeoutMs: 10_000 }), {
			run: async (_binary, args, options) => {
				if (args[0] === "new") {
					await Bun.sleep(20);
					return { stdout: "", stderr: "post-create check failed", code: 7 };
				}
				cleanupTimeoutMs = options.timeoutMs;
				return { stdout: "", stderr: "", code: 0 };
			},
		});
		const deadlineMs = 100;
		const error = (await driver
			.create({ ...request, deadlineMs })
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("create-failed");
		expect(cleanupTimeoutMs).toBeLessThan(deadlineMs);
		expect(cleanupTimeoutMs).toBeGreaterThan(0);
	});

	test("create cancellation aborts reconciliation that is already in flight", async () => {
		let cleanupAttempts = 0;
		let cleanupSignal: AbortSignal | undefined;
		let noteCleanupStarted!: () => void;
		const cleanupStarted = new Promise<void>((resolve) => {
			noteCleanupStarted = resolve;
		});
		const driver = cliDriver(tamaLikeSpec({ commandTimeoutMs: 10_000 }), {
			run: async (_binary, args, options) => {
				if (args[0] === "new") return { stdout: "", stderr: "create rejected", code: 7 };
				cleanupAttempts++;
				if (cleanupAttempts > 1) return { stdout: "", stderr: "", code: 0 };
				cleanupSignal = options.signal;
				noteCleanupStarted();
				return new Promise<CliRunResult>((_resolve, reject) => {
					const aborted = () => reject(options.signal?.reason);
					options.signal?.addEventListener("abort", aborted, { once: true });
					if (options.signal?.aborted) aborted();
				});
			},
		});
		const cancellation = new AbortController();
		const creating = driver.create(request, { signal: cancellation.signal });
		await cleanupStarted;
		const reason = new Error("process shutdown");
		cancellation.abort(reason);

		const error = (await creating.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(cleanupSignal?.aborted).toBe(true);
		expect(cleanupSignal?.reason).toBe(reason);
		await error.cleanup();
		expect(cleanupAttempts).toBe(2);
	});

	test("readiness cancellation reaps the poll runner before returning recovery ownership", async () => {
		let notePollStarted!: () => void;
		const pollStarted = new Promise<void>((resolve) => {
			notePollStarted = resolve;
		});
		let noteAbortObserved!: () => void;
		const abortObserved = new Promise<void>((resolve) => {
			noteAbortObserved = resolve;
		});
		let finishTermination!: () => void;
		const terminationGate = new Promise<void>((resolve) => {
			finishTermination = resolve;
		});
		let pollSettled = false;
		let cleanupCalls = 0;
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args, options) => {
				if (args[0] === "new") return { stdout: "", stderr: "", code: 0 };
				if (args[0] === "list") {
					notePollStarted();
					await new Promise<void>((resolve) => {
						const aborted = () => {
							noteAbortObserved();
							void terminationGate.then(resolve);
						};
						options.signal?.addEventListener("abort", aborted, { once: true });
						if (options.signal?.aborted) aborted();
					});
					pollSettled = true;
					throw options.signal?.reason;
				}
				cleanupCalls++;
				return { stdout: "", stderr: "", code: 0 };
			},
		});
		const cancellation = new AbortController();
		let createSettled = false;
		const creating = driver
			.create(request, { signal: cancellation.signal })
			.catch((caught: unknown) => caught)
			.finally(() => {
				createSettled = true;
			});
		await pollStarted;
		cancellation.abort(new Error("process shutdown"));
		await abortObserved;
		await Bun.sleep(1);
		expect(createSettled).toBe(false);
		expect(cleanupCalls).toBe(0);

		finishTermination();
		const error = (await creating) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(pollSettled).toBe(true);
		expect(cleanupCalls).toBe(0);
		await error.cleanup();
		expect(cleanupCalls).toBe(1);
	});

	test("provisioning time is subtracted from the readiness budget and passed to the runner", async () => {
		const vendor = fakeVendor({ readyAfterPolls: 0 });
		const timeouts: Array<{ verb: string; timeoutMs: number }> = [];
		const driver = cliDriver(tamaLikeSpec({ commandTimeoutMs: 10_000 }), {
			run: async (binary, args, options) => {
				timeouts.push({ verb: args[0] ?? "", timeoutMs: options.timeoutMs });
				if (args[0] === "new") await Bun.sleep(20);
				return vendor.run(binary, args, options);
			},
		});
		const session = await driver.create({ ...request, deadlineMs: 100 });
		const createTimeout = timeouts.find(({ verb }) => verb === "new")?.timeoutMs;
		const pollTimeout = timeouts.find(({ verb }) => verb === "list")?.timeoutMs;
		expect(createTimeout).toBeLessThanOrEqual(100);
		expect(pollTimeout).toBeLessThan(createTimeout ?? 0);
		await session.destroy();
		expect(vendor.machines.size).toBe(0);
	});

	test("a cleanup double fault preserves both failures and a retryable recovery locator", async () => {
		let cleanupCalls = 0;
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args) => {
				if (args[0] === "new") return { stdout: "", stderr: "", code: 0 };
				if (args[0] === "list") return { stdout: "not json", stderr: "", code: 0 };
				cleanupCalls++;
				return cleanupCalls === 1
					? { stdout: "", stderr: "cleanup failed", code: 7 }
					: { stdout: "", stderr: "", code: 0 };
			},
		});
		const error = (await driver
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error).toBeInstanceOf(SuppressedError);
		expect((error.error as DriverError).code).toBe("destroy-failed");
		expect((error.suppressed as DriverError).code).toBe("vendor-output-unparseable");
		expect(error.provider).toBe("tama");
		expect(error.locator).toEqual({
			kind: "name",
			value: expect.stringMatching(/^bench-/),
		});

		await error[Symbol.asyncDispose]();
		await error[Symbol.asyncDispose]();
		expect(cleanupCalls).toBe(2);
	});

	test("failed-create cleanup retains ownership across a transient not-found", async () => {
		let cleanupCalls = 0;
		const driver = cliDriver(
			tamaLikeSpec({
				cleanupCreated: {
					kind: "command",
					command: (name) => ["rm-name", "-y", name],
					absenceConfirmationMs: 100,
				},
			}),
			{
				run: async (_binary, args) => {
					if (args[0] === "new") return { stdout: "", stderr: "", code: 0 };
					if (args[0] === "list") return { stdout: "not json", stderr: "", code: 0 };
					cleanupCalls++;
					return cleanupCalls === 1
						? { stdout: "", stderr: "machine not found", code: 0 }
						: { stdout: "", stderr: "", code: 0 };
				},
			},
		);
		const error = (await driver
			.create({ ...request, deadlineMs: 50 })
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect((error.error as DriverError).vendorMessage).toBe("machine not found");
		expect(error.locator).toMatchObject({ kind: "name" });

		await error[Symbol.asyncDispose]();
		expect(cleanupCalls).toBe(2);
	});

	test("an immediate owner retry cannot confirm absence before the declared horizon", async () => {
		let cleanupCalls = 0;
		const observations: number[] = [];
		const confirmationMs = 50;
		const driver = cliDriver(
			tamaLikeSpec({
				cleanupCreated: {
					kind: "command",
					command: (name) => ["rm-name", "-y", name],
					absenceConfirmationMs: confirmationMs,
				},
			}),
			{
				run: async (_binary, args) => {
					if (args[0] === "new") return { stdout: "", stderr: "", code: 0 };
					if (args[0] === "list") return { stdout: "not json", stderr: "", code: 0 };
					cleanupCalls++;
					observations.push(Date.now());
					return { stdout: "", stderr: "machine not found", code: 0 };
				},
			},
		);
		const error = (await driver
			.create({ ...request, deadlineMs: 10 })
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(cleanupCalls).toBe(1);

		const cleanup = error[Symbol.asyncDispose]();
		await Bun.sleep(5);
		// The process owner has observed the same immediate name-index miss, but ownership
		// remains live until a third observation reaches the provider's convergence horizon.
		expect(cleanupCalls).toBe(2);
		await cleanup;
		expect(cleanupCalls).toBe(3);
		expect((observations[2] ?? 0) - (observations[0] ?? 0)).toBeGreaterThanOrEqual(confirmationMs);
	});

	test("the joined attempt ceiling bounds a hung create below the caller's deadline", async () => {
		const dir = mkdtempSync(join(tmpdir(), "cli-driver-timeout-"));
		const aliveMarker = join(dir, "survived");
		const pidFile = join(dir, "pid");
		try {
			const driver = cliDriver(
				tamaLikeSpec({
					binary: "/bin/sh",
					commandTimeoutMs: 1_000,
					create: () => [
						"-c",
						`echo $$ > ${JSON.stringify(pidFile)}; sleep 0.2; touch ${JSON.stringify(aliveMarker)}`,
					],
					cleanupCreated: {
						kind: "command",
						command: () => ["-c", "exit 0"],
						absenceConfirmationMs: 5,
					},
				}),
				{ createAttemptCeilingMs: 75 },
			);
			const started = Date.now();
			const error = (await driver
				.create({ ...request, deadlineMs: 1_000 })
				.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
			expect(error).toBeInstanceOf(FailedCreateCleanupError);
			expect((error.suppressed as DriverError).code).toBe("readiness-timeout");
			expect((error.suppressed as Error).message).toMatch(/within 75ms/);
			expect((error.error as DriverError).message).toMatch(/request deadline was exhausted/);
			expect(Date.now() - started).toBeLessThan(1_000);
			const childPid = Number.parseInt(readFileSync(pidFile, "utf8"), 10);
			expect(() => process.kill(childPid, 0)).toThrow();
			await Bun.sleep(200);
			expect(existsSync(aliveMarker)).toBe(false);
			await error[Symbol.asyncDispose]();
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test.skipIf(process.platform === "win32")(
		"create cancellation kills and reaps the detached CLI before returning recovery ownership",
		async () => {
			const dir = mkdtempSync(join(tmpdir(), "cli-driver-abort-"));
			const aliveMarker = join(dir, "survived");
			const pidFile = join(dir, "pid");
			try {
				const driver = cliDriver(
					tamaLikeSpec({
						binary: "/bin/sh",
						commandTimeoutMs: 1_000,
						createCommandTimeoutMs: 20_000,
						create: () => [
							"-c",
							`echo $$ > ${JSON.stringify(pidFile)}; sleep 10; touch ${JSON.stringify(aliveMarker)}`,
						],
						cleanupCreated: {
							kind: "command",
							command: () => ["-c", "exit 0"],
							absenceConfirmationMs: 5,
						},
					}),
				);
				const cancellation = new AbortController();
				const creating = driver.create(
					{ ...request, deadlineMs: 20_000 },
					{ signal: cancellation.signal },
				);
				const waitDeadline = Date.now() + 2_000;
				while (!existsSync(pidFile)) {
					if (Date.now() >= waitDeadline) throw new Error("CLI create did not start");
					await Bun.sleep(5);
				}
				const childPid = Number.parseInt(readFileSync(pidFile, "utf8"), 10);
				cancellation.abort(new Error("process shutdown"));
				const error = (await creating.catch(
					(caught: unknown) => caught,
				)) as FailedCreateCleanupError;
				expect(error).toBeInstanceOf(FailedCreateCleanupError);
				expect(() => process.kill(childPid, 0)).toThrow();
				await Bun.sleep(100);
				expect(existsSync(aliveMarker)).toBe(false);
				await error.cleanup();
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		},
	);

	test.skipIf(process.platform === "win32")(
		"the default runner bounds pipe drain when a background helper inherits stdio",
		async () => {
			const dir = mkdtempSync(join(tmpdir(), "cli-driver-helper-"));
			const aliveMarker = join(dir, "survived");
			try {
				const driver = cliDriver(
					tamaLikeSpec({
						binary: "/bin/sh",
						commandTimeoutMs: 50,
						create: () => ["-c", `(sleep 0.2; touch ${JSON.stringify(aliveMarker)}) &`],
						cleanupCreated: {
							kind: "command",
							command: () => ["-c", "exit 0"],
							absenceConfirmationMs: 5,
						},
					}),
				);
				const started = Date.now();
				const error = (await driver
					.create({ ...request, deadlineMs: 500 })
					.catch((caught: unknown) => caught)) as DriverError;
				expect(error).toMatchObject({ code: "create-failed", provider: "tama" });
				expect(Date.now() - started).toBeLessThan(300);
				await Bun.sleep(200);
				expect(existsSync(aliveMarker)).toBe(false);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		},
	);

	test("secret argv values are redacted from every diagnostic", async () => {
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args) =>
				args[0] === "rm-name"
					? { stdout: "", stderr: "", code: 0 }
					: { stdout: "", stderr: "invalid token s3cret", code: 3 },
		});
		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("create-failed");
		expect(error.message).toContain("--token ***");
		expect(error.message).not.toContain("s3cret");
		expect(error.vendorMessage).toBe("invalid token ***");
	});

	test("a stdout-only nonzero create keeps its diagnostic and still reconciles by name", async () => {
		const calls: string[][] = [];
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args) => {
				calls.push([...args]);
				return args[0] === "new"
					? { stdout: "capacity exhausted", stderr: "", code: 7 }
					: { stdout: "", stderr: "", code: 0 };
			},
		});
		const error = await driver.create(request).catch((caught: unknown) => caught);
		expect(error).toMatchObject({
			code: "create-failed",
			vendorExitCode: 7,
			vendorMessage: "capacity exhausted",
		});
		expect(calls.map(([verb]) => verb)).toEqual(["new", "rm-name"]);
	});

	test("exec caps are per-call opt-in and reported as truncation", async () => {
		const vendor = fakeVendor();
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args, options) =>
				args[0] === "exec"
					? { stdout: "x".repeat(100), stderr: "", code: 0 }
					: vendor.run(_binary, args, options),
		});
		const session = await driver.create(request);
		const capped = await session.exec("noisy", { maxOutputBytes: 10 });
		expect(capped.stdout).toHaveLength(10);
		expect(capped.truncated).toBe(true);
		const uncapped = await session.exec("noisy");
		expect(uncapped.stdout).toHaveLength(100);
		expect(uncapped.truncated).toBe(false);
	});
});

describe("redactArgs", () => {
	test("redacts exactly the value following each secret flag", () => {
		expect(redactArgs(["login", "--token", "s3cret", "--json"], ["--token"])).toEqual([
			"login",
			"--token",
			"***",
			"--json",
		]);
	});

	test("does not reinterpret a redacted value as another secret flag", () => {
		expect(redactArgs(["login", "--token", "--token", "visible"], ["--token"])).toEqual([
			"login",
			"--token",
			"***",
			"visible",
		]);
	});

	test("redacts declared secret values from vendor diagnostics", () => {
		expect(
			redactDiagnostic(
				"command failed: --token s3cret (s3cret rejected)",
				["login", "--token", "s3cret"],
				["--token"],
			),
		).toBe("command failed: --token *** (*** rejected)");
	});

	test("redacts overlapping values longest-first", () => {
		expect(
			redactDiagnostic(
				"long=s3cret-long short=s3cret",
				["login", "--token", "s3cret-long", "--key", "s3cret"],
				["--token", "--key"],
			),
		).toBe("long=*** short=***");
	});

	test("does not reinterpret a secret value as another secret flag", () => {
		expect(
			redactDiagnostic(
				"the --token value failed; visible stays visible",
				["login", "--token", "--token", "visible"],
				["--token"],
			),
		).toBe("the *** value failed; visible stays visible");
	});
});
