import { describe, expect, it } from "bun:test";
import type { ProviderMeta } from "./index.ts";
import { getProvider, hourlyCostAtTargetSpec, PROVIDERS, TARGET_SPEC } from "./index.ts";

// A fixture meta so the registry helpers are tested independently of which providers have shipped.
// The id only has to be a valid ProviderId — these helpers never look it up in PROVIDERS.
const fixture: ProviderMeta = {
	id: "e2b",
	displayName: "Fixture",
	website: "https://example.com",
	sdkPackage: "fixture-sdk",
	requiredEnvVars: ["FIXTURE_API_KEY"],
	isolation: { technology: "microVM" },
	pricing: { model: "per_vcpu_hour", usdPerVcpuHour: 0.05, usdPerGibHour: 0.01, notes: "fixture" },
	maturity: { status: "ga" },
	specPinning: "settable",
	transport: { streaming: false, syncCapMs: 60_000, detachedPoll: true },
};

describe("@sandbox-benchmarks/schema providers", () => {
	it("pins the registered provider id set (the independent oracle downstream joins derive from)", () => {
		// Deliberately hardcoded: downstream tests (e.g. results' normalizeResultsTree) assert their
		// output against PROVIDERS, so this pin is what makes an accidental registry removal loud.
		expect(PROVIDERS.map((p) => p.id).sort()).toEqual([
			"blaxel",
			"daytona-container",
			"daytona-vm",
			"e2b",
			"modal-gvisor",
			"modal-vm",
			"novita",
		]);
	});

	it("keeps the registry well-formed (unique ids, non-empty required env vars)", () => {
		const ids = PROVIDERS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of PROVIDERS) {
			expect(p.requiredEnvVars.length).toBeGreaterThan(0);
		}
	});

	it("declares a well-formed exec transport for every provider", () => {
		for (const p of PROVIDERS) {
			const t = p.transport;
			expect(typeof t.streaming).toBe("boolean");
			expect(typeof t.detachedPoll).toBe("boolean");
			// A cap is either "uncapped" (null) or a strictly-positive, *finite* duration — a 0/negative
			// cap would force every step past it (always detached) and is never a real bound, and a
			// non-finite cap (`Infinity`) is "uncapped" smuggled in as a number instead of `null`.
			// Split into explicit branches so a failure says which rule broke, not "expected false".
			if (t.syncCapMs === null) {
				expect(t.syncCapMs).toBeNull();
			} else {
				expect(typeof t.syncCapMs).toBe("number");
				expect(Number.isFinite(t.syncCapMs)).toBe(true);
				expect(t.syncCapMs).toBeGreaterThan(0);
				// A bounded cap is only honourable if there's a detached path to fall back to: the harness
				// routes steps past the cap to detached+poll. A finite cap with `detachedPoll: false` would
				// silently strand capped steps in synchronous best-effort mode — the exact failure this
				// schema exists to prevent — so assert the invariant the type alone can't.
				expect(t.detachedPoll).toBe(true);
			}
		}
	});

	it("derives PROVIDERS from the keyed registry without id drift", () => {
		// Each entry's id must equal the key it resolves under — the whole point of keying by id.
		for (const p of PROVIDERS) {
			expect(getProvider(p.id)?.id).toBe(p.id);
		}
	});

	it("freezes the registry against runtime mutation", () => {
		expect(Object.isFrozen(PROVIDERS)).toBe(true);
		const [first] = PROVIDERS;
		expect(first && Object.isFrozen(first.pricing)).toBe(true);
	});

	it("looks providers up by id and returns undefined for unknown ids", () => {
		expect(getProvider("definitely-not-a-provider")).toBeUndefined();
		for (const p of PROVIDERS) {
			expect(getProvider(p.id)?.id).toBe(p.id);
		}
	});

	it("computes hourly cost at the target spec from a per-vCPU-hour rate", () => {
		const expected = 0.05 * TARGET_SPEC.vcpus + 0.01 * TARGET_SPEC.memoryGb;
		expect(hourlyCostAtTargetSpec(fixture)).toBeCloseTo(expected);
	});

	it("bills only memory beyond a provider's included allowance", () => {
		const allInclusive: ProviderMeta = {
			...fixture,
			pricing: {
				model: "per_vcpu_hour",
				usdPerVcpuHour: 0.05,
				usdPerGibHour: 0.01,
				includedMemoryGb: TARGET_SPEC.memoryGb + 4, // allowance exceeds the spec
				notes: "all memory free",
			},
		};
		// Billable memory clamps at 0, so only the vCPU cost remains.
		expect(hourlyCostAtTargetSpec(allInclusive)).toBeCloseTo(0.05 * TARGET_SPEC.vcpus);
	});

	it("prices shipped providers from their vetted per-second rates", () => {
		// Guards the economics constants against accidental regressions (PR #15 review). Daytona's
		// first 5 GiB of memory are free; e2b bills all memory at the same vCPU/GiB rates.
		const expected: Record<string, number> = {
			// Modal's two variants bill identically; likewise Daytona's — assert one of each here, and
			// the shared-pricing invariant across a vendor's variants is checked separately below.
			"modal-gvisor": 0.141912 * TARGET_SPEC.vcpus + 0.024192 * TARGET_SPEC.memoryGb,
			e2b: 0.0504 * TARGET_SPEC.vcpus + 0.0162 * TARGET_SPEC.memoryGb,
			"daytona-vm": 0.0504 * TARGET_SPEC.vcpus + 0.0162 * Math.max(0, TARGET_SPEC.memoryGb - 5),
			novita: 0.03528 * TARGET_SPEC.vcpus + 0.01152 * TARGET_SPEC.memoryGb,
		};
		for (const [id, cost] of Object.entries(expected)) {
			const meta = getProvider(id);
			expect(meta).toBeDefined();
			expect(meta && hourlyCostAtTargetSpec(meta)).toBeCloseTo(cost);
		}
	});

	it("records disk rates where published and omits them where not", () => {
		// Disk is captured for display but kept out of hourlyCostAtTargetSpec (PR #15 review).
		const diskRate = (id: string) => {
			const pricing = getProvider(id)?.pricing;
			return pricing?.model === "per_vcpu_hour" ? pricing.usdPerGibDiskHour : undefined;
		};
		expect(diskRate("daytona-vm")).toBeCloseTo(0.000108); // $0.00000003/GiB-s × 3600
		expect(diskRate("modal-gvisor")).toBe(0); // volumes free under the 1 TiB/mo tier
		expect(diskRate("e2b")).toBeUndefined(); // no published overage rate
		expect(diskRate("novita")).toBe(0); // 20 GB target spec inside the 60 GB free tier
	});

	it("resolves retired provider ids through the legacy aliases", () => {
		// Pre-split committed runs carry `modal`/`daytona`; getProvider must still resolve them to the
		// variant that subsumed each so a historical leaderboard keeps its display names + economics.
		expect(getProvider("modal")?.id).toBe("modal-gvisor");
		expect(getProvider("daytona")?.id).toBe("daytona-vm");
	});

	it("keeps a vendor's isolation variants on identical pricing", () => {
		// The two Modal variants (and the two Daytona variants) differ only in isolation, never billing —
		// a drift here would misrank one against the other, so pin that they share a pricing object.
		expect(getProvider("modal-vm")?.pricing).toEqual(getProvider("modal-gvisor")?.pricing);
		expect(getProvider("daytona-container")?.pricing).toEqual(getProvider("daytona-vm")?.pricing);
	});

	it("returns null when a provider has no vetted rate", () => {
		const unpriced: ProviderMeta = { ...fixture, pricing: { model: "unknown", notes: "n/a" } };
		expect(hourlyCostAtTargetSpec(unpriced)).toBeNull();
	});
});
