/**
 * The bundled faces.
 *
 * Two invariants, both of which are determinism holes rather than preferences:
 *
 *  - The face list is EXPLICIT AND ORDERED, never a glob or a `readdir`. Satori resolves
 *    same-name faces first-wins and walks the array in order for missing-glyph fallback,
 *    so array order is an input to the rendered bytes; `readdir` order is filesystem order
 *    and differs between a laptop, ext4 and an overlayfs CI container. A globbed font list
 *    only shows up as a mysterious byte diff on someone else's machine.
 *  - The faces are BUNDLED, not read from the system. `/usr/share/fonts` has DejaVu on
 *    this container and may not on the next one, at a different version — and the width
 *    solver in ../view/columns.ts is calibrated to these exact files.
 *
 * They are bundled UNMODIFIED (see assets/fonts/LICENSE-DejaVu.txt, Bitstream Vera, which
 * permits redistribution and sale but modification only under a renamed family). Do not
 * subset them: `scripts/subset-fonts.mjs` exists for the SITE's webfonts and must not be
 * pointed here, or the advance ratio stops matching.
 *
 * WOFF2 is not an option: satori parses fonts with opentype.js, which cannot read brotli.
 * The site's own `public/fonts/*.woff2` are therefore unusable here, which is why this
 * package carries its own TTFs rather than reusing them.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface FontFace {
	/** Bundled file name, carried so provenance can be recorded without re-listing faces. */
	readonly file: string;
	readonly name: string;
	readonly data: Uint8Array;
	readonly weight: 400 | 700;
	readonly style: "normal";
}

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "fonts");

/** Ordered. See the module comment — this order is part of the rendered output. */
const FACES = [
	{ file: "DejaVuSansMono.ttf", name: "Mono", weight: 400 },
	{ file: "DejaVuSansMono-Bold.ttf", name: "Mono", weight: 700 },
] as const;

let cache: readonly FontFace[] | undefined;

export function loadFonts(): readonly FontFace[] {
	if (cache) return cache;
	cache = FACES.map((face) => {
		const path = join(ASSETS, face.file);
		let data: Uint8Array;
		try {
			data = readFileSync(path);
		} catch {
			throw new Error(
				`figures: missing bundled font ${face.file} (looked in ${ASSETS}). The faces are ` +
					`committed; a missing one means the package was copied without its assets/.`,
			);
		}
		return { file: face.file, name: face.name, data, weight: face.weight, style: "normal" };
	});
	return cache;
}
