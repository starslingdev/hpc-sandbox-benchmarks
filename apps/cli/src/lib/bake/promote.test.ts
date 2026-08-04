import { describe, expect, test } from "bun:test";
import {
	effectivePromotionRequirements,
	fullPromotionResult,
	promotionScopeAfterValidation,
} from "./promote.ts";

describe("effectivePromotionRequirements", () => {
	test("makes every scoped provider required without needing a redundant --require", () => {
		expect(effectivePromotionRequirements([], ["runloop"])).toEqual(["runloop"]);
	});

	test("preserves explicit requirements and leaves a full release's optional providers optional", () => {
		expect(effectivePromotionRequirements(["e2b"], ["runloop"])).toEqual(["e2b", "runloop"]);
		expect(effectivePromotionRequirements(["e2b"], undefined)).toEqual(["e2b"]);
	});
});

describe("promotionScopeAfterValidation", () => {
	test("does not publish an optional provider artifact after its candidate validation fails", () => {
		const scope = promotionScopeAfterValidation(
			["e2b", "runloop"],
			[
				{ provider: "e2b", status: "ok", durationMs: 10 },
				{
					provider: "runloop",
					status: "failed",
					reason: "candidate Blueprint did not boot",
					durationMs: 20,
				},
			],
		);

		expect(scope.eligible).toEqual(["e2b"]);
		expect(scope.rejected).toEqual([
			{
				provider: "runloop",
				status: "failed",
				reason: "candidate Blueprint did not boot",
				durationMs: 20,
			},
		]);
	});

	test("fails closed when a requested provider has no validation result", () => {
		const scope = promotionScopeAfterValidation(["runloop"], []);

		expect(scope.eligible).toEqual([]);
		expect(scope.rejected).toEqual([
			{
				provider: "runloop",
				status: "failed",
				reason: "candidate re-validation produced no result",
			},
		]);
	});
});

describe("fullPromotionResult", () => {
	test("keeps an optional validation failure visible without failing after the image commits", () => {
		const result = fullPromotionResult([
			{ provider: "runloop", status: "failed", reason: "candidate Blueprint did not boot" },
			{ provider: "image", status: "ok" },
		]);

		expect(result.ok).toBe(true);
		expect(result.reports[0]).toEqual({
			provider: "runloop",
			status: "failed",
			reason: "candidate Blueprint did not boot",
		});
	});

	test("fails when the immutable image commit fails or never happens", () => {
		expect(fullPromotionResult([{ provider: "image", status: "failed" }]).ok).toBe(false);
		expect(fullPromotionResult([{ provider: "runloop", status: "failed" }]).ok).toBe(false);
	});
});
