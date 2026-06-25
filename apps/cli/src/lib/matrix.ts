// Private CLI helper: plans the provider × suite benchmark matrix the bench-matrix workflow fans out
// over. The setup job runs this once per dispatch/schedule: it validates the requested providers and
// suites against the schema registries, drops the providers whose credentials are absent (recording a
// skip cell per dropped (provider, suite) so the packaged Run still records WHY a provider is missing),
// and emits the credentialed provider list + selected suites for the per-suite reusable workflow to
// matrix over.
//
// Pure + injectable: credential state and the registries come in as plain data, so the planner is
// unit-testable without touching process.env or a provider SDK. The bin (../bin/plan-matrix.ts) joins
// it to the real `providers` config + `process.env` and performs the filesystem / $GITHUB_OUTPUT side
// effects.
import type { SuiteName } from "@sandbox-benchmarks/schema";

/**
 * Resolve a `--providers`/`--suites` selection against a known registry. `all` (case-insensitive) or an
 * empty/unset value selects every known id; otherwise a comma-separated subset. An unknown id is a usage
 * error (fail loud rather than silently plan a smaller matrix than asked for). The result is returned in
 * REGISTRY order, not request order, so the emitted matrix is deterministic regardless of input spelling.
 */
export function resolveSelection<T extends string>(
	raw: string | undefined,
	known: readonly T[],
	label: string,
): T[] {
	const trimmed = (raw ?? "").trim();
	if (trimmed === "" || trimmed.toLowerCase() === "all") return [...known];

	const requested = trimmed
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const knownSet = new Set<string>(known);
	const unknown = requested.filter((id) => !knownSet.has(id));
	if (unknown.length > 0) {
		throw new Error(`Unknown ${label}: ${unknown.join(", ")}. Known ${label}: ${known.join(", ")}`);
	}
	const requestedSet = new Set<string>(requested);
	return known.filter((id) => requestedSet.has(id));
}

/** Per-provider credential state, mirroring the harness's `missingCreds` decision. */
export interface ProviderCredState {
	id: string;
	/** Required env vars that are absent/empty for this provider (from harness `missingCreds`). */
	missing: string[];
}

/** A (provider, suite) cell dropped from the matrix because the provider has no credentials. */
export interface SkipCell {
	provider: string;
	suite: SuiteName;
	reason: string;
}

export interface MatrixPlan {
	/** Credentialed provider ids — the fan-out matrix the per-suite reusable workflow runs over. */
	providers: string[];
	/** Selected suites — each becomes one suite job in the orchestrator. */
	suites: SuiteName[];
	/** Cells dropped for missing credentials: one per credential-less provider × selected suite. */
	skipped: SkipCell[];
}

/** The skip reason recorded for a credential-less provider — matches the harness's runSuite wording. */
export function missingCredsReason(missing: readonly string[]): string {
	return `Missing credentials: ${missing.join(", ")}`;
}

/**
 * Plan the matrix: partition the selected providers into credentialed (kept in {@link MatrixPlan.providers})
 * and credential-less (dropped, one skip cell per selected suite). Suites pass through unchanged — the
 * orchestrator gates each suite job on the emitted padded suite list, then the reusable workflow fans the
 * credentialed providers out under that suite.
 *
 * Dropping credential-less providers HERE (rather than spinning a runner per provider just to write a skip
 * marker) is the cost saving the matrix exists for; their skip markers are written once at plan time so the
 * packaged Run still records why they are absent.
 */
export function planMatrix(opts: {
	providers: readonly ProviderCredState[];
	suites: readonly SuiteName[];
}): MatrixPlan {
	const providers: string[] = [];
	const skipped: SkipCell[] = [];
	for (const provider of opts.providers) {
		if (provider.missing.length === 0) {
			providers.push(provider.id);
			continue;
		}
		const reason = missingCredsReason(provider.missing);
		for (const suite of opts.suites) skipped.push({ provider: provider.id, suite, reason });
	}
	return { providers, suites: [...opts.suites], skipped };
}
