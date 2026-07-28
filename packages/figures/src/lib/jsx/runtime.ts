/**
 * A JSX runtime that builds satori element trees directly. No React.
 *
 * Satori calls each component exactly once to build a tree — there is no reconciler, no state, no
 * effects and no context, so every React feature beyond "a function returning elements" is inert
 * here. What we get for the ~40 lines below is a `style` prop typed as the flexbox-only subset
 * satori can actually lay out (see ./types.ts), which neither `react` nor satori's own shipped
 * `satori/jsx` runtime provides — both type it as an index signature.
 *
 * Three non-obvious requirements, each learned the hard way:
 *
 *  - The exported `JSX` namespace is MANDATORY. Without `JSX.IntrinsicElements`, every host tag is
 *    `error TS7026: JSX element implicitly has type 'any'` under `noImplicitAny`; without
 *    `IntrinsicAttributes`, `key` on a function component is TS2322; without
 *    `ElementChildrenAttribute`, nested JSX is not matched to the `children` prop.
 *  - `JSX.ElementType` must be a TYPE ALIAS. Declared as an empty interface it crashes tsc 6.0.3
 *    inside `getJsxElementTypeTypeAt` rather than producing a diagnostic.
 *  - `jsxDEV` takes SIX parameters and is what Bun actually calls. `bun test` and
 *    `bun build --target=bun` emit dev-runtime calls regardless of `jsx: "react-jsx"`, so the module
 *    tsc typechecks against (`jsx`/`jsxs`) is not the module Bun runs. Both must exist and agree.
 */
import type { Child, Element, ElementProps, FC, ImgProps } from "./types.ts";

/** Drop `undefined` style values. React tolerates them; satori throws
 *  `undefined is not an object (evaluating 'inputValue.trim')` from deep inside its CSS parser,
 *  with no attribution to the offending property. */
function clean(props: Record<string, unknown>): Record<string, unknown> {
	const style = props.style;
	if (style === undefined || style === null || typeof style !== "object") return props;
	const kept: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(style)) {
		if (value !== undefined) kept[key] = value;
	}
	return { ...props, style: kept };
}

export function jsx(
	type: string | FC<never>,
	props: Record<string, unknown>,
	key?: string | number,
): Element | null {
	if (typeof type === "function") {
		return (type as unknown as (p: Record<string, unknown>) => Element | null)(props);
	}
	return {
		type,
		props: clean(props) as Element["props"],
		key: key === undefined ? null : String(key),
	};
}

/** Satori does not distinguish static from dynamic children, so `jsxs` is `jsx`. */
export const jsxs = jsx;

/** Bun's dev path. The trailing three parameters are Bun's debug metadata and are deliberately unused. */
export function jsxDEV(
	type: string | FC<never>,
	props: Record<string, unknown>,
	key?: string | number,
	_isStaticChildren?: boolean,
	_source?: unknown,
	_self?: unknown,
): Element | null {
	return jsx(type, props, key);
}

/**
 * NOTE: a fragment is NOT transparent here — satori has no fragment concept, so `<>…</>` must
 * become a real element, and any real element is a box that participates in layout. It is emitted as
 * a `flexDirection: column` div, which is right for stacking figure sections and wrong for anything
 * expecting a passthrough. Prefer an explicit `<div>` in components where the layout matters.
 */
export function Fragment(props: { children?: Child }): Element {
	return {
		type: "div",
		props: { style: { display: "flex", flexDirection: "column" }, children: props.children },
		key: null,
	};
}

export declare namespace JSX {
	/** Must be a type alias — an empty interface crashes tsc 6.0.3. See the module comment. */
	type ElementType = string | FC<never>;
	type Element = import("./types.ts").Element | null;
	type ElementClass = never;
	interface ElementAttributesProperty {
		props: object;
	}
	interface ElementChildrenAttribute {
		children: object;
	}
	interface IntrinsicAttributes {
		key?: string | number | undefined;
	}
	/** Only what satori can lay out. No table tags — satori has no table layout. */
	interface IntrinsicElements {
		div: ElementProps;
		span: ElementProps;
		img: ImgProps;
	}
}
