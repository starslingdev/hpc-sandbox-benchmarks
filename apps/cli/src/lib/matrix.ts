// Private CLI helper: builds the provider × suite benchmark matrix the CI fan-out runs.
// Imports from schema so the schema → cli import chain is real, and both registries (PROVIDERS,
// SUITES) are the single source of truth — the matrix can never name a provider or suite that isn't
// registered.
import type { ProviderId, SuiteName } from "@sandbox-benchmarks/schema";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";

/** One CI cell: a single (provider, suite) benchmark run. */
export interface MatrixEntry {
	provider: ProviderId;
	suite: SuiteName;
}

/**
 * The providers a dispatch asks the matrix to fan out over, parsed from a comma-separated list (the
 * `BENCH_PROVIDERS` dispatch input). Absent or blank → every registered provider, so the default CI
 * matrix is unchanged and the registry stays the source of truth.
 *
 * An unregistered name THROWS rather than being dropped: a typo'd `--providers e2b,dayton` would
 * otherwise silently shrink the matrix and publish a dataset missing that provider, which reads
 * downstream as "daytona had no results" instead of "you misspelled it". Duplicates collapse, and the
 * result is ordered by the registry, so a dispatch can't reorder or double-run a cell. Matching is
 * case-insensitive (every registered id is lowercase), so a hand-typed `E2B` still selects `e2b`.
 */
export function selectProviders(raw: string | undefined): ProviderId[] {
	const registered = PROVIDERS.map((p) => p.id);
	const requested = (raw ?? "")
		.toLowerCase()
		.split(",")
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
	if (requested.length === 0) return registered;

	const unknown = requested.filter((name) => !registered.includes(name as ProviderId));
	if (unknown.length > 0) {
		throw new Error(
			`unknown provider(s): ${unknown.join(", ")} — registered providers are ${registered.join(", ")}`,
		);
	}
	// Registry order, not request order: the matrix is a set of cells, and a stable order keeps the CI
	// job list (and any diff of it) from churning with the way a dispatch happened to spell the list.
	return registered.filter((id) => requested.includes(id));
}

/**
 * The suites a dispatch asks the matrix to run, parsed from a comma-separated list (the `BENCH_SUITES`
 * dispatch input). Absent or blank → every registered suite, so the default matrix is unchanged and the
 * registry stays the source of truth. Mirrors {@link selectProviders} on the suite axis: an unregistered
 * name THROWS (a typo must fail the plan, not silently run nothing), duplicates collapse, and the result
 * is ordered by the registry. Matching is case-insensitive to tolerate a hand-typed dispatch input.
 *
 * This is the pre-merge/targeted-run knob: `BENCH_SUITES=network` runs only the network suite's jobs, so
 * a validation dispatch doesn't have to spend the whole matrix. Blank stays the main-publish default.
 */
export function selectSuites(raw: string | undefined): SuiteName[] {
	const requested = (raw ?? "")
		.toLowerCase()
		.split(",")
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
	if (requested.length === 0) return [...SUITE_NAMES];

	const unknown = requested.filter((name) => !SUITE_NAMES.includes(name as SuiteName));
	if (unknown.length > 0) {
		throw new Error(
			`unknown suite(s): ${unknown.join(", ")} — registered suites are ${SUITE_NAMES.join(", ")}`,
		);
	}
	return SUITE_NAMES.filter((name) => requested.includes(name));
}

/**
 * The full benchmark matrix: every provider × every registered suite. Each cell becomes one CI job
 * (`bench-suite <provider> <suite>`), so the dataset grows by adding a provider or a suite to its
 * registry — never by editing the workflow. Both lists are injectable for unit tests; the defaults are
 * the real registries.
 */
export function buildMatrix(
	providers: readonly ProviderId[] = PROVIDERS.map((p) => p.id),
	suites: readonly SuiteName[] = SUITE_NAMES,
): MatrixEntry[] {
	const entries: MatrixEntry[] = [];
	for (const provider of providers) {
		for (const suite of suites) {
			entries.push({ provider, suite });
		}
	}
	return entries;
}
