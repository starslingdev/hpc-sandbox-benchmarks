// ComputeSDK's E2B wrapper always uses the template's default user and does not expose the raw
// SDK's `user` command option. Our E2B/Novita template importers install that user after the image
// is built. Run the benchmark lane as root through envd — the native SDK-supported identity — so
// apt fallbacks, /etc PTS config, and the toolchain state baked under /var/lib all use one consistent
// runtime identity. Daytona and Modal already run the same image as root.

import type { SandboxMethods } from "@computesdk/provider";
import type { CommandResult } from "computesdk";
import type { Sandbox as E2bSandbox } from "e2b";
import type { DirectProvider } from "./types.ts";

type E2bLikeSandbox = Pick<E2bSandbox, "commands">;
type RootCommandMethod = SandboxMethods<E2bLikeSandbox>["runCommand"];

interface PatchableManager {
	methods: Record<string, unknown> & { runCommand: RootCommandMethod };
}

function patchableManager(provider: DirectProvider): PatchableManager {
	const manager = provider.sandbox as unknown as { methods?: Record<string, unknown> };
	if (typeof manager.methods?.runCommand !== "function") {
		throw new Error(
			"@computesdk/e2b provider internals changed shape (sandbox manager has no patchable " +
				"runCommand method); revisit the root-user adapter against the upgraded wrapper",
		);
	}
	return manager as PatchableManager;
}

/** The stock @computesdk/e2b runCommand behavior, with the native E2B user pinned to root. */
export const runE2bCommandAsRoot: RootCommandMethod = async (
	sandbox,
	command,
	options,
): Promise<CommandResult> => {
	const startTime = Date.now();
	try {
		// Use envd's structured channels instead of reconstructing cwd/env as shell source. Besides
		// preserving argument boundaries, the native background option avoids the stock wrapper's broken
		// `nohup cd … && command &` expansion. ComputeSDK expects a completed launch result rather than
		// E2B's CommandHandle, so translate a successful background start into exit 0; the harness polls
		// its own done-file for the detached job's eventual result.
		const nativeOptions = {
			user: "root" as const,
			...(options?.cwd !== undefined ? { cwd: options.cwd } : {}),
			...(options?.env ? { envs: options.env } : {}),
			...(options?.timeout !== undefined ? { timeoutMs: options.timeout } : {}),
			...(options?.onStdout ? { onStdout: options.onStdout } : {}),
			...(options?.onStderr ? { onStderr: options.onStderr } : {}),
		};
		if (options?.background) {
			await sandbox.commands.run(command, { ...nativeOptions, background: true });
			return { stdout: "", stderr: "", exitCode: 0, durationMs: Date.now() - startTime };
		}
		const execution = await sandbox.commands.run(command, {
			...nativeOptions,
			background: false,
		});
		return {
			stdout: execution.stdout,
			stderr: execution.stderr,
			exitCode: execution.exitCode,
			durationMs: Date.now() - startTime,
		};
	} catch (error) {
		const result = (error as { result?: Partial<CommandResult> })?.result;
		if (result) {
			return {
				stdout: result.stdout ?? "",
				stderr: result.stderr ?? "",
				exitCode: result.exitCode ?? 1,
				durationMs: Date.now() - startTime,
			};
		}
		return {
			stdout: "",
			stderr: error instanceof Error ? error.message : String(error),
			exitCode: 127,
			durationMs: Date.now() - startTime,
		};
	}
};

/** Clone and patch one E2B-compatible provider instance without mutating the wrapper's shared table. */
export function e2bCommandsAsRoot(provider: DirectProvider): DirectProvider {
	const manager = patchableManager(provider);
	manager.methods = { ...manager.methods, runCommand: runE2bCommandAsRoot };
	return provider;
}
