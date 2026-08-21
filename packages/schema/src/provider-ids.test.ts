import { describe, expect, test } from "bun:test";
import { PROVIDER_IDS } from "./provider-ids.ts";
import { parseProviderId, providerIdSchema } from "./provider-parsers.ts";
import { PROVIDERS } from "./providers.ts";

describe("provider identity boundary", () => {
	test("the tuple is unique and exactly accepted by the runtime parser", () => {
		expect(new Set(PROVIDER_IDS).size).toBe(PROVIDER_IDS.length);
		expect(PROVIDERS.map((provider) => provider.id)).toEqual([...PROVIDER_IDS]);
		for (const id of PROVIDER_IDS) {
			expect(providerIdSchema(id)).toBe(id);
			expect(parseProviderId(id)).toBe(id);
		}
		expect(() => parseProviderId("not-a-provider")).toThrow(/invalid provider id/);
	});

	test("the identity and target-spec leaves stay dependency-free", async () => {
		for (const file of ["provider-ids.ts", "target-spec.ts"]) {
			const source = await Bun.file(new URL(file, import.meta.url)).text();
			expect(source).not.toMatch(/^\s*import\s/m);
		}
	});
});
