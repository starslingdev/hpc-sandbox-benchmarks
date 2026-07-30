/**
 * Calibrates the width solver against SATORI ITSELF.
 *
 * `textWidth` is a closed-form arithmetic prediction of what satori will lay out. If that
 * prediction is wrong the failure is silent and destructive: satori does not clip, so a
 * cell that is wider than its solved column wraps (doubling the row height and bleeding
 * across the rule below it) or leaks across its neighbour, and renders successfully with
 * exit code 0 either way. There is no measurement API to catch it afterwards.
 *
 * So the constant is not trusted, it is measured — here, against the real renderer with
 * the real bundled faces, across a grid of sizes and strings drawn from what the figures
 * actually contain. The assertion is asymmetric on purpose: the prediction must NEVER be
 * lower than reality (that is the overflow direction), and may exceed it by at most one
 * pixel (the float-tie guard in `solveColumns`).
 *
 * This is the test that fails if someone subsets or swaps the bundled font.
 */

import { describe, expect, it } from "bun:test";
import satori from "satori";
import { fontBytes } from "../assets/bytes.ts";
import { loadFonts } from "../assets/fonts.ts";
import { textWidth } from "../view/columns.ts";

/** Lay out a single unwrapped string and report the width satori gave it. */
async function satoriWidth(text: string, fontSize: number): Promise<number> {
	let measured = 0;
	await satori(
		// A shrink-wrapped inline-ish box: no explicit width, so Yoga sizes it to the text.
		<div style={{ display: "flex" }}>
			<div style={{ display: "flex", fontFamily: "Mono", fontSize }}>{text}</div>
		</div>,
		{
			// Generous canvas so nothing wraps; we read the node box, not the canvas.
			width: 4000,
			fonts: loadFonts().map((f) => ({
				name: f.name,
				data: fontBytes(f.data),
				weight: f.weight,
				style: f.style,
			})),
			embedFont: true,
			onNodeDetected: (node) => {
				// The innermost text-bearing node is the one whose width we predict.
				if (node.type === "div" && node.width > measured) measured = node.width;
			},
		},
	);
	return measured;
}

const SIZES = [12, 14, 15, 21] as const;
const STRINGS = [
	"METRIC",
	"Modal (gVisor)",
	"229,500",
	"×59.2",
	"Better-Auth: total (Σ task medians) s ↓",
	"fio rand read 4KB, O_DIRECT (IOPS) IOPS ↑",
	"–",
	"10,991 ‡",
	"Blaxel †",
	"WWWWWWWWWW",
] as const;

describe("textWidth matches satori's layout", () => {
	for (const fontSize of SIZES) {
		for (const text of STRINGS) {
			it(`${fontSize}px ${JSON.stringify(text)}`, async () => {
				const predicted = textWidth(text, fontSize);
				const actual = await satoriWidth(text, fontSize);
				// Never under-predict: that is the direction that overflows.
				expect(
					predicted,
					`under-predicted ${JSON.stringify(text)} @${fontSize}`,
				).toBeGreaterThanOrEqual(actual);
				// And never over-predict by more than the one-pixel float-tie guard.
				expect(
					predicted - actual,
					`over-predicted ${JSON.stringify(text)} @${fontSize}`,
				).toBeLessThanOrEqual(1);
			});
		}
	}
});
