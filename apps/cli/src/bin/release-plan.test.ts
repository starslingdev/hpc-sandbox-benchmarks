import { describe, expect, test } from "bun:test";
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import { buildReleasePlan, planOutputs, RELEASE_REQUIRED_PROVIDERS } from "./release-plan.ts";

const base = { sourceRef: "abc123", forceRepublish: false, alreadyPublished: false };
const ALL_PROVIDERS = PROVIDERS.map((p) => p.id);

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

	// The reason the scoped path exists: v7 was published for every provider except the one being added,
	// so the early skip would otherwise kill the run before it could backfill anything.
	test("a scoped release runs against an already-published version (mode backfill, skip false)", () => {
		const plan = buildReleasePlan({ ...base, alreadyPublished: true, providers: "vercel" });
		expect(plan.mode).toBe("backfill");
		expect(plan.partial).toBe(true);
		expect(plan.skip).toBe(false);
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
			"microsandbox-local",
			"microsandbox-cloud",
			"modal-gvisor",
			"modal-vm",
			"novita",
			"namespace",
			"vercel",
		]);
	});

	test("marks exactly the required providers as gating cells", () => {
		const plan = buildReleasePlan(base);
		const required = plan.matrix.include.filter((c) => c.required).map((c) => c.provider);
		expect(required).toEqual([...RELEASE_REQUIRED_PROVIDERS]);
		expect(plan.required).toEqual([...RELEASE_REQUIRED_PROVIDERS]);
	});

	test("a scoped dispatch emits only its own cells", () => {
		const plan = buildReleasePlan({ ...base, providers: "vercel" });
		expect(plan.matrix.include).toEqual([{ provider: "vercel", required: true }]);
		expect(plan.providers.map((p) => p.provider)).toEqual(["vercel"]);
	});

	// A named provider that could still skip on a missing secret would report a green release that
	// published nothing — the exact failure the scoped path is meant to make impossible.
	test("every provider a scoped dispatch names is required, even a normally best-effort one", () => {
		const plan = buildReleasePlan({ ...base, providers: "blaxel,novita" });
		expect(plan.required).toEqual(["blaxel", "novita"]);
		expect(plan.matrix.include.every((c) => c.required)).toBe(true);
	});

	test("naming the whole registry is a full release, not a partial one", () => {
		const plan = buildReleasePlan({ ...base, providers: ALL_PROVIDERS.join(",") });
		expect(plan.partial).toBe(false);
		expect(plan.mode).toBe("build");
	});

	test("an unknown provider id throws instead of silently shrinking the release", () => {
		expect(() => buildReleasePlan({ ...base, providers: "vercelly" })).toThrow(/vercelly/);
	});
});

describe("buildReleasePlan phases", () => {
	test("defaults to a full build that promotes", () => {
		const plan = buildReleasePlan(base);
		expect(plan.build).toBe("full");
		expect(plan.promote).toBe(true);
	});

	test("carries the build mode and promote toggle through to the plan", () => {
		const plan = buildReleasePlan({ ...base, build: "variants", promote: false });
		expect(plan.build).toBe("variants");
		expect(plan.promote).toBe(false);
	});
});

describe("buildReleasePlan packages", () => {
	// The vercel bake cell pulls its staged variant from GHCR with no login, so the variant package has
	// to be covered by the visibility guard too — the base alone is not enough.
	test("lists the base package and every registry-served variant package", () => {
		const plan = buildReleasePlan(base);
		expect(plan.packages[0]).toBe(plan.image.name);
		expect(plan.packages).toContain(`${plan.image.name}-vercel`);
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
		expect(parsed.include).toHaveLength(11);
		expect((matrixLine as string).includes("\n")).toBe(false);
	});

	// The workflow's `if:` conditions compare against these literal strings, so the booleans have to
	// render as `true`/`false` — not `True`, not empty.
	test("emits the job-skipping gates as the strings the workflow compares against", () => {
		const lines = planOutputs(buildReleasePlan({ ...base, build: "skip", promote: false })).split(
			"\n",
		);
		expect(lines).toContain("build-mode=skip");
		expect(lines).toContain("run-build=false");
		expect(lines).toContain("run-publish=false");
	});

	test("emits the RESOLVED provider scope, so a blank input becomes the whole registry", () => {
		expect(planOutputs(buildReleasePlan(base)).split("\n")).toContain(
			`providers=${ALL_PROVIDERS.join(",")}`,
		);
		expect(planOutputs(buildReleasePlan({ ...base, providers: "vercel" })).split("\n")).toContain(
			"providers=vercel",
		);
	});

	test("emits every package the visibility guard must check, comma-separated", () => {
		const plan = buildReleasePlan(base);
		expect(planOutputs(plan).split("\n")).toContain(`packages=${plan.packages.join(",")}`);
	});
});
