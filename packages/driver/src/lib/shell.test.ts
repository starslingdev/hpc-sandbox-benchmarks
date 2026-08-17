import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExecResult, SandboxSession } from "./port.ts";
import { stubSession } from "./session.fixture.ts";
import { launchDetached, readTextFile, shellQuote, writeTextFile } from "./shell.ts";

/**
 * A session whose exec IS a local /bin/sh — so the shell mechanics are tested against a real
 * shell, not against our own idea of one. No files/launch capabilities: the fallbacks under
 * test are exactly what a capability-less vendor session exercises.
 */
function localShellSession(cwd: string): SandboxSession {
	return stubSession({
		native: cwd,
		async exec(command): Promise<ExecResult> {
			const started = Date.now();
			const child = Bun.spawnSync(["/bin/sh", "-c", command], { cwd });
			return {
				exit:
					child.exitCode !== null
						? { kind: "exited", code: child.exitCode }
						: { kind: "unknown", detail: "no exit code" },
				stdout: child.stdout.toString(),
				stderr: child.stderr.toString(),
				durationMs: Date.now() - started,
				truncated: false,
			};
		},
	});
}

function recordingSession(record: string[]): SandboxSession {
	return stubSession({
		async exec(command): Promise<ExecResult> {
			record.push(command);
			return {
				exit: { kind: "exited", code: 0 },
				stdout: "",
				stderr: "",
				durationMs: 0,
				truncated: false,
			};
		},
	});
}

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "driver-shell-"));
});
afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe("shellQuote", () => {
	test("survives quotes, spaces, dollars and newlines through a real shell", async () => {
		const session = localShellSession(dir);
		for (const hostile of [
			"plain",
			"with space",
			`single'quote`,
			`$HOME and "double"`,
			"line\nbreak",
		]) {
			const result = await session.exec(`printf '%s' ${shellQuote(hostile)}`);
			expect(result.stdout).toBe(hostile);
		}
	});
});

describe("writeTextFile / readTextFile fallbacks", () => {
	test("round-trips arbitrary content through base64-over-exec and cat", async () => {
		const session = localShellSession(dir);
		const content = `#!/bin/sh\necho "hé — $VALUE" 'single' | base64\n`;
		await writeTextFile(session, join(dir, "staged.sh"), content);
		expect(await readTextFile(session, join(dir, "staged.sh"))).toBe(content);
	});

	test("readTextFile returns null (a recorded gap) for an unreadable path", async () => {
		expect(await readTextFile(localShellSession(dir), join(dir, "missing"))).toBeNull();
	});

	test("prefers the native files capability when the session has one", async () => {
		const writes: Array<[string, string]> = [];
		const session = stubSession({
			native: null,
			files: {
				readFile: async (path) => `native:${path}`,
				exists: async () => true,
				writeText: async (path, text) => {
					writes.push([path, text]);
				},
			},
		});
		await writeTextFile(session, "/bench/a", "1");
		expect(writes).toEqual([["/bench/a", "1"]]);
		expect(await readTextFile(session, "/bench/a")).toBe("native:/bench/a");
	});
});

describe("launchDetached", () => {
	test("falls back to the nohup double-fork over exec", async () => {
		const record: string[] = [];
		await launchDetached(recordingSession(record), "bash task.sh");
		expect(record).toEqual([`nohup /bin/sh -lc 'bash task.sh' </dev/null >/dev/null 2>&1 &`]);
	});

	test("uses the session's native launch when present", async () => {
		const record: string[] = [];
		const launches: string[] = [];
		const session = stubSession({
			...recordingSession(record),
			launch: async (command) => {
				launches.push(command);
			},
		});
		await launchDetached(session, "bash task.sh");
		expect(launches).toEqual(["bash task.sh"]);
		expect(record).toEqual([]);
	});

	test("a detached command actually survives the exec round-trip", async () => {
		const session = localShellSession(dir);
		await launchDetached(
			session,
			`sleep 0.05 && printf done > ${shellQuote(join(dir, "done-file"))}`,
		);
		// The launch returned before the command finished; the done-file appears afterwards.
		expect(await readTextFile(session, join(dir, "done-file"))).toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(await readTextFile(session, join(dir, "done-file"))).toBe("done");
	});
});
