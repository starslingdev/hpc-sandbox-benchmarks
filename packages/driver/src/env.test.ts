import { describe, expect, test } from "bun:test";
import { parseDriverEnv } from "./env.ts";

describe("parseDriverEnv", () => {
	test("returns the exact declared slice from an ambient environment", () => {
		const env = parseDriverEnv("blaxel", {
			BL_API_KEY: "key",
			BL_WORKSPACE: "ws",
			PATH: "/usr/bin",
			E2B_API_KEY: "someone-else's",
		});
		expect(env).toEqual({ BL_API_KEY: "key", BL_WORKSPACE: "ws" });
	});

	test("a missing credential fails with the repo's one error grammar, naming the provider", () => {
		expect(() => parseDriverEnv("blaxel", { BL_API_KEY: "key" })).toThrow(
			/missing credentials for blaxel: BL_WORKSPACE must be a string \(was missing\)/,
		);
	});

	test("empty string counts as unset (the config gatekeeper's rule)", () => {
		expect(() => parseDriverEnv("tama", { TAMA_TOKEN: "" })).toThrow(/TAMA_TOKEN/);
	});

	test("undeclared ambient variables are never rejected — the pick IS the slice boundary", () => {
		const env = parseDriverEnv("tama", { TAMA_TOKEN: "tok", HOME: "/root", TERM: "xterm" });
		expect(Object.keys(env)).toEqual(["TAMA_TOKEN"]);
	});
});
