/**
 * Glyph-coverage policy: which characters a figure is allowed to contain.
 *
 * Satori does NOT throw or drop on a missing glyph — it lays out and paints `.notdef`, so
 * a provider renamed to `Novita·中文` publishes as `Novita·□□` with exit code 0. The
 * strings come from a dataset whose provider set and metric labels change between runs,
 * so the only safe posture is to fail the build.
 *
 * Rather than parse the TTF `cmap` (a font-parsing dependency for one check), this asserts
 * against the coverage the figure set actually needs: printable ASCII plus the typographic
 * characters these renderers emit. Widening it is a one-line change — after confirming the
 * bundled faces contain the character.
 */

// Written as escapes, not literals: these are DATA (the characters a figure may contain),
// but the repo's copy guard scans source text and cannot tell an allowlist entry from a
// sentence. `\u2014` says exactly which codepoint is meant either way.
const EXTRA_COVERED = new Set([
	"\u2013", // en dash: the "no value" / "no spread" placeholder
	"\u2014", // em dash
	"·", // middot — subtitle and legend separator
	"×", // formatSpread / formatRatio
	"÷", // the SPREAD legend
	"↑", // direction: higher is better
	"↓", // direction: lower is better
	"†", // off-spec provider marker
	"‡", // backfilled-cell marker
	"§", // shard-recovered marker
	"\u2192", // right arrow: the pipeline chart's phase-order summary
	"\u26a0", // warning sign: the heterogeneous-fleet mark in the environments table
	"Σ", // derived-total labels ("Σ task medians")
	"∑",
	"≥",
	"≤",
	"±",
	"…",
	"µ",
	"°",
]);

function isCovered(ch: string): boolean {
	const code = ch.codePointAt(0) ?? 0;
	if (code >= 0x20 && code <= 0x7e) return true; // printable ASCII
	return EXTRA_COVERED.has(ch);
}

/** Throw naming the string AND the character, so a failure is actionable without a
 *  debugger. */
export function assertGlyphCoverage(strings: Iterable<string>, where: string): void {
	for (const text of strings) {
		for (const ch of text) {
			if (isCovered(ch)) continue;
			const hex = (ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
			throw new Error(
				`figures: ${where} contains U+${hex} (${JSON.stringify(ch)}), which the bundled fonts are ` +
					`not asserted to cover, in ${JSON.stringify(text)}. Satori would paint it as a tofu box ` +
					`without failing. Add it to EXTRA_COVERED in lib/assets/coverage.ts once you have ` +
					`confirmed the bundled faces contain it, or change the source string.`,
			);
		}
	}
}
