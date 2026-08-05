// Invariant: toolchain-image.yml's promote fan-out stays in lockstep with the provider registry.
// The `checkPromoteFanout()` test against the real workflow IS the gate's CI enforcement point (same
// precedent as workflow-hardening.test.ts); the rest is unit coverage of the pure checks against
// synthetic drift, so a regression names the offender instead of just failing. See ./lib/promote-fanout.ts.
import { describe, expect, test } from "bun:test";
import { hasVersionArtifact, PROVIDERS } from "@sandbox-benchmarks/schema";
import {
	checkFanoutPhase,
	checkPromoteFanout,
	expectedFanout,
	fanoutSteps,
	PROMOTE_PHASE_BIN,
	PUBLISH_JOB,
	scopeGuard,
	TOOLCHAIN_WORKFLOW,
} from "./lib/promote-fanout.ts";
import { readWorkflow } from "./lib/workflow-yaml.ts";

/** A synthetic publish job whose fan-out steps are generated from a spec, for the drift fixtures. */
function publishDoc(
	validate: ReadonlyArray<{ provider: string; guard?: string; env?: Record<string, string> }>,
	artifact: ReadonlyArray<{ provider: string; guard?: string; env?: Record<string, string> }> = [],
) {
	const step = (
		phase: string,
		spec: { provider: string; guard?: string; env?: Record<string, string> },
	) => ({
		name: `${phase} ${spec.provider}`,
		if: spec.guard ?? scopeGuard(spec.provider),
		env: spec.env ?? {},
		run: `bun ${PROMOTE_PHASE_BIN} ${phase} --provider ${spec.provider} --base-ref "$BASE_REF"`,
	});
	return {
		jobs: {
			[PUBLISH_JOB]: {
				steps: [
					{ run: `bun ${PROMOTE_PHASE_BIN} preflight --provider "$RELEASE_PROVIDERS"` },
					{ parallel: validate.map((spec) => step("validate", spec)) },
					{ parallel: artifact.map((spec) => step("artifact", spec)) },
				],
			},
		},
	};
}

/** The registry spec that should pass: every provider re-validated with its own credentials. */
const registryValidate = PROVIDERS.map((provider) => ({
	provider: provider.id,
	env: Object.fromEntries((provider.requiredEnvVars ?? []).map((key) => [key, "x"])),
}));
const registryArtifact = PROVIDERS.filter((provider) => hasVersionArtifact(provider.id)).map(
	(provider) => ({ provider: provider.id }),
);

describe("the real toolchain workflow", () => {
	test("its promote fan-out is in sync with the registry", () => {
		expect(checkPromoteFanout()).toEqual([]);
	});

	test("re-validates every registered provider, exactly once each", () => {
		const doc = readWorkflow(TOOLCHAIN_WORKFLOW);
		const providers = fanoutSteps(doc, "validate", TOOLCHAIN_WORKFLOW).map((s) => s.provider);
		expect([...providers].sort()).toEqual([...PROVIDERS.map((p) => p.id)].sort());
	});

	test("builds a version artifact for exactly the providers that have one", () => {
		const doc = readWorkflow(TOOLCHAIN_WORKFLOW);
		const providers = fanoutSteps(doc, "artifact", TOOLCHAIN_WORKFLOW).map((s) => s.provider);
		expect([...providers].sort()).toEqual(
			PROVIDERS.map((p) => p.id)
				.filter((id) => hasVersionArtifact(id))
				.sort(),
		);
		// Sanity that the filter is doing something: the artifact fan-out is strictly smaller.
		expect(providers.length).toBeLessThan(PROVIDERS.length);
	});
});

describe("expectedFanout", () => {
	test("validate covers the whole registry; artifact covers only artifact-bearing providers", () => {
		expect(expectedFanout("validate")).toEqual(PROVIDERS.map((p) => p.id));
		expect(expectedFanout("artifact").every((id) => hasVersionArtifact(id))).toBe(true);
		expect(expectedFanout("artifact").length).toBeGreaterThan(0);
	});
});

describe("checkFanoutPhase on synthetic drift", () => {
	test("passes the registry-complete fan-out", () => {
		const doc = publishDoc(registryValidate, registryArtifact);
		expect(checkFanoutPhase(doc, "validate", "synthetic.yml")).toEqual([]);
		expect(checkFanoutPhase(doc, "artifact", "synthetic.yml")).toEqual([]);
	});

	test("flags a provider added to the registry but not to the fan-out", () => {
		// The real failure mode: PROVIDERS grew, the workflow did not, and that provider is silently
		// never re-validated — a skip nobody notices because there is no step to fail.
		const doc = publishDoc(registryValidate.slice(1), registryArtifact);
		const errors = checkFanoutPhase(doc, "validate", "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(registryValidate[0]?.provider ?? "");
		expect(errors[0]).toContain("published unverified");
	});

	test("flags a step for an id that is no longer registered", () => {
		const doc = publishDoc([...registryValidate, { provider: "retired-provider" }]);
		const errors = checkFanoutPhase(doc, "validate", "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("retired-provider");
	});

	test("flags a duplicated provider — two concurrent steps would race", () => {
		const first = registryValidate[0];
		if (first === undefined) throw new Error("registry is empty");
		const doc = publishDoc([...registryValidate, first]);
		const errors = checkFanoutPhase(doc, "validate", "synthetic.yml");
		expect(errors.some((e) => e.includes("more than once"))).toBe(true);
	});

	test("flags a version-artifact step for a provider that builds nothing", () => {
		const bootsOnly = PROVIDERS.map((p) => p.id).find((id) => !hasVersionArtifact(id));
		if (bootsOnly === undefined) throw new Error("every provider has an artifact");
		const doc = publishDoc(registryValidate, [...registryArtifact, { provider: bootsOnly }]);
		const errors = checkFanoutPhase(doc, "artifact", "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(bootsOnly);
		expect(errors[0]).toContain("hasVersionArtifact");
	});

	test("flags an ungated step — it would run for a release that did not scope it in", () => {
		const [first, ...rest] = registryValidate;
		if (first === undefined) throw new Error("registry is empty");
		const doc = publishDoc([{ ...first, guard: "always()" }, ...rest], registryArtifact);
		const errors = checkFanoutPhase(doc, "validate", "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(scopeGuard(first.provider));
	});

	test("flags a substring scope guard, which would match a variant id", () => {
		const [first, ...rest] = registryValidate;
		if (first === undefined) throw new Error("registry is empty");
		// `contains(<csv string>, 'daytona')` matches daytona-vm AND daytona-container; only element
		// equality against the matrix array is correct.
		const substring = `contains(needs.plan.outputs.providers, '${first.provider}')`;
		const doc = publishDoc([{ ...first, guard: substring }, ...rest], registryArtifact);
		expect(checkFanoutPhase(doc, "validate", "synthetic.yml")[0]).toContain("must be gated on");
	});

	test("flags a step carrying another provider's credential", () => {
		const donor = PROVIDERS.find(
			(p) => (p.requiredEnvVars ?? []).length > 0 && p.id !== registryValidate[0]?.provider,
		);
		const [first, ...rest] = registryValidate;
		if (first === undefined || donor === undefined) throw new Error("registry too small");
		const foreignKey = (donor.requiredEnvVars ?? [])[0];
		if (foreignKey === undefined) throw new Error("donor has no credential");
		if (first.env[foreignKey] !== undefined) throw new Error("donor key overlaps");
		const doc = publishDoc(
			[{ ...first, env: { ...first.env, [foreignKey]: "leaked" } }, ...rest],
			registryArtifact,
		);
		const errors = checkFanoutPhase(doc, "validate", "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(foreignKey);
		expect(errors[0]).toContain("least-privilege");
	});

	test("flags a re-validate step that omits its own credential", () => {
		const withCreds = registryValidate.find((spec) => Object.keys(spec.env ?? {}).length > 0);
		if (withCreds === undefined) throw new Error("no provider declares credentials");
		const doc = publishDoc(
			registryValidate.map((spec) => (spec === withCreds ? { ...spec, env: {} } : spec)),
			registryArtifact,
		);
		const errors = checkFanoutPhase(doc, "validate", "synthetic.yml");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("never re-validated");
	});
});
