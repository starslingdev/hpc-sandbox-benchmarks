import { describe, expect, test } from "bun:test";
import { escapeHtml, renderCell } from "./release-summary.ts";

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
