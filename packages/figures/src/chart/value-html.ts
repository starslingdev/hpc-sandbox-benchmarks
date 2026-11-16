/** The cost-vs-time scatter: log scales, bottom left best; billed dots solid, estimated hollow. */

import type { FigureProvider, ValueScatter } from "../metric-model.ts";
import { pageColors } from "../page-theme.ts";
import { assertCovered } from "./fonts.ts";
import { METRIC_BAR_COLOR as TEAL } from "./metric-model.ts";
import * as T from "./template.ts";

const { px, MONO } = T;
const AXIS = 76; // y-axis tick column
const H = 440;
const DOT = 12;
const LINE = 14;
const W = T.FIGURE_WIDTH - 2 * T.PADDING - AXIS;

const minutes = (s: number) =>
	s >= 3600
		? `${Math.floor(s / 3600)}h${s % 3600 ? ` ${Math.round((s % 3600) / 60)}m` : ""}`
		: `${Math.round(s / 60)}m`;

function logScale(values: readonly number[]) {
	const lo = Math.min(...values) / 1.25;
	const hi = Math.max(...values) * 1.25;
	return { lo, hi, at: (v: number) => Math.log(v / lo) / Math.log(hi / lo) };
}

const STYLE = `.plot { position: relative; margin-left: ${px(AXIS)}; width: ${px(W)}; height: ${px(H)}; border-left: 1px solid ${pageColors.muted40}; border-bottom: 1px solid ${pageColors.muted40}; background: linear-gradient(to top right, #e3f3f5 0%, #ffffff 45%); }
.plot > span { position: absolute; white-space: nowrap; }
.grid { background: #eeeeee; }
.tick { font: 400 10px/14px ${MONO}; color: ${pageColors.muted}; }
.dot { width: ${DOT}px; height: ${DOT}px; border-radius: 50%; border: 2px solid ${TEAL}; }
.name { font: 400 11px/${LINE}px ${MONO}; color: ${pageColors.fg90}; }
.axis-title { font: 400 11px/16px ${MONO}; letter-spacing: 0.08em; text-transform: uppercase; color: ${pageColors.muted}; }
.corner { left: 10px; bottom: 8px; font: 400 10px/14px ${MONO}; letter-spacing: 0.14em; text-transform: uppercase; color: ${TEAL}; }
.swatch { border-radius: 50%; border: 2px solid ${TEAL}; }
`;

export function valueScatterHtml(
	scatter: ValueScatter,
	providers: readonly FigureProvider[],
	note: string,
): string {
	const offSpec = new Set(providers.filter((p) => !p.specMatched).map((p) => p.id));
	const x = logScale(scatter.points.map((p) => p.costUsd));
	const y = logScale(scatter.points.map((p) => p.seconds));
	const left = (v: number) => x.at(v) * W;
	const top = (v: number) => (1 - y.at(v)) * H;
	const inRange = (s: { lo: number; hi: number }, t: number) => t >= s.lo && t <= s.hi;
	const grid = [
		...[0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
			.filter((t) => inRange(x, t))
			.map(
				(t) =>
					`<span class="grid" style="left: ${px(left(t))}; top: 0; width: 1px; height: ${px(H)};"></span>` +
					`<span class="tick" style="left: ${px(left(t) - 16)}; top: ${px(H + 6)};">$${t}</span>`,
			),
		...[5, 10, 15, 20, 25, 30, 35, 45, 55, 60, 90, 120, 180]
			.map((m) => m * 60)
			.filter((t) => inRange(y, t))
			.map(
				(t) =>
					`<span class="grid" style="top: ${px(top(t))}; left: 0; height: 1px; width: ${px(W)};"></span>` +
					`<span class="tick" style="left: ${px(4 - AXIS)}; top: ${px(top(t) - 7)};">${minutes(t)}</span>`,
			),
	];
	// Each label takes the first free slot: right of its dot, else left, else a line lower. Dots are
	// obstacles too, so no label covers one.
	const box = (x0: number, w: number, y: number) => ({ x0, x1: x0 + w, y });
	const placed = scatter.points.map((p) =>
		box(left(p.costUsd) - DOT / 2, DOT, top(p.seconds) - DOT / 2),
	);
	const dots = [...scatter.points]
		.sort((a, b) => top(a.seconds) - top(b.seconds))
		.map((p) => {
			const cx = left(p.costUsd);
			const cy = top(p.seconds);
			const label = `${p.label}${offSpec.has(p.provider) ? " †" : ""}`;
			const w = label.length * 6.7;
			const fits = [cx + DOT / 2 + 4, cx - DOT / 2 - 4 - w].filter((x) => x >= 0 && x + w <= W);
			const sides = fits.length > 0 ? fits : [Math.max(0, W - w)];
			const free = (x0: number, y: number) =>
				!placed.some((b) => Math.abs(b.y - y) < LINE && b.x0 < x0 + w && x0 < b.x1);
			let ly = cy - LINE / 2;
			while (!sides.some((x) => free(x, ly))) ly += LINE / 2;
			const x0 = sides.find((x) => free(x, ly)) as number;
			placed.push(box(x0, w, ly));
			return (
				`<span class="dot" style="left: ${px(cx - DOT / 2)}; top: ${px(cy - DOT / 2)}; background: ${p.billed ? TEAL : "#ffffff"};"></span>` +
				`<span class="name" style="left: ${px(x0)}; top: ${px(ly)};">${T.escapeHtml(label)}</span>`
			);
		});
	const document = T.chartDocument({
		title: scatter.label,
		summary: `economics · three-pipeline total · ${scatter.points.length} environments · not ranked`,
		noteHtml: T.inlineMarkdown(note),
		rows: [
			`<p class="axis-title">time · lower is faster</p>` +
				`<div class="plot">${grid.join("")}<span class="corner">faster &amp; cheaper</span>${dots.join("")}</div>` +
				`<p class="axis-title" style="margin: 26px 0 0 ${px(AXIS)};">cost (USD) · left is cheaper</p>`,
		],
		legendItems: [
			`<li><span class="swatch" style="background: ${TEAL};"></span>billed: the provider's own bill</li>`,
			`<li><span class="swatch"></span>estimated: published prices × time</li>`,
		],
		legendNote: "log scales",
		style: STYLE,
	});
	assertCovered(document);
	return document;
}
