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
	const data = typeof bytes === "string" ? new TextEncoder().encode(bytes).buffer : bytes;
	const digest = await crypto.subtle.digest("SHA-256", data as ArrayBuffer);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
