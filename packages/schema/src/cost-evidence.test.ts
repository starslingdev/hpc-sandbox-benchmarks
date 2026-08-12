import { describe, expect, it } from "bun:test";
import type { ObservedProviderCostEvidence, ProviderCostEvidence } from "./index.ts";
import {
	providerCostEvidenceSchema,
	providerCostTotal,
	providerResponseJsonSchema,
} from "./index.ts";

function observed(
	overrides: Partial<ObservedProviderCostEvidence> = {},
): ObservedProviderCostEvidence {
	return {
		kind: "observed",
		cell: { runId: "run-1", providerId: "modal-gvisor", suite: "cpu-node" },
		subject: { kind: "sandbox", sandboxId: "sb-1" },
		capturedAt: "2026-08-08T00:00:00.000Z",
		sdk: { packageName: "vendor-sdk", version: "1.2.3" },
		apiOperation: "sandboxes.getUsage",
		usage: [{ resource: "cpu", quantity: 2, unit: "CPU-seconds" }],
		amount: 0,
		currency: "USD",
		source: "provider_reported",
		responseJson: '{"amount":0}',
		...overrides,
	};
}

describe("provider cost evidence", () => {
	it("uses the canonical Run, provider, and suite identity vocabularies", () => {
		expect(providerCostEvidenceSchema.allows(observed())).toBe(true);
		expect(
			providerCostEvidenceSchema.allows(
				observed({ cell: { runId: "../run", providerId: "modal-gvisor", suite: "cpu-node" } }),
			),
		).toBe(false);
		expect(
			providerCostEvidenceSchema.allows({
				...observed(),
				cell: { runId: "run-1", providerId: "unknown", suite: "unknown" },
			}),
		).toBe(false);
	});

	it("accepts explicit provider-reported zero but requires sandbox attribution", () => {
		expect(providerCostEvidenceSchema.allows(observed())).toBe(true);
		expect(providerCostTotal([observed()], [observed().cell])).toEqual({
			amount: 0,
			currency: "USD",
		});
		expect(
			providerCostEvidenceSchema.allows(
				observed({ subject: { kind: "sandbox", organizationId: "org-shared" } }),
			),
		).toBe(false);
	});

	it("requires rate provenance only for calculated provider usage", () => {
		const calculated = observed({
			source: "calculated_from_provider_usage",
			calculation: {
				componentIds: ["cpu"],
				rateVerifiedAt: "2026-08-08",
				sourceUrls: ["https://vendor.invalid/pricing"],
			},
		});
		expect(providerCostEvidenceSchema.allows(calculated)).toBe(true);
		const { calculation: _calculation, ...without } = calculated;
		expect(providerCostEvidenceSchema.allows(without)).toBe(false);
	});

	it("requires canonical object/array response JSON", () => {
		expect(providerResponseJsonSchema.allows('{"a":1,"b":2}')).toBe(true);
		expect(providerResponseJsonSchema.allows('{ "b": 2, "a": 1 }')).toBe(false);
		expect(providerResponseJsonSchema.allows("0")).toBe(false);
		expect(providerResponseJsonSchema.allows("not-json")).toBe(false);
		expect(
			providerResponseJsonSchema.allows(
				JSON.stringify({ values: new Array(9).fill("é".repeat(8_000)) }),
			),
		).toBe(false);
		let nested: unknown = {};
		for (let index = 0; index < 18; index++) nested = { nested };
		expect(providerResponseJsonSchema.allows(JSON.stringify(nested))).toBe(false);
		expect(providerResponseJsonSchema.allows(JSON.stringify(new Array(1_025).fill(0)))).toBe(false);
	});

	it("bounds evidence strings and provenance/resource arrays", () => {
		expect(
			providerCostEvidenceSchema.allows({ ...observed(), apiOperation: "x".repeat(257) }),
		).toBe(false);
		expect(
			providerCostEvidenceSchema.allows({
				...observed(),
				usage: new Array(129).fill(observed().usage[0]),
			}),
		).toBe(false);
		expect(
			providerCostEvidenceSchema.allows(
				observed({
					source: "calculated_from_provider_usage",
					calculation: {
						componentIds: new Array(65).fill("cpu"),
						rateVerifiedAt: "2026-08-08",
						sourceUrls: ["https://vendor.invalid/pricing"],
					},
				}),
			),
		).toBe(false);
		expect(
			providerCostEvidenceSchema.allows({
				kind: "missing",
				cell: observed().cell,
				subject: observed().subject,
				capturedAt: observed().capturedAt,
				sdk: observed().sdk,
				reason: "provider_api_error",
				detail: "x".repeat(513),
			}),
		).toBe(false);
	});

	it("returns no exact total for empty, missing, duplicate, reused-sandbox, or mixed-currency sets", () => {
		const missing: ProviderCostEvidence = {
			kind: "missing",
			cell: { runId: "run-1", providerId: "modal-gvisor", suite: "cpu-node" },
			subject: { kind: "sandbox", sandboxId: "sb-1" },
			capturedAt: "2026-08-08T00:00:00.000Z",
			sdk: { packageName: "vendor-sdk", version: "1.2.3" },
			reason: "unsupported_public_api",
			detail: "No public sandbox usage endpoint.",
		};
		expect(providerCostTotal([], [])).toBeNull();
		expect(providerCostTotal([missing], [missing.cell])).toBeNull();
		const first = observed({ amount: 1 });
		expect(
			providerCostTotal(
				[first, observed({ subject: { kind: "sandbox", sandboxId: "sb-2" } })],
				[first.cell],
			),
		).toBeNull();
		const secondCell = { ...first.cell, suite: "memory" as const };
		expect(providerCostTotal([first], [first.cell, secondCell])).toBeNull();
		const second = observed({
			cell: secondCell,
			subject: { kind: "sandbox", sandboxId: "sb-2" },
			amount: 2,
		});
		expect(providerCostTotal([second, first], [first.cell, secondCell])).toEqual({
			amount: 3,
			currency: "USD",
		});
		expect(providerCostTotal([first], [first.cell, first.cell])).toBeNull();
		expect(
			providerCostTotal(
				[
					first,
					observed({
						cell: secondCell,
						subject: { kind: "sandbox", sandboxId: "sb-1" },
					}),
				],
				[first.cell, secondCell],
			),
		).toBeNull();
		expect(
			providerCostTotal(
				[
					first,
					observed({
						cell: secondCell,
						subject: { kind: "sandbox", sandboxId: "sb-2" },
						currency: "EUR",
					}),
				],
				[first.cell, secondCell],
			),
		).toBeNull();
		expect(providerCostTotal([first], [{ ...first.cell, suite: "system" }])).toBeNull();
	});

	it("runtime-validates expected cells and evidence rather than trusting TypeScript callers", () => {
		const valid = observed({ amount: 1 });
		expect(
			providerCostTotal(
				[valid],
				[{ ...valid.cell, suite: "unknown" } as unknown as typeof valid.cell],
			),
		).toBeNull();
		expect(
			providerCostTotal([{ ...valid, amount: -1 } as ObservedProviderCostEvidence], [valid.cell]),
		).toBeNull();
		expect(
			providerCostTotal(
				[{ ...valid, currency: "usd" } as ObservedProviderCostEvidence],
				[valid.cell],
			),
		).toBeNull();
		expect(
			providerCostTotal(
				[{ ...valid, responseJson: "not-json" } as ObservedProviderCostEvidence],
				[valid.cell],
			),
		).toBeNull();
	});
});
