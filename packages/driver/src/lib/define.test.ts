import { describe, expect, test } from "bun:test";
import type { EnvOf } from "./define.ts";
import { defineDriver } from "./define.ts";
import type { SandboxDriver } from "./port.ts";

// Minimal type-level assertion helpers (kept local; this is the package's only type-test site).
type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

const stubDriver: SandboxDriver = {
	create: async () => {
		throw new Error("stub driver — never created in tests");
	},
};

describe("EnvOf", () => {
	test("derives the exact resolved slice from the registry input literals", () => {
		type _tama = Expect<
			Equal<EnvOf<"tama">, { readonly TAMA_TOKEN: string; readonly TAMA_CLI?: string }>
		>;
		type _blaxel = Expect<
			Equal<EnvOf<"blaxel">, { readonly BL_API_KEY: string; readonly BL_WORKSPACE: string }>
		>;
		type _daytona = Expect<
			Equal<
				EnvOf<"daytona-vm">,
				{
					readonly DAYTONA_API_KEY: string;
					readonly DAYTONA_TARGET: string;
					readonly DAYTONA_SNAPSHOT?: string;
				}
			>
		>;
		type _union = Expect<
			Equal<
				EnvOf<"tama" | "e2b">,
				| { readonly TAMA_TOKEN: string; readonly TAMA_CLI?: string }
				| { readonly E2B_API_KEY: string; readonly E2B_TEMPLATE?: string }
			>
		>;
		expect(true).toBe(true); // the assertions above are compile-time; typecheck is the oracle
	});
});

describe("defineDriver", () => {
	test("carries the id and spec through unchanged", () => {
		const module_ = defineDriver("tama", {
			createBudget: { owner: "driver", attemptCeilingMs: 60_000 },
			driver: ({ env }) => {
				// env is the exact tama slice; both lines below are type-checked by `tsc --noEmit`.
				const token: string = env.TAMA_TOKEN;
				void token;
				// @ts-expect-error — tama declares no E2B_API_KEY; the registry is the source of truth
				void env.E2B_API_KEY;
				return stubDriver;
			},
		});
		expect(module_.id).toBe("tama");
		expect(module_.createBudget).toEqual({ owner: "driver", attemptCeilingMs: 60_000 });
		const driver = module_.driver({ env: { TAMA_TOKEN: "tok" } });
		expect(typeof driver.create).toBe("function");
	});

	test("rejects unregistered provider ids at compile time", () => {
		// @ts-expect-error — "not-a-provider" is not a ProviderId
		const bad = () => defineDriver("not-a-provider", { driver: () => stubDriver });
		void bad;
		expect(true).toBe(true);
	});
});
