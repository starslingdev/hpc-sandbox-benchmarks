// Harness-owned shell mechanics (ADR-0007 §2), written once. These express optional session
// capabilities over the one required primitive (`exec`), so consumers never ask capability
// questions: a session with a native fast path uses it, and one without gets the same behavior
// through the shell. Three byte-identical shellQuote copies and four hand-rolled nohup lines
// across the old adapters collapse into this module.

import type { ExecResult, SandboxSession } from "./port.ts";
import { succeeded } from "./port.ts";

/** POSIX single-quote escaping: the only quoting rule any of this module ever uses. */
export const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * Fire-and-forget a command. Uses the session's native `launch` when the vendor has one;
 * otherwise the classic double-fork: nohup under `sh -lc`, all stdio detached, so the exec
 * round-trip returns immediately and the command survives it. Completion is observed by the
 * caller (done-file poll), not by this call.
 */
export async function launchDetached(session: SandboxSession, command: string): Promise<void> {
	if (session.launch) {
		await session.launch(command);
		return;
	}
	await session.exec(`nohup /bin/sh -lc ${shellQuote(command)} </dev/null >/dev/null 2>&1 &`);
}

/**
 * Read a text file, via the native filesystem capability when present, `cat` otherwise.
 * Returns null when the file is unreadable — a recorded gap, not an exception to catch.
 */
export async function readTextFile(session: SandboxSession, path: string): Promise<string | null> {
	if (session.files) {
		try {
			return await session.files.readFile(path);
		} catch {
			return null;
		}
	}
	const result = await session.exec(`cat ${shellQuote(path)}`);
	return succeeded(result.exit) ? result.stdout : null;
}

/**
 * Write a text file, via the native filesystem capability when present, base64-over-exec
 * otherwise. Base64 (not a heredoc) so arbitrary content — quotes, dollar signs, newlines,
 * even NUL-free binary-ish text — survives the shell without any quoting subtleties.
 */
export async function writeTextFile(
	session: SandboxSession,
	path: string,
	text: string,
): Promise<void> {
	if (session.files) {
		await session.files.writeText(path, text);
		return;
	}
	// base64's alphabet (A-Za-z0-9+/=) can never contain a single quote, so the payload — which
	// can be multi-MB — is wrapped in literal quotes directly instead of scanned by shellQuote.
	// `Uint8Array.toBase64` is the repo's Bun-native spelling (see harness collect.ts) — no Buffer.
	const encoded = new TextEncoder().encode(text).toBase64();
	const result = await session.exec(`printf '%s' '${encoded}' | base64 -d > ${shellQuote(path)}`);
	if (!succeeded(result.exit)) {
		throw new Error(`writeTextFile(${path}) failed: ${describeFailure(result)}`);
	}
}

function describeFailure(result: ExecResult): string {
	const exit = result.exit;
	switch (exit.kind) {
		case "exited":
			return `exit ${exit.code}: ${result.stderr.trim()}`;
		case "signalled":
			return `signal ${exit.signal}`;
		case "unknown":
			return `unknown exit (${exit.detail})`;
	}
}
