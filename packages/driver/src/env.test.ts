import { describe, expect, test } from "bun:test";
import { envSchemaFor, parseDriverEnv } from "./env.ts";
import { DriverError } from "./lib/errors.ts";

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

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
		const error = (() => {
			try {
				parseDriverEnv("blaxel", { BL_API_KEY: "key" });
			} catch (caught) {
				return caught;
			}
		})();
		expect(error).toBeInstanceOf(DriverError);
		expect(error).toMatchObject({ code: "missing-credentials", provider: "blaxel" });
		expect((error as Error).message).toMatch(
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

	test("applies registry defaults while leaving genuinely optional inputs absent", () => {
		expect(parseDriverEnv("daytona-vm", { DAYTONA_API_KEY: "key" })).toEqual({
			DAYTONA_API_KEY: "key",
			DAYTONA_TARGET: "us-west-2",
		});
	});

	test("ambient values override defaults and empty optional values stay absent", () => {
		expect(
			parseDriverEnv("daytona-vm", {
				DAYTONA_API_KEY: "key",
				DAYTONA_TARGET: "eu-west-1",
				DAYTONA_SNAPSHOT: "",
			}),
		).toEqual({ DAYTONA_API_KEY: "key", DAYTONA_TARGET: "eu-west-1" });
	});

	test("the direct schema deletes foreign provider secrets and resolves defaults", () => {
		expect(
			envSchemaFor("daytona-vm")({
				DAYTONA_API_KEY: "key",
				E2B_API_KEY: "must-not-escape",
			}),
		).toEqual({ DAYTONA_API_KEY: "key", DAYTONA_TARGET: "us-west-2" });
	});

	test("the direct schema exposes distinct raw input and resolved output types", () => {
		const schema = envSchemaFor("daytona-vm");
		type _input = Expect<
			Equal<
				typeof schema.inferIn,
				{
					readonly DAYTONA_API_KEY: string;
					readonly DAYTONA_TARGET?: string;
					readonly DAYTONA_SNAPSHOT?: string;
				}
			>
		>;
		type _output = Expect<
			Equal<
				typeof schema.infer,
				{
					readonly DAYTONA_API_KEY: string;
					readonly DAYTONA_TARGET: string;
					readonly DAYTONA_SNAPSHOT?: string;
				}
			>
		>;
		expect(true).toBe(true);
	});
});
