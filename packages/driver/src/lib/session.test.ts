import { describe, expect, test } from "bun:test";
import { stubSession } from "./session.fixture.ts";
import { withSessionTeardown } from "./session.ts";

const session = (onDestroy: () => Promise<void>) => stubSession({ destroy: onDestroy });

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
			withSessionTeardown(
				session(async () => {}),
				async () => {
					throw new Error("benchmark failed");
				},
			),
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
