import { describe, expect, it } from "bun:test";
import satori from "satori";
import { fontBytes } from "../assets/bytes.ts";
import type { StackName } from "../assets/page-fonts.ts";
import { loadPageFonts, STACKS } from "../assets/page-fonts.ts";
import type { TextStyle } from "../view/text.ts";
import { measureRun } from "../view/text.ts";

/**
 * Calibrates the page figures' text measurement against SATORI ITSELF.
 *
 * `measureRun` predicts two things at once: the width Chromium lays a run out at, and the
 * `letterSpacing` that makes satori come out at that same width. The first half is checked
 * continuously and empirically by `pnpm sandbox-benchmarks:figure-diff`, which regenerates
 * the browser crops and compares pixels. THIS test checks the second half, which nothing
 * else can: that satori, handed the compensated spacing, actually lays the run out where
 * the view model said it would.
 *
 * The failure it exists to catch is silent and destructive. Satori does not clip and
 * exposes no measurement API, so a run wider than the column solved for it either WRAPS —
 * doubling a table row's height and bleeding across the rule below it — or LEAKS across
 * its neighbour. Both render successfully, exit code 0, and the only symptom is a figure
 * that looks slightly wrong to someone who happens to compare it with the page.
 *
 * It is also the test that fails if the bundled faces are swapped, re-instanced at a
 * different weight, or subset: every number below is a property of those exact files.
 *
 * The tolerance is ONE PIXEL, and it is asymmetric in neither direction on purpose —
 * unlike the composites' solver, this measurement is not a deliberate over-estimate, it is
 * a prediction of satori's own arithmetic, so it should be right to within Yoga's
 * whole-pixel rounding of the node box.
 */

/** Lay out one unwrapped run and report the width satori gave its box. */
async function satoriWidth(text: string, style: TextStyle, letterSpacing: number): Promise<number> {
	let measured = 0;
	await satori(
		<div style={{ display: "flex" }}>
			<div
				style={{
					display: "flex",
					whiteSpace: "pre",
					fontFamily: STACKS[style.stack],
					fontSize: style.size,
					fontWeight: style.weight,
					letterSpacing,
				}}
			>
				{text}
			</div>
		</div>,
		{
			// Generous canvas so nothing wraps; the node box is what is read, not the canvas.
			width: 4000,
			fonts: loadPageFonts().map((f) => ({
				name: f.family,
				data: fontBytes(f.data),
				weight: f.weight,
				style: f.style,
			})),
			embedFont: true,
			onNodeDetected: (node) => {
				if (node.type === "div" && node.width > measured) measured = node.width;
			},
		},
	);
	return measured;
}

/** Every stack, at the sizes and weights the eight figures actually draw. */
const CASES: { stack: StackName; size: number; weight: 400 | 500 | 600 | 700; texts: string[] }[] =
	[
		{
			stack: "mono",
			size: 12,
			weight: 400,
			// The last two are the reason the FALLBACK faces are in the bundle: Geist Mono's
			// unicode-range stops at U+007F, so every one of those characters is drawn by another
			// face, in both engines.
			texts: [
				"Daytona (VM)",
				"Modal (gVisor)",
				"229,500",
				"Blaxel †",
				"8 models across replicates ⚠",
			],
		},
		{ stack: "mono", size: 13, weight: 600, texts: ["442.6 s", "48.7 s"] },
		{
			stack: "mono",
			size: 11,
			weight: 400,
			texts: ["better-auth total · fastest vs slowest", "10,991 ‡"],
		},
		{
			stack: "mono",
			size: 10,
			weight: 400,
			texts: ["n = 43 cells", "worst 231% · OpenClaw: git clone", "IOPS ↑ ∑"],
		},
		{ stack: "mono", size: 10, weight: 700, texts: ["DISK I/O"] },
		{ stack: "mono", size: 9, weight: 400, texts: ["§", "‡"] },
		{
			stack: "sans",
			size: 14,
			weight: 500,
			texts: ["spread on the same real pipeline", "fastest at-spec better-auth run"],
		},
		{
			stack: "sans",
			size: 13,
			weight: 400,
			texts: [
				"Insufficient disk: 20.0 GiB free, suite needs 30 GiB",
				"fio rand read 4KB, O_DIRECT (IOPS)",
			],
		},
		{
			stack: "sans",
			size: 14,
			weight: 400,
			texts: ["better-auth's own CI task matrix, run cold on twelve fresh sandboxes"],
		},
		{ stack: "head", size: 36, weight: 500, texts: ["2.8×", "160.6 s"] },
		{ stack: "head", size: 24, weight: 500, texts: ["Better-Auth", "OpenClaw"] },
	];

describe("page-figure text measurement matches satori's layout", () => {
	for (const { stack, size, weight, texts } of CASES) {
		for (const text of texts) {
			it(`${stack} ${size}px/${weight} ${JSON.stringify(text)}`, async () => {
				const run = measureRun(text, { stack, size, weight });
				const actual = await satoriWidth(run.text, { stack, size, weight }, run.letterSpacing);
				expect(
					Math.abs(run.width - actual),
					`predicted ${run.width.toFixed(2)}, satori laid out ${actual.toFixed(2)} for ` +
						`${JSON.stringify(text)} at ${size}px ${stack}`,
				).toBeLessThanOrEqual(1);
			});
		}
	}

	it("compensates a kerned face and leaves an unkerned one alone", () => {
		// The monospace faces have no kern feature, so their compensation must be exactly
		// zero; Geist has one, so its must not be. If this ever inverts, the compensation is
		// being computed from something other than the font's own GPOS table.
		expect(measureRun("Daytona (VM)", { stack: "mono", size: 12, weight: 400 }).letterSpacing).toBe(
			0,
		);
		expect(
			measureRun("spread on the same real pipeline", { stack: "sans", size: 14, weight: 500 })
				.letterSpacing,
		).toBeLessThan(0);
	});

	it("reports a finite width and spacing for the empty string", () => {
		// A NaN letter-spacing does not throw in satori — it lays the whole line out at
		// position zero — so the zero-length case is guarded here rather than discovered in a
		// published figure.
		const run = measureRun("", { stack: "sans", size: 13, weight: 400 });
		expect(run.width).toBe(0);
		expect(Number.isFinite(run.letterSpacing)).toBe(true);
	});
});
