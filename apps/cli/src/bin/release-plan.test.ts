import { describe, expect, test } from "bun:test";
import { buildReleasePlan, planOutputs, RELEASE_REQUIRED_PROVIDERS } from "./release-plan.ts";

const base = { sourceRef: "abc123", forceRepublish: false, alreadyPublished: false };

describe("buildReleasePlan mode + skip", () => {
	test("a fresh build of an unpublished version runs (mode build, skip false)", () => {
		const plan = buildReleasePlan(base);
		expect(plan.mode).toBe("build");
		expect(plan.skip).toBe(false);
	});

	test("a plain build skips once the immutable version already exists", () => {
		const plan = buildReleasePlan({ ...base, alreadyPublished: true });
		expect(plan.mode).toBe("build");
		expect(plan.skip).toBe(true);
	});

	test("force_republish regenerates in place even when already published (mode republish, skip false)", () => {
		const plan = buildReleasePlan({ ...base, forceRepublish: true, alreadyPublished: true });
		expect(plan.mode).toBe("republish");
		expect(plan.skip).toBe(false);
		expect(plan.gates.forceRepublish).toBe(true);
	});
});

describe("buildReleasePlan matrix", () => {
	test("fans out over every provider in registry order", () => {
		const plan = buildReleasePlan(base);
		expect(plan.matrix.include.map((c) => c.provider)).toEqual([
			"e2b",
			"daytona-vm",
			"daytona-container",
			"blaxel",
			"modal-gvisor",
			"modal-vm",
			"novita",
		]);
	});

	test("marks exactly the required providers as gating cells", () => {
		const plan = buildReleasePlan(base);
		const required = plan.matrix.include.filter((c) => c.required).map((c) => c.provider);
		expect(required).toEqual([...RELEASE_REQUIRED_PROVIDERS]);
		expect(plan.required).toEqual([...RELEASE_REQUIRED_PROVIDERS]);
	});
});

describe("planOutputs", () => {
	test("emits one key=value per line with a single-line matrix json", () => {
		const lines = planOutputs(buildReleasePlan(base)).split("\n");
		expect(lines).toContain("mode=build");
		expect(lines).toContain("skip=false");
		expect(lines).toContain(`required=${RELEASE_REQUIRED_PROVIDERS.join(",")}`);
		const matrixLine = lines.find((l) => l.startsWith("matrix="));
		expect(matrixLine).toBeDefined();
		// The matrix value must be valid, single-line JSON (the fromJSON contract).
		const parsed = JSON.parse((matrixLine as string).slice("matrix=".length));
		expect(parsed.include).toHaveLength(7);
		expect((matrixLine as string).includes("\n")).toBe(false);
	});
});
