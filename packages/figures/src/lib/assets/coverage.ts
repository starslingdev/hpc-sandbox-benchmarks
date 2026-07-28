/**
 * Glyph-coverage policy: which characters a figure is allowed to contain.
 *
 * Satori does NOT throw or drop on a missing glyph — it lays out and paints `.notdef`, so a provider
 * renamed to `Novita·中文` publishes as `Novita·□□` with exit code 0, and a ZWJ emoji sequence
 * becomes five separate boxes. The strings come from a provider registry that can change, so the
 * only safe posture is to fail the build.
 *
 * Rather than parse the TTF `cmap` (a font-parsing dependency for one check), this asserts against
 * the coverage the figure set actually needs: printable ASCII plus the typographic characters the
 * renderers emit. Widening it is a one-line change — after confirming the bundled faces contain the
 * character.
 */

const EXTRA_COVERED = new Set([
	"–", // en dash — `formatInterval` joins bounds with it
	"—", // em dash — the "no interval" / "not measured" placeholder
	"·", // middot — subtitle separator
	"±",
	"×", // `metricTakeaway` ratio phrasing
	"≥",
	"≤",
	"→",
	"°",
	"µ",
	"“",
	"”",
	"‘",
	"’",
	"…",
]);

function isCovered(ch: string): boolean {
	const code = ch.codePointAt(0) ?? 0;
	if (code >= 0x20 && code <= 0x7e) return true; // printable ASCII
	return EXTRA_COVERED.has(ch);
}

/** Throw naming the string AND the character, so a failure is actionable without a debugger. */
export function assertGlyphCoverage(strings: Iterable<string>, where: string): void {
	for (const text of strings) {
		for (const ch of text) {
			if (isCovered(ch)) continue;
			const hex = (ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
			throw new Error(
				`@sandbox-benchmarks/figures: ${where} contains U+${hex} (${JSON.stringify(ch)}), which the ` +
					`bundled fonts are not asserted to cover, in ${JSON.stringify(text)}. Satori would render it ` +
					`as a tofu box without failing. Add the character to EXTRA_COVERED in lib/assets/coverage.ts ` +
					`once you have confirmed the bundled faces contain it, or change the source string.`,
			);
		}
	}
}
