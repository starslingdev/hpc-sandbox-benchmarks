import { describe, expect, it } from "bun:test";
import { createStderrRedirect, withStdoutQuarantined } from "./stdout-guard.ts";

describe("createStderrRedirect", () => {
	it("diverts a chunk to the stderr writer it was given", () => {
		const seen: unknown[] = [];
		const redirect = createStderrRedirect(((chunk: unknown) => {
			seen.push(chunk);
			return true;
		}) as typeof process.stderr.write);
		redirect("hello");
		expect(seen).toEqual(["hello"]);
	});

	// `write` has two overloads (`chunk, cb` and `chunk, encoding, cb`). Collapsing them would drop a
	// caller's callback and hang a stream waiting on its drain.
	it("forwards the encoding and callback arguments untouched", () => {
		const seen: unknown[][] = [];
		const redirect = createStderrRedirect(((...args: unknown[]) => {
			seen.push(args);
			return true;
		}) as typeof process.stderr.write);
		const callback = () => {};
		redirect("hello", "utf8", callback);
		expect(seen[0]).toEqual(["hello", "utf8", callback]);
	});
});

describe("withStdoutQuarantined", () => {
	/** Capture what reaches each stream while `fn` runs, without touching the real terminal. */
	async function capture(fn: () => Promise<void>): Promise<{ out: string; err: string }> {
		const realOut = process.stdout.write.bind(process.stdout);
		const realErr = process.stderr.write.bind(process.stderr);
		let out = "";
		let err = "";
		process.stdout.write = ((chunk: unknown) => {
			out += String(chunk);
			return true;
		}) as typeof process.stdout.write;
		process.stderr.write = ((chunk: unknown) => {
			err += String(chunk);
			return true;
		}) as typeof process.stderr.write;
		try {
			await fn();
		} finally {
			process.stdout.write = realOut;
			process.stderr.write = realErr;
		}
		return { out, err };
	}

	it("diverts a direct process.stdout.write made inside the quarantine", async () => {
		const { out } = await capture(async () => {
			await withStdoutQuarantined(async () => {
				process.stdout.write("progress\n");
			});
		});
		expect(out).toBe("");
	});

	/**
	 * Run `body` inside a quarantine in a REAL subprocess and return its actual streams.
	 *
	 * In-process capture cannot verify the console half at all: Bun's `console.*` writes to the file
	 * descriptor natively, bypassing `process.stderr.write` — which is the very fact the redirect
	 * exists for (see ./log-prefix.ts's incident note). Only a child's real fds can show where the
	 * bytes went, which is also exactly how the bin is used: `bench-local > run.json`.
	 */
	async function runChild(body: string): Promise<{ out: string; err: string }> {
		const guard = new URL("./stdout-guard.ts", import.meta.url).pathname;
		const code = `
			const { withStdoutQuarantined } = await import(${JSON.stringify(guard)});
			const { emit } = await withStdoutQuarantined(async () => { ${body} });
			emit('{"schemaVersion":"5"}\\n');
		`;
		const proc = Bun.spawn(["bun", "-e", code], { stdout: "pipe", stderr: "pipe" });
		const [out, err] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
		]);
		await proc.exited;
		return { out, err };
	}

	// Patching the stream alone is NOT enough: Bun's console.log writes to the fd natively rather than
	// calling process.stdout.write — the incident ./log-prefix.ts documents. Every console.log in
	// packages/harness would otherwise land in the middle of the JSON document.
	it("diverts console.log/info/debug, which bypass the stream patch", async () => {
		const { out, err } = await runChild(`
			console.log("from console.log");
			console.info("from console.info");
			console.debug("from console.debug");
			process.stdout.write("from stream write\\n");
		`);
		// The whole contract: stdout carries the document and nothing else.
		expect(out).toBe('{"schemaVersion":"5"}\n');
		expect(err).toContain("from console.log");
		expect(err).toContain("from console.info");
		expect(err).toContain("from console.debug");
		expect(err).toContain("from stream write");
	});

	it("hands back a writer that reaches the real stdout", async () => {
		const { out, err } = await runChild(`console.log("noise");`);
		expect(JSON.parse(out)).toEqual({ schemaVersion: "5" });
		expect(err).toContain("noise");
	});

	it("returns the wrapped function's value", async () => {
		const { result } = await withStdoutQuarantined(async () => 42);
		expect(result).toBe(42);
	});

	it("restores stdout and console on the throwing path", async () => {
		const before = { write: process.stdout.write, log: console.log };
		await expect(
			withStdoutQuarantined(async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect(process.stdout.write).toBe(before.write);
		expect(console.log).toBe(before.log);
	});

	it("restores them on the success path too", async () => {
		const before = { write: process.stdout.write, log: console.log };
		await withStdoutQuarantined(async () => {});
		expect(process.stdout.write).toBe(before.write);
		expect(console.log).toBe(before.log);
	});
});
