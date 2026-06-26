// Shared, agent-facing discovery for the CLI bins: a `--help`/`--list-*` flag detector and the
// provider/suite listings the bins advertise. Both listings read the schema registries directly, so a
// bin can never advertise a provider or suite that isn't registered. Kept here rather than per-bin so
// every bin spells the flags and renders the listings the same way (one vocabulary across the CLI).
import { PROVIDERS, SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";

/**
 * Whether `argv` contains any of `names`. Callers pass the long flags (e.g. `--help`, `--json`) — the
 * stable handle an agent should prefer — alongside any short alias (`-h`).
 */
export function hasFlag(argv: readonly string[], ...names: string[]): boolean {
	return argv.some((arg) => names.includes(arg));
}

/** One registered provider, as the discovery surface advertises it. */
export interface ProviderListing {
	id: string;
	displayName: string;
	requiredEnvVars: string[];
}

/** One registered suite, as the discovery surface advertises it. */
export interface SuiteListing {
	name: string;
	dimensions: string[];
	metrics: string[];
}

/** The registered providers, in schema declaration order — the join's schema half. */
export function providerListing(): ProviderListing[] {
	return PROVIDERS.map((p) => ({
		id: p.id,
		displayName: p.displayName,
		requiredEnvVars: [...p.requiredEnvVars],
	}));
}

/** The registered suites, in registry order, with the dimensions/metrics each emits. */
export function suiteListing(): SuiteListing[] {
	return SUITE_NAMES.map((name) => ({
		name,
		dimensions: [...SUITES[name].dimensions],
		metrics: [...SUITES[name].metrics],
	}));
}

/**
 * Render the provider listing: pretty JSON under `--json` (the machine surface), else one
 * `id<TAB>displayName (env vars)` line per provider for a human skimming `--help`.
 */
export function renderProviders(json: boolean): string {
	const rows = providerListing();
	if (json) return JSON.stringify(rows, null, 2);
	return rows.map((p) => `${p.id}\t${p.displayName} (${p.requiredEnvVars.join(", ")})`).join("\n");
}

/**
 * Render the suite listing: pretty JSON under `--json`, else one `name<TAB>[dimensions]` line per
 * suite.
 */
export function renderSuites(json: boolean): string {
	const rows = suiteListing();
	if (json) return JSON.stringify(rows, null, 2);
	return rows.map((s) => `${s.name}\t[${s.dimensions.join(", ")}]`).join("\n");
}

/**
 * The discovery dispatch every bin shares. Given the bin's `argv` (already sliced past the runtime +
 * script) and its `--help` text, return the text the bin should print to stdout, or `null` when no
 * discovery flag is present and the bin should fall through to its real positional behaviour.
 * Recognised flags, identical across every bin:
 *   - `--help` / `-h`    → the bin's usage text
 *   - `--list-providers` → the registered providers (pretty JSON under `--json`, else human lines)
 *   - `--list-suites`    → the registered suites
 * Centralising the dispatch keeps the flag vocabulary consistent and makes a bin's discovery output
 * unit-testable without spawning a process.
 */
export function handleDiscovery(argv: readonly string[], help: string): string | null {
	if (hasFlag(argv, "--help", "-h")) return help;
	const json = hasFlag(argv, "--json");
	if (hasFlag(argv, "--list-providers")) return renderProviders(json);
	if (hasFlag(argv, "--list-suites")) return renderSuites(json);
	return null;
}
