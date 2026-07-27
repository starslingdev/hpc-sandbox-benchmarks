import { describe, expect, it } from "bun:test";
import { neverReadyReason, READINESS_CMD, waitUntilReady } from "./readiness.ts";

/** A fake whose probes resolve/hang/fail on demand, recording every command it was asked to run. */
function fakeSandbox(outcomes: Array<"ok" | "fail" | "throw" | "hang">) {
	const commands: string[] = [];
	let probe = 0;
	return {
		commands,
		sandbox: {
			runCommand: (command: string) => {
				commands.push(command);
				const outcome = outcomes[probe++] ?? "ok";
				if (outcome === "throw") return Promise.reject(new Error("sandbox not up"));
				// Never settles — what an exec against a still-pulling container actually does.
				if (outcome === "hang") return new Promise<{ exitCode: number }>(() => {});
				return Promise.resolve({ exitCode: outcome === "ok" ? 0 : 1 });
			},
		},
	};
}

// Tests must never really sleep, and a bounded probe must not really wait out its ceiling.
const noDelay = () => Promise.resolve();

describe("waitUntilReady", () => {
	it("probes once when the sandbox is already up", async () => {
		const { sandbox, commands } = fakeSandbox(["ok"]);
		expect(await waitUntilReady(sandbox, { delay: noDelay })).toBe(true);
		expect(commands).toEqual([READINESS_CMD]);
	});

	it("retries a non-zero or throwing probe until the sandbox answers", async () => {
		const { sandbox, commands } = fakeSandbox(["fail", "throw", "ok"]);
		expect(await waitUntilReady(sandbox, { delay: noDelay })).toBe(true);
		expect(commands.length).toBe(3);
	});

	it("gives up at maxAttempts rather than spinning", async () => {
		const { sandbox, commands } = fakeSandbox(["fail", "fail", "fail", "fail"]);
		expect(await waitUntilReady(sandbox, { maxAttempts: 3, delay: noDelay })).toBe(false);
		expect(commands.length).toBe(3);
	});

	it("bounds a HANGING probe and retries it — the namespace image-pull failure mode", async () => {
		// The regression this module exists for: an exec issued against a not-yet-running container hangs
		// instead of erroring (Namespace's RunCommandSync blocks server-side for the whole image pull).
		// An unbounded probe would wait forever on attempt 1; a bounded one must cut it and try again.
		const { sandbox, commands } = fakeSandbox(["hang", "hang", "ok"]);
		expect(
			await waitUntilReady(sandbox, { probeTimeoutMs: 5, retryDelayMs: 0, delay: noDelay }),
		).toBe(true);
		expect(commands.length).toBe(3);
	});

	it("reports never-ready as a bounded, self-describing reason", async () => {
		const { sandbox } = fakeSandbox(["hang"]);
		expect(await waitUntilReady(sandbox, { maxAttempts: 1, probeTimeoutMs: 5 })).toBe(false);
		expect(neverReadyReason(1)).toContain(READINESS_CMD);
		expect(neverReadyReason(1)).toMatch(/never ready/);
	});

	it("falls back to a finite bound when handed a non-finite one", async () => {
		const { sandbox, commands } = fakeSandbox(["fail", "fail", "ok"]);
		expect(await waitUntilReady(sandbox, { maxAttempts: Number.NaN, delay: noDelay })).toBe(true);
		expect(commands.length).toBe(3);
	});
});
