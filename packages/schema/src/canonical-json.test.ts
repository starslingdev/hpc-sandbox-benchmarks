import { describe, expect, it } from "bun:test";
import { canonicalJsonString } from "./canonical-json.ts";

describe("canonicalJsonString", () => {
	it("rejects root and nested array-index accessors without invoking getters", () => {
		let getterCalls = 0;
		const accessor = (): unknown[] => {
			const value: unknown[] = [];
			Object.defineProperty(value, "0", {
				get: () => {
					getterCalls++;
					return "secret";
				},
				enumerable: true,
				configurable: true,
			});
			return value;
		};

		expect(() => canonicalJsonString(accessor())).toThrow(/accessor|descriptor/);
		expect(() => canonicalJsonString({ nested: accessor() })).toThrow(/accessor|descriptor/);
		expect(getterCalls).toBe(0);
	});

	it("rejects sparse arrays and unexpected own properties", () => {
		expect(() => canonicalJsonString(new Array(1))).toThrow(/sparse|unexpected/);
		const custom = [1] as unknown[] & { extra?: boolean };
		custom.extra = true;
		expect(() => canonicalJsonString(custom)).toThrow(/sparse|unexpected/);
	});
});
