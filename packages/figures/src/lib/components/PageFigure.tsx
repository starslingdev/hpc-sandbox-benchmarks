// biome-ignore-all lint/suspicious/noArrayIndexKey: the block tree is POSITIONAL — a block
// has no identity beyond where it sits, and reordering one means a different figure. There is
// nothing else to key on, and this renders once to a string with no reconciliation.
/**
 * The ONE component that draws a page figure.
 *
 * Presentational to the point of being mechanical: it walks the block tree from
 * `../view/page/blocks.ts` and turns each node into a `Box`. It makes no layout decision
 * of its own — no width, no height, no wrap point, no colour is computed here. All of
 * that is already in the tree, where a unit test can assert on it, which is the entire
 * reason the tree exists.
 *
 * TWO THINGS IT DOES THAT ARE NOT MECHANICAL, both about satori rather than about design:
 *
 *  1. **`flexShrink: 0` on everything.** Satori's Yoga will happily shrink a child below
 *     the width the view solved for it, and the symptom is a table column that is right
 *     in the view model and wrong in the image. The widths here are answers, not requests.
 *  2. **`whiteSpace: "pre"` on every text node.** Each `text` block is ONE line that has
 *     already been measured and, where it was wrapped, already broken. Letting satori
 *     re-break it would put a second line breaker in the pipeline, disagreeing with the
 *     one that computed the heights — and satori does not report heights back, so the
 *     disagreement would show up as text sliced off the bottom of the canvas.
 *
 * The crop padding is applied here rather than in the tree so every builder can work in
 * the page's own coordinates: an anchor is 896px wide on the page, and the crop adds 24px
 * of margin on each side (see `CROP_PADDING`).
 */

import { CROP_PADDING, pageColors } from "../../page-theme.ts";
import type { Style } from "../style.tsx";
import { Box } from "../style.tsx";
import type { Block, BoxStyle, PageFigureView } from "../view/page/blocks.ts";
import { fontFamilyOf } from "../view/text.ts";

/** Box-model properties every block shares. Rules are always 1px — the page has no
 *  thicker border anywhere in these eight regions. */
function boxStyle(block: BoxStyle): Style {
	const style: Style = { flexShrink: 0 };
	if (block.width !== undefined) style.width = block.width;
	if (block.height !== undefined) style.height = block.height;
	if (block.paddingTop !== undefined) style.paddingTop = block.paddingTop;
	if (block.paddingRight !== undefined) style.paddingRight = block.paddingRight;
	if (block.paddingBottom !== undefined) style.paddingBottom = block.paddingBottom;
	if (block.paddingLeft !== undefined) style.paddingLeft = block.paddingLeft;
	if (block.marginTop !== undefined) style.marginTop = block.marginTop;
	if (block.marginBottom !== undefined) style.marginBottom = block.marginBottom;
	if (block.marginLeft !== undefined) style.marginLeft = block.marginLeft;
	if (block.background !== undefined) style.backgroundColor = block.background;
	if (block.borderTop !== undefined) style.borderTop = `1px solid ${block.borderTop}`;
	if (block.borderBottom !== undefined) style.borderBottom = `1px solid ${block.borderBottom}`;
	if (block.borderLeft !== undefined) style.borderLeft = `1px solid ${block.borderLeft}`;
	if (block.borderRight !== undefined) style.borderRight = `1px solid ${block.borderRight}`;
	if (block.radius !== undefined) style.borderRadius = block.radius;
	if (block.radiusCorners !== undefined) {
		const [tl, tr, br, bl] = block.radiusCorners;
		style.borderTopLeftRadius = tl;
		style.borderTopRightRadius = tr;
		style.borderBottomRightRadius = br;
		style.borderBottomLeftRadius = bl;
	}
	return style;
}

function BlockNode({ block, index }: { block: Block; index: number }) {
	if (block.kind === "text") {
		return (
			<Box
				key={index}
				style={{
					...boxStyle(block),
					fontFamily: fontFamilyOf(block.stack),
					fontSize: block.size,
					fontWeight: block.weight,
					letterSpacing: block.letterSpacing,
					lineHeight: `${block.lineHeight}px`,
					color: block.color,
					alignItems: "center",
					whiteSpace: "pre",
				}}
			>
				{block.text}
			</Box>
		);
	}
	return (
		<Box
			key={index}
			style={{
				...boxStyle(block),
				flexDirection: block.direction,
				...(block.gap === undefined ? {} : { gap: block.gap }),
				...(block.align === undefined ? {} : { alignItems: block.align }),
				...(block.justify === undefined ? {} : { justifyContent: block.justify }),
				...(block.wrap ? { flexWrap: "wrap" as const } : {}),
			}}
		>
			{block.children.map((child, i) => (
				<BlockNode key={i} block={child} index={i} />
			))}
		</Box>
	);
}

export function PageFigure({ view }: { view: PageFigureView }) {
	return (
		<Box
			style={{
				flexDirection: "column",
				width: "100%",
				backgroundColor: pageColors.bg,
				padding: CROP_PADDING,
			}}
		>
			<BlockNode block={view.root} index={0} />
		</Box>
	);
}
