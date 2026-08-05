// Drift gate: the toolchain release's promote fan-out stays in lockstep with the provider registry.
//
// toolchain-image.yml's `publish` job splits the promote transaction into per-provider steps that run
// concurrently inside two `parallel:` blocks — one step per provider to re-validate its candidate, then
// one step per provider that has a version artifact to build it. GHA cannot import TypeScript, so those
// ~19 steps are written by hand, and a hand-written fan-out over a registry is exactly the thing that
// rots: add a provider to PROVIDERS, forget its promote steps, and the release silently never publishes
// that provider — a skip, not a failure, because there is no cell to notice its absence.
//
// This module re-derives the truth from PROVIDERS + hasVersionArtifact (packages/schema) and compares.
// It is the promote-lane counterpart to workflow-sync.ts, which does the same for the benchmark lanes.
//
// Invariants:
//   1. The re-validate block names EXACTLY the registered providers — no missing provider, no step for
//      an id that no longer exists.
//   2. The version-artifact block names EXACTLY the providers hasVersionArtifact() is true for. A
//      provider that builds nothing must not get a step (it would publish nothing and cost a runner);
//      one that does build something must, or its artifact is never created for the version.
//   3. Every fan-out step is gated on ITS provider, with the element-equality scope guard. A wrong or
//      missing guard would run a provider that the release did not scope in.
//   4. Every re-validate step carries its provider's requiredEnvVars (schema) in its own `env:`, and no
//      other provider's. This is the property that makes the fan-out least-privilege rather than merely
//      concurrent: a credential must reach exactly the step that needs it.
//   5. Each step invokes promote-phase with the matching subcommand and its own `--provider <id>`, so a
//      copy-pasted step cannot quietly drive a different provider than its name and guard claim.
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { hasVersionArtifact, PROVIDERS } from "@sandbox-benchmarks/schema";
import { asRecord, flattenSteps, readWorkflow } from "./workflow-yaml.ts";

export const TOOLCHAIN_WORKFLOW = ".github/workflows/toolchain-image.yml";
export const PUBLISH_JOB = "publish";

/** The bin every fan-out step drives. A step that stopped calling it is not part of the transaction. */
export const PROMOTE_PHASE_BIN = "apps/cli/src/bin/promote-phase.ts";

/** The two per-provider phases, by the promote-phase subcommand their steps invoke. */
export type FanoutPhase = "validate" | "artifact";

/** The `if:` a fan-out step for `provider` must carry. Element EQUALITY against the plan's matrix:
 *  `contains(<array>, <item>)` compares elements, while `contains(<string>, <substring>)` would also
 *  match a future id that merely CONTAINS this one — and the registry already splits providers into
 *  `-vm`/`-container`/`-local`/`-cloud` variants, so that is not hypothetical. */
export function scopeGuard(provider: string): string {
	return `contains(fromJSON(needs.plan.outputs.matrix).include.*.provider, '${provider}')`;
}

/** Every credential name any registered provider needs, so a step can be checked for carrying one that
 *  is not its own. Environment-independent values (a region default, a local opt-in) are included:
 *  they are per-provider wiring even when they are not secrets. */
export function allProviderEnvVars(): Set<string> {
	return new Set(PROVIDERS.flatMap((provider) => provider.requiredEnvVars ?? []));
}

/** One fan-out step, reduced to what the invariants compare. */
export interface FanoutStep {
	/** The `--provider <id>` the step's `run:` actually passes. */
	provider: string;
	/** The step's `if:` expression, or undefined when it has none. */
	guard: string | undefined;
	/** The keys of the step's own `env:` block. */
	envKeys: string[];
}

/**
 * The steps of one phase's `parallel:` block, in file order. Identified by the promote-phase
 * subcommand their `run:` invokes rather than by their position or name, so reordering the blocks or
 * renaming a step does not silently change what is being checked — and a step that was moved OUT of a
 * parallel block still counts, because `flattenSteps` does not care about nesting.
 */
export function fanoutSteps(doc: unknown, phase: FanoutPhase, label: string): FanoutStep[] {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const job = asRecord(jobs[PUBLISH_JOB], `${label}: no "${PUBLISH_JOB}" job`);
	const found: FanoutStep[] = [];
	for (const step of flattenSteps(job.steps, label)) {
		const run = typeof step.run === "string" ? step.run : "";
		if (!run.includes(PROMOTE_PHASE_BIN) || !run.includes(`${PROMOTE_PHASE_BIN} ${phase} `))
			continue;
		const match = run.match(/--provider\s+(\S+)/);
		const env =
			step.env === undefined || step.env === null
				? {}
				: asRecord(step.env, `${label}: malformed step env`);
		found.push({
			provider: match?.[1] ?? "",
			guard: typeof step.if === "string" ? step.if : undefined,
			envKeys: Object.keys(env),
		});
	}
	return found;
}

/** The providers each phase must fan out over, derived from the registry. */
export function expectedFanout(phase: FanoutPhase): ProviderId[] {
	const ids = PROVIDERS.map((provider) => provider.id);
	return phase === "validate" ? ids : ids.filter((id) => hasVersionArtifact(id));
}

/** Invariants 1–5 for one phase. Returns human-readable errors; empty means the fan-out is in sync. */
export function checkFanoutPhase(
	doc: unknown,
	phase: FanoutPhase,
	label: string = TOOLCHAIN_WORKFLOW,
): string[] {
	const errors: string[] = [];
	const steps = fanoutSteps(doc, phase, label);
	const expected = expectedFanout(phase);
	const actual = steps.map((step) => step.provider);
	// The parsed `--provider` values are plain strings (a drifted workflow may name an id the registry
	// no longer has), so membership is compared through a string set rather than the ProviderId union.
	const expectedIds: ReadonlySet<string> = new Set<string>(expected);

	// 1 & 2: exactly the expected providers, and each exactly once. Compared as sorted sets so a
	// reordering is not reported as drift, but a duplicate still is (two steps would race on one
	// artifact name, and their fragments would overwrite each other).
	const missing = expected.filter((id) => !actual.includes(id));
	const unexpected = actual.filter((id) => !expectedIds.has(id));
	const duplicated = [...new Set(actual.filter((id, i) => actual.indexOf(id) !== i))];
	if (missing.length > 0) {
		errors.push(
			`${label}::${PUBLISH_JOB}: the ${phase} fan-out is missing a step for ${missing.join(", ")} — ` +
				(phase === "validate"
					? "every registered provider must be re-validated before promote, or it is published unverified"
					: "each provider hasVersionArtifact() is true for must build its version artifact, or the version ships without it"),
		);
	}
	if (unexpected.length > 0) {
		errors.push(
			`${label}::${PUBLISH_JOB}: the ${phase} fan-out has a step for ${unexpected.join(", ")}, which ` +
				(phase === "validate"
					? "is not a registered provider"
					: "builds no version artifact (see hasVersionArtifact) — remove the step"),
		);
	}
	if (duplicated.length > 0) {
		errors.push(
			`${label}::${PUBLISH_JOB}: the ${phase} fan-out drives ${duplicated.join(", ")} more than once — ` +
				"two concurrent steps would race on the same artifact name and overwrite each other's report",
		);
	}

	// 3 & 4: per-step guard and credential scoping.
	const everyEnvVar = allProviderEnvVars();
	for (const step of steps) {
		if (!expectedIds.has(step.provider)) continue; // already reported above
		const wanted = scopeGuard(step.provider);
		if (step.guard !== wanted) {
			errors.push(
				`${label}::${PUBLISH_JOB}: the ${phase} step for ${step.provider} must be gated on \`if: ${wanted}\` ` +
					`(found ${step.guard === undefined ? "no `if:`" : `\`${step.guard}\``}) — an ungated step runs for a release that did not scope it in`,
			);
		}
		const own = new Set(PROVIDERS.find((p) => p.id === step.provider)?.requiredEnvVars ?? []);
		const foreign = step.envKeys.filter((key) => everyEnvVar.has(key) && !own.has(key));
		if (foreign.length > 0) {
			errors.push(
				`${label}::${PUBLISH_JOB}: the ${phase} step for ${step.provider} carries ${foreign.join(", ")}, ` +
					"which belong(s) to another provider — per-step scoping is what makes this fan-out least-privilege",
			);
		}
		// Only the re-validate phase boots a sandbox, so only it must carry the provider's own
		// credentials. The artifact phase is checked for FOREIGN keys above but not for completeness:
		// vercel's version artifact, for instance, is a registry retag that uses the job's docker
		// session rather than any provider key.
		if (phase === "validate") {
			const absent = [...own].filter((key) => !step.envKeys.includes(key));
			if (absent.length > 0) {
				errors.push(
					`${label}::${PUBLISH_JOB}: the ${phase} step for ${step.provider} does not pass ${absent.join(", ")} — ` +
						"without its credentials the provider takes the missing-credentials skip and is never re-validated",
				);
			}
		}
	}
	return errors;
}

/** The whole promote fan-out gate against the real workflow file. */
export function checkPromoteFanout(doc: unknown = readWorkflow(TOOLCHAIN_WORKFLOW)): string[] {
	return [...checkFanoutPhase(doc, "validate"), ...checkFanoutPhase(doc, "artifact")];
}
