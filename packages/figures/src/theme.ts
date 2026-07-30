/**
 * Design tokens for the sandbox-benchmark share figures.
 *
 * Typography is monospace THROUGHOUT, which is a correctness decision before it is an
 * aesthetic one:
 *
 *  - Every glyph in DejaVu Sans Mono shares one advance width, so a cell's laid width is
 *    `chars × fontSize × ADVANCE_RATIO` exactly (lib/view/columns.ts). That is what lets
 *    column widths be solved with arithmetic instead of measurement — satori exposes no
 *    measurement API, and does not clip, so an unsolved width wraps or leaks silently.
 *  - Numeric columns get tabular figures for free. Satori ignores `fontVariantNumeric`
 *    and `fontFeatureSettings`, so a proportional face's `tnum` can never be switched on
 *    afterwards, and `1,111.11` vs `8,888.88` would differ in width.
 *
 * The palette is the site's own dark theme (src/index.css) resolved to opaque hex.
 * Satori has no CSS variables and no `color-mix`, and an alpha-composited border over an
 * unknown backdrop is not something it can resolve — so every value here is the colour
 * the site produces ON the figure's background, computed once rather than approximated
 * per component.
 *
 * A `Theme` is an object rather than a `"dark" | "light"` union so a third theme is an
 * addition instead of a breaking change.
 */

export interface ThemeColors {
	/** Figure background. */
	bg: string;
	/** Primary text: metric labels, measured values. */
	fg: string;
	/** Secondary text: units, column headers, footnotes. */
	dim: string;
	/** Row rules and table borders. */
	line: string;
	/** Dimension-group header band. */
	bandBg: string;
	/** Dimension-group header text. */
	band: string;
	/** The row's best cell: text and its wash. */
	best: string;
	bestBg: string;
	/** Behind-the-best wash, indexed by RatioTintStep. Index 0 is "no shading". */
	tint: readonly [string, string, string, string, string];
	/** A cell the run produced no value for. */
	missing: string;
	/** Off-spec (†) and backfilled (‡) markers. */
	marker: string;
}

export interface Theme {
	readonly name: string;
	readonly colors: Readonly<ThemeColors>;
}

/**
 * The canonical figure theme: the site's light surface, matching what the previous
 * browser-captured images used. Share images land in blog posts, READMEs and social
 * cards whose surrounding surface is usually light, and a dark crop on a light page
 * reads as a screenshot of something else.
 */
export const light: Theme = {
	name: "light",
	colors: {
		bg: "#ffffff",
		fg: "#0a0a0a",
		dim: "#737373",
		line: "#e5e5e5",
		bandBg: "#f7f7f7",
		band: "#0990a6",
		best: "#0a0a0a",
		bestBg: "#f0fafb",
		tint: ["#ffffff", "#fdf6ee", "#fbeedd", "#f8e3c8", "#f5d8b3"],
		missing: "#a3a3a3",
		marker: "#b45309",
	},
};

/** The site's canonical dark surface, for figures embedded on a dark page. */
export const dark: Theme = {
	name: "dark",
	colors: {
		bg: "#030712",
		fg: "#f9fafb",
		dim: "#9ca3af",
		line: "#1b2130",
		bandBg: "#0a1020",
		band: "#22d3ee",
		best: "#f9fafb",
		bestBg: "#07222a",
		tint: ["#030712", "#0b0d15", "#131118", "#1b151b", "#24191d"],
		missing: "#4b5563",
		marker: "#fbbf24",
	},
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;

/** Font size per region. Column widths derive from these, so changing one reflows. */
export const type_ = {
	title: 21,
	subtitle: 14,
	columnHeader: 12,
	cell: 15,
	band: 12,
	footnote: 12,
} as const;

/** Layout constants shared by the width solver and the components. */
export const metrics = {
	/** Horizontal padding inside every cell, per side. */
	cellPadX: 12,
	/** Data row height. Must comfortably exceed `type_.cell` or rows crowd. */
	rowHeight: 34,
	/** Dimension-band row height. */
	bandHeight: 26,
	/** Figure padding. */
	pad: 32,
} as const;
