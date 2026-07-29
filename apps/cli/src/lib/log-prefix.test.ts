import { describe, expect, it } from "bun:test";
import { createTaggedWriter, prefixChunk, withLineTag } from "./log-prefix.ts";

const TAG = "[r3] ";

describe("prefixChunk", () => {
	it("tags a whole line and leaves the stream at a line start", () => {
		const state = { atLineStart: true };
		expect(prefixChunk("hello\n", TAG, state)).toBe("[r3] hello\n");
		expect(state.atLineStart).toBe(true);
	});

	it("tags every line of a multi-line chunk without a dangling trailing tag", () => {
		const state = { atLineStart: true };
		expect(prefixChunk("a\nb\nc\n", TAG, state)).toBe("[r3] a\n[r3] b\n[r3] c\n");
	});

	// Every writer on the tagged path emits whole lines today, but the line cursor is shared across R
	// concurrent replicates, so a partial write must not corrupt the continuation.
	it("does not tag the continuation of a partial line", () => {
		const state = { atLineStart: true };
		expect(prefixChunk("exit ", TAG, state)).toBe("[r3] exit ");
		expect(state.atLineStart).toBe(false);
		expect(prefixChunk("0 in 4.1s\n", TAG, state)).toBe("0 in 4.1s\n");
		expect(state.atLineStart).toBe(true);
	});

	// A tagged `::error::` stops being an annotation and renders as literal text, so workflow commands
	// pass through untouched.
	it("passes workflow commands through unprefixed", () => {
		const state = { atLineStart: true };
		expect(prefixChunk("::error title=x::boom\n", TAG, state)).toBe("::error title=x::boom\n");
		expect(state.atLineStart).toBe(true);
	});

	// StepRunner.finishStep writes a step's WHOLE stdout in one call. A chunk-level `::` check made a
	// step whose first line began with `::` (an IPv6 literal) lose the tag for its entire transcript.
	it("only exempts the ::-leading LINE, still tagging the rest of the chunk", () => {
		const state = { atLineStart: true };
		expect(prefixChunk("::1 listening\nline2\nline3\n", TAG, state)).toBe(
			"::1 listening\n[r3] line2\n[r3] line3\n",
		);
	});

	// Without the forced break, a partial line from one replicate welds the next replicate's
	// annotation onto its end, where GitHub will not parse it — losing the cell's only failure signal.
	it("forces a line break so a mid-line workflow command still parses", () => {
		const state = { atLineStart: true };
		const partial = prefixChunk("progress: 42%", "[r1] ", state);
		const command = prefixChunk("::error title=t::boom\n", "[r0] ", state);
		expect(partial + command).toBe("[r1] progress: 42%\n::error title=t::boom\n");
	});

	it("still tags a line that merely contains :: away from the start", () => {
		const state = { atLineStart: true };
		expect(prefixChunk("see foo::bar\n", TAG, state)).toBe("[r3] see foo::bar\n");
	});

	it("leaves an empty chunk alone", () => {
		const state = { atLineStart: true };
		expect(prefixChunk("", TAG, state)).toBe("");
		expect(state.atLineStart).toBe(true);
	});
});

describe("createTaggedWriter + withLineTag", () => {
	/** A writer plus the chunks it received, standing in for a real stream. */
	const spyWriter = (): { write: ReturnType<typeof createTaggedWriter>; written: string[] } => {
		const written: string[] = [];
		const write = createTaggedWriter((chunk) => {
			written.push(String(chunk));
			return true;
		});
		return { write, written };
	};

	it("tags writes inside a tagged context and leaves untagged writes alone", async () => {
		const { write, written } = spyWriter();
		await withLineTag("[r1] ", async () => {
			write("inside\n");
		});
		write("outside\n");
		expect(written).toEqual(["[r1] inside\n", "outside\n"]);
	});

	// The whole point: R replicates interleave on one stream, and each line must name its sandbox.
	it("tags each concurrent replicate's lines with its own tag", async () => {
		const { write, written } = spyWriter();
		await Promise.all(
			["[r0] ", "[r1] "].map((tag) =>
				withLineTag(tag, async () => {
					write("start\n");
					await Bun.sleep(0);
					write("done\n");
				}),
			),
		);
		expect(written.toSorted()).toEqual([
			"[r0] done\n",
			"[r0] start\n",
			"[r1] done\n",
			"[r1] start\n",
		]);
	});

	it("carries the tag across an await inside the harness's async call graph", async () => {
		const { write, written } = spyWriter();
		const deepInSomeOtherPackage = async (): Promise<void> => {
			await Promise.resolve();
			write("nested\n");
		};
		await withLineTag("[r7] ", deepInSomeOtherPackage);
		expect(written).toEqual(["[r7] nested\n"]);
	});
});

// Run in a SUBPROCESS, not in-process: the thing under test is that Bun's native `console.log` — which
// writes to the fd directly instead of calling process.stdout.write — is routed through the tagging
// patch. Any in-process spy would have to replace process.stdout.write and would therefore bypass the
// very layer being asserted. A live three-replicate run is what surfaced this: the harness's own
// `console.log` step banners came out untagged while the echoed step output around them was tagged.
describe("installLineTagging end to end (subprocess)", () => {
	const MODULE = new URL("./log-prefix.ts", import.meta.url).pathname;

	const runScript = async (body: string): Promise<string> => {
		const proc = Bun.spawn(
			[
				"bun",
				"-e",
				`import { installLineTagging, withLineTag } from ${JSON.stringify(MODULE)};\n` +
					`installLineTagging();\n${body}`,
			],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
		expect(exitCode).toBe(0);
		return stdout;
	};

	it("tags console.log and process.stdout.write alike inside a tagged context", async () => {
		const stdout = await runScript(
			`await withLineTag("[r5] ", async () => {\n` +
				`  console.log("=== [step] ===");\n` +
				`  process.stdout.write("echoed\\n");\n` +
				`});`,
		);
		expect(stdout).toBe("[r5] === [step] ===\n[r5] echoed\n");
	});

	it("leaves console.log untouched outside a tagged context", async () => {
		expect(await runScript(`console.log("plain %s", "value");`)).toBe("plain value\n");
	});

	// The shape the harness actually uses on the tagged path: a message plus an Error
	// (`console.error(msg, err)` in withSandbox). Bun.inspect renders the Error, uncoloured.
	it("renders a message plus a non-string argument", async () => {
		const stdout = await runScript(
			`await withLineTag("[r2] ", async () => console.log("destroy failed:", { code: 7 }));`,
		);
		expect(stdout).toBe("[r2] destroy failed: {\n[r2]   code: 7,\n[r2] }\n");
	});

	// Pinned, not incidental: dropping node:util.format for Bun.inspect costs printf substitution, and
	// no call site in the repo uses one. If a tagged printf call is ever added, this test is the
	// tripwire that says renderArg must grow a formatter.
	it("does not substitute printf directives while tagged (documented Bun.inspect trade)", async () => {
		const stdout = await runScript(
			`await withLineTag("[r0] ", async () => console.log("plain %s", "value"));`,
		);
		expect(stdout).toBe("[r0] plain %s value\n");
	});

	// Asserted in the subprocess for the same reason as the rest of this block, plus one of its own: a
	// real `installLineTagging()` in THIS process would replace process.stdout/stderr and console.* for
	// every test file scheduled after it. `runScript` already installs once, so the call below is the
	// second — a patch that wrapped the writer twice would emit `[r4] [r4] once`.
	it("is idempotent — a second install must not double the tag", async () => {
		const stdout = await runScript(
			`installLineTagging();\nawait withLineTag("[r4] ", async () => console.log("once"));`,
		);
		expect(stdout).toBe("[r4] once\n");
	});
});
