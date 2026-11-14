import { expect, test } from "bun:test";
import type { SandboxInstance } from "@tangle-network/sandbox";
import { SandboxError } from "@tangle-network/sandbox";
import { TANGLE_PTS_PREFLIGHT, tangleVendor } from "./vendor.ts";

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
	expect(commands[0]).toEndWith(TANGLE_PTS_PREFLIGHT);
	for (const command of commands) expect(command).toStartWith('export PATH="$HOME/.local/pts/bin:');
});
