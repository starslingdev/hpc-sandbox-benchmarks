import { describe, expect, test } from "bun:test";
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import { isPartialScope, selectProviders } from "./matrix.ts";

const ALL_PROVIDERS = PROVIDERS.map((p) => p.id);

// The one predicate the scoped-release path turns on: the plan (mode/skip/required), the
// credential-free validate gate (force_republish conflict), and `bake --promote` (base retag or not)
// all call this. They must agree exactly — a gate reading "the operator typed a list" while the
// transaction reads "strict subset" would reject dispatches the transaction would have accepted.
describe("isPartialScope", () => {
	test("no selection at all is a full release (the local `bake --promote` default)", () => {
		expect(isPartialScope(undefined)).toBe(false);
	});

	test("a strict subset is partial", () => {
		expect(isPartialScope(["vercel"])).toBe(true);
		expect(isPartialScope(selectProviders("blaxel,novita"))).toBe(true);
	});

	test("naming every registered provider is NOT partial — it is just a full release", () => {
		expect(isPartialScope(ALL_PROVIDERS)).toBe(false);
		expect(isPartialScope(selectProviders(ALL_PROVIDERS.join(",")))).toBe(false);
	});

	test("a blank list resolves to every provider, so it is not partial", () => {
		expect(isPartialScope(selectProviders(""))).toBe(false);
		expect(isPartialScope(selectProviders(undefined))).toBe(false);
	});
});
