import { describe, expect, test } from "bun:test";
import { requestedBaseImage, requestedProviders } from "./bake.ts";

describe("requestedProviders", () => {
	test("no flag → undefined (drive every registered provider, the local default)", () => {
		expect(requestedProviders(["--build-push"])).toBeUndefined();
	});

	test("a matrix cell's single id selects just that provider", () => {
		expect(requestedProviders(["--provider", "e2b"])).toEqual(["e2b"]);
		expect(requestedProviders(["--provider=daytona-vm"])).toEqual(["daytona-vm"]);
	});

	test("a comma-separated list returns registry order, not request order", () => {
		expect(requestedProviders(["--provider", "modal-gvisor,e2b"])).toEqual(["e2b", "modal-gvisor"]);
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

describe("requestedBaseImage", () => {
	test("defaults to undefined so local bakes keep the configured candidate", () => {
		expect(requestedBaseImage(["--provider", "runcloud"])).toBeUndefined();
	});

	test("accepts the release plan's base as a separate or equals-form argument", () => {
		expect(requestedBaseImage(["--base-image", "ghcr.io/o/tc@sha256:abc"])).toBe(
			"ghcr.io/o/tc@sha256:abc",
		);
		expect(requestedBaseImage(["--base-image=ghcr.io/o/tc:v1"])).toBe("ghcr.io/o/tc:v1");
	});

	test("rejects a present-but-empty base ref", () => {
		expect(() => requestedBaseImage(["--base-image"])).toThrow(/non-empty image reference/);
		expect(() => requestedBaseImage(["--base-image="])).toThrow(/non-empty image reference/);
		expect(() => requestedBaseImage(["--base-image", "--provider", "runcloud"])).toThrow(
			/non-empty image reference/,
		);
	});
});
