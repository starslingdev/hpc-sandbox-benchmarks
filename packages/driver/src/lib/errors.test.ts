import { describe, expect, test } from "bun:test";
import type { FailedCreateRecovery } from "./errors.ts";
import { FailedCreateCleanupError } from "./errors.ts";

function retainedError(locator: FailedCreateRecovery["locator"], cleanup = async () => {}) {
	return new FailedCreateCleanupError(new Error("cleanup failed"), new Error("create failed"), {
		provider: "tama",
		locator,
		cleanup,
	});
}

describe("FailedCreateCleanupError", () => {
	test("owns inherited and non-enumerable marker fields instead of spreading their container", () => {
		const inherited = Object.create({ kind: "marker" }) as object;
		Object.defineProperties(inherited, {
			key: { value: "attempt", enumerable: false },
			value: { value: "abc", enumerable: false },
		});
		const error = retainedError(inherited as FailedCreateRecovery["locator"]);
		expect(error.locator).toEqual({ kind: "marker", key: "attempt", value: "abc" });
		expect(Object.isFrozen(error.locator)).toBe(true);
		expect(error.message).toContain("marker attempt=abc");
	});

	test("single-reads stateful locator accessors into one stable snapshot", () => {
		const reads = { kind: 0, key: 0, value: 0 };
		const locator = {
			get kind() {
				if (++reads.kind > 1) throw new Error("kind reread");
				return "marker" as const;
			},
			get key() {
				if (++reads.key > 1) throw new Error("key reread");
				return "externalId";
			},
			get value() {
				if (++reads.value > 1) throw new Error("value reread");
				return "stable";
			},
		};
		const error = retainedError(locator);
		expect(error.locator).toEqual({ kind: "marker", key: "externalId", value: "stable" });
		expect(reads).toEqual({ kind: 1, key: 1, value: 1 });
	});

	test("retains callback-only cleanup when a marker accessor throws", async () => {
		let cleanupCalls = 0;
		const locator = {
			kind: "marker" as const,
			get key(): string {
				throw new Error("raw locator secret");
			},
			value: "stable",
		};
		const error = retainedError(locator, async () => {
			cleanupCalls += 1;
		});
		expect(error.locator).toEqual({ kind: "cleanup-callback" });
		expect(error.message).toContain("retained cleanup callback");
		expect(error.message).not.toContain("raw locator secret");
		await error.cleanup();
		expect(cleanupCalls).toBe(1);
	});
});
