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

	test("cancels an interval sleep without starting another probe", async () => {
		const cancellation = new AbortController();
		let polls = 0;
		const polling = pollUntilReady({
			provider: "tama",
			deadlineMs: 10_000,
			intervalMs: 5_000,
			signal: cancellation.signal,
			poll: async () => {
				polls++;
				return null;
			},
		});
		await delay(5);
		const reason = new Error("shutdown");
		cancellation.abort(reason);
		await expect(polling).rejects.toBe(reason);
		expect(polls).toBe(1);
	});

	test("subscribes before a poll can synchronously abort", async () => {
		const cancellation = new AbortController();
		const reason = new Error("synchronous shutdown");
		const polling = pollUntilReady({
			provider: "tama",
			deadlineMs: 1_000,
			intervalMs: 1,
			signal: cancellation.signal,
			poll: () => {
				cancellation.abort(reason);
				return new Promise<null>(() => {});
			},
		});
		await expect(polling).rejects.toBe(reason);
	});
});
