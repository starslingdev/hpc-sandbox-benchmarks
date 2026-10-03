// Vercel tested at the vendor seam: the adapter's translation over a stub SDK, the port contract,
// and sessions through the package's own module. Kit behaviour (convergence, deadlines, the
// inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { launchDetached, readTextFile } from "@sandbox-benchmarks/driver";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import type { Sandbox } from "@vercel/sandbox";
import { APIError } from "@vercel/sandbox";
import vercel, { VERCEL_SANDBOX_ID } from "./index.ts";
import type { VercelSdk } from "./vendor.ts";
import { VERCEL_NAME_PREFIX, vercelVendor } from "./vendor.ts";

const CLAIMS = { owner_id: "team_test123", project_id: "prj_test456" };
const OIDC_TOKEN = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(CLAIMS)).toString("base64url")}.sig`;
const IMAGE =
	"vcr.vercel.com/starsling/hpc-sandbox-benchmarks/sandbox-benchmarks-toolchain-vercel:v1";
const context: DriverContext<"vercel"> = {
	env: { VERCEL_OIDC_TOKEN: OIDC_TOKEN },
	artifact: { kind: "mirror", repository: "sandbox-benchmarks-toolchain-vercel" },
	resolvedArtifact: { kind: "mirror", ref: IMAGE },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};
const apiError = (status: number) =>
	new APIError(new Response(null, { status }), { message: `http ${status}` });
const owned = (uuid: string) => `${VERCEL_NAME_PREFIX}${uuid}`;

interface Row {
	status: string;
	readonly files: Map<string, string>;
}

/**
 * A whole Vercel project behind a stub of the SDK's `Sandbox` statics: name-keyed records, a
 * `delete` that removes the record (404 afterwards), cursor-paged listings, and a current session
 * whose commands share one file store. Every call records its parameters.
 */
function vercelProject(
	options: {
		readonly pageSize?: number;
		readonly diskCapacityGb?: number;
		/** The first create allocates and then loses its response. */
		readonly ambiguousFirstCreate?: boolean;
		/** `get` answers with a sandbox of another name. */
		readonly getReturnsOther?: boolean;
	} = {},
) {
	const rows = new Map<string, Row>();
	const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
	const commands: Array<Record<string, unknown>> = [];
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (name: string, status = "running") => {
		rows.set(name, { status, files: new Map() });
		return name;
	};
	const run = (row: Row, script: string) => {
		const exit = /^sh -c 'exit (\d+)'$/.exec(script);
		if (exit) return { exitCode: Number(exit[1]), stdout: "" };
		if (script.startsWith("df -Pk"))
			return { exitCode: 0, stdout: `${(options.diskCapacityGb ?? 80) * 1024 * 1024}\n` };
		const echo = /^echo (\S+) > (\S+)$/.exec(script);
		if (echo) row.files.set(echo[2] ?? "", `${echo[1]}\n`);
		const cat = /^cat '(.*)'$/.exec(script);
		if (cat) {
			const body = row.files.get(cat[1] ?? "");
			return body === undefined ? { exitCode: 1, stdout: "" } : { exitCode: 0, stdout: body };
		}
		return { exitCode: 0, stdout: "out" };
	};
	const handle = (name: string) =>
		({
			name,
			get status() {
				return rows.get(name)?.status ?? "failed";
			},
			delete: async (params: Record<string, unknown>) => {
				calls.push({ name: "delete", params: { name, ...params } });
				if (!rows.delete(name)) throw apiError(404);
			},
			currentSession: () => ({
				runCommand: async (params: { args: string[]; detached?: boolean }) => {
					commands.push(params);
					const row = rows.get(name);
					if (!row) throw apiError(404);
					const result = run(row, params.args[1] ?? "");
					if (params.detached) return { cmdId: "cmd_1" };
					return {
						exitCode: result.exitCode,
						stdout: async () => result.stdout,
						stderr: async () => "err",
					};
				},
			}),
		}) as unknown as Sandbox;
	const sdk = {
		create: async (params: Record<string, unknown>) => {
			calls.push({ name: "create", params });
			const name = allocate(String(params.name));
			if (ambiguous) {
				ambiguous = false;
				throw new TypeError("connection reset after the vendor accepted the create");
			}
			return handle(name);
		},
		get: async (params: Record<string, unknown>) => {
			calls.push({ name: "get", params });
			const name = String(params.name);
			if (!rows.has(name)) throw apiError(404);
			return handle(options.getReturnsOther ? owned("00000000-0000-4000-8000-000000000000") : name);
		},
		list: async (params: Record<string, unknown>) => {
			calls.push({ name: "list", params });
			const all = [...rows.entries()].map(([name, row]) => ({ name, status: row.status }));
			const from = Number(params.cursor ?? 0);
			const size = options.pageSize ?? 100;
			return {
				sandboxes: all.slice(from, from + size),
				pagination: {
					count: all.length,
					next: from + size < all.length ? String(from + size) : null,
				},
			};
		},
	} as unknown as VercelSdk;
	return {
		sdk,
		rows,
		calls,
		commands,
		allocate,
		count: (name: string) => calls.filter((call) => call.name === name).length,
	};
}

/** The package's own module, lowered over a stub SDK instead of the real one. */
function driverOver(project: ReturnType<typeof vercelProject>) {
	return vendorDriver(vercel, context, {
		vendor: vercelVendor(project.sdk, context),
		timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
	});
}

vendorContract("vercel adapter", vercel, () =>
	vercelVendor(vercelProject({ pageSize: 1 }).sdk, context),
);

describe("Vercel end to end through its module", () => {
	test("a session proves disk, runs and detaches through the current session, inventories, and is deleted", async () => {
		const project = vercelProject({ pageSize: 2 });
		project.allocate("someone-elses-box", "stopped");
		project.allocate("dead-box", "aborted");
		const driver = driverOver(project);
		const session = await driver.create(request);
		expect(VERCEL_SANDBOX_ID.allows(session.sandboxRef.id)).toBe(true);
		expect(project.commands[0]?.args).toEqual(["-lc", "df -Pk / | awk 'NR==2 {print $2}'"]);

		const seven = await session.exec("sh -c 'exit 7'");
		expect(seven).toMatchObject({ exit: { kind: "exited", code: 7 }, stderr: "err" });
		expect(project.commands.at(-1)).toMatchObject({
			cmd: "/bin/sh",
			args: ["-lc", "sh -c 'exit 7'"],
		});
		expect(project.commands.at(-1)).not.toHaveProperty("detached");
		expect(session.files).toBeUndefined();
		await launchDetached(session, "echo done > /tmp/done");
		expect(project.commands.at(-1)).toMatchObject({ detached: true });
		expect(await readTextFile(session, "/tmp/done")).toBe("done\n");

		const failed = project.allocate(owned("33333333-3333-4333-8333-333333333333"), "failed");
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef, { provider: "vercel", id: failed }],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "vercel", id: failed });
		await session.destroy();
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
		for (const call of project.calls.filter((entry) => entry.name === "list"))
			expect(call.params).not.toHaveProperty("namePrefix");
	});

	test("an allocation whose disk is short of the request is refused and deleted", async () => {
		const project = vercelProject({ diskCapacityGb: 24 });
		await expect(driverOver(project).create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
			provider: "vercel",
		});
		expect(project.count("delete")).toBe(1);
		expect(project.rows.size).toBe(0);
	});
});
