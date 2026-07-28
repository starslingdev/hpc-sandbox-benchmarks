// The crowning rule, tested against rows directly — no board, no fixture, no renderer. This is what
// the seam bought: the decision that most affects whether the figure is honest is now assertable in
// isolation from everything it is later assembled into.
import { describe, expect, it } from "bun:test";
import { row } from "./__fixtures__/board.ts";
import { emphasisOf, leaderIsEstablished, rankLabel } from "./emphasis.ts";

describe("leaderIsEstablished", () => {
	it("is true when rank 1 is unique and the runner-up is separated", () => {
		expect(
			leaderIsEstablished([
				row({ providerId: "a", rank: 1 }),
				row({ providerId: "b", rank: 2, verdict: "separated" }),
			]),
		).toBe(true);
	});

	it("is false when the runner-up is underpowered — the test could not have separated them at all", () => {
		expect(
			leaderIsEstablished([
				row({ providerId: "a", rank: 1 }),
				row({ providerId: "b", rank: 2, verdict: "underpowered" }),
			]),
		).toBe(false);
	});

	it("is false when the runner-up is a statistical tie", () => {
		expect(
			leaderIsEstablished([
				row({ providerId: "a", rank: 1 }),
				row({ providerId: "b", rank: 2, verdict: "tied" }),
			]),
		).toBe(false);
	});

	it("is false when the comparison was never tested", () => {
		expect(
			leaderIsEstablished([
				row({ providerId: "a", rank: 1 }),
				row({ providerId: "b", rank: 2, verdict: "untested" }),
			]),
		).toBe(false);
	});

	it("is false when rank 1 is shared — a cohort is not a winner", () => {
		expect(
			leaderIsEstablished([
				row({ providerId: "a", rank: 1 }),
				row({ providerId: "b", rank: 1, verdict: "separated", tiedWithAbove: "statistical" }),
			]),
		).toBe(false);
	});

	it("is false for a sole provider — it leads nothing", () => {
		expect(leaderIsEstablished([row({ providerId: "a", rank: 1 })])).toBe(false);
	});

	it("is false for an empty board", () => {
		expect(leaderIsEstablished([])).toBe(false);
	});
});

describe("emphasisOf", () => {
	it("crowns rank 1 only when the leader is established", () => {
		const first = row({ providerId: "a", rank: 1 });
		expect(emphasisOf(first, true)).toBe("lead");
		expect(emphasisOf(first, false)).toBe("muted");
	});

	it("never crowns a row below rank 1, even on an established board", () => {
		expect(emphasisOf(row({ providerId: "b", rank: 2, verdict: "separated" }), true)).toBe(
			"separated",
		);
	});

	it("mutes any row whose rank the test did not establish", () => {
		for (const verdict of ["tied", "underpowered", "untested"] as const) {
			expect(emphasisOf(row({ providerId: "b", rank: 2, verdict }), true)).toBe("muted");
		}
	});
});

describe("rankLabel", () => {
	it("marks a shared rank so the column cannot read as a strict ordering", () => {
		expect(rankLabel(row({ providerId: "b", rank: 3, tiedWithAbove: "statistical" }))).toBe("=3");
		expect(rankLabel(row({ providerId: "b", rank: 3, tiedWithAbove: "identical-value" }))).toBe(
			"=3",
		);
	});

	it("leaves an unshared rank bare", () => {
		expect(rankLabel(row({ providerId: "a", rank: 3 }))).toBe("3");
	});
});
