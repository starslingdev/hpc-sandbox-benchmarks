/**
 * One hex-digest implementation.
 *
 * The producer (the manifest writer) and the gate that verifies it sit on two sides of an equality
 * assertion; two copies of the encoding would make a mismatch report as an opaque string difference
 * rather than as the encoding change it was. The manifest schema pins the format with a
 * `/^[0-9a-f]{64}$/` regex, so lowercase hex is a contract, not a preference.
 */

/** Lowercase hex SHA-256 of a buffer or a UTF-8 string. */
export async function sha256Hex(bytes: ArrayBuffer | string): Promise<string> {
	// Hash the encoder's VIEW, never `.buffer`: a Uint8Array may be a window into a larger buffer,
	// and `.buffer` would silently hash the whole allocation (or trailing slack) instead of the
	// string. Bun currently returns an exact-sized buffer, which is precisely why this would be a
	// silent wrong-digest bug rather than a visible one if that ever changed.
	// `BufferSource` is a DOM lib type and this package builds with `lib: ["ESNext"]`, so the
	// parameter type is spelled out. `Uint8Array<ArrayBuffer>` pins the backing store as non-shared,
	// which is what `crypto.subtle.digest` accepts.
	const data: ArrayBuffer | Uint8Array<ArrayBuffer> =
		typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
	const digest = await crypto.subtle.digest("SHA-256", data);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
