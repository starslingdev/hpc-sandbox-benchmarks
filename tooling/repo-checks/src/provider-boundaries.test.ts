// Invariant: the per-provider package architecture stays decoupled.
// (a) A provider package (@sandbox-benchmarks/provider-<id>, core excluded) never depends on a
//     sibling provider package — providers compose through the aggregator, not each other.
// (b) Every provider package depends on @sandbox-benchmarks/provider-core (the shared contract).
// (c) The aggregator (@sandbox-benchmarks/providers) declares NO external runtime dependency:
//     vendor SDKs (@computesdk/*, raw SDKs) live only in provider packages.
// (d) Vendor deps are declared ONLY by provider packages — the set is derived from what provider
//     packages themselves declare (so raw SDKs like `e2b` are fenced too), with `@computesdk/*` as
//     a floor. A vendor SDK moving into any other member is the regression this split prevents.
import { describe, expect, it } from "bun:test";
import { isProviderPackage, providerBoundaryViolations } from "./lib/provider-boundaries.ts";
import { listMembers } from "./lib/workspace.ts";

const members = listMembers();

describe("provider package boundaries (real workspace)", () => {
	it("holds across the workspace", () => {
		expect(providerBoundaryViolations(members)).toEqual([]);
	});

	it("actually sees the provider packages (guard against a vacuous scan)", () => {
		expect(members.filter((m) => isProviderPackage(m.name)).length).toBeGreaterThanOrEqual(7);
	});
});

describe("providerBoundaryViolations (rule spec on synthetic fixtures)", () => {
	const member = (name: string, dependencies: Record<string, string>) => ({
		name,
		pkg: { name, dependencies },
	});

	it("flags a provider package depending on a sibling provider package", () => {
		const violations = providerBoundaryViolations([
			member("@sandbox-benchmarks/provider-a", {
				"@sandbox-benchmarks/provider-core": "workspace:*",
				"@sandbox-benchmarks/provider-b": "workspace:*",
			}),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("sibling");
	});

	it("flags a provider package that skips the provider-core contract", () => {
		const violations = providerBoundaryViolations([
			member("@sandbox-benchmarks/provider-a", { "@computesdk/a": "catalog:computesdk" }),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("provider-core");
	});

	it("flags the aggregator declaring any external runtime dependency", () => {
		const violations = providerBoundaryViolations([
			member("@sandbox-benchmarks/providers", {
				"@sandbox-benchmarks/provider-core": "workspace:*",
				"@computesdk/e2b": "catalog:computesdk",
			}),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("@computesdk/e2b");
	});

	it("flags a non-provider member declaring a @computesdk/* wrapper", () => {
		const violations = providerBoundaryViolations([
			member("@sandbox-benchmarks/harness", { "@computesdk/modal": "catalog:computesdk" }),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("@computesdk/modal");
	});

	it("fences known raw SDKs even when no provider package declares them, minus documented exemptions", () => {
		// `@daytona/sdk` reaches the daytona control plane directly but no provider package declares
		// it (provider-daytona speaks @computesdk/daytona) — the KNOWN_RAW_SDKS floor fences it, and
		// only apps/cli's reviewed bake-pipeline exemption passes.
		const violations = providerBoundaryViolations([
			member("@sandbox-benchmarks/cli", { "@daytona/sdk": "catalog:computesdk" }),
			member("@sandbox-benchmarks/harness", { "@daytona/sdk": "catalog:computesdk" }),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("harness");
		expect(violations[0]).toContain("@daytona/sdk");
	});

	it("fences raw vendor SDKs by deriving the set from provider packages' own deps", () => {
		// provider-a declares the raw `some-sdk` — that makes it vendor surface, so harness declaring
		// it too is the exact re-coupling the split prevents, even though it isn't @computesdk/*.
		const violations = providerBoundaryViolations([
			member("@sandbox-benchmarks/provider-a", {
				"@sandbox-benchmarks/provider-core": "workspace:*",
				"some-sdk": "catalog:computesdk",
			}),
			member("@sandbox-benchmarks/harness", { "some-sdk": "catalog:computesdk" }),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("some-sdk");
		expect(violations[0]).toContain("harness");
	});

	it("accepts the intended shape (and computesdk core outside provider packages)", () => {
		expect(
			providerBoundaryViolations([
				member("@sandbox-benchmarks/provider-a", {
					"@sandbox-benchmarks/provider-core": "workspace:*",
					"@computesdk/a": "catalog:computesdk",
				}),
				member("@sandbox-benchmarks/providers", {
					"@sandbox-benchmarks/provider-a": "workspace:*",
					"@sandbox-benchmarks/schema": "workspace:*",
				}),
				// computesdk core (universal types) is fine anywhere; only @computesdk/* wrappers are fenced.
				member("@sandbox-benchmarks/harness", { computesdk: "catalog:computesdk" }),
				member("@sandbox-benchmarks/provider-core", { computesdk: "catalog:computesdk" }),
			]),
		).toEqual([]);
	});

	it("treats provider-core as the contract, not a provider (may be depended on by all)", () => {
		expect(isProviderPackage("@sandbox-benchmarks/provider-core")).toBe(false);
		expect(isProviderPackage("@sandbox-benchmarks/provider-e2b")).toBe(true);
		expect(isProviderPackage("@sandbox-benchmarks/providers")).toBe(false);
	});
});
