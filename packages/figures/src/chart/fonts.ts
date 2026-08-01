/**
 * The chart faces, as `@font-face` rules with `data:` URIs — sourced from pinned npm
 * packages, not vendored binaries.
 *
 * Inlined rather than referenced: the HTML a chart renders from is handed to a browser as a
 * single document with no server behind it, so a `url(file: …)` would make the figure depend
 * on the checkout's absolute path and an installed-font fallback would make it depend on the
 * machine. With the faces inline, the document carries everything the rasteriser needs and
 * the same HTML draws the same text wherever Chrome runs it.
 *
 * The bytes come out of `node_modules` (`@fontsource/*` woff2 subsets), resolved through the
 * package resolver so the lockfile pins the glyphs exactly as it pins code. Weights the faces
 * don't carry (the mono 600 totals) are the browser's synthetic bold.
 *
 * BRAND FACES ONLY, no Unicode fallback. The two characters the templates use that Geist Mono
 * and Afacad lack — `†` and `→` — are both present in the Geist Sans subset already embedded
 * here, so every font stack simply ends on Geist and the glyphs are drawn by the brand face
 * rather than a foreign one. (`·` needs no fallback at all; every face has it.) What used to
 * fill that role was the full 757 KB DejaVu Sans, which base64'd to 986 KB — 88% of every
 * generated document — to supply two glyphs Geist already had. {@link assertCovered} is what
 * makes dropping it safe: the coverage it insured against losing is now checked, not carried.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** A file inside an installed package, located via Bun's own resolver (survives hoisting,
 *  workspaces, and a relocated store) — `package.json` is always exported, so it anchors. */
function packageFile(pkg: string, ...rel: string[]): string {
	return join(dirname(Bun.resolveSync(`${pkg}/package.json`, import.meta.dir)), ...rel);
}

const FACES = [
	{
		family: "Geist",
		weight: 400,
		mime: "font/woff2",
		format: "woff2",
		file: packageFile("@fontsource/geist-sans", "files", "geist-sans-latin-400-normal.woff2"),
	},
	{
		family: "Geist",
		weight: 500,
		mime: "font/woff2",
		format: "woff2",
		file: packageFile("@fontsource/geist-sans", "files", "geist-sans-latin-500-normal.woff2"),
	},
	{
		family: "Geist Mono",
		weight: 400,
		mime: "font/woff2",
		format: "woff2",
		file: packageFile("@fontsource/geist-mono", "files", "geist-mono-latin-400-normal.woff2"),
	},
	{
		family: "Afacad",
		// A VARIABLE face: one file carries the whole wght axis, so the declaration is a
		// range and the browser instances the exact weight the template asks for.
		weight: "400 700",
		mime: "font/woff2",
		format: "woff2",
		file: packageFile("@fontsource-variable/afacad", "files", "afacad-latin-wght-normal.woff2"),
	},
] as const;

/**
 * Every codepoint an embedded face is known to draw — the guard behind {@link assertCovered}.
 *
 * Not derived from the files: reading a cmap means decompressing woff2, which is a decoder this
 * package would otherwise have no reason to carry. It is instead the ASCII the templates emit
 * plus the punctuation VERIFIED present in the Geist Sans subset (checked against the shipped
 * cmap), which is the fallback every stack ends on. The list is deliberately short — a character
 * missing from it is not a crash, it is a prompt to check the subset actually has the glyph and
 * add it here.
 */
const COVERED = new Set<number>([
	// Printable ASCII — every face carries it.
	...Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i),
	0x00a0, // no-break space
	0x00b0, // °
	0x00b1, // ±
	0x00b7, // ·  the summary and disclosure separator
	0x00d7, // ×
	0x00a7, // §
	0x2013, // –
	0x2014, // —
	0x2018, // '
	0x2019, // '
	0x201c, // "
	0x201d, // "
	0x2020, // †  the off-spec dagger
	0x2021, // ‡
	0x2022, // •
	0x2026, // …
	0x2192, // →  the phase-order arrow
	0x2248, // ≈
	0x2264, // ≤
	0x2265, // ≥
]);

/**
 * Fail the render on a character no embedded face can draw.
 *
 * The figure's whole determinism claim is that the document carries everything the rasteriser
 * needs, so the same HTML draws the same pixels anywhere. An uncovered character breaks that
 * SILENTLY: Chrome reaches past the embedded faces to whatever the machine has installed, and
 * the figure becomes a function of the renderer's font directory — locally fine, tofu or a
 * different face in a bare CI container. The note is authored text, so this is a live risk
 * rather than a theoretical one (`µs` in a future note would do it).
 *
 * Carrying a 986 KB full Unicode fallback used to paper over this for the price of 88% of every
 * document. Refusing to render is the same insurance at no bytes: a build error names the
 * character, and the fix is a glyph the brand faces have or a deliberate addition to
 * {@link COVERED}.
 */
/** Tab, LF and CR: the document's layout whitespace. They are not glyphs, so a face cannot
 *  "cover" them — reporting one as an uncovered character would be a confusing lie. */
const LAYOUT_WHITESPACE = new Set([0x09, 0x0a, 0x0d]);

export function assertCovered(document: string): void {
	for (const char of document) {
		const cp = char.codePointAt(0);
		if (cp !== undefined && !LAYOUT_WHITESPACE.has(cp) && !COVERED.has(cp)) {
			throw new Error(
				`no embedded face covers ${JSON.stringify(char)} (U+${cp.toString(16).toUpperCase().padStart(4, "0")}) — ` +
					`the figure would fall back to an installed font and stop being reproducible`,
			);
		}
	}
}

/**
 * The notices the embedded faces' licences require to travel with copies of the fonts — and a
 * document with the font bytes inlined IS a copy. The full licence texts ship inside the font
 * packages themselves; this comment rides in every generated document so a figure distributed
 * on its own still carries the attribution.
 */
const FONT_NOTICES = `/*
 * Embedded fonts (full licences ship in their npm packages):
 * Geist, Geist Mono - Copyright 2024 The Geist Project Authors
 *   (https://github.com/vercel/geist-font.git), SIL Open Font License 1.1.
 * Afacad - Copyright 2023 The Afacad Project Authors
 *   (https://github.com/Dicotype/Afacad), SIL Open Font License 1.1.
 */`;

let cached: string | null = null;

/** Every face as one `@font-face` block, led by the licence notices the embedded copies must
 *  carry. Read lazily and once per process, then reused by every chart of a render. */
export function fontFaceCss(): string {
	if (cached === null) {
		cached = `${FONT_NOTICES}\n${FACES.map(
			(face) =>
				`@font-face { font-family: "${face.family}"; font-weight: ${face.weight}; ` +
				`src: url(data:${face.mime};base64,${readFileSync(face.file).toBase64()}) format("${face.format}"); }`,
		).join("\n")}`;
	}
	return cached;
}
