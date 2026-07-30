/**
 * Per-glyph advance widths, read straight out of a TTF's `cmap` and `hmtx`.
 *
 * WHY THIS EXISTS AT ALL. The composite figures get their widths from arithmetic
 * (`../view/columns.ts`): every glyph in DejaVu Sans Mono shares one advance, so a
 * string's width is `chars × size × ratio` and no font has to be parsed. The PAGE
 * figures cannot use that. They render in the site's own faces, and Geist and Afacad are
 * PROPORTIONAL — 138 and 50 distinct advances across their mapped glyphs. There is no
 * ratio to pin, so the only way to know how wide `Modal (gVisor)` is at 13px is to add up
 * its glyphs.
 *
 * WHY NOT USE A FONT LIBRARY. Satori already bundles a fork of opentype.js, but satori is
 * confined to `../render/` by this package's layering, and importing a renderer's private
 * dependency to do arithmetic in `view/` would defeat the point of the layering. What is
 * needed here is two tables and one number per codepoint; the parser below is ~120 lines
 * and has no dependency, no version skew and nothing to keep in step.
 *
 * WHAT IS DELIBERATELY NOT HANDLED, because no face in this package needs it and a silent
 * wrong answer is worse than a loud gap:
 *
 *  - **Ligatures and any other GSUB substitution.** Satori does not apply them either, so
 *    ignoring them keeps the prediction matched to the renderer. Chromium DOES apply
 *    them, which makes this a real (small) source of disagreement for the proportional
 *    faces; no string in these figures contains an `ffi`-class cluster, and the diff
 *    harness is what would show it if one appeared.
 *  - **Every GPOS adjustment except horizontal kerning.** Mark attachment and cursive
 *    positioning move glyphs but not the pen, so they cannot change a run's width.
 *  - **Variable-font deltas (`HVAR`/`gvar`).** The bundled faces are static instances —
 *    see scripts/convert-figure-fonts.py — so there is no axis to apply. A variable font
 *    reaching this parser would be read at its default instance, which is why
 *    {@link readFontMetrics} rejects one outright instead.
 */

interface Reader {
	readonly view: DataView;
}

function u16(r: Reader, at: number): number {
	return r.view.getUint16(at);
}
function i16(r: Reader, at: number): number {
	return r.view.getInt16(at);
}
function u32(r: Reader, at: number): number {
	return r.view.getUint32(at);
}
function tag(r: Reader, at: number): string {
	return String.fromCharCode(
		r.view.getUint8(at),
		r.view.getUint8(at + 1),
		r.view.getUint8(at + 2),
		r.view.getUint8(at + 3),
	);
}

export interface FontMetrics {
	/** Design units per em, from `head`. */
	readonly unitsPerEm: number;
	/** Advance width in EM FRACTIONS, keyed by Unicode code point. A code point absent here
	 *  is absent from the face, which is what makes fallback resolvable without rendering. */
	readonly advances: ReadonlyMap<number, number>;
	/** Glyph id per code point, needed to look a kern pair up. */
	readonly glyphs: ReadonlyMap<number, number>;
	/**
	 * Horizontal kerning in EM FRACTIONS, keyed `${leftGid}:${rightGid}`.
	 *
	 * Chromium applies the `kern` feature to horizontal text by default (`font-kerning:
	 * auto`), and satori does not. On Geist that is worth up to 3% of a run's width — enough
	 * to move a wrap point, which is a whole-line layout error rather than a subpixel one.
	 * Empty for the monospace faces, which have no kern feature.
	 */
	readonly kerning: ReadonlyMap<string, number>;
}

/** Locate the table directory entries. Rejects the containers this package cannot use
 *  rather than reading garbage out of them. */
function tableDirectory(r: Reader): Map<string, { offset: number; length: number }> {
	const version = u32(r, 0);
	// 0x00010000 = TrueType outlines, 'OTTO' = CFF outlines. Both carry cmap/hmtx/head.
	if (version !== 0x00010000 && tag(r, 0) !== "OTTO") {
		const seen = tag(r, 0);
		throw new Error(
			`figures: not a TTF/OTF (leading tag ${JSON.stringify(seen)}). ` +
				(seen === "wOF2" || seen === "wOFF"
					? "WOFF is not readable here; run scripts/convert-figure-fonts.py."
					: "Expected a font file."),
		);
	}
	const count = u16(r, 4);
	const tables = new Map<string, { offset: number; length: number }>();
	for (let i = 0; i < count; i++) {
		const at = 12 + i * 16;
		tables.set(tag(r, at), { offset: u32(r, at + 8), length: u32(r, at + 12) });
	}
	return tables;
}

/** `cmap` → code point → glyph id. Reads format 4 (BMP) and format 12 (full range), which
 *  is every subtable the bundled faces carry. */
function readCmap(r: Reader, offset: number): Map<number, number> {
	const map = new Map<number, number>();
	const numTables = u16(r, offset + 2);
	// Prefer a format 12 (3,10) subtable when present, else the first (3,1)/(0,x) unicode
	// one. Picking by platform/encoding rather than by order: the order is the font's, and
	// a Mac Roman subtable earlier in the list would silently map every glyph to the wrong code point.
	let best = -1;
	let bestScore = -1;
	for (let i = 0; i < numTables; i++) {
		const at = offset + 4 + i * 8;
		const platform = u16(r, at);
		const encoding = u16(r, at + 2);
		const sub = offset + u32(r, at + 4);
		const format = u16(r, sub);
		const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
		if (!unicode) continue;
		const score = format === 12 ? 2 : format === 4 ? 1 : 0;
		if (score > bestScore) {
			bestScore = score;
			best = sub;
		}
	}
	if (best < 0) throw new Error("figures: font has no Unicode cmap subtable");

	const format = u16(r, best);
	if (format === 4) {
		const segX2 = u16(r, best + 6);
		const ends = best + 14;
		const starts = ends + segX2 + 2;
		const deltas = starts + segX2;
		const ranges = deltas + segX2;
		for (let s = 0; s < segX2 / 2; s++) {
			const end = u16(r, ends + s * 2);
			const start = u16(r, starts + s * 2);
			const delta = i16(r, deltas + s * 2);
			const rangeOffset = u16(r, ranges + s * 2);
			if (start === 0xffff) continue;
			for (let cp = start; cp <= end && cp !== 0x10000; cp++) {
				let gid: number;
				if (rangeOffset === 0) gid = (cp + delta) & 0xffff;
				else {
					const at = ranges + s * 2 + rangeOffset + (cp - start) * 2;
					if (at + 1 >= r.view.byteLength) continue;
					const raw = u16(r, at);
					gid = raw === 0 ? 0 : (raw + delta) & 0xffff;
				}
				if (gid !== 0) map.set(cp, gid);
			}
		}
	} else if (format === 12) {
		const groups = u32(r, best + 12);
		for (let g = 0; g < groups; g++) {
			const at = best + 16 + g * 12;
			const start = u32(r, at);
			const end = u32(r, at + 4);
			const startGid = u32(r, at + 8);
			for (let cp = start; cp <= end; cp++) map.set(cp, startGid + (cp - start));
		}
	} else {
		throw new Error(`figures: unsupported cmap format ${format}`);
	}
	return map;
}

/** Glyph ids a coverage table covers, in coverage-index order. */
function readCoverage(r: Reader, at: number): number[] {
	const format = u16(r, at);
	const glyphs: number[] = [];
	if (format === 1) {
		const count = u16(r, at + 2);
		for (let i = 0; i < count; i++) glyphs.push(u16(r, at + 4 + i * 2));
	} else if (format === 2) {
		const count = u16(r, at + 2);
		for (let i = 0; i < count; i++) {
			const rec = at + 4 + i * 6;
			const start = u16(r, rec);
			const end = u16(r, rec + 2);
			const index = u16(r, rec + 4);
			for (let g = start; g <= end; g++) glyphs[index + (g - start)] = g;
		}
	}
	return glyphs;
}

/** glyph id → class, from a ClassDef table. Unlisted glyphs are class 0 by definition. */
function readClassDef(r: Reader, at: number): Map<number, number> {
	const map = new Map<number, number>();
	const format = u16(r, at);
	if (format === 1) {
		const start = u16(r, at + 2);
		const count = u16(r, at + 4);
		for (let i = 0; i < count; i++) map.set(start + i, u16(r, at + 6 + i * 2));
	} else if (format === 2) {
		const count = u16(r, at + 2);
		for (let i = 0; i < count; i++) {
			const rec = at + 4 + i * 6;
			const from = u16(r, rec);
			const to = u16(r, rec + 2);
			const cls = u16(r, rec + 4);
			for (let g = from; g <= to; g++) map.set(g, cls);
		}
	}
	return map;
}

/** Byte length of a ValueRecord under `format`: one int16 per set bit. */
function valueRecordSize(format: number): number {
	let bits = 0;
	for (let b = 0; b < 16; b++) if (format & (1 << b)) bits++;
	return bits * 2;
}

/** X_ADVANCE out of a ValueRecord, or 0 when the format does not carry one. The fields are
 *  stored in bit order, so the offset is the number of set bits BELOW X_ADVANCE (0x0004). */
function xAdvanceOf(r: Reader, at: number, format: number): number {
	if (!(format & 0x0004)) return 0;
	let offset = 0;
	if (format & 0x0001) offset += 2;
	if (format & 0x0002) offset += 2;
	return i16(r, at + offset);
}

/** One PairPos subtable → pair kerning, accumulated into `out`. */
function readPairPos(r: Reader, at: number, out: Map<string, number>): void {
	const format = u16(r, at);
	const coverage = readCoverage(r, at + u16(r, at + 2));
	const valueFormat1 = u16(r, at + 4);
	const valueFormat2 = u16(r, at + 6);
	const size1 = valueRecordSize(valueFormat1);
	const size2 = valueRecordSize(valueFormat2);

	if (format === 1) {
		const pairSetCount = u16(r, at + 8);
		for (let i = 0; i < pairSetCount && i < coverage.length; i++) {
			const first = coverage[i];
			if (first === undefined) continue;
			const set = at + u16(r, at + 10 + i * 2);
			const pairs = u16(r, set);
			for (let p = 0; p < pairs; p++) {
				const rec = set + 2 + p * (2 + size1 + size2);
				const second = u16(r, rec);
				const adjust = xAdvanceOf(r, rec + 2, valueFormat1);
				if (adjust !== 0) out.set(`${first}:${second}`, adjust);
			}
		}
		return;
	}
	if (format !== 2) return;

	const classDef1 = readClassDef(r, at + u16(r, at + 8));
	const classDef2 = readClassDef(r, at + u16(r, at + 10));
	const class1Count = u16(r, at + 12);
	const class2Count = u16(r, at + 14);
	const records = at + 16;
	// Class 2 (the right-hand glyph) is keyed over EVERY glyph in the font, not only the
	// covered ones — but the LEFT glyph must be in coverage, so the pairs enumerated here
	// are coverage × classDef2, which is bounded by the font's glyph count.
	const rightByClass = new Map<number, number[]>();
	for (const [glyph, cls] of classDef2) {
		const list = rightByClass.get(cls);
		if (list) list.push(glyph);
		else rightByClass.set(cls, [glyph]);
	}
	for (const first of coverage) {
		const class1 = classDef1.get(first) ?? 0;
		if (class1 >= class1Count) continue;
		for (let class2 = 0; class2 < class2Count; class2++) {
			const rec = records + (class1 * class2Count + class2) * (size1 + size2);
			const adjust = xAdvanceOf(r, rec, valueFormat1);
			if (adjust === 0) continue;
			for (const second of rightByClass.get(class2) ?? []) {
				out.set(`${first}:${second}`, adjust);
			}
		}
	}
}

/**
 * Horizontal kerning from GPOS, in font units.
 *
 * Only the `kern` FEATURE's lookups are read. Taking every PairPos lookup instead would
 * fold in optional features Chromium does not enable by default (`cpsp`, `kern` variants
 * behind a stylistic set) and make the prediction wrong in a way that looks like a font
 * bug. Extension lookups (type 9) are followed one level, which is the only nesting the
 * format allows.
 */
function readKerning(r: Reader, gpos: number): Map<string, number> {
	const out = new Map<string, number>();
	const featureList = gpos + u16(r, gpos + 6);
	const lookupList = gpos + u16(r, gpos + 8);

	const wanted = new Set<number>();
	const featureCount = u16(r, featureList);
	for (let i = 0; i < featureCount; i++) {
		const rec = featureList + 2 + i * 6;
		if (tag(r, rec) !== "kern") continue;
		const feature = featureList + u16(r, rec + 4);
		const indexCount = u16(r, feature + 2);
		for (let k = 0; k < indexCount; k++) wanted.add(u16(r, feature + 4 + k * 2));
	}

	const lookupCount = u16(r, lookupList);
	for (const index of wanted) {
		if (index >= lookupCount) continue;
		const lookup = lookupList + u16(r, lookupList + 2 + index * 2);
		const type = u16(r, lookup);
		const subtableCount = u16(r, lookup + 4);
		for (let s = 0; s < subtableCount; s++) {
			const subtable = lookup + u16(r, lookup + 6 + s * 2);
			if (type === 2) readPairPos(r, subtable, out);
			else if (type === 9 && u16(r, subtable + 2) === 2) {
				readPairPos(r, subtable + u32(r, subtable + 4), out);
			}
		}
	}
	return out;
}

/**
 * Read the advance widths a face lays text out with.
 *
 * Rejects a variable font rather than reading its default instance: the figures request
 * weight 500 in several places, and a variable file silently answering with its 400
 * advances is a wrong number that renders successfully.
 */
export function readFontMetrics(data: Uint8Array): FontMetrics {
	const r: Reader = {
		view: new DataView(data.buffer, data.byteOffset, data.byteLength),
	};
	const tables = tableDirectory(r);
	if (tables.has("fvar")) {
		throw new Error(
			"figures: variable font passed to readFontMetrics. Satori cannot select an axis " +
				"and would render one weight for all of them. Instance it first with " +
				"scripts/convert-figure-fonts.py.",
		);
	}
	const head = tables.get("head");
	const hhea = tables.get("hhea");
	const hmtx = tables.get("hmtx");
	const cmap = tables.get("cmap");
	if (!head || !hhea || !hmtx || !cmap) {
		throw new Error("figures: font is missing head/hhea/hmtx/cmap");
	}

	const unitsPerEm = u16(r, head.offset + 18);
	const numberOfHMetrics = u16(r, hhea.offset + 34);
	const glyphs = readCmap(r, cmap.offset);

	const advances = new Map<number, number>();
	for (const [cp, gid] of glyphs) {
		// `hmtx` stores numberOfHMetrics (advance, lsb) pairs; every glyph past that shares
		// the LAST pair's advance. That tail is how monospace faces store 2000+ glyphs in
		// four bytes, so skipping it would report zero width for most of DejaVu.
		const index = Math.min(gid, numberOfHMetrics - 1);
		const at = hmtx.offset + index * 4;
		if (at + 1 >= hmtx.offset + hmtx.length) continue;
		advances.set(cp, u16(r, at) / unitsPerEm);
	}

	const gpos = tables.get("GPOS");
	const kerning = new Map<string, number>();
	if (gpos) {
		for (const [pair, units] of readKerning(r, gpos.offset)) {
			kerning.set(pair, units / unitsPerEm);
		}
	}
	return { unitsPerEm, advances, glyphs, kerning };
}
