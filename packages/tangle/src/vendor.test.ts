import { expect, test } from "bun:test";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { SandboxInstance } from "@tangle-network/sandbox";
import { SandboxError } from "@tangle-network/sandbox";
import type { TangleClient } from "./vendor.ts";
import { tangleVendor } from "./vendor.ts";

test("only an SDK-confirmed refusal can discard ambiguous create custody", () => {
	const vendor = tangleVendor(
		{} as TangleClient,
		{
			resolvedArtifact: { kind: "image", ref: "image" },
		} as Pick<DriverContext<"tangle">, "resolvedArtifact">,
	);
	expect(
		vendor.control.refused?.(new SandboxError("unauthorized", { status: 401 })),
	).toBeUndefined();
	expect(
		vendor.control.refused?.(
			new SandboxError("quota", { status: 429, createFailureDisposition: "not-admitted" }),
		),
	).toEqual({ retryable: true });
});

test("Tangle commands use the baked toolchain before the runtime's Nix PATH", async () => {
	const commands: string[] = [];
	const sandbox = {
		exec: async (command: string) => {
			commands.push(command);
			return { exitCode: 0, stdout: "ok", stderr: "" };
		},
		process: {
			spawn: async (command: string) => {
				commands.push(command);
				return { pid: 123 };
			},
		},
	} as unknown as SandboxInstance;
	const vendor = tangleVendor(
		{} as TangleClient,
		{
			resolvedArtifact: {
				kind: "image",
				ref: "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8",
			},
		} as Pick<DriverContext<"tangle">, "resolvedArtifact">,
	);

	await vendor.data.exec(sandbox, "node -e 'process.stdout.write(process.versions.node)'");
	if (!vendor.data.launch) throw new Error("Tangle durable launch is required");
	await vendor.data.launch(sandbox, "mise run benchmark:cpu:node");

	for (const command of commands) {
		expect(command).toStartWith(
			"export PATH=/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH; ",
		);
	}
	expect(commands[0]).toEndWith("node -e 'process.stdout.write(process.versions.node)'");
	expect(commands[1]).toEndWith("mise run benchmark:cpu:node");
});
