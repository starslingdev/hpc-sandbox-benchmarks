// Byte-accurate output capping (ADR-0007 §9: caps are per-call opt-in and never a kit default —
// results collection rides multi-MB base64-tar over stdout). Applied ONCE, centrally, in
// driverFromTable's assembled exec — so a method table's exec never sees the option and cannot
// accept-and-ignore it (the contract violation the ADRs forbid). `maxOutputBytes` means bytes,
// not UTF-16 code units, so the cap is honest on non-ASCII output and never splits a code point.

import { DriverError } from "./errors.ts";
import type { ExecResult } from "./port.ts";

const encoder = new TextEncoder();

/** Clip a string to at most `maxBytes` UTF-8 bytes without splitting a code point. */
function clipToBytes(text: string, maxBytes: number): { text: string; cut: boolean } {
	if (encoder.encode(text).length <= maxBytes) {
		return { text, cut: false };
	}
	// Walk code points, accumulating byte length, until the next one would overflow.
	let bytes = 0;
	let end = 0;
	for (const codePoint of text) {
		const size = encoder.encode(codePoint).length;
		if (bytes + size > maxBytes) break;
		bytes += size;
		end += codePoint.length;
	}
	return { text: text.slice(0, end), cut: true };
}

/**
 * Apply an optional byte cap to an exec result, setting `truncated` when either stream was cut.
 * `undefined` cap ⇒ the result passes through untouched (the common, uncapped path).
 */
export function capExecOutput(result: ExecResult, maxOutputBytes: number | undefined): ExecResult {
	if (maxOutputBytes === undefined) {
		return result;
	}
	if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 0) {
		throw new DriverError(
			"invalid-exec-options",
			`maxOutputBytes must be a non-negative safe integer, received ${String(maxOutputBytes)}`,
		);
	}
	const stdout = clipToBytes(result.stdout, maxOutputBytes);
	const stderr = clipToBytes(result.stderr, maxOutputBytes);
	if (!stdout.cut && !stderr.cut) {
		return result;
	}
	return { ...result, stdout: stdout.text, stderr: stderr.text, truncated: true };
}
