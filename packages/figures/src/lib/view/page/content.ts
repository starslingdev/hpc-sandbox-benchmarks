/**
 * The AUTHORED strings the page figures reproduce, supplied by the caller.
 *
 * Two of the eight page figures show prose that no dataset contains: the KPI band's
 * labels and the per-suite note under each pipeline chart. Both are written in the
 * report's voice and both belong to the site, so the package takes them as an argument
 * rather than importing them — that is what keeps `src/figures` free of any edge back
 * into `@/lib`, and it is what makes it possible to render these figures for a run whose
 * prose has not been written yet.
 *
 * The KPI band is deliberately passed whole rather than re-derived from the data. Its
 * NUMBERS are computed by the site (from the same artifact), its LABELS are authored, and
 * the figure's whole claim is that it reproduces the band the page renders — so it must
 * read the band, not a second computation of it.
 */
export interface PageFigureContent {
	/** The four KPI tiles, exactly as the page renders them. */
	readonly headlineStats: readonly { value: string; label: string; sub: string }[];
	/** Authored note per charted suite id; a suite with no note renders none. */
	readonly suiteNotes: Readonly<Record<string, string>>;
}
