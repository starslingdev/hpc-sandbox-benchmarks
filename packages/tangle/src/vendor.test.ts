import { expect, test } from "bun:test";
import type { SandboxInstance } from "@tangle-network/sandbox";
import { SandboxError } from "@tangle-network/sandbox";
import { TANGLE_PTS_PREFLIGHT, tangleVendor } from "./vendor.ts";

const vendor = tangleVendor({} as Parameters<typeof tangleVendor>[0], {
	resolvedArtifact: { kind: "image", ref: "image" },
});

test("a non-retryable 4xx refuses, while a bare 429 stays ambiguous unless the SDK labels it", () => {
	const refused = (error: SandboxError) => vendor.control.refused?.(error);
	expect(refused(new SandboxError("over limit", { status: 400 }))).toEqual({ retryable: false });
	expect(refused(new SandboxError("busy", { status: 429 }))).toBeUndefined();
	expect(
		refused(new SandboxError("quota", { status: 429, createFailureDisposition: "not-admitted" })),
	).toEqual({ retryable: true });
	expect(refused(new SandboxError("conflict", { status: 409 }))).toBeUndefined();
});

test("every command and the preflight run behind the image toolchain and HOME PTS state", async () => {
	const commands: string[] = [];
	const sandbox = {
		resources: { cpuCores: 4, memoryMB: 8192 },
		exec: async (command: string) => {
			commands.push(command);
			return { exitCode: 0, stdout: "", stderr: "" };
		},
		process: {
			spawn: async (command: string) => {
				commands.push(command);
				return { pid: 7 };
			},
		},
	} as unknown as SandboxInstance;
	const spec = { vcpus: 4, memoryGb: 8, diskGb: 40 };
	const op = { signal: new AbortController().signal };
	expect(await vendor.data.prepare?.({ native: sandbox } as never, { spec } as never, op)).toEqual({
		status: "honored",
	});
	await vendor.data.exec(sandbox, "true");
	await vendor.data.launch?.(sandbox, "mise run x");
	expect(commands[0]).toEndWith(TANGLE_PTS_PREFLIGHT);
	for (const command of commands)
		expect(command).toStartWith('export PATH="$HOME/.local/pts/bin:/usr/local/share/mise/shims:');
});
