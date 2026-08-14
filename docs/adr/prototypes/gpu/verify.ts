/**
 * Runtime proofs for kit-modal.ts's P1/P5/P6/P7 claims — runs with `bun run verify.ts`,
 * no Modal credentials needed (modal is imported type-only except NotFoundError, unused here).
 */
import assert from "node:assert/strict";
import type { ModalReadStream } from "modal";
import {
	type CreateRequest,
	type MethodTable,
	drain,
	driverFromTable,
	parseCreateRequest,
	sandboxId,
	withSessionTeardown,
} from "./kit-modal.ts";

/* P1 — parse once, deep undeclared keys, positive values */
const valid = parseCreateRequest({
	spec: { vcpus: 4, memoryGb: 8 },
	artifactRef: "im-abc123",
	deadlineMs: 60_000,
	gpu: { model: "H100", count: 1 },
});
assert.equal(valid.spec.memoryGb, 8);

const expectParseError = (input: unknown, needle: string) => {
	try {
		parseCreateRequest(input);
		assert.fail(`expected rejection containing: ${needle}`);
	} catch (error) {
		assert.match(String(error), new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
	}
};
expectParseError({ spec: { vcpus: 4, memroyGb: 8 }, artifactRef: "x", deadlineMs: 1 }, "spec.memroyGb must be removed");
expectParseError(
	{ spec: { vcpus: 4, memoryGb: 8 }, artifactRef: "x", deadlineMs: 1, gpu: { model: "H100", cout: 2, count: 1 } },
	"gpu.cout must be removed",
);
expectParseError({ spec: { vcpus: -1, memoryGb: 8 }, artifactRef: "x", deadlineMs: 1 }, "spec.vcpus must be positive");
expectParseError({ spec: { vcpus: 4, memoryGb: 8 }, artifactRef: "", deadlineMs: 1 }, "artifactRef");
console.log("P1 ok: parse-once boundary rejects deep misspellings and non-positive values");

/* P6 — a failed lazy ctx load does not brick the driver */
let attempts = 0;
const baseTable: MethodTable<string, null> = {
	create: async () => ({ handle: "h", sandboxId: sandboxId("sb-1") }),
	exec: async () => ({ exit: { kind: "exited", code: 0 }, stdout: "", stderr: "", durationMs: 0, truncated: false }),
	destroy: async () => {},
};
const flakyTable: MethodTable<string, { ready: true }> = {
	create: async () => ({ handle: "h", sandboxId: sandboxId("sb-1") }),
	exec: async () => ({ exit: { kind: "exited", code: 0 }, stdout: "", stderr: "", durationMs: 0, truncated: false }),
	destroy: async () => {},
};
const flaky = driverFromTable(flakyTable, async () => {
	attempts += 1;
	if (attempts === 1) throw new Error("transient plumbing failure");
	return { ready: true };
});
const request: CreateRequest = valid;
await assert.rejects(() => flaky.create(request), /transient plumbing failure/);
const session = await flaky.create(request); // would replay the memoized rejection before P6
assert.equal(attempts, 2);
console.log("P6 ok: transient ctx failure retried, driver not bricked");

/* P4 — artifact mismatch fails loudly (and destroys the just-created sandbox) */
let destroyed = 0;
const mismatchTable: MethodTable<string, null> = {
	...baseTable,
	create: async () => ({ handle: "h", sandboxId: sandboxId("sb-2"), artifactRef: "im-OTHER" }),
	destroy: async () => {
		destroyed += 1;
	},
};
const mismatch = driverFromTable(mismatchTable, async () => null);
await assert.rejects(() => mismatch.create(request), /artifact mismatch: request says im-abc123, driver booted im-OTHER/);
assert.equal(destroyed, 1);
console.log("P4 ok: request-vs-booted artifact contradiction fails create and tears down");

/* P5 — teardown preserves the primary error */
const failingSession = await (async () => {
	const table: MethodTable<string, null> = {
		...baseTable,
		destroy: async () => {
			throw new Error("teardown exploded");
		},
	};
	return driverFromTable(table, async () => null).create(request);
})();
try {
	await withSessionTeardown(failingSession, async () => {
		throw new Error("benchmark failed");
	});
	assert.fail("expected SuppressedError");
} catch (error) {
	assert.ok(error instanceof SuppressedError);
	assert.match(String((error as SuppressedError).error), /teardown exploded/);
	assert.match(String((error as SuppressedError).suppressed), /benchmark failed/);
}
console.log("P5 ok: SuppressedError carries both the teardown and the primary error");

/* P7 — streaming decoder survives split UTF-8; cap is opt-in and flagged */
const fakeStream = (chunks: (string | Uint8Array)[]): ModalReadStream<string> => {
	let i = 0;
	return {
		getReader: () => ({
			read: async () =>
				i < chunks.length ? { done: false, value: chunks[i++] as string } : { done: true, value: undefined },
			releaseLock: () => {},
		}),
	} as unknown as ModalReadStream<string>;
};
const eAcute = new TextEncoder().encode("héllo");
const splitAt = 2; // splits the 2-byte é across chunks
const decoded = await drain(fakeStream([eAcute.slice(0, splitAt), eAcute.slice(splitAt)]));
assert.equal(decoded.text, "héllo");
assert.equal(decoded.truncated, false);
const capped = await drain(fakeStream(["a".repeat(100)]), 10);
assert.equal(capped.text.length, 10);
assert.equal(capped.truncated, true);
const uncapped = await drain(fakeStream(["a".repeat(100)]));
assert.equal(uncapped.truncated, false);
console.log("P7 ok: split UTF-8 decodes intact; caps are opt-in and reported");

console.log("verify.ts: all runtime proofs passed");
