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
 * Parse a comma-separated dispatch list against a registry: blank → every registered id; unknown names
 * throw (never silently shrink); duplicates collapse; order follows the registry, not the request;
 * matching is case-insensitive. Shared by the provider and suite axes so they can't drift.
 */
export function selectRegistryIds<T extends string>(
	raw: string | undefined,
	registered: readonly T[],
	kind: "provider" | "suite",
): T[] {
	const requested = (raw ?? "")
		.toLowerCase()
		.split(",")
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
	if (requested.length === 0) return [...registered];

	const registeredSet = new Set<string>(registered);
	const unknown = requested.filter((name) => !registeredSet.has(name));
	if (unknown.length > 0) {
		const plural = kind === "provider" ? "provider(s)" : "suite(s)";
		const registeredLabel = kind === "provider" ? "providers" : "suites";
		throw new Error(
			`unknown ${plural}: ${unknown.join(", ")} — registered ${registeredLabel} are ${registered.join(", ")}`,
		);
	}
	// Registry order, not request order: the matrix is a set of cells, and a stable order keeps the CI
	// job list (and any diff of it) from churning with the way a dispatch happened to spell the list.
	return registered.filter((id) => requested.includes(id));
}

/**
 * The providers a dispatch asks the matrix to fan out over, parsed from a comma-separated list (the
 * `BENCH_PROVIDERS` dispatch input). Absent or blank → every registered provider, so the default CI
 * matrix is unchanged and the registry stays the source of truth.
 *
 * An unregistered name THROWS rather than being dropped: a typo'd `--providers e2b,dayton` would
 * otherwise silently shrink the matrix and publish a dataset missing that provider, which reads
 * downstream as "daytona had no results" instead of "you misspelled it".
 */
export function selectProviders(raw: string | undefined): ProviderId[] {
	return selectRegistryIds(raw, PROVIDERS.map((p) => p.id), "provider");
}

/**
 * The suites a dispatch asks the matrix to run, parsed from a comma-separated list (the `BENCH_SUITES`
 * dispatch input). Absent or blank → every registered suite. This is the pre-merge/targeted-run knob:
 * `BENCH_SUITES=network` runs only the network suite's jobs.
 */
export function selectSuites(raw: string | undefined): SuiteName[] {
	return selectRegistryIds(raw, SUITE_NAMES, "suite");
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
