import { describe, expect, it } from "bun:test";
import type { SuiteName } from "@sandbox-benchmarks/schema";
import { missingCredsReason, planMatrix, resolveSelection } from "./matrix.ts";

const KNOWN = ["e2b", "daytona", "modal"] as const;

describe("resolveSelection", () => {
	it("treats 'all' (case-insensitive) and empty/unset as the whole registry", () => {
		expect(resolveSelection("all", KNOWN, "provider")).toEqual(["e2b", "daytona", "modal"]);
		expect(resolveSelection("ALL", KNOWN, "provider")).toEqual(["e2b", "daytona", "modal"]);
		expect(resolveSelection("", KNOWN, "provider")).toEqual(["e2b", "daytona", "modal"]);
		expect(resolveSelection(undefined, KNOWN, "provider")).toEqual(["e2b", "daytona", "modal"]);
	});

	it("returns a subset in REGISTRY order regardless of request order, de-duplicated", () => {
		expect(resolveSelection("modal,e2b,modal", KNOWN, "provider")).toEqual(["e2b", "modal"]);
	});

	it("tolerates surrounding whitespace in the comma list", () => {
		expect(resolveSelection(" daytona , e2b ", KNOWN, "provider")).toEqual(["e2b", "daytona"]);
	});

	it("throws on an unknown id, naming the offender and the known set", () => {
		expect(() => resolveSelection("daytona,bogus", KNOWN, "provider")).toThrow(
			/Unknown provider: bogus\. Known provider: e2b, daytona, modal/,
		);
	});
});

describe("missingCredsReason", () => {
	it("matches the harness's runSuite skip wording", () => {
		expect(missingCredsReason(["E2B_API_KEY"])).toBe("Missing credentials: E2B_API_KEY");
		expect(missingCredsReason(["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"])).toBe(
			"Missing credentials: MODAL_TOKEN_ID, MODAL_TOKEN_SECRET",
		);
	});
});

describe("planMatrix", () => {
	const suites = ["cpu-node"] as SuiteName[];

	it("keeps credentialed providers in the fan-out matrix and passes suites through", () => {
		const plan = planMatrix({
			providers: [
				{ id: "daytona", missing: [] },
				{ id: "e2b", missing: [] },
			],
			suites,
		});
		expect(plan.providers).toEqual(["daytona", "e2b"]);
		expect(plan.suites).toEqual(suites);
		expect(plan.skipped).toEqual([]);
	});

	it("drops a credential-less provider and records one skip cell per selected suite", () => {
		const plan = planMatrix({
			providers: [
				{ id: "daytona", missing: [] },
				{ id: "e2b", missing: ["E2B_API_KEY"] },
			],
			suites: ["cpu-node", "cpu-node-2"] as unknown as SuiteName[],
		});
		expect(plan.providers).toEqual(["daytona"]);
		expect(plan.skipped).toEqual([
			{
				provider: "e2b",
				suite: "cpu-node" as SuiteName,
				reason: "Missing credentials: E2B_API_KEY",
			},
			{
				provider: "e2b",
				suite: "cpu-node-2" as SuiteName,
				reason: "Missing credentials: E2B_API_KEY",
			},
		]);
	});

	it("yields an empty matrix (but no skips) when no providers were selected", () => {
		const plan = planMatrix({ providers: [], suites });
		expect(plan.providers).toEqual([]);
		expect(plan.skipped).toEqual([]);
	});

	it("can drop every provider, leaving an empty matrix and a full skip list", () => {
		const plan = planMatrix({
			providers: [
				{ id: "modal", missing: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"] },
				{ id: "e2b", missing: ["E2B_API_KEY"] },
			],
			suites,
		});
		expect(plan.providers).toEqual([]);
		expect(plan.skipped.map((s) => s.provider)).toEqual(["modal", "e2b"]);
	});
});
