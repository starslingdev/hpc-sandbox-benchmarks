import { describe, expect, test } from "bun:test";
import { config } from "@sandbox-benchmarks/providers";
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import {
	blocksPromotion,
	candidateRefsFor,
	effectivePromotionRequirements,
	fullPromotionResult,
	promotePayload,
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

describe("blocksPromotion", () => {
	// The shared predicate both the in-process transaction and the CI gate step apply. A second
	// spelling of it in the split lane would be a gate that disagrees with the transaction it gates.
	const required = ["e2b", "daytona-vm"];

	test("a REQUIRED provider that failed blocks the release", () => {
		expect(blocksPromotion(required)({ provider: "e2b", status: "failed" })).toBe(true);
	});

	test("a best-effort provider's failure is recorded but does not block", () => {
		// daytona-container shares daytona-vm's credentials, so it runs rather than skips — its failure
		// must stay visible without failing a full publish.
		expect(blocksPromotion(required)({ provider: "daytona-container", status: "failed" })).toBe(
			false,
		);
	});

	test("a pure SKIP never blocks here — that gap is the required-providers gate's job", () => {
		// Caught later by unmetRequirements(), while the base is still unwritten, so a fixed rerun is
		// not refused at step 1. Blocking on it here would abort with a different (worse) recovery story.
		expect(blocksPromotion(required)({ provider: "e2b", status: "skipped" })).toBe(false);
	});

	test("with nothing required, any failure blocks (the lenient local default)", () => {
		expect(blocksPromotion([])({ provider: "novita", status: "failed" })).toBe(true);
	});
});

describe("candidateRefsFor", () => {
	test("swaps only the base, so a per-provider step can rebuild the preflight's refs", () => {
		const refs = candidateRefsFor("ghcr.io/x/y@sha256:deadbeef");
		expect(refs.toolchainImageCandidate).toBe("ghcr.io/x/y@sha256:deadbeef");
		expect(refs.e2bTemplateCandidate).toBe(config.e2bTemplateCandidate);
		expect(refs.vercelImageCandidate).toBe(config.vercelImageCandidate);
	});
});

describe("promotePayload", () => {
	// The `promote-payload-<run_id>` artifact contract. Both `bake --promote` and the split lane build
	// it here, so an operator cannot tell which lane produced a payload — and nothing downstream
	// (release-summary's `diagnostics:`, operator tooling) has to care.
	test("a full release records the whole registry as its scope and is not partial", () => {
		const payload = promotePayload(undefined, []);
		expect(payload.scope).toEqual(PROVIDERS.map((provider) => provider.id));
		expect(payload.partial).toBe(false);
	});

	test("a strict subset is recorded as a partial promote", () => {
		const payload = promotePayload(["runloop"], []);
		expect(payload.scope).toEqual(["runloop"]);
		expect(payload.partial).toBe(true);
	});

	test("carries the version names the release owns, not just the ones it touched", () => {
		expect(promotePayload(["runloop"], []).version).toEqual({
			image: config.toolchainImageVersion,
			e2bTemplate: config.e2bTemplateVersion,
			daytonaSnapshot: config.daytonaSnapshotDefault,
			daytonaContainerSnapshot: config.daytonaContainerSnapshotDefault,
			novitaTemplate: config.novitaTemplateVersion,
			runloopBlueprint: config.runloopBlueprintVersion,
		});
	});
});
