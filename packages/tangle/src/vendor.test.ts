import { expect, test } from "bun:test";
import type { SandboxInstance } from "@tangle-network/sandbox";
import { SandboxError } from "@tangle-network/sandbox";
import { tanglePtsPreflight, tangleVendor } from "./vendor.ts";

const vendor = tangleVendor({} as never, { resolvedArtifact: { kind: "image", ref: "image" } });
const refused = (status: number, disposition?: "not-admitted") =>
	vendor.control.refused?.(
		new SandboxError("x", { status, createFailureDisposition: disposition }),
	);

test("a non-retryable 4xx refuses; a bare 429 stays ambiguous unless the SDK labels it", () => {
	expect(refused(400)).toEqual({ retryable: false });
	expect(refused(409)).toBeUndefined();
	expect(refused(429)).toBeUndefined();
	expect(refused(429, "not-admitted")).toEqual({ retryable: true });
});

test("the preflight and every command run behind the image toolchain and HOME PTS state", async () => {
	const commands: string[] = [];
	const record = async (command: string) => {
		commands.push(command);
		return { exitCode: 0, pid: 7 };
	};
	const sandbox = { exec: record, process: { spawn: record } } as unknown as SandboxInstance;
	const spec = { vcpus: 4, memoryGb: 8 };
	const op = { signal: AbortSignal.timeout(1_000) };
	expect(await vendor.data.prepare?.({ native: sandbox } as never, { spec } as never, op)).toEqual({
		status: "honored",
	});
	await vendor.data.exec(sandbox, "true");
	await vendor.data.launch?.(sandbox, "true");
	expect(commands[0]).toEndWith(tanglePtsPreflight());
	for (const command of commands) expect(command).toStartWith('export PATH="$HOME/.local/pts/bin:');
});

test("the preflight stages only a frozen suite's profiles and otherwise stages every baked profile", async () => {
	const prepared = async (
		resolveBakedPtsProfiles: () => Promise<readonly string[] | undefined>,
	) => {
		const commands: string[] = [];
		const sandbox = {
			exec: async (command: string) => {
				commands.push(command);
				return { exitCode: 0 };
			},
		} as unknown as SandboxInstance;
		const op = { signal: AbortSignal.timeout(1_000), resolveBakedPtsProfiles };
		await vendor.data.prepare?.({ native: sandbox } as never, { spec: {} } as never, op);
		return commands[0];
	};
	const root = "/var/lib/phoronix-test-suite/installed-tests/pts";
	expect(await prepared(async () => ["pgbench-1.15.0"])).toEndWith(
		tanglePtsPreflight(["pgbench-1.15.0"]),
	);
	expect(tanglePtsPreflight(["pgbench-1.15.0"])).toStartWith(`set -- ${root}/pgbench-1.15.0\n`);
	expect(await prepared(async () => [])).toContain("set -- \n");
	for (const resolve of [
		async () => undefined,
		async () => ["../etc", "iperf-1.2.0"],
		() => Promise.reject(new Error("task discovery failed")),
	])
		expect(await prepared(resolve)).toEndWith(tanglePtsPreflight());
	expect(tanglePtsPreflight()).toStartWith(`set -- ${root}/*\n`);
	expect(tanglePtsPreflight(["iperf-1.2.0", "iperf-1.2.0"])).toStartWith(
		`set -- ${root}/iperf-1.2.0\n`,
	);
});

test("the driver keeps every sandbox call on the public Sandbox API", async () => {
	const { tangleClient } = await import("./index.ts");
	expect(tangleClient("key").directExec).toBe(false);
});
