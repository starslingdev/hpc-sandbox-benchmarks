/**
 * The bundled faces: loading them, and recording which ones rendered.
 *
 * Two invariants, both learned from measurement:
 *
 *  - The face list is EXPLICIT AND ORDERED, never a glob or a `readdir`. Satori resolves same-name
 *    faces first-wins and walks the array in order for missing-glyph fallback, so array order is an
 *    input to the rendered bytes; `readdir` order is filesystem-hash order and differs between ext4,
 *    an overlayfs CI container, and a laptop. A globbed font list is a determinism hole that only
 *    shows up as a mysterious byte diff on someone else's machine.
 *  - Bytes are `ArrayBuffer`, not `Uint8Array`. Satori's `FontOptions["data"]` is
 *    `Buffer | ArrayBuffer`, and `Uint8Array` is NOT assignable to it; `Buffer` is banned in
 *    `packages/**` by biome as Node-specific. `Bun.file().arrayBuffer()` threads that needle.
 *
 * The faces are bundled UNMODIFIED — see ../../../assets/fonts/LICENSE-DejaVu.txt. Do not subset
 * them: the licence permits modification only under a renamed family, and the width solver in
 * ../view/columns.ts is calibrated to these exact files.
 */
import { dirname, join } from "node:path";
import { sha256Hex } from "../digest.ts";

/** Satori's font descriptor, restated locally so this module does not re-export a dependency's type. */
export interface FontFace {
	/** Bundled file name. Carried so provenance can be recorded without re-listing the faces. */
	readonly file: string;
	readonly name: string;
	readonly data: ArrayBuffer;
	readonly weight: 400 | 700;
	readonly style: "normal";
}

/** One bundled face's identity, for the figure manifest. */
export interface FontDigest {
	readonly file: string;
	readonly sha256: string;
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
			file: face.file,
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
 * SHA-256 of every bundled face, in load order, for the manifest's provenance record.
 *
 * Derived from {@link loadFonts} rather than from a second face list: a consumer that restated the
 * filenames would keep recording the old set after a face was added here, and the gate that checks
 * the manifest would then pass while describing a render that no longer happens.
 */
export async function fontDigests(): Promise<FontDigest[]> {
	const faces = await loadFonts();
	return Promise.all(
		faces.map(async (face) => ({ file: face.file, sha256: await sha256Hex(face.data) })),
	);
}
