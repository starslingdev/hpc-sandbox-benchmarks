/**
 * The one conversion between how this package HOLDS font bytes and what satori's
 * `FontOptions` accepts.
 *
 * The faces are held as `Uint8Array`: `Buffer` is a Node-only type, and nothing about parsing
 * a TTF or handing it to a layout engine needs it (the repo's lint rule says so for every
 * package's source, and it is right). satori's declared `data` is `ArrayBuffer | Buffer`,
 * which a bare `Uint8Array` does not satisfy — so the array is copied into a standalone
 * buffer at the boundary rather than by loosening the declaration on either side.
 *
 * A COPY, not `data.buffer`. `readFileSync` returns a view into a POOLED allocation, so
 * `.buffer` is the pool — routinely far larger than the file and beginning at a non-zero
 * `byteOffset`. Handing that to a font parser is not "the same bytes with extra"; it is a
 * different file that starts in the middle of another one, and opentype.js reads it as
 * garbage. The copy is ~340 KB per face, once per render, against a Yoga layout pass.
 */
export function fontBytes(data: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(data.byteLength);
	copy.set(data);
	return copy.buffer;
}
