/**
 * Text measurement for the page figures, and the two corrections that make them line up.
 *
 * ── WHAT HAD TO BE MEASURED, NOT ASSUMED ────────────────────────────────────────────
 *
 * Chromium lays this page out with EXACT FRACTIONAL glyph advances — the crops are cut at
 * `deviceScaleFactor: 2` by the full Chromium build, which enables subpixel text
 * positioning. (This is worth stating because the obvious probe gets it wrong: the same
 * page measured under `chrome-headless-shell` reports INTEGER advances — `Daytona (VM)`
 * comes out 84px instead of 86.41px — and calibrating against that produces a figure that
 * is wrong everywhere by ~2%. `scripts/snapshot-sandbox-benchmark-images.ts` resolves the
 * full Chromium, so that is the engine these figures have to agree with.)
 *
 * So the base measurement is a plain sum of `advance × fontSize`, which is also exactly
 * what satori accumulates. For the MONOSPACE faces that is the whole story, and it is
 * exact: `Daytona (VM)` is 86.400 here against Chromium's 86.406.
 *
 * ── THE CORRECTION: KERNING ─────────────────────────────────────────────────────────
 *
 * Chromium applies the `kern` feature to horizontal text by default. Satori does not.
 * On the proportional faces that is not a rounding difference — it is up to 3% of a run:
 *
 *     "fastest at-spec better-auth run" at 14px Geist 500
 *         Chromium 203.33px      unkerned sum 209.68px
 *
 * and 3% is the difference between that label fitting on one line in its 206px KPI column
 * and wrapping onto two, which moves everything below it. So the width reported here is
 * KERNED (advances from `hmtx`, pair adjustments from GPOS — see ../assets/advances.ts),
 * and what satori gets handed is a `letterSpacing` that closes the gap:
 *
 *     letterSpacing = authored + (kernedWidth - unkernedWidth) / characterCount
 *
 * Satori implements letter-spacing the way CSS does, adding a fixed delta after EVERY
 * character including the last, so a run rendered with that value comes out at exactly the
 * kerned width. Spreading one pair's adjustment evenly across the run is an approximation
 * INSIDE the run — a letter can sit a fraction of a pixel from where Chromium puts it —
 * but the run's width, its right edge and every wrap decision made from it are right.
 *
 * ── WHY NOT SCALE THE FONT INSTEAD ──────────────────────────────────────────────────
 *
 * `fontSize × kerned/unkerned` would also produce the right width, and the wrong glyphs:
 * every letter drawn 3% small. Letter spacing moves glyphs without resizing them.
 *
 * ── WRAPPING ────────────────────────────────────────────────────────────────────────
 *
 * {@link wrapText} is a break-on-spaces line breaker over the same measurement, used where
 * a figure needs to know the line COUNT up front (a table row's height, a paragraph's
 * block height) because satori computes heights and never reports them back. Every text
 * block the figures emit is ONE already-broken line, so satori is never asked to re-break
 * anything and there is only one line breaker in the pipeline.
 */
import type { FaceWeight, PageFace, StackName } from "../assets/page-fonts.ts";
import { facesOf, STACKS } from "../assets/page-fonts.ts";

export interface TextStyle {
	readonly stack: StackName;
	readonly size: number;
	readonly weight: FaceWeight;
	/** Authored tracking in px, as the page's `tracking-[…]` utilities resolve it. */
	readonly letterSpacing?: number;
	readonly uppercase?: boolean;
}

export interface MeasuredRun {
	/** Text as it is drawn — uppercased already if the style says so, because satori's
	 *  `textTransform` and this measurement must not be able to disagree about the string. */
	readonly text: string;
	/** Width Chromium lays this run out at, to the pixel. */
	readonly width: number;
	/** What to pass satori so its layout comes out at {@link width}. Includes the authored
	 *  tracking; do NOT add that again at the call site. */
	readonly letterSpacing: number;
}

/** The first face in the stack that covers `codePoint`. `undefined` means no bundled face
 *  has it — a tofu box, which `../assets/coverage.ts` turns into a build failure rather
 *  than a published square. */
function faceFor(faces: readonly PageFace[], codePoint: number): PageFace | undefined {
	for (const face of faces) if (face.metrics.advances.has(codePoint)) return face;
	return undefined;
}

/**
 * Code points of `text`, counting the way a layout engine does.
 *
 * Iterating the string (rather than indexing it) keeps an astral character as ONE
 * advance rather than two half-measured surrogates. No figure currently contains one; the
 * coverage assertion rejects them before they get here, and this stays correct if that
 * ever widens.
 */
function codePoints(text: string): number[] {
	return [...text].map((ch) => ch.codePointAt(0) ?? 0);
}

/**
 * Measure a run and produce the letter-spacing that makes satori agree with Chromium.
 *
 * An empty run gets `width: 0` and the authored spacing: dividing by a zero character
 * count would produce `NaN`, and a `NaN` letter-spacing does not throw in satori — it
 * lays the whole line out at position zero.
 */
export function measureRun(text: string, style: TextStyle): MeasuredRun {
	const drawn = style.uppercase ? text.toUpperCase() : text;
	const authored = style.letterSpacing ?? 0;
	const faces = facesOf(style.stack, style.weight);
	const points = codePoints(drawn);
	if (points.length === 0) return { text: drawn, width: 0, letterSpacing: authored };

	let unkerned = 0;
	let kerns = 0;
	let previous: { face: PageFace; glyph: number } | undefined;
	for (const point of points) {
		const face = faceFor(faces, point);
		if (!face) {
			previous = undefined;
			continue;
		}
		unkerned += (face.metrics.advances.get(point) ?? 0) * style.size;
		const glyph = face.metrics.glyphs.get(point);
		// A pair only kerns when both glyphs come from the SAME face: the adjustment is
		// indexed by glyph id, and two faces' glyph ids are unrelated numbers.
		if (previous && glyph !== undefined && previous.face === face) {
			kerns += (face.metrics.kerning.get(`${previous.glyph}:${glyph}`) ?? 0) * style.size;
		}
		previous = glyph === undefined ? undefined : { face, glyph };
	}
	const tracking = authored * points.length;
	return {
		text: drawn,
		width: unkerned + kerns + tracking,
		letterSpacing: authored + kerns / points.length,
	};
}

/** Just the width. The common case in a width solve, where the spacing is applied later
 *  by whoever draws the cell. */
export function textWidth(text: string, style: TextStyle): number {
	return measureRun(text, style).width;
}

export interface WrappedText {
	readonly lines: readonly MeasuredRun[];
	/** Width of the widest line. */
	readonly width: number;
}

/**
 * Where a line MAY be broken, as a list of units each ending at a break opportunity.
 *
 * Spaces, and after a hyphen or a dash. That set is not arbitrary and it is not "close
 * enough": the published crop shows Chromium breaking `pts_realworld-mastra.xml` after its
 * hyphen and `4.19.0-gvisor` after its, and a wrapper that only breaks on spaces puts both
 * on an overflowing line of their own — one line where the browser used two, in a table
 * where every row after it then sits in the wrong place.
 *
 * It is still deliberately NOT a UAX-14 implementation. Chromium also breaks around an em
 * dash, after some slashes and between CJK characters; none of those appear in these
 * figures, and each additional rule is another way to disagree with the browser in a case
 * nobody checked.
 */
function breakUnits(text: string): string[] {
	const units: string[] = [];
	let current = "";
	for (const ch of text) {
		current += ch;
		if (ch === " " || ch === "-" || ch === "\u2013" || ch === "\u2014") {
			units.push(current);
			current = "";
		}
	}
	if (current !== "") units.push(current);
	return units;
}

export interface WrapOptions {
	/**
	 * `overflow-wrap: anywhere`, as the coverage table's reason column carries it. A unit
	 * that does not fit on a line of its own is broken between characters instead of being
	 * allowed to overflow. Without it a metric id long enough to exceed the column sets the
	 * column's width and pushes it out of the image, which is exactly why the page turns it
	 * on there.
	 */
	readonly anywhere?: boolean;
}

/**
 * Break `text` into lines that fit `maxWidth`.
 *
 * Used where the CALLER needs a line count — to size a table row, to size a paragraph
 * block — because satori computes heights and never reports them back. Every line it
 * returns is emitted as its own already-measured text block, so satori is never asked to
 * re-break anything and there is only ever one line breaker in the pipeline.
 *
 * Trailing spaces are not measured, matching CSS: a line ending at a space is as wide as
 * its last visible glyph, and counting the space would break one word early.
 */
export function wrapText(
	text: string,
	style: TextStyle,
	maxWidth: number,
	options: WrapOptions = {},
): WrappedText {
	const lines: MeasuredRun[] = [];
	let current = "";
	const push = () => {
		lines.push(measureRun(current.replace(/\s+$/, ""), style));
		current = "";
	};

	for (let unit of breakUnits(text)) {
		if (current !== "" && textWidth((current + unit).replace(/\s+$/, ""), style) > maxWidth) {
			push();
		}
		if (options.anywhere) {
			// A unit that cannot fit even alone is split between characters, one line at a time.
			while (textWidth(current + unit, style) > maxWidth && unit.length > 1) {
				let taken = "";
				for (const ch of unit) {
					if (current !== "" || taken !== "") {
						if (textWidth(current + taken + ch, style) > maxWidth) break;
					}
					taken += ch;
				}
				if (taken === "") break; // nothing fits at all; let it overflow rather than loop
				current += taken;
				unit = unit.slice(taken.length);
				push();
			}
		}
		current += unit;
	}
	if (current !== "" || lines.length === 0) push();
	return { lines, width: Math.max(...lines.map((l) => l.width)) };
}

/** The satori `fontFamily` string for a stack. Re-exported here so a component never has
 *  to name a face directly. */
export function fontFamilyOf(stack: StackName): string {
	return STACKS[stack];
}
