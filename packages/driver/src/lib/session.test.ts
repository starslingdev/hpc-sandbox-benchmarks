import { describe, expect, test } from "bun:test";
import type { SandboxSession } from "./port.ts";
import { sandboxRef } from "./port.ts";
import { withSessionTeardown } from "./session.ts";

function session(onDestroy: () => Promise<void>): SandboxSession {
	return {
		sandboxRef: sandboxRef("tama", "m-1"),
		artifactRef: "im-1",
		native: null,
		async exec() {
			return { exit: { kind: "exited", code: 0 }, stdout: "", stderr: "", durationMs: 0, truncated: false };
		},
		destroy: onDestroy,
	};
}

describe("withSessionTeardown", () => {
	test("destroys exactly once on success and returns the work's result", async () => {
		let destroys = 0;
		const result = await withSessionTeardown(
			session(async () => {
				destroys += 1;
			}),
			async () => "measured",
		);
		expect(result).toBe("measured");
		expect(destroys).toBe(1);
	});

	test("a work failure with clean teardown propagates the work failure", async () => {
		await expect(
			withSessionTeardown(session(async () => {}), async () => {
				throw new Error("benchmark failed");
			}),
		).rejects.toThrow("benchmark failed");
	});

	test("a teardown-only failure propagates plainly", async () => {
		await expect(
			withSessionTeardown(
				session(async () => {
					throw new Error("teardown exploded");
				}),
				async () => "fine",
			),
		).rejects.toThrow("teardown exploded");
	});

	test("a double fault preserves BOTH errors as SuppressedError", async () => {
		try {
			await withSessionTeardown(
				session(async () => {
					throw new Error("teardown exploded");
				}),
				async () => {
					throw new Error("benchmark failed");
				},
			);
			expect.unreachable("expected SuppressedError");
		} catch (error) {
			expect(error).toBeInstanceOf(SuppressedError);
			const suppressed = error as SuppressedError;
			expect(String(suppressed.error)).toContain("teardown exploded");
			expect(String(suppressed.suppressed)).toContain("benchmark failed");
		}
	});
});
