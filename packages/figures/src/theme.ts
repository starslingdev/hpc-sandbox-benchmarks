/**
 * Design tokens for the figures.
 *
 * Typography is monospace THROUGHOUT, which is a correctness decision rather than an aesthetic one:
 *
 *  - Every glyph in DejaVu Sans Mono shares one advance width, so a cell's laid width is
 *    `chars × fontSize × ADVANCE_RATIO` exactly (see lib/view/columns.ts). That is what lets column
 *    widths be solved with pure arithmetic in `view/`, with no font-parsing dependency and no
 *    measurement API — satori exposes none.
 *  - Numeric columns get tabular figures for free. Satori 0.29 silently IGNORES
 *    `fontVariantNumeric` and `fontFeatureSettings`, so a proportional face's `tnum` can never be
 *    switched on later; in a proportional face `1111.11` and `8888.88` differ in width by 2×.
 *
 * A `Theme` is an object rather than a `"dark" | "light"` union so a third theme is an addition
 * instead of a breaking change to a public union.
 */

export interface ThemeColors {
	/** Figure background. */
	bg: string;
	/** Primary text. */
	fg: string;
	/** Secondary text: units, footnotes, column headers. */
	dim: string;
	/** Row rules and separators. */
	line: string;
	/** The interval span for a row whose rank is statistically established. */
	bar: string;
	/** The interval span for a row whose rank is NOT established (tied/underpowered/untested). */
	barMuted: string;
	/** Median tick inside the interval span. */
	tick: string;
	/** Applied ONLY to a leader the statistics actually separate. See lib/view/metric-table.ts. */
	lead: string;
	/** Coverage-gap ("not measured") rows. */
	gap: string;
}

export interface Theme {
	readonly name: string;
	readonly colors: Readonly<ThemeColors>;
}

export const dark: Theme = {
	name: "dark",
	colors: {
		bg: "#0d1117",
		fg: "#e6edf3",
		dim: "#8b949e",
		line: "#21262d",
		bar: "#2f81f7",
		barMuted: "#3f4753",
		tick: "#e6edf3",
		lead: "#f0b429",
		gap: "#6e7681",
	},
};

export const light: Theme = {
	name: "light",
	colors: {
		bg: "#ffffff",
		fg: "#1f2328",
		dim: "#59636e",
		line: "#d1d9e0",
		bar: "#0969da",
		barMuted: "#d1d9e0",
		tick: "#1f2328",
		lead: "#9a6700",
		gap: "#818b98",
	},
};

export const themes = { dark, light } as const;

/** Font size per figure region. Column widths are derived from these, so changing one reflows. */
export const type_ = {
	title: 26,
	subtitle: 15,
	columnHeader: 13,
	cell: 16,
	footnote: 13,
} as const;

/** Layout constants shared by the width solver and the components. */
export const metrics = {
	/** Horizontal padding inside every cell, per side. */
	cellPadX: 12,
	/** Row height. Must comfortably exceed `type_.cell` or rows crowd. */
	rowHeight: 40,
	/** Figure padding. */
	pad: 36,
	/** Width of the interval-span column. */
	spanWidth: 260,
} as const;
