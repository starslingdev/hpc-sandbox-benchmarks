import { describe, expect, test } from "bun:test";
import { DriverError } from "./errors.ts";
import { pollUntilReady } from "./poll.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("pollUntilReady", () => {
	test("returns the first ready value inside the shared deadline", async () => {
		let polls = 0;
		await expect(
			pollUntilReady({
				provider: "tama",
				deadlineMs: 100,
				intervalMs: 1,
				poll: async () => (++polls === 2 ? "ready" : null),
			}),
		).resolves.toBe("ready");
		expect(polls).toBe(2);
	});

	test("does not accept a value whose probe resolves after the deadline", async () => {
		const error = await pollUntilReady({
			provider: "tama",
			deadlineMs: 10,
			intervalMs: 1,
			poll: async () => {
				await delay(30);
				return "late";
			},
		}).catch((caught) => caught);
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("readiness-timeout");
	});

	test("bounds a probe that never resolves", async () => {
		const started = Date.now();
		await expect(
			pollUntilReady({
				provider: "tama",
				deadlineMs: 15,
				intervalMs: 1,
				poll: () => new Promise<null>(() => {}),
			}),
		).rejects.toMatchObject({ code: "readiness-timeout" });
		expect(Date.now() - started).toBeLessThan(100);
	});
});
