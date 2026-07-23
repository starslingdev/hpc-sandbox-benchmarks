// Private CLI helper: builds the provider × suite benchmark matrix the CI fan-out runs.
// Imports from schema so the schema → cli import chain is real, and both registries (PROVIDERS,
// SUITES) are the single source of truth — the matrix can never name a provider or suite that isn't
// registered.
import type { ProviderId, SuiteName } from "@sandbox-benchmarks/schema";
import { PROVIDERS, SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";

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
	return selectRegistryIds(
		raw,
		PROVIDERS.map((p) => p.id),
		"provider",
	);
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
 * The replicate count a suite runs when a dispatch gives no override: its schema-declared
 * {@link Suite.defaultReplicas} (the between-machine axis, configurable per test category), or a single
 * sandbox when the suite declares none. Replicates capture a provider's fleet variation — two sandboxes
 * of one (provider, suite) can land on different host hardware — which the in-sandbox PTS passes can't see.
 */
export const SINGLE_REPLICATE = 1;

/** The replicate count for one suite: the `BENCH_REPLICAS` override when set, else the suite's default. */
export function replicaCountForSuite(suite: SuiteName, override?: number): number {
	if (override !== undefined) return override;
	return SUITES[suite].defaultReplicas ?? SINGLE_REPLICATE;
}

/**
 * Parse the `BENCH_REPLICAS` dispatch override into a positive integer, or `undefined` when blank/unset
 * (each suite then keeps its own {@link Suite.defaultReplicas}). A non-positive or non-integer value
 * THROWS — a typo'd `--replicas 0` would otherwise fan out zero sandboxes (a silently empty run), and a
 * fractional one is meaningless — so the plan fails loudly instead of guessing. This is the single global
 * knob that scales EVERY suite's replicate count up (tighter between-machine intervals) or down (a quick
 * pass) without editing each suite's schema default.
 */
export function parseReplicasOverride(raw: string | undefined): number | undefined {
	const trimmed = (raw ?? "").trim();
	if (trimmed === "") return undefined;
	const count = Number(trimmed);
	if (!Number.isInteger(count) || count < 1) {
		throw new Error(`replicas override must be a positive integer; got "${raw}"`);
	}
	return count;
}

/**
 * The per-suite replicate index arrays the CI matrix fans out over, keyed by suite name — e.g.
 * `{ "cpu-node": [0, 1, 2], "realworld-mastra": [0, 1, 2, 3, 4] }`. Each suite maps to `[0..R-1]`, where
 * R is the `BENCH_REPLICAS` override (`replicasRaw`) when set, else that suite's schema default. The
 * suite set matches {@link selectSuites} exactly (same `BENCH_SUITES` parsing), so the map is keyed by
 * precisely the suites the plan's suite axis emits — the reusable bench-suite.yml indexes it by
 * `matrix.suite` to get its own replicate axis. `suitesRaw`/`replicasRaw` are the raw dispatch strings.
 */
export function planReplicateMap(
	suitesRaw: string | undefined,
	replicasRaw: string | undefined,
): Record<string, number[]> {
	const override = parseReplicasOverride(replicasRaw);
	const map: Record<string, number[]> = {};
	for (const suite of selectSuites(suitesRaw)) {
		const count = replicaCountForSuite(suite, override);
		map[suite] = Array.from({ length: count }, (_, index) => index);
	}
	return map;
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
