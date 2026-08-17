import { describe, expect, test } from "bun:test";
import { type } from "arktype";
import type { CliRunResult, CliSpec } from "./cli.ts";
import { cliDriver, cliMethodTable, redactArgs } from "./cli.ts";
import type { CreateRequest } from "./index.ts";
import { DriverError, sandboxRef } from "./index.ts";

const machineRows = type("string.json.parse").to(
	type({ id: "string", name: "string", status: "string" }).array(),
);
type MachineRow = { id: string; name: string; status: string };

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8 },
	artifactRef: "registry.example/toolchain:1",
	deadlineMs: 2_000,
};

function tamaLikeSpec(overrides: Partial<CliSpec<MachineRow>> = {}): CliSpec<MachineRow> {
	return {
		provider: "tama",
		binary: "fake-cli",
		secretFlags: ["--token"],
		create: (r, name) => ["new", name, "--token", "s3cret", "--image", r.artifactRef],
		ready: {
			poll: ["list", "--json"],
			parse: machineRows,
			select: (rows, name) =>
				rows.find((row) => row.name === name && row.status === "ready") ?? null,
			pollIntervalMs: 1,
		},
		idOf: (row) => row.id,
		exec: (id, command) => ["exec", id, "--", "bash", "-lc", command],
		destroy: (id) => ["rm", "-y", id],
		notFound: /not found|no such machine/i,
		...overrides,
	};
}

/** A scripted fake vendor CLI: create registers the machine; readiness flips after N polls. */
function fakeVendor(options: { readyAfterPolls?: number } = {}) {
	const calls: string[][] = [];
	const machines = new Map<string, MachineRow>();
	let polls = 0;
	const run = async (_binary: string, args: readonly string[]): Promise<CliRunResult> => {
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
		return { stdout: "", stderr: `unknown verb ${verb}`, code: 2 };
	};
	return { run, calls, machines };
}

describe("cliDriver", () => {
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
		await table.destroyById?.(null, sandboxRef("tama", "m-gone"));
		// a genuinely different failure is not swallowed — and carries a typed code + vendor fields:
		const failing = cliMethodTable(tamaLikeSpec({ destroy: () => ["boom"] }), {
			run: async () => ({ stdout: "", stderr: "quota exceeded", code: 9 }),
		});
		const error = (await failing
			.destroyById?.(null, sandboxRef("tama", "m-1"))
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error).toBeInstanceOf(DriverError);
		expect(error.code).toBe("destroy-failed");
		expect(error.vendorExitCode).toBe(9);
		expect(error.vendorMessage).toBe("quota exceeded");
		expect(error.provider).toBe("tama");
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

	test("a create that never becomes ready fails at the request deadline", async () => {
		const vendor = fakeVendor({ readyAfterPolls: Number.POSITIVE_INFINITY });
		const driver = cliDriver(tamaLikeSpec(), { run: vendor.run });
		const error = (await driver
			.create({ ...request, deadlineMs: 25 })
			.catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("readiness-timeout");
		expect(error.message).toMatch(/tama sandbox not ready within 25ms/);
	});

	test("secret argv values are redacted from every diagnostic", async () => {
		const driver = cliDriver(tamaLikeSpec(), {
			run: async () => ({ stdout: "", stderr: "invalid token", code: 3 }),
		});
		const error = (await driver.create(request).catch((caught: unknown) => caught)) as DriverError;
		expect(error.code).toBe("create-failed");
		expect(error.message).toContain("--token ***");
		expect(error.message).not.toContain("s3cret");
		expect(error.vendorMessage).toBe("invalid token");
	});

	test("exec caps are per-call opt-in and reported as truncation", async () => {
		const vendor = fakeVendor();
		const driver = cliDriver(tamaLikeSpec(), {
			run: async (_binary, args) =>
				args[0] === "exec"
					? { stdout: "x".repeat(100), stderr: "", code: 0 }
					: vendor.run(_binary, args),
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
});
