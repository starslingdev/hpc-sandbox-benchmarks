import { describe, expect, it } from "bun:test";
import { placeLabels } from "./value-html.ts";

const LINE = 14;
const DOT = 12;
const overlaps = (a: { x0: number; x1: number; y0: number; y1: number }, b: typeof a) =>
	a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe("placeLabels", () => {
	// The crowded $0.13–$0.26 cluster of run 43863642458's backfilled scatter, in plot pixels.
	const cluster = [
		[448, 290, 6],
		[505, 299, 21],
		[597, 290, 18],
		[600, 329, 9],
		[470, 345, 8],
		[730, 293, 6],
	].map(([cx, cy, chars]) => ({ cx: cx as number, cy: cy as number, w: (chars as number) * 6.7 }));
	const placed = placeLabels(cluster);
	const labelBox = ({ w, slot }: (typeof placed)[number]) => ({
		x0: slot.x,
		x1: slot.x + w,
		y0: slot.y,
		y1: slot.y + LINE,
	});

	it("covers no dot and no other label", () => {
		for (const [i, label] of placed.entries()) {
			for (const { cx, cy } of cluster) {
				const dot = { x0: cx - DOT / 2, x1: cx + DOT / 2, y0: cy - DOT / 2, y1: cy + DOT / 2 };
				expect(overlaps(labelBox(label), dot)).toBe(false);
			}
			for (const other of placed.slice(i + 1)) {
				expect(overlaps(labelBox(label), labelBox(other))).toBe(false);
			}
		}
	});

	it("keeps every label without a leader on its dot's line or straight above or below it", () => {
		for (const { cx, cy, w, slot } of placed) {
			const onLine = Math.abs(slot.y - (cy - LINE / 2)) <= LINE / 2;
			expect(slot.leader || onLine || (slot.x <= cx && cx <= slot.x + w)).toBe(true);
		}
	});

	it("keeps a lone label beside its dot, on its line", () => {
		const [{ slot }] = placeLabels([{ cx: 100, cy: 100, w: 40 }]) as [(typeof placed)[number]];
		expect(slot).toEqual({ x: 100 + DOT / 2 + 4, y: 100 - LINE / 2, leader: false });
	});
});
