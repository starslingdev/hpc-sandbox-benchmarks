/**
 * The style vocabulary the figure components are written against, and the one primitive
 * that renders it.
 *
 * WHY A CLOSED TYPE. Satori lays out with Yoga and supports a strict subset of CSS. What
 * it does not support it does not reject: `display: "grid"` throws at render time,
 * `calc()` and `z-index` warn and then silently produce a wrong width, and
 * `fontVariantNumeric` is ignored outright. React's `CSSProperties` accepts all of them,
 * so a component typed against it gets no help at all. {@link Style} is a hand-maintained
 * subset — a property absent here is a property these figures do not use. Adding one is a
 * one-line change; the CLOSED set is the point.
 *
 * WHY A `Box` INSTEAD OF A CUSTOM JSX RUNTIME. The reference implementation this package
 * is modelled on defines its own JSX runtime so that intrinsic `<div style>` is typed
 * against its closed vocabulary. That costs a full `JSX` namespace, a 6-arity `jsxDEV`,
 * and `jsx`/`jsxImportSource` declared inline in every tsconfig the runner may resolve —
 * because those settings are ignored when inherited through `extends`. This repo already
 * has React and a working `react-jsx` pipeline, so all of that would be cost without
 * benefit. Routing every element through one `Box` gets the same closed vocabulary with
 * one cast at one site, and no build configuration to keep in step.
 *
 * There are deliberately no `<table>`/`<tr>`/`<td>` primitives: satori has NO table
 * layout, so table tags render as a vertical pile. A ranked table here is a column of
 * flex rows holding fixed, pre-solved widths.
 */
import type { CSSProperties, ReactNode } from "react";

/** Lengths satori honours where these figures use them. Excludes `calc()`, which satori
 *  warns on and then silently falls back to a wrong width. */
export type Length = number | `${number}%`;

/** The flexbox-only subset. See the module comment for why this is closed. */
export interface Style {
	display?: "flex" | "none";
	flexDirection?: "row" | "column";
	alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
	justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
	/** Only ever `wrap`: the page's phase legend wraps, and nothing here un-wraps. */
	flexWrap?: "wrap";

	width?: Length;
	height?: Length;
	minWidth?: Length;
	maxWidth?: Length;
	flexShrink?: 0;
	flexGrow?: 0 | 1;
	/** Gap between flex children. Satori honours it; the page uses it everywhere. */
	gap?: number;

	padding?: number;
	paddingLeft?: number;
	paddingRight?: number;
	paddingTop?: number;
	paddingBottom?: number;
	marginTop?: number;
	marginBottom?: number;
	marginLeft?: number;

	backgroundColor?: string;
	borderBottom?: string;
	borderTop?: string;
	borderLeft?: string;
	borderRight?: string;
	borderRadius?: number;
	/** Per-corner radii, for the bars whose right end is rounded and left end is not. */
	borderTopLeftRadius?: number;
	borderTopRightRadius?: number;
	borderBottomLeftRadius?: number;
	borderBottomRightRadius?: number;

	color?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: 400 | 500 | 600 | 700;
	/** In px. The page figures pass a COMPENSATED value from ../view/text.ts, never a raw
	 *  tracking value — see that module on why satori needs the compensation. */
	letterSpacing?: number;
	/** Satori honours this. The measurement in ../view/text.ts uppercases the string
	 *  itself, so the two cannot disagree about what is being laid out. */
	textTransform?: "uppercase";
	/** Number = multiple of font size; string = px. Satori accepts both. */
	lineHeight?: number | `${number}px`;
	/** Satori honours this; it is how a long footnote is allowed to wrap deliberately. */
	whiteSpace?: "pre" | "nowrap";
}

/**
 * The single element primitive. Every figure component composes this, so {@link Style} is
 * the only style vocabulary in the package and the cast to React's open `CSSProperties`
 * happens exactly once.
 *
 * `display: "flex"` is defaulted because satori requires an explicit display on any node
 * with more than one child, and forgetting it is a render-time throw rather than a
 * layout nudge.
 */
export function Box({ style, children }: { style: Style; children?: ReactNode }) {
	return <div style={{ display: "flex", ...style } as CSSProperties}>{children}</div>;
}
