/**
 * The load-bearing assumption of the whole width solver: `textWidth()` predicts what satori will
 * actually lay out. If it under-predicts by even a pixel, cells wrap or leak — silently, because
 * satori does not clip and exposes no measurement API to detect it after the fact.
 *
 * This is the only test that validates `view/` arithmetic against the real layout engine, which is
 * why it lives in `render/` (the layer allowed to import satori) rather than beside the solver.
 */
import { describe, expect, it } from "bun:test";
import satori from "satori";
import { type_ } from "../../theme.ts";
import { loadFonts } from "../assets/fonts.ts";
import { textWidth } from "../view/columns.ts";

type SatoriArg = Parameters<typeof satori>[0];

/** Lay out a string with no width constraint and report what satori made it. */
async function laidWidth(text: string, fontSize: number): Promise<number> {
	const fonts = await loadFonts();
	let width = 0;
	await satori(
		{
			type: "div",
			props: {
				style: { display: "flex" },
				children: {
					type: "div",
					props: { style: { display: "flex", fontFamily: "Mono", fontSize }, children: text },
				},
			},
		} as unknown as SatoriArg,
		{
			width: 8000,
			fonts: fonts.map((f) => ({ ...f })),
			embedFont: true,
			onNodeDetected: (node) => {
				if (node.textContent === text) width = node.width;
			},
		},
	);
	return width;
}

const SAMPLES = [
	"0",
	"W",
	"(",
	"1234567890",
	"Modal (gVisor)",
	"248500",
	"18.51 – 20.56",
	"n too small, equal medians",
	"95% INTERVAL",
	"not measured",
	"bar = 95% bootstrap interval, tick = median",
	"fio rand read 4KB, O_DIRECT (IOPS)",
];

describe("textWidth predicts satori's layout", () => {
	for (const fontSize of [
		type_.footnote,
		type_.columnHeader,
		type_.subtitle,
		type_.cell,
		type_.title,
	]) {
		it(`never under-predicts at ${fontSize}px`, async () => {
			for (const text of SAMPLES) {
				const predicted = textWidth(text, fontSize);
				const actual = await laidWidth(text, fontSize);
				// Under-prediction is the dangerous direction: it is what makes a cell wrap.
				expect(predicted).toBeGreaterThanOrEqual(actual);
				// Over-prediction is safe but wasteful; keep it tight so figures don't bloat.
				expect(predicted - actual).toBeLessThanOrEqual(1);
			}
		});
	}
});
