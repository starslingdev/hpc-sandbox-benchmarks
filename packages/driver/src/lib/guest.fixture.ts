// An in-memory guest shell faithful to exactly the command shapes the kit emits, shared by the
// conformance suite's fake drivers and the vendor kit's memoryVendor. This matters: the "fallback is
// tested, not skipped" rule is only true if the fake actually executes base64-chunked writes, `mv`,
// `cat` and the shell-detach launcher rather than pattern-matching them away. `.fixture.ts` (repo
// convention) so the test runner does not treat it as a suite.

export interface GuestOutcome {
	readonly stdout: string;
	readonly stderr: string;
	readonly code: number;
}

export interface GuestShellOptions {
	/** Swallow detached launches so no done-file ever appears. */
	readonly swallowLaunch?: boolean;
	/** Answer one simple command before the modelled grammar (for example a probe's fixed output). */
	readonly answer?: (
		command: string,
	) => { readonly stdout: string; readonly code: number } | undefined;
}

const unquote = (value: string): string =>
	value.startsWith("'") && value.endsWith("'")
		? value.slice(1, -1).replaceAll(`'\\''`, "'")
		: value;

/** A guest whose filesystem is `files`; returns the function that runs one exec'd command. */
export function guestShell(
	files: Map<string, string>,
	options: GuestShellOptions = {},
): (command: string) => GuestOutcome {
	const runSimple = (raw: string): { stdout: string; code: number } => {
		const command = raw.trim();
		const answered = options.answer?.(command);
		if (answered !== undefined) return answered;
		if (command.length === 0 || /^sleep /.test(command)) return { stdout: "", code: 0 };

		const exitCode = /^exit (\d+)$/.exec(command);
		if (exitCode?.[1] !== undefined) return { stdout: "", code: Number(exitCode[1]) };

		const nohup = /^nohup \/bin\/sh -lc ('(?:[^']|'\\'')*')/.exec(command);
		if (nohup?.[1] !== undefined) {
			// runSimple, not runScript: the inner is a single `sh -c '…; …'` invocation, and splitting
			// on `;` before unquoting tears the quoted script apart — which silently broke the
			// shell-detach fallback this fake exists to exercise.
			if (!options.swallowLaunch) runSimple(unquote(nohup[1]));
			return { stdout: "", code: 0 };
		}

		const nested = /^sh -c ('(?:[^']|'\\'')*')$/.exec(command);
		// Propagate the inner status: a wrapper that swallowed it would make the fake itself commit
		// the exit-code fabrication the conformance suite exists to catch.
		if (nested?.[1] !== undefined) return runScript(unquote(nested[1]));

		const truncate = /^: > (\S+)$/.exec(command);
		if (truncate?.[1] !== undefined) {
			files.set(unquote(truncate[1]), "");
			return { stdout: "", code: 0 };
		}

		const append = /^printf '%s' '([^']*)' \| base64 -d >> (\S+)$/.exec(command);
		if (append?.[1] !== undefined && append[2] !== undefined) {
			const path = unquote(append[2]);
			const decoded = new TextDecoder().decode(Uint8Array.fromBase64(append[1]));
			files.set(path, (files.get(path) ?? "") + decoded);
			return { stdout: "", code: 0 };
		}

		const move = /^mv (\S+) (\S+)$/.exec(command);
		if (move?.[1] !== undefined && move[2] !== undefined) {
			const from = unquote(move[1]);
			const to = unquote(move[2]);
			const body = files.get(from);
			if (body === undefined) return { stdout: "", code: 1 };
			files.delete(from);
			files.set(to, body);
			return { stdout: "", code: 0 };
		}

		const read = /^cat (\S+)$/.exec(command);
		if (read?.[1] !== undefined) {
			const body = files.get(unquote(read[1]));
			return body === undefined ? { stdout: "", code: 1 } : { stdout: body, code: 0 };
		}

		const exists = /^test -e (\S+)$/.exec(command);
		if (exists?.[1] !== undefined)
			return { stdout: "", code: files.has(unquote(exists[1])) ? 0 : 1 };

		const remove = /^rm -f (\S+)$/.exec(command);
		if (remove?.[1] !== undefined) {
			files.delete(unquote(remove[1]));
			return { stdout: "", code: 0 };
		}

		const redirect = /^echo (\S+) > (\S+)$/.exec(command);
		if (redirect?.[1] !== undefined && redirect[2] !== undefined) {
			files.set(unquote(redirect[2]), `${redirect[1]}\n`);
			return { stdout: "", code: 0 };
		}

		if (command === "echo out") return { stdout: "out\n", code: 0 };
		if (command === "echo err 1>&2") return { stdout: "", code: 0 };
		return { stdout: "", code: 127 };
	};

	/** Run a `;`-separated script, stopping at the first nonzero status. */
	const runScript = (script: string): { stdout: string; code: number } => {
		let stdout = "";
		let code = 0;
		for (const part of script.split(";")) {
			const result = runSimple(part);
			stdout += result.stdout;
			code = result.code;
			if (code !== 0) break;
		}
		return { stdout, code };
	};

	return (command) => {
		// The launch wrapper carries shell bookkeeping past the nohup; only its head is modelled.
		const script = command.startsWith("nohup ")
			? (command.split(" & child=$!")[0] ?? command)
			: command;
		// runSimple, not runScript: splitting on `;` first would tear apart a quoted `sh -c '…; …'`.
		const result = runSimple(script);
		const stderr = script.includes("echo err 1>&2") ? "err\n" : "";
		return { stdout: result.stdout, stderr, code: result.code };
	};
}
