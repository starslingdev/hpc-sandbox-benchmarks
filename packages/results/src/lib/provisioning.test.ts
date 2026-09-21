/**
 * Unit tests for provisioning.ts: the pre-booted/boot-on-create classifier and the counted tally an
 * aggregated Run publishes.
 *
 * The cases that matter most are the ones about what the classifier REFUSES to say — a shared kernel
 * must not make a fresh sandbox look pooled, and a Run whose producer never probed must stay silent
 * rather than claiming an inconclusive look.
 */
import { describe, expect, it } from "bun:test";
import type { ObservedSpecs } from "@sandbox-benchmarks/schema";
import {
	BOOT_ON_CREATE_MARGIN_S,
	buildObservedProvisioning,
	classifyProvisioning,
	PRE_BOOTED_MARGIN_S,
} from "./provisioning.ts";

/** A reading of a sandbox whose own age and our wait for it are both known. */
function reading(age: number, elapsed: number, extra: ObservedSpecs = {}): ObservedSpecs {
	return { uptimeAtProbeS: age, pid1AgeAtProbeS: age, elapsedSinceCreateS: elapsed, ...extra };
}

describe("classifyProvisioning", () => {
	it("calls a machine that long predated the create call pre-booted, with its margin", () => {
		expect(classifyProvisioning(reading(900, 120))).toEqual({
			provisioning: "pre-booted",
			preBootedByS: 780,
		});
	});

	it("calls a machine whose whole life fits inside our wait boot-on-create", () => {
		expect(classifyProvisioning(reading(118.5, 120))).toEqual({
			provisioning: "boot-on-create",
			preBootedByS: -1.5,
		});
	});

	it("refuses the band between the thresholds rather than rounding to the nearer answer", () => {
		const margin = (PRE_BOOTED_MARGIN_S + BOOT_ON_CREATE_MARGIN_S) / 2;
		expect(classifyProvisioning(reading(120 + margin, 120))).toEqual({
			provisioning: "indeterminate",
			preBootedByS: margin,
		});
	});

	it("is inclusive at the pre-booted threshold and exclusive at the fresh one", () => {
		expect(classifyProvisioning(reading(120 + PRE_BOOTED_MARGIN_S, 120)).provisioning).toBe(
			"pre-booted",
		);
		expect(
			classifyProvisioning(reading(120 + BOOT_ON_CREATE_MARGIN_S - 0.01, 120)).provisioning,
		).toBe("boot-on-create");
		expect(classifyProvisioning(reading(120 + BOOT_ON_CREATE_MARGIN_S, 120)).provisioning).toBe(
			"indeterminate",
		);
	});

	// The failure that would actually mislead a reader: a container on a host that has been up for
	// days is NOT a pooled machine, and the kernel's uptime is the host's. pid 1 is the sandbox's own
	// first process, and taking the minimum is what keeps the host's age out of the verdict.
	it("does not let a long-lived shared kernel make a fresh sandbox look pooled", () => {
		expect(
			classifyProvisioning({
				uptimeAtProbeS: 86_400,
				pid1AgeAtProbeS: 90,
				elapsedSinceCreateS: 100,
			}),
		).toEqual({ provisioning: "boot-on-create", preBootedByS: -10 });
	});

	it("still classifies when only one age reading came back", () => {
		expect(
			classifyProvisioning({ uptimeAtProbeS: 900, elapsedSinceCreateS: 60 }).provisioning,
		).toBe("pre-booted");
		expect(
			classifyProvisioning({ pid1AgeAtProbeS: 900, elapsedSinceCreateS: 60 }).provisioning,
		).toBe("pre-booted");
	});

	it("says indeterminate — with no margin — when the probe looked but the comparison can't be made", () => {
		// An age with no t0: the harness did not create this sandbox, so nothing says when it was asked
		// for. A margin here would be measured against a denominator nobody observed.
		expect(classifyProvisioning({ uptimeAtProbeS: 900 })).toEqual({
			provisioning: "indeterminate",
		});
		// A t0 with no age: the probe ran but read neither /proc.
		expect(classifyProvisioning({ elapsedSinceCreateS: 120 })).toEqual({
			provisioning: "indeterminate",
		});
		// A boot id alone is still evidence the probe ran.
		expect(classifyProvisioning({ bootId: "b" })).toEqual({ provisioning: "indeterminate" });
	});

	// The distinction the whole absence semantics rest on: never probed is not an inconclusive look.
	it("says nothing at all when no provisioning signal was recorded", () => {
		expect(classifyProvisioning({})).toEqual({});
		expect(classifyProvisioning({ vcpus: 4, memoryGb: 8, cpuModel: "EPYC" })).toEqual({});
	});
});

describe("buildObservedProvisioning", () => {
	it("tallies the verdicts and medians the margins", () => {
		expect(
			buildObservedProvisioning([
				reading(900, 60), // pre-booted by 840
				reading(700, 60), // pre-booted by 640
				reading(59, 60), // boot-on-create by -1
			]),
		).toEqual({
			preBooted: 2,
			bootOnCreate: 1,
			indeterminate: 0,
			medianPreBootedByS: 640,
		});
	});

	// The shortfall against ObservedMixtures.sandboxes is the disclosure that some sandbox was never
	// probed, so an unprobed reading must not be absorbed into `indeterminate`.
	it("counts probed-but-unplaceable sandboxes and skips never-probed ones", () => {
		expect(buildObservedProvisioning([reading(900, 60), { uptimeAtProbeS: 900 }, {}])).toEqual({
			preBooted: 1,
			bootOnCreate: 0,
			indeterminate: 1,
			medianPreBootedByS: 840,
		});
	});

	it("returns nothing when no reading carried any evidence", () => {
		expect(buildObservedProvisioning([{}, { vcpus: 4 }])).toBeUndefined();
		expect(buildObservedProvisioning([])).toBeUndefined();
	});

	it("counts a repeated boot id as one machine serving several sandboxes", () => {
		expect(
			buildObservedProvisioning([
				reading(900, 60, { bootId: "same" }),
				reading(905, 60, { bootId: "same" }),
				reading(400, 60, { bootId: "other" }),
			]),
		).toMatchObject({ bootIdSandboxes: 3, distinctBootIds: 2 });
	});

	it("prefers a reading's own recorded verdict over re-deriving one", () => {
		// A shard classified at normalize time carries its verdict; the tally must honor it rather than
		// silently re-running a rule that may since have changed, which would make a committed Run and a
		// board built from it disagree.
		expect(buildObservedProvisioning([{ provisioning: "pre-booted", preBootedByS: 500 }])).toEqual({
			preBooted: 1,
			bootOnCreate: 0,
			indeterminate: 0,
			medianPreBootedByS: 500,
		});
	});
});
