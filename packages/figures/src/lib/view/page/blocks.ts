/**
 * The block tree the page figures are described as, and the vocabulary every builder in
 * this directory speaks.
 *
 * WHY A TREE IN `view/` RATHER THAN SIX BESPOKE COMPONENTS. This package's layering says
 * `view/` holds pure data and every decision, and `components/` is dumb. Eight figures of
 * six different shapes would otherwise mean six components each making its own layout
 * choices in JSX, where the only way to test any of it is to render an SVG and squint. A
 * closed block union moves all eight layouts into plain objects a fixture test can assert
 * on — `blocks[2].children[0].height === 36` is a unit test — and leaves exactly ONE
 * component in the package that knows how to draw a box.
 *
 * THE UNION IS TWO MEMBERS ON PURPOSE.
 *
 *   `stack`  a flex box. With a background and a fixed size it is also every rule, every
 *            swatch and every bar segment in these figures; there is no separate "fill"
 *            node, because a second way to draw a rectangle is a second thing to keep in
 *            step.
 *   `text`   ONE LINE of text. Wrapped prose is a `stack` of `text` lines, which is what
 *            the browser does too (a line box per line) and is what lets a builder know a
 *            paragraph's height before satori has laid it out. Satori will not tell it
 *            afterwards.
 *
 * EVERY `text` CARRIES ITS OWN MEASURED WIDTH AND COMPENSATED LETTER SPACING, from
 * ../text.ts. That is the load-bearing detail: satori accumulates exact fractional glyph
 * advances and Chromium rounds each advance to a whole pixel, so a run handed to satori
 * without its compensation comes out systematically wide, and a right-aligned number ends
 * up in the wrong place. Builders never construct a `text` by hand; they go through
 * {@link textBlock}, which cannot forget.
 */

import type { StackName } from "../../assets/page-fonts.ts";
import type { TextStyle } from "../text.ts";
import { measureRun } from "../text.ts";

export interface BoxStyle {
	readonly width?: number;
	readonly height?: number;
	readonly paddingTop?: number;
	readonly paddingRight?: number;
	readonly paddingBottom?: number;
	readonly paddingLeft?: number;
	readonly marginTop?: number;
	readonly marginBottom?: number;
	readonly marginLeft?: number;
	readonly background?: string;
	/** Colour of a 1px rule on that edge. The page draws all its rules at 1px. */
	readonly borderTop?: string;
	readonly borderBottom?: string;
	readonly borderLeft?: string;
	readonly borderRight?: string;
	readonly radius?: number;
	/** Per-corner radii, for a bar whose right end is rounded and left end is not. */
	readonly radiusCorners?: readonly [number, number, number, number];
}

export interface StackBlock extends BoxStyle {
	readonly kind: "stack";
	readonly direction: "row" | "column";
	readonly gap?: number;
	readonly align?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
	readonly justify?: "flex-start" | "center" | "flex-end" | "space-between";
	readonly wrap?: boolean;
	readonly children: readonly Block[];
}

export interface TextBlock extends BoxStyle {
	readonly kind: "text";
	/** Already uppercased if the style asked for it — see ../text.ts. */
	readonly text: string;
	readonly stack: StackName;
	readonly size: number;
	readonly weight: 400 | 500 | 600 | 700;
	/** Compensated. Pass to satori verbatim; do not add tracking to it again. */
	readonly letterSpacing: number;
	readonly color: string;
	/** Chromium's width for this run. Callers use it to position siblings. */
	readonly measuredWidth: number;
	readonly lineHeight: number;
}

export type Block = StackBlock | TextBlock;

/** Build a measured single-line text block. The only way a `text` is constructed. */
export function textBlock(
	text: string,
	style: TextStyle,
	color: string,
	options: { lineHeight: number } & BoxStyle,
): TextBlock {
	const run = measureRun(text, style);
	const { lineHeight, ...box } = options;
	return {
		kind: "text",
		...box,
		text: run.text,
		stack: style.stack,
		size: style.size,
		weight: style.weight,
		letterSpacing: run.letterSpacing,
		color,
		measuredWidth: run.width,
		lineHeight,
		height: box.height ?? lineHeight,
	};
}

/** A plain container. Present so builders never write `kind: "stack"` by hand and a new
 *  field on {@link StackBlock} has one place to acquire a default. */
export function stack(
	direction: "row" | "column",
	children: readonly Block[],
	options: Omit<StackBlock, "kind" | "direction" | "children"> = {},
): StackBlock {
	return { kind: "stack", direction, children, ...options };
}

/** A rectangle: a rule, a swatch, a bar segment. A `stack` with no children, named so the
 *  intent is readable at the call site. */
export function fill(
	width: number,
	height: number,
	background: string,
	options: BoxStyle = {},
): StackBlock {
	return { kind: "stack", direction: "row", children: [], width, height, background, ...options };
}

/** A figure: one block tree plus the canvas it is drawn on. */
export interface PageFigureView {
	/** Matches the page's `data-snapshot` anchor, so a figure and the crop it reproduces
	 *  are named the same thing and `figure-diff` can pair them without a lookup table. */
	readonly anchor: string;
	/** Canvas width in CSS px, including the crop padding on both sides. */
	readonly width: number;
	readonly root: Block;
}
