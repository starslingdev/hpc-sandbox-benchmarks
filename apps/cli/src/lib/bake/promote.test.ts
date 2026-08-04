import { describe, expect, test } from "bun:test";
import { promotionScopeAfterValidation } from "./promote.ts";

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
