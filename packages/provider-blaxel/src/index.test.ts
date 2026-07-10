import { describe, expect, it } from "bun:test";
import { blaxelAdapter } from "./index.ts";

describe("@sandbox-benchmarks/provider-blaxel", () => {
	it("boots the stock Debian image with no create-time pins (all policy is factory config)", () => {
		// Blaxel's spec dimensions are coupled (CPU = memory/2048, disk ≈ 78% of memory), so the whole
		// create-time policy lives in the factory call — image, memory, region — and createOptions has
		// nothing left to pin.
		expect(blaxelAdapter.createOptions).toEqual({});
		expect(typeof blaxelAdapter.createCompute).toBe("function");
	});
});
