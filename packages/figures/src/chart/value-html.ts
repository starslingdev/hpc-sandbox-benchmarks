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
.leaders { position: absolute; left: 0; top: 0; overflow: visible; }
.leaders line { stroke: ${pageColors.muted}; stroke-width: 1; }
`;

/** Half-line shifts off a dot's level, nearest first. */
const SHIFTS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, -8];

/**
 * Place labels in order, each in the nearest free slot inside the plot so it reads as its dot's:
 * beside the dot on its own line (right, else left), else centred just above or below it, else
 * beside it shifted by half lines. Dots are obstacles too, so no label covers one. A label shifted
 * more than half a line can sit nearer a neighbour's dot than its own, so it gets a leader line.
 */
export function placeLabels<L extends { cx: number; cy: number; w: number }>(labels: readonly L[]) {
	const box = (x0: number, w: number, y: number) => ({ x0, x1: x0 + w, y });
	const placed = labels.map(({ cx, cy }) => box(cx - DOT / 2, DOT, cy - DOT / 2));
	return labels.map((label) => {
		const { cx, cy, w } = label;
		const fits = [cx + DOT / 2 + 4, cx - DOT / 2 - 4 - w].filter((x) => x >= 0 && x + w <= W);
		const sides = fits.length > 0 ? fits : [Math.max(0, W - w)];
		const centred = Math.min(Math.max(0, cx - w / 2), W - w);
		const level = cy - LINE / 2;
		const free = (x0: number, y: number) =>
			!placed.some((b) => Math.abs(b.y - y) < LINE && b.x0 < x0 + w && x0 < b.x1);
		let slot = [
			...sides.map((x) => ({ x, y: level, leader: false })),
			{ x: centred, y: cy - DOT / 2 - LINE - 1, leader: false },
			{ x: centred, y: cy + DOT / 2 + 1, leader: false },
			...SHIFTS.flatMap((k) =>
				sides.map((x) => ({ x, y: level + (k * LINE) / 2, leader: Math.abs(k) > 1 })),
			),
		]
			.filter((c) => c.y >= 0 && c.y + LINE <= H)
			.find((c) => free(c.x, c.y));
		// A pile-up past every nearby slot: keep walking down.
		for (let y = level + ((SHIFTS.length / 2 + 1) * LINE) / 2; slot === undefined; y += LINE / 2) {
			const x = sides.find((s) => free(s, y));
			if (x !== undefined) slot = { x, y, leader: true };
		}
		placed.push(box(slot.x, w, slot.y));
		return { ...label, slot };
	});
}

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
	const placed = placeLabels(
		[...scatter.points]
			.sort((a, b) => top(a.seconds) - top(b.seconds))
			.map((p) => {
				const name = `${p.label}${offSpec.has(p.provider) ? " †" : ""}`;
				return { p, name, cx: left(p.costUsd), cy: top(p.seconds), w: name.length * 6.7 };
			}),
	);
	// Under the dots, so each line starts at its dot's centre and the dot hides the overlap.
	const leaders = placed.flatMap(({ cx, cy, w, slot }) =>
		slot.leader
			? [
					`<line x1="${cx}" y1="${cy}" x2="${slot.x >= cx ? slot.x - 2 : slot.x + w + 2}" y2="${slot.y + LINE / 2}"/>`,
				]
			: [],
	);
	const dots = placed.map(
		({ p, name, cx, cy, slot }) =>
			`<span class="dot" style="left: ${px(cx - DOT / 2)}; top: ${px(cy - DOT / 2)}; background: ${p.billed ? TEAL : "#ffffff"};"></span>` +
			`<span class="name" style="left: ${px(slot.x)}; top: ${px(slot.y)};">${T.escapeHtml(name)}</span>`,
	);
	const document = T.chartDocument({
		title: scatter.label,
		summary: `economics · three-pipeline total · ${scatter.points.length} environments · not ranked`,
		noteHtml: T.inlineMarkdown(note),
		rows: [
			`<p class="axis-title">time · lower is faster</p>` +
				`<div class="plot">${grid.join("")}<span class="corner">faster &amp; cheaper</span><svg class="leaders" width="${W}" height="${H}">${leaders.join("")}</svg>${dots.join("")}</div>` +
				`<p class="axis-title" style="margin: 26px 0 0 ${px(AXIS)};">cost (USD) · left is cheaper</p>`,
		],
		legendItems: [
			T.legendItem("billed: the provider's bill rate × time", TEAL),
			`<li><span class="swatch"></span>estimated: published prices × time</li>`,
		],
		legendNote: "log scales",
		style: STYLE,
	});
	assertCovered(document);
	return document;
}
