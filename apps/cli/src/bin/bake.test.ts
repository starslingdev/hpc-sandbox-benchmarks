import { describe, expect, test } from "bun:test";
import { requestedProviders } from "./bake.ts";

describe("requestedProviders", () => {
	test("no flag → undefined (drive every registered provider, the local default)", () => {
		expect(requestedProviders(["--build-push"])).toBeUndefined();
	});

	test("a matrix cell's single id selects just that provider", () => {
		expect(requestedProviders(["--provider", "e2b"])).toEqual(["e2b"]);
		expect(requestedProviders(["--provider=daytona"])).toEqual(["daytona"]);
	});

	test("a comma-separated list returns registry order, not request order", () => {
		expect(requestedProviders(["--provider", "modal,e2b"])).toEqual(["e2b", "modal"]);
	});

	test("an unknown id throws, naming the registered providers", () => {
		expect(() => requestedProviders(["--provider", "dayton"])).toThrow(/dayton/);
	});

	// The dangerous case: `selectProviders` maps a blank list to "every provider", so without an explicit
	// guard a cell whose `--provider` value failed to interpolate would bake all five instead of its one.
	test("a present-but-valueless flag throws instead of silently selecting every provider", () => {
		expect(() => requestedProviders(["--provider"])).toThrow(/requires at least one provider/);
		expect(() => requestedProviders(["--provider="])).toThrow(/requires at least one provider/);
		expect(() => requestedProviders(["--provider", "--force"])).toThrow(
			/requires at least one provider/,
		);
		expect(() => requestedProviders(["--provider", " "])).toThrow(/requires at least one provider/);
	});
});
