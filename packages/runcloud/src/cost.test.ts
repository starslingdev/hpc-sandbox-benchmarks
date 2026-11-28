import { describe, expect, it } from "bun:test";
import { RunCloudError } from "@run-cloud/sdk";
import { billedWallSeconds, providerCostEvidenceSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { runcloudCostEvidenceWith } from "./cost.ts";

const ENV = { RUN_CLOUD_API_KEY: "rc-test" };
const SANDBOX = "sbx_3f2a9c";

const input = (completed = true) => ({
	cell: { runId: "run-1", providerId: "runcloud", suite: "system", replicateIndex: 0 } as const,
	providerId: "runcloud" as const,
	sandboxId: SANDBOX,
	teardown: { completed, attemptedAt: "2026-11-28T10:01:05.000Z" },
});

const body = (status: "accruing" | "final", extra: Record<string, unknown> = {}) => ({
	sandboxId: SANDBOX,
	status,
	currency: "USD",
	totalNanodollars: "494820",
	totalUsd: "0.00049482",
	lines: [
		{ meter: "cpu", nanodollars: "147600", quantity: "60", unit: "vcpu_second" },
		{ meter: "memory", nanodollars: "199620", quantity: "240", unit: "gib_second" },
		{ meter: "cpu_burst", nanodollars: "147600", quantity: "60", unit: "vcpu_second" },
	],
	startedAt: "2026-11-28T10:00:00.000Z",
	endedAt: "2026-11-28T10:01:00.000Z",
	meteredThrough: status === "final" ? "2026-11-28T10:01:00.000Z" : null,
	asOf: "2026-11-28T10:01:06.000Z",
	availableUntil: null,
	...extra,
});

/** Reads answer from `script` one call at a time; the last answer repeats. A function throws. */
async function capture(script: readonly (unknown | (() => never))[], completed = true) {
	const reads: string[] = [];
	let clock = 0;
	const capability = runcloudCostEvidenceWith({
		read: async (apiKey, sandboxId) => {
			expect(apiKey).toBe(ENV.RUN_CLOUD_API_KEY);
			reads.push(sandboxId);
			const answer = script[Math.min(reads.length - 1, script.length - 1)];
			return typeof answer === "function" ? (answer as () => never)() : answer;
		},
		sleep: async (ms) => {
			clock += ms;
		},
		now: () => clock,
	});
	const parsed = providerCostEvidenceSchema(
		await capability.captureAfterTeardown(input(completed), ENV),
	);
	if (parsed instanceof type.errors) throw new Error(parsed.summary);
	return { record: parsed, reads };
}

describe("runcloudCostEvidence", () => {
	it("records a final bill as provider-reported USD with its lines and lifetime", async () => {
		const { record, reads } = await capture([body("final")]);
		expect(reads).toEqual([SANDBOX]);
		expect(record).toMatchObject({
			kind: "observed",
			subject: { kind: "sandbox", sandboxId: SANDBOX },
			apiOperation: "GET /run-cloud/sandboxes/{id}/cost",
			amount: 0.00049482,
			currency: "USD",
			source: "provider_reported",
		});
		if (record.kind !== "observed") throw new Error("unreachable");
		expect(billedWallSeconds(record)).toBe(60);
		expect(record.usage).toContainEqual({
			resource: "billed_cpu_burst",
			quantity: 60,
			unit: "vcpu_second",
		});
		expect(JSON.parse(record.responseJson).status).toBe("final");
	});

	it("waits for an accruing bill to become final", async () => {
		const { record, reads } = await capture([body("accruing"), body("accruing"), body("final")]);
		expect(reads).toHaveLength(3);
		expect(record.kind).toBe("observed");
	});

	it("never records an accruing bill, even at the deadline", async () => {
		const { record, reads } = await capture([body("accruing")]);
		expect(reads.length).toBeGreaterThan(1);
		expect(record).toMatchObject({ kind: "missing", reason: "provider_api_error" });
		if (record.kind !== "missing") throw new Error("unreachable");
		expect(JSON.parse(record.responseJson ?? "{}").status).toBe("accruing");
	});

	it("does not read a bill when teardown was not confirmed", async () => {
		const { record, reads } = await capture([body("final")], false);
		expect(reads).toEqual([]);
		expect(record).toMatchObject({ kind: "missing", reason: "sandbox_teardown_unconfirmed" });
	});

	it("records an API failure with its status", async () => {
		const { record } = await capture([
			() => {
				throw new RunCloudError(404, "Not found");
			},
		]);
		expect(record).toMatchObject({ kind: "missing", reason: "provider_api_error" });
		if (record.kind !== "missing") throw new Error("unreachable");
		expect(record.detail).toContain("HTTP 404");
	});

	it("rejects a body for another sandbox or of the wrong shape", async () => {
		expect((await capture([body("final", { sandboxId: "sbx_other" })])).record).toMatchObject({
			kind: "missing",
			reason: "invalid_provider_response",
		});
		expect((await capture([body("final", { totalNanodollars: 1.5 })])).record).toMatchObject({
			kind: "missing",
			reason: "invalid_provider_response",
		});
	});
});
