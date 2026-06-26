/**
 * The suite ↔ dimension ↔ metric contract: the fail-fast boundary between a benchmark suite (the
 * producer) and the Metric Catalog (the consumer). As suites multiply, a suite emitting a metric that
 * is not catalogued — or one catalogued on a different Dimension than the suite claims to measure —
 * would silently corrupt the comparison: an uncatalogued result is inert (reported, never ranked) and
 * an off-dimension metric lands under the wrong leaderboard axis. This module makes each suite's
 * declaration explicit and checks it against the Catalog at schema load, so an incorrectly declared
 * suite fails the build instead of shipping.
 *
 * Why a plain load-time check and not an arktype schema: the contract is a *cross-registry* invariant
 * (SUITES validated against METRIC_CATALOG), and arktype's `.narrow` validates a single value in
 * isolation — it can't reach into a second registry. So this mirrors catalog.ts's own cross-registry
 * guards (duplicate-id, one-headline-per-dimension), which are likewise plain throws at module load
 * over already-typed in-repo constants. The suite SHAPE is enforced at compile time by
 * `satisfies Record<string, Suite>` (suites.ts), exactly as providers.ts pins its REGISTRY — no
 * runtime shape validation is needed for hand-authored constants with no external provenance.
 *
 * A {@link SuiteContractViolation} is a discriminated union (one arm per failure mode), so each arm
 * carries exactly the fields that mode means — an uncatalogued/off-dimension breach names a `metricId`,
 * a dangling-axis breach names a `dimension`, and the off-dimension arm carries both. The same idiom as
 * `ProviderPricing` and `PtsMapping`: invalid combinations (a metric id on an empty-dimension breach)
 * are unrepresentable, and the human message is derived from the structured fields in one place
 * ({@link describeSuiteContractViolation}) rather than hand-passed alongside `kind`, so the two can't
 * disagree.
 *
 * {@link suiteContractViolations} is pure (suites + catalog in, violations out) so it is unit-testable
 * against crafted registries and catalogs, independent of the singletons; {@link assertSuiteContract}
 * is the load-time wrapper that throws, invoked once at module end over the real `SUITES` and
 * `METRIC_CATALOG`.
 */
import { METRIC_CATALOG } from "./catalog.ts";
import type { Dimension, MetricDef } from "./metrics.ts";
import type { Suite } from "./suites.ts";
import { SUITES } from "./suites.ts";

/**
 * One breach of the suite contract — a discriminated union on {@link SuiteContractViolation.kind}:
 * - `uncatalogued`    — a declared `metricId` is not in the Metric Catalog.
 * - `off-dimension`   — a declared `metricId` is catalogued, but on a `dimension` the suite does not
 *   declare.
 * - `empty-dimension` — a declared `dimension` is covered by none of the suite's declared metrics (a
 *   dangling axis: the declaration claims an axis the suite emits nothing on).
 *
 * Each arm carries only the fields its mode has, so e.g. a `dimension`-less `uncatalogued` breach or a
 * `metricId`-bearing `empty-dimension` breach cannot be constructed.
 */
export type SuiteContractViolation =
	| { suite: string; kind: "uncatalogued"; metricId: string }
	| { suite: string; kind: "off-dimension"; metricId: string; dimension: Dimension }
	| { suite: string; kind: "empty-dimension"; dimension: Dimension };

/** The slice of a {@link Suite} the contract constrains — declared axes and emitted metric ids. */
export type SuiteContract = Pick<Suite, "dimensions" | "metrics">;

/** Render a violation as a single human-readable line — the one place breach text is authored. */
export function describeSuiteContractViolation(violation: SuiteContractViolation): string {
	const { suite } = violation;
	switch (violation.kind) {
		case "uncatalogued":
			return `suite "${suite}" declares metric "${violation.metricId}", which is not in the Metric Catalog`;
		case "off-dimension":
			return `suite "${suite}" declares metric "${violation.metricId}" on undeclared dimension "${violation.dimension}"`;
		case "empty-dimension":
			return `suite "${suite}" declares dimension "${violation.dimension}" but emits no metric on it`;
		default: {
			// Exhaustiveness guard: a new union arm without a case here is a compile error (the same
			// `never` idiom as the results package's PtsMapping switch in lib/extract.ts).
			const _exhaustive: never = violation;
			throw new Error(`unhandled suite contract violation: ${JSON.stringify(_exhaustive)}`);
		}
	}
}

/**
 * Every way the given suites breach the contract against `catalog`, in a deterministic order (suite
 * declaration order, then each suite's declared metrics, then its dangling dimensions). Empty when the
 * registry is sound. Pure: no module singletons unless the caller passes them.
 */
export function suiteContractViolations(
	suites: Record<string, SuiteContract>,
	catalog: readonly MetricDef[] = METRIC_CATALOG,
): SuiteContractViolation[] {
	// One id → dimension lookup over the catalog, reused across every suite.
	const dimensionById = new Map<string, Dimension>(
		catalog.map((metric) => [metric.id, metric.dimension]),
	);
	const violations: SuiteContractViolation[] = [];

	for (const [suite, contract] of Object.entries(suites)) {
		const declared = new Set<Dimension>(contract.dimensions);
		// Dimensions actually backed by a catalogued, on-dimension metric — used to flag dangling axes.
		const covered = new Set<Dimension>();

		for (const metricId of contract.metrics) {
			const dimension = dimensionById.get(metricId);
			if (dimension === undefined) {
				violations.push({ suite, kind: "uncatalogued", metricId });
				continue;
			}
			if (!declared.has(dimension)) {
				violations.push({ suite, kind: "off-dimension", metricId, dimension });
				continue;
			}
			covered.add(dimension);
		}

		for (const dimension of declared) {
			if (covered.has(dimension)) continue;
			violations.push({ suite, kind: "empty-dimension", dimension });
		}
	}

	return violations;
}

/**
 * Throw if any suite breaches the contract; a no-op otherwise. The error lists every violation at once
 * (not just the first) so a multi-suite mistake is fixed in one pass. Defaults to the real registry and
 * Catalog so the bare call at module load is the production check; the arguments stay injectable for
 * tests.
 */
export function assertSuiteContract(
	suites: Record<string, SuiteContract> = SUITES,
	catalog: readonly MetricDef[] = METRIC_CATALOG,
): void {
	const violations = suiteContractViolations(suites, catalog);
	if (violations.length === 0) return;
	const lines = violations.map((violation) => `  - ${describeSuiteContractViolation(violation)}`);
	throw new Error(`suite ↔ dimension ↔ metric contract violated:\n${lines.join("\n")}`);
}

// Fail fast at schema load: importing @sandbox-benchmarks/schema (every consumer does) validates the
// real registry against the real Catalog, so an off-contract suite can never reach a running benchmark.
assertSuiteContract();
