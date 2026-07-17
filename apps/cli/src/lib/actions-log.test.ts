import { describe, expect, test } from "bun:test";
import type { Run } from "@sandbox-benchmarks/schema";
import {
	escapeHtml,
	fieldTable,
	isFailure,
	providerSummaryRows,
	renderCell,
} from "./actions-log.ts";

describe("isFailure", () => {
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
		expect(escapeHtml("<img src=x onerror=alert(1)> & \"ok\" 'x'")).toBe(
			"&lt;img src=x onerror=alert(1)&gt; &amp; &quot;ok&quot; &#39;x&#39;",
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

describe("fieldTable", () => {
	test("drops empty values and renders code cells", () => {
		const rows = fieldTable([
			["Status", "success", "plain"],
			["Skip", "", "plain"],
			["Suite", "cpu-node", "code"],
		]);
		expect(rows).toHaveLength(3); // header + 2 data rows
		expect(rows[1]).toEqual(["Status", "success"]);
		expect(rows[2]).toEqual(["Suite", "<code>cpu-node</code>"]);
	});
});

describe("providerSummaryRows", () => {
	test("builds one data row per provider with gap counts", () => {
		const run = {
			providers: [
				{
					providerId: "e2b",
					validationStatus: "validated",
					metrics: [{}, {}],
					suitesCovered: ["cpu-node"],
					gaps: [{ outcome: "skipped" }, { outcome: "failed" }, { outcome: "failed" }],
					uncatalogued: [{}],
				},
			],
		} as unknown as Run;
		const rows = providerSummaryRows(run);
		expect(rows).toHaveLength(2);
		expect(rows[1]).toEqual(["<code>e2b</code>", "validated", "2", "1", "1", "2", "1"]);
	});
});
