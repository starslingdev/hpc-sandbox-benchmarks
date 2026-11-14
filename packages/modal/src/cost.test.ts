import { describe, expect, it } from "bun:test";
import { providerCostEvidenceSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { ModalBilling } from "./cost.ts";
import { MODAL_MARKER_TAG, modalCostEvidence } from "./cost.ts";
import type { SandboxStatsGroup, SandboxStatsRequest } from "./stats.ts";

const ENV = { MODAL_TOKEN_ID: "ak-test", MODAL_TOKEN_SECRET: "as-test" };
const ATTEMPTED_AT = "2026-11-14T03:47:12.000Z";

const input = (completed = true) => ({
	cell: { runId: "run-1", providerId: "modal-vm", suite: "system", replicateIndex: 0 } as const,
	providerId: "modal-vm" as const,
	sandboxId: "sb-01M7C9GJ34MR5YMSSRR66P6VN0",
	teardown: { completed, attemptedAt: ATTEMPTED_AT },
});

const group = (cost: string, marker = "m-1"): SandboxStatsGroup => ({
	tags: { [MODAL_MARKER_TAG]: marker },
	cost,
	costByResource: { Memory: "0.00002904", CPU: (Number(cost) - 0.00002904).toFixed(8) },
});

/** Stats answer from `script` one poll at a time; the last answer repeats. */
async function capture(
	script: readonly (readonly SandboxStatsGroup[])[],
	tags: Readonly<Record<string, string>> = { [MODAL_MARKER_TAG]: "m-1" },
) {
	const requests: SandboxStatsRequest[] = [];
	const billing: ModalBilling = {
		tags: async () => tags,
		appId: async () => "ap-1",
		async *stats(request) {
			requests.push(request);
			yield* script[Math.min(requests.length - 1, script.length - 1)] ?? [];
		},
		close: () => {},
	};
	const capability = modalCostEvidence("modal-vm", {
		billing: () => billing,
		sleep: async () => {},
	});
	const parsed = providerCostEvidenceSchema(await capability.captureAfterTeardown(input(), ENV));
	if (parsed instanceof type.errors) throw new Error(parsed.summary);
	return { record: parsed, requests };
}

describe("modalCostEvidence", () => {
	it("reports the settled cost of exactly the marker-tagged sandbox", async () => {
		const { record, requests } = await capture([
			[group("0.00398890")],
			[group("0.00643345")],
			[group("0.01009681")],
		]);
		expect(record).toMatchObject({
			kind: "observed",
			amount: 0.01009681,
			source: "provider_reported",
			subject: { appId: "ap-1", appName: "sandbox-benchmarks-vm" },
			usage: [
				{ resource: "CPU", quantity: 0.01006777, unit: "USD" },
				{ resource: "Memory", quantity: 0.00002904, unit: "USD" },
			],
		});
		// Three moving reads, then four unchanged ones.
		expect(requests).toHaveLength(7);
		expect(requests[0]).toEqual({
			appId: "ap-1",
			since: new Date("2026-11-14T00:00:00.000Z"),
			groupByTags: [MODAL_MARKER_TAG],
			tags: { [MODAL_MARKER_TAG]: "m-1" },
		});
	});

	it.each([
		["still moving", Array.from({ length: 20 }, (_, i) => [group((0.001 * (i + 1)).toFixed(8))])],
		["never reported", [[]]],
	])("records a cost %s at the deadline as missing", async (_, script) => {
		const { record, requests } = await capture(script);
		expect(record).toMatchObject({ kind: "missing", reason: "provider_api_error" });
		expect(requests).toHaveLength(11);
	});

	it.each([
		["another sandbox's group", [group("0.01"), group("0.02", "m-2")]],
		["a non-decimal cost", [{ ...group("0.01"), cost: "NaN" }]],
	])("rejects %s", async (_, groups) => {
		const { record } = await capture([groups]);
		expect(record).toMatchObject({ kind: "missing", reason: "invalid_provider_response" });
	});

	it("refuses to attribute a sandbox without the marker tag", async () => {
		const { record, requests } = await capture([[group("0.01")]], {});
		expect(record).toMatchObject({ kind: "missing", reason: "not_sandbox_scoped" });
		expect(requests).toHaveLength(0);
	});

	it("never opens billing for a sandbox whose teardown was not confirmed", async () => {
		const capability = modalCostEvidence("modal-gvisor", {
			billing: () => {
				throw new Error("must not open");
			},
		});
		expect(await capability.captureAfterTeardown(input(false), ENV)).toMatchObject({
			kind: "missing",
			reason: "sandbox_teardown_unconfirmed",
			subject: { appName: "sandbox-benchmarks" },
		});
	});
});
