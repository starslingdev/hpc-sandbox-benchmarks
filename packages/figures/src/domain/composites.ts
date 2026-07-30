/**
 * Composite share-image SELECTION: which rows and which provider columns each
 * published image is made of.
 *
 * This is the one part of the share-image pipeline that can be hermetic. It has
 * no I/O, no browser and no DOM, and it takes its dataset as an argument, so the
 * rules below are fixture-testable against synthetic data rather than against
 * whatever the current run happens to contain.
 *
 * It deliberately does NOT decide what the image LOOKS like — the footnote, the
 * table width, the capture anchor. Those live in ../lib/view/table.ts, so there
 * is exactly one place that turns a spec into a view model and no call site that
 * can get a prop wrong.
 *
 * NOR does it decide WHICH composites exist. The published specs are an editorial
 * record about one post on one site (`src/lib/sandbox-composites.ts`); the rules
 * for turning any spec into a table are this package's. Keeping the two apart is
 * what lets the dataset be an argument here: a resolver holding the site's specs
 * would have to hold the site's dataset to be worth calling.
 */
import { rowRestrictedTo } from "./metrics.ts";
import type { MetricTableRow, SandboxBenchmarkData, SandboxProvider } from "./types.ts";

export interface CompositeSpec {
	name: string;
	/**
	 * Headline for the rendered figure, and the basis of its alt text.
	 *
	 * A share image is read outside the page that framed it, so it has to say what it is
	 * showing on its own. The spec name is a file name, not a sentence; when it is the only
	 * thing available the figure falls back to it, but every published composite should
	 * carry a title.
	 */
	title?: string;
	/**
	 * Rows to keep.
	 *
	 * A `predicate` only notices a selection that matched NOTHING. An explicit
	 * `ids` list names every id that failed to resolve, so a composite that
	 * quietly lost three of its four rows to a renamed metric fails instead of
	 * shipping a thinner table than it claims. Use `ids` whenever the image's
	 * argument depends on those exact rows being present.
	 */
	rows: { predicate: (id: string) => boolean } | { ids: string[] };
	/** Provider ids to keep. Omit to keep all. Column ORDER is always the
	 *  table's, never this array's — see resolveComposite. */
	providers?: string[];
}

export interface ResolvedComposite {
	name: string;
	groups: { dimension: string; rows: MetricTableRow[] }[];
	providers: SandboxProvider[];
}

function resolveIds(spec: CompositeSpec, allMetricIds: string[]): Set<string> {
	if ("ids" in spec.rows) {
		const known = new Set(allMetricIds);
		const missing = spec.rows.ids.filter((id) => !known.has(id));
		if (missing.length > 0) {
			throw new Error(
				`composite "${spec.name}" names ${missing.length} metric id(s) this run has no row for: ${missing.join(", ")}`,
			);
		}
		return new Set(spec.rows.ids);
	}
	const predicate = spec.rows.predicate;
	const ids = allMetricIds.filter(predicate);
	if (ids.length === 0) {
		throw new Error(`composite "${spec.name}" selected no rows: check its predicate`);
	}
	return new Set(ids);
}

/**
 * Resolve a spec against a dataset. Three rules, each of which the DOM-surgery
 * implementation this replaced got right only as a side effect of operating on
 * an already-rendered table:
 *
 *  - **Row and column order come from the TABLE, not the spec.** The old
 *    implementation deleted rows and columns in place, so it could not reorder
 *    even if a spec listed them differently. Resolving by spec order instead
 *    would render two provider columns under each other's headers.
 *  - **An orphaned task row is flattened** (`indent: false`). `shortRowLabel`
 *    keys off `indent`, so this alone restores the full catalog label: a
 *    cold-install row kept without its suite total reads "Better-Auth: cold
 *    install" rather than a bare "cold install" with no repo attached.
 *  - **A restricted row is restricted BEFORE derivation** (`rowRestrictedTo`),
 *    after which the table's own `bestP50` / `metricSpread` / `ratioTint`
 *    re-derive against the kept set. Without it a two-column image inherits the
 *    six-provider Spread — ×66.9 across a set it no longer shows — and may mark
 *    "best" on a column that is gone.
 *
 * The dataset is REQUIRED, not defaulted. A default would be a module-level
 * singleton, and it is precisely the absence of one that lets the fixture tests
 * run this against synthetic data instead of against whatever the committed run
 * happens to contain.
 */
export function resolveComposite(
	spec: CompositeSpec,
	data: SandboxBenchmarkData,
): ResolvedComposite {
	const allMetricIds = data.dimensionGroups.flatMap((g) => g.rows.map((r) => r.id));
	const parentTotalOf: Record<string, string> = Object.fromEntries(
		data.suites.flatMap((s) => s.tasks.map((t) => [t.id, `${s.id}_total`])),
	);

	const keep = resolveIds(spec, allMetricIds);
	const allProviderIds = data.providers.map((p) => p.id);
	const keepProviderIds = spec.providers ?? allProviderIds;
	const unknown = keepProviderIds.filter((id) => !allProviderIds.includes(id));
	if (unknown.length > 0) {
		throw new Error(`composite "${spec.name}" names unknown provider(s): ${unknown.join(", ")}`);
	}
	const restrict = spec.providers !== undefined;

	const groups = data.dimensionGroups
		.map((group) => ({
			dimension: group.dimension,
			rows: group.rows
				.filter((row) => keep.has(row.id))
				.map((row) => {
					const orphan = row.indent === true && !keep.has(parentTotalOf[row.id] ?? "");
					const flattened = orphan ? { ...row, indent: false } : row;
					return restrict ? rowRestrictedTo(flattened, keepProviderIds) : flattened;
				}),
		}))
		.filter((group) => group.rows.length > 0);

	return {
		name: spec.name,
		groups,
		// Table order, NOT spec order — enforced structurally rather than trusting
		// the caller to type the array in the right order.
		providers: data.providers.filter((p) => keepProviderIds.includes(p.id)),
	};
}
