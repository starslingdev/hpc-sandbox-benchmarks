import { describe, expect, test } from "bun:test";
import { normalizeProviderInput } from "@sandbox-benchmarks/schema/provider-meta";
import { REGISTRY } from "@sandbox-benchmarks/schema/providers";
import { ACME_MANIFEST } from "../acme/manifest.ts";
import { BREZEL_CONTROL_PLANE } from "../brezel-manifest.ts";
import { TAMA_MANIFEST } from "../tama/manifest.ts";
import { manifestFailures } from "./manifest-schema.ts";

const inputs = (id: keyof typeof REGISTRY) =>
	REGISTRY[id].inputs.map((input) => normalizeProviderInput(input).name);

describe("generator-time manifest validation", () => {
	test("accepts every prototype manifest against its declared inputs", () => {
		expect(manifestFailures(BREZEL_CONTROL_PLANE, inputs("brezel"))).toEqual([]);
		expect(manifestFailures(TAMA_MANIFEST, inputs("tama"))).toEqual([]);
		expect(manifestFailures(ACME_MANIFEST, ["ACME_TOKEN", "ACME_URL", "ACME_IMAGE"])).toEqual([]);
	});

	test("reports an undeclared credential, an unread row field, and a bad pattern in one pass", () => {
		const broken = {
			...TAMA_MANIFEST,
			prepare: { ...TAMA_MANIFEST.prepare, fallback: ["login", "--token", "{{env.TAMA_TOKN}}"] },
			nameField: "label",
			id: { field: "id", pattern: "^(unclosed" },
		};
		expect(manifestFailures(broken, inputs("tama"))).toEqual([
			"{{env.TAMA_TOKN}} references an undeclared input",
			"field label is read but not declared in the row schema",
			expect.stringMatching(/^invalid pattern: .*missing \)/),
		]);
	});

	test("rejects structural mistakes with arktype's path-qualified summary", () => {
		const failures = manifestFailures(
			{ ...BREZEL_CONTROL_PLANE, phases: { rules: [], otherwise: "up" } },
			[],
		);
		expect(failures).toHaveLength(1);
		expect(failures[0]).toContain("phases");
	});
});
