import { describe, expect, test } from "bun:test";
import { buildMode } from "./build-candidate.ts";

describe("buildMode", () => {
	test("blank or unset means the full base rebuild (the default release path)", () => {
		expect(buildMode(undefined)).toBe("full");
		expect(buildMode("")).toBe("full");
		expect(buildMode("  ")).toBe("full");
	});

	test("accepts the two modes this script implements", () => {
		expect(buildMode("full")).toBe("full");
		expect(buildMode("variants")).toBe("variants");
	});

	// Defaulting an unrecognized value to `full` would spend an hour rebuilding the base — and, because
	// the toolchain build is not reproducible, overwrite the candidate with different bytes — on a
	// dispatch that explicitly asked not to touch it.
	test("an unrecognized mode throws instead of falling back to a base rebuild", () => {
		// `skip` is a real dispatch value, but the plan handles it by skipping the job — the script
		// itself must not silently treat it as "rebuild everything".
		expect(() => buildMode("skip")).toThrow(/BUILD_MODE/);
		expect(() => buildMode("base")).toThrow(/BUILD_MODE/);
	});
});
