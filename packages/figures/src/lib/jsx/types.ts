/**
 * The element and style vocabulary the figure components are written against.
 *
 * Two deliberate narrowings, both of which buy compile-time errors that neither React's
 * `CSSProperties` nor satori's own shipped JSX runtime can give us (both type `style` as an index
 * signature, so `display: "grid"` compiles against either):
 *
 *  - {@link Style} is a hand-maintained SUBSET of what satori supports — a property absent here is
 *    a property these components do not use. Adding one is a two-line change; the CLOSED set is the
 *    whole point, because satori lays out with Yoga and silently mis-renders anything it cannot
 *    honour (`z-index` warns and continues; `calc()` warns and falls back to a wrong width).
 *  - {@link JSX.IntrinsicElements} lists only the tags these components use. `<table>`/`<tr>`/`<td>`
 *    are absent ON PURPOSE: satori has no table layout at all, so a table built from table tags
 *    renders as a vertical pile. A ranked table here is flex rows of fixed-width cells.
 */

/** Anything that may appear as a child. The recursion is what makes `{rows.map(...)}` legal, and the
 *  `null | undefined | boolean` arm is what makes `{cond ? <X/> : null}` and `{cond && <X/>}` legal. */
export type Child = Element | string | number | boolean | null | undefined | readonly Child[];

/** A rendered element. Satori consumes exactly this shape; there is no React runtime involved. */
export interface Element {
	readonly type: string;
	readonly props: Readonly<Record<string, unknown>> & { readonly children?: Child };
	readonly key: string | null;
}

/** A function component: props in, elements out. Called ONCE by the renderer — no state, no effects. */
export type FC<P = Record<never, never>> = (props: P) => Element | null;

/** Lengths satori accepts where we use them. Deliberately excludes `calc()`, which satori warns on
 *  and then silently falls back — a wrong width is worse than a compile error. */
export type Length = number | `${number}%`;

/** The flexbox-only style subset. See the module comment for why this is closed rather than open. */
export interface Style {
	display?: "flex" | "none";
	flexDirection?: "row" | "column";
	alignItems?: "flex-start" | "center" | "flex-end" | "baseline" | "stretch";
	justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
	gap?: number;

	/** Absolute positioning is how the interval bar and its median tick are placed on a shared track:
	 *  a tick expressed as a flex sibling cannot sit INSIDE the bar it annotates. */
	position?: "relative" | "absolute";
	left?: number;
	top?: number;

	width?: Length;
	height?: Length;
	padding?: number;
	paddingBottom?: number;
	paddingLeft?: number;
	paddingRight?: number;
	marginTop?: number;
	marginBottom?: number;
	marginLeft?: number;
	marginRight?: number;

	backgroundColor?: string;
	borderRadius?: number;
	borderBottom?: string;

	color?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: 400 | 700;
}

/** Props every intrinsic element accepts.
 *
 * `key` is declared here as well as in `JSX.IntrinsicAttributes` because TypeScript checks an
 * intrinsic tag's attributes against `IntrinsicElements[tag]` directly. It never reaches the props
 * object at runtime — TS and Bun both pass `key` to the runtime as a separate third argument. */
export interface ElementProps {
	key?: string | number;
	style?: Style;
	children?: Child;
}
