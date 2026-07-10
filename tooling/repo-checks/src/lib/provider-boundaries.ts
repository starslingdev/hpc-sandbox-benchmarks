// The per-provider package decoupling rules, as one pure function over package.json shapes so the
// spec is unit-testable on synthetic fixtures and enforced against the real workspace by the same
// code. Runtime `dependencies` only — devDependencies (tsconfig, typescript) are tooling, not
// coupling.
import type { PackageJson } from "./workspace.ts";

const PROVIDER_PREFIX = "@sandbox-benchmarks/provider-";
const CORE = "@sandbox-benchmarks/provider-core";
const AGGREGATOR = "@sandbox-benchmarks/providers";
const WORKSPACE_SCOPE = "@sandbox-benchmarks/";
const VENDOR_WRAPPER_PREFIX = "@computesdk/";
// The universal type/runtime layer, deliberately allowed anywhere; everything else a provider
// package declares externally is that provider's vendor surface and is fenced.
const SHARED_EXTERNALS = new Set(["computesdk"]);

/** A provider package (`provider-<id>`): implements the contract. provider-core IS the contract. */
export function isProviderPackage(name: string): boolean {
	return name.startsWith(PROVIDER_PREFIX) && name !== CORE;
}

/** The slice of a workspace member these rules read. */
export interface MemberDeps {
	name: string;
	pkg: Pick<PackageJson, "dependencies">;
}

const runtimeDeps = (member: MemberDeps): string[] => Object.keys(member.pkg.dependencies ?? {});

/**
 * Every violation of the provider-package architecture in the given members (empty = compliant):
 * provider packages don't depend on siblings and always speak the provider-core contract, the
 * aggregator carries no external runtime dependency, and vendor SDKs are declared nowhere else —
 * the isolation the per-provider split exists to guarantee.
 *
 * The fenced vendor set is DERIVED, not hardcoded: every external runtime dep a provider package
 * declares (raw SDKs like `e2b` included) is vendor surface, plus anything under `@computesdk/*`
 * as a floor — so the fence self-updates when a provider package adopts a new raw SDK, instead of
 * only guarding a name prefix.
 */
export function providerBoundaryViolations(members: MemberDeps[]): string[] {
	const violations: string[] = [];

	// Pass 1 — collect the vendor surface: external runtime deps owned by provider packages.
	const vendorDeps = new Set<string>();
	for (const member of members) {
		if (!isProviderPackage(member.name)) continue;
		for (const dep of runtimeDeps(member)) {
			if (!dep.startsWith(WORKSPACE_SCOPE) && !SHARED_EXTERNALS.has(dep)) {
				vendorDeps.add(dep);
			}
		}
	}
	const isVendorDep = (dep: string): boolean =>
		vendorDeps.has(dep) || dep.startsWith(VENDOR_WRAPPER_PREFIX);

	// Pass 2 — enforce the rules against every member.
	for (const member of members) {
		const deps = runtimeDeps(member);

		if (isProviderPackage(member.name)) {
			for (const dep of deps) {
				if (isProviderPackage(dep)) {
					violations.push(
						`${member.name} depends on sibling provider package ${dep} — providers compose through the aggregator, never each other`,
					);
				}
			}
			if (!deps.includes(CORE)) {
				violations.push(`${member.name} does not depend on ${CORE} (the shared adapter contract)`);
			}
			continue;
		}

		if (member.name === AGGREGATOR) {
			for (const dep of deps) {
				if (!dep.startsWith(WORKSPACE_SCOPE)) {
					violations.push(
						`${AGGREGATOR} declares external runtime dependency ${dep} — vendor SDKs live in provider packages; the aggregator only joins`,
					);
				}
			}
			continue;
		}

		// Everyone else: computesdk core (universal types) is fine; the vendor surface is fenced into
		// provider packages.
		for (const dep of deps) {
			if (isVendorDep(dep)) {
				violations.push(
					`${member.name} declares vendor dependency ${dep} — vendor SDKs belong to @sandbox-benchmarks/provider-<id> packages only`,
				);
			}
		}
	}
	return violations;
}
