import { describe, expect, it } from "bun:test";
import { imagetoolsRetagCmd } from "./image.ts";

describe("imagetoolsRetagCmd", () => {
	it("builds a registry-side retag (candidate → version) with no pull", () => {
		expect(imagetoolsRetagCmd("ghcr.io/o/tc:v1-candidate", "ghcr.io/o/tc:v1")).toEqual([
			"docker",
			"buildx",
			"imagetools",
			"create",
			"-t",
			"ghcr.io/o/tc:v1",
			"ghcr.io/o/tc:v1-candidate",
		]);
	});
});
