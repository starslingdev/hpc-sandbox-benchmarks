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

/** A provider package (`provider-<id>`): implements the contract. provider-core IS the contract. */
export function isProviderPackage(name: string): boolean {
	return name.startsWith(PROVIDER_PREFIX) && name !== CORE;
}

/** The slice of a workspace member these rules read. */
export interface MemberDeps {
	name: string;
	pkg: Pick<PackageJson, "dependencies">;
}

/**
 * Every violation of the provider-package architecture in the given members (empty = compliant):
 * provider packages don't depend on siblings and always speak the provider-core contract, the
 * aggregator carries no external runtime dependency, and `@computesdk/*` wrappers are declared
 * nowhere else — the isolation the per-provider split exists to guarantee.
 */
export function providerBoundaryViolations(members: MemberDeps[]): string[] {
	const violations: string[] = [];
	for (const member of members) {
		const deps = Object.keys(member.pkg.dependencies ?? {});

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

		// Everyone else: computesdk core (universal types) is fine; vendor WRAPPERS are fenced into
		// provider packages.
		for (const dep of deps) {
			if (dep.startsWith(VENDOR_WRAPPER_PREFIX)) {
				violations.push(
					`${member.name} declares vendor wrapper ${dep} — @computesdk/* wrappers belong to @sandbox-benchmarks/provider-<id> packages only`,
				);
			}
		}
	}
	return violations;
}
