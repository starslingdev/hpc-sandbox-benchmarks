import { describe, expect, test } from "bun:test";
import { escapeHtml, isFailure, renderCell } from "./release-summary.ts";

describe("isFailure", () => {
	// Both spellings are in circulation (GitHub's job.status says `failure`; the bake report and the
	// composite's documented vocabulary say `failed`). Matching only one renders a FAILED phase as a
	// green notice — the exact way a broken release looks healthy.
	test("treats both `failure` and `failed` as failure", () => {
		expect(isFailure("failure")).toBe(true);
		expect(isFailure("failed")).toBe(true);
		expect(isFailure("FAILED")).toBe(true);
		expect(isFailure(" failure ")).toBe(true);
	});

	test("does not treat a success/skip status as failure", () => {
		expect(isFailure("success")).toBe(false);
		expect(isFailure("ok")).toBe(false);
		expect(isFailure("skipped")).toBe(false);
		expect(isFailure("")).toBe(false);
	});
});

describe("escapeHtml", () => {
	test("escapes the HTML metacharacters so a value can't inject into the summary table", () => {
		expect(escapeHtml('<img src=x onerror=alert(1)> & "ok"')).toBe(
			'&lt;img src=x onerror=alert(1)&gt; &amp; "ok"',
		);
	});

	test("escapes & before < > so an entity can't be double-decoded", () => {
		expect(escapeHtml("a & <b>")).toBe("a &amp; &lt;b&gt;");
	});
});

describe("renderCell", () => {
	test("wraps code values in <code> after escaping", () => {
		expect(renderCell("ghcr.io/x@sha256:ab", "code")).toBe("<code>ghcr.io/x@sha256:ab</code>");
	});

	test("leaves plain prose unwrapped (still escaped)", () => {
		expect(renderCell("2 vCPU / 8 GiB", "plain")).toBe("2 vCPU / 8 GiB");
		expect(renderCell("<b>", "plain")).toBe("&lt;b&gt;");
	});
});
