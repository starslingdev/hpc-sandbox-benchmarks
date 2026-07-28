/**
 * Font loading.
 *
 * Two invariants, both learned from measurement:
 *
 *  - The face list is EXPLICIT AND ORDERED, never a glob or a `readdir`. Satori resolves same-name
 *    faces first-wins and walks the array in order for missing-glyph fallback, so array order is an
 *    input to the rendered bytes; `readdir` order is filesystem-hash order and differs between ext4,
 *    an overlayfs CI container, and a laptop. A globbed font list is a determinism hole that only
 *    shows up as a mysterious byte diff on someone else's machine.
 *  - Bytes are `ArrayBuffer`, not `Uint8Array`. Satori's `FontOptions["data"]` is `Buffer | ArrayBuffer`,
 *    and `Uint8Array` is NOT assignable to it; `Buffer` is banned in `packages/**` by biome as
 *    Node-specific. `Bun.file().arrayBuffer()` threads that needle.
 *
 * The faces are bundled UNMODIFIED — see ../../../assets/fonts/LICENSE-DejaVu.txt. Do not subset
 * them: the licence permits modification only under a renamed family, and the width solver in
 * ../view/columns.ts is calibrated to these exact files.
 */
import { dirname, join } from "node:path";

/** Satori's font descriptor, restated locally so this module does not re-export a dependency's type. */
export interface FontFace {
	readonly name: string;
	readonly data: ArrayBuffer;
	readonly weight: 400 | 700;
	readonly style: "normal";
}

const ASSETS = join(dirname(import.meta.dir), "..", "..", "assets", "fonts");

/** Ordered. See the module comment — this order is part of the rendered output. */
const FACES = [
	{ file: "DejaVuSansMono.ttf", name: "Mono", weight: 400 },
	{ file: "DejaVuSansMono-Bold.ttf", name: "Mono", weight: 700 },
] as const;

let cache: readonly FontFace[] | undefined;

export async function loadFonts(): Promise<readonly FontFace[]> {
	if (cache) return cache;
	const faces: FontFace[] = [];
	for (const face of FACES) {
		const path = join(ASSETS, face.file);
		const file = Bun.file(path);
		if (!(await file.exists())) {
			throw new Error(
				`@sandbox-benchmarks/figures: missing bundled font ${face.file} (looked in ${ASSETS}). ` +
					`The faces are committed to the repo; a missing one means the package was copied without its assets/.`,
			);
		}
		faces.push({
			name: face.name,
			data: await file.arrayBuffer(),
			weight: face.weight,
			style: "normal",
		});
	}
	cache = faces;
	return faces;
}

/**
 * Every character the bundled faces can render.
 *
 * Satori does NOT throw or drop on a missing glyph — it lays out and paints `.notdef`, so a provider
 * renamed to `Novita·中文` publishes as `Novita·□□` with exit code 0, and a ZWJ emoji sequence
 * becomes five separate boxes. Since the strings come from a provider registry that can change, the
 * only safe posture is to fail the build. Rather than parse the TTF `cmap` (which would mean taking
 * a font-parsing dependency for one check), we assert against the coverage this figure set needs:
 * printable ASCII plus the handful of typographic characters the renderers emit.
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
					`as a tofu box without failing. Add the character to EXTRA_COVERED in lib/assets/fonts.ts ` +
					`once you have confirmed the bundled faces contain it, or change the source string.`,
			);
		}
	}
}
