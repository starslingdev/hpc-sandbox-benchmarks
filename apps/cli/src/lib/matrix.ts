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
