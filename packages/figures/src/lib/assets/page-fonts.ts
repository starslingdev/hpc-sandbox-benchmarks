/**
 * The faces the PAGE figures render in — the site's own webfonts, plus the fallbacks the
 * browser is already using.
 *
 * This is a different bundle from `./fonts.ts`, which carries DejaVu Sans Mono for the
 * composite figures. The composites are synthesised views that appear nowhere on the page
 * and are free to have their own typography; the page figures are reproductions of
 * `/sandbox-benchmarks` and have to be set in what the page is set in.
 *
 * THE FALLBACKS ARE NOT OPTIONAL, and this is the part that is easy to get wrong.
 * `public/fonts/geist-mono.woff2` declares `unicode-range: U+0020-007F`, so Geist Mono is
 * only ever asked for ASCII. Every other character the page prints in a monospace
 * context — the `·` separating a caption, the `–` that stands for a missing measurement,
 * the `†` on an off-spec provider, the `‡` on a backfilled cell, the `§` on a
 * shard-recovered value, the `→` between pipeline phases — is ALREADY drawn by the
 * browser in a fallback face. Reproducing the page therefore means reproducing its
 * fallbacks, not "adding a fallback in case something is missing":
 *
 *   monospace  Geist Mono -> DejaVu Sans Mono
 *   sans       Geist      -> DejaVu Sans
 *   heading    Afacad     -> DejaVu Sans
 *
 * Those two fallbacks were identified by rendering each glyph in the REAL page and
 * comparing the rasterised bitmap against every installed face — not by reading
 * `fc-match`, and specifically NOT under `chrome-headless-shell`, where the same page
 * resolves a different monospace face and also reports integer glyph advances. Calibrating
 * against the shell produces a figure that is wrong everywhere by ~2% and looks entirely
 * plausible. `scripts/snapshot-sandbox-benchmark-images.ts` drives the full Chromium, so
 * that is the engine these faces have to match.
 *
 * A CONSEQUENCE WORTH STATING PLAINLY: those fallbacks are a property of the machine the
 * CROPS are cut on, not of the site. On a Mac the same page would draw `·` in SF Mono and
 * the crop would differ. This package stays deterministic either way — it renders from
 * bundled bytes and never asks the system for a font — but the crop it is being compared
 * against is not, which is one of the reasons `figure-diff` regenerates BOTH sides.
 *
 * ORDER IS AN INPUT TO THE OUTPUT. Satori walks this array for missing-glyph fallback and
 * resolves same-name faces first-wins, so the list is explicit and hand-ordered; a
 * `readdir` would make the rendered bytes depend on filesystem order.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FontMetrics } from "./advances.ts";
import { readFontMetrics } from "./advances.ts";

/** Weights the figures request. Geist Mono ships weight 400 only — the page's `font-medium`
 *  / `font-semibold` monospace runs are the SAME face, which is why 500/600/700 map back
 *  onto the 400 file. See {@link PAGE_FACES}. */
export type FaceWeight = 400 | 500 | 600 | 700;

export interface PageFace {
	/** Bundled file name, carried so provenance can be reported without re-listing faces. */
	readonly file: string;
	/** Family name satori resolves `fontFamily` against. NOT the font's internal name. */
	readonly family: string;
	readonly weight: FaceWeight;
	readonly style: "normal";
	readonly data: Uint8Array;
	/** Advance widths, parsed once. This is what `../view/text.ts` measures with. */
	readonly metrics: FontMetrics;
}

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "fonts");

/**
 * Ordered face list.
 *
 * Every (family, weight) pair the figures can request must appear, because satori falls
 * back to the nearest weight silently — a missing 500 renders as 400 with no warning, and
 * the only symptom is thinner stems in a share image nobody diffs.
 *
 * Geist Mono at 500/600/700 deliberately points at the SAME file as 400. That is not a
 * shortcut: `@font-face` for Geist Mono declares `font-weight: 400`, so the browser
 * selects the 400 face for a `font-semibold` monospace run and applies SYNTHETIC bold on
 * top. The advances are identical (measured: `8.9%` is 28px at 12px in both), which is
 * what matters for layout. The synthetic emboldening itself is a stroke satori cannot
 * apply, and is one of the documented, unfixable differences.
 */
const FACES: readonly { file: string; family: string; weight: FaceWeight }[] = [
	{ file: "GeistMono-Regular.ttf", family: "GeistMono", weight: 400 },
	{ file: "GeistMono-Regular.ttf", family: "GeistMono", weight: 500 },
	{ file: "GeistMono-Regular.ttf", family: "GeistMono", weight: 600 },
	{ file: "GeistMono-Regular.ttf", family: "GeistMono", weight: 700 },
	{ file: "Geist-Regular.ttf", family: "Geist", weight: 400 },
	{ file: "Geist-Medium.ttf", family: "Geist", weight: 500 },
	{ file: "Afacad-Medium.ttf", family: "Afacad", weight: 500 },
	{ file: "DejaVuSansMono.ttf", family: "DejaVuSansMono", weight: 400 },
	{ file: "DejaVuSansMono.ttf", family: "DejaVuSansMono", weight: 500 },
	{ file: "DejaVuSansMono.ttf", family: "DejaVuSansMono", weight: 600 },
	{ file: "DejaVuSansMono.ttf", family: "DejaVuSansMono", weight: 700 },
	{ file: "DejaVuSans.ttf", family: "DejaVuSans", weight: 400 },
	{ file: "DejaVuSans.ttf", family: "DejaVuSans", weight: 500 },
];

/**
 * The three CSS font stacks, as satori `fontFamily` strings.
 *
 * Written once here and imported by both the measurer and the components, so a stack
 * cannot be measured against one list and rendered against another — which would produce
 * columns solved for a face the figure does not draw in.
 */
export const STACKS = {
	mono: "GeistMono, DejaVuSansMono",
	sans: "Geist, DejaVuSans",
	head: "Afacad, DejaVuSans",
} as const;

export type StackName = keyof typeof STACKS;

let cache: readonly PageFace[] | undefined;

export function loadPageFonts(): readonly PageFace[] {
	if (cache) return cache;
	const parsed = new Map<string, { data: Uint8Array; metrics: FontMetrics }>();
	cache = FACES.map((face) => {
		let entry = parsed.get(face.file);
		if (!entry) {
			const path = join(ASSETS, face.file);
			let data: Uint8Array;
			try {
				data = readFileSync(path);
			} catch {
				throw new Error(
					`figures: missing bundled font ${face.file} (looked in ${ASSETS}). The faces are ` +
						`committed; regenerate them with scripts/convert-figure-fonts.py.`,
				);
			}
			entry = { data, metrics: readFontMetrics(data) };
			parsed.set(face.file, entry);
		}
		return { ...face, style: "normal" as const, data: entry.data, metrics: entry.metrics };
	});
	return cache;
}

/** The faces of one stack, in fallback order, for a requested weight. Satori resolves the
 *  same way; this mirrors it so a measurement cannot disagree with a render about which
 *  face draws a character. */
export function facesOf(stack: StackName, weight: FaceWeight): readonly PageFace[] {
	const families = STACKS[stack].split(", ");
	const faces = loadPageFonts();
	return families.flatMap((family) => {
		const exact = faces.filter((f) => f.family === family && f.weight === weight);
		if (exact.length > 0) return exact;
		// Nearest available weight, which is what satori does. Reaching this for a family
		// that should have the weight means FACES is missing a row.
		const any = faces.filter((f) => f.family === family);
		if (any.length === 0) throw new Error(`figures: no face for family ${family}`);
		return [
			any.reduce((best, f) =>
				Math.abs(f.weight - weight) < Math.abs(best.weight - weight) ? f : best,
			),
		];
	});
}
