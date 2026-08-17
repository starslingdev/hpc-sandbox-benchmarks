import { describe, expect, test } from "bun:test";
import { PROVIDERS } from "@sandbox-benchmarks/schema/providers";
import type { EnvOf } from "./define.ts";
import { DRIVER_CREDENTIALS, defineDriver } from "./define.ts";
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

describe("DRIVER_CREDENTIALS", () => {
	test("is pinned to the registry's requiredEnvVars, name for name", () => {
		// The literal table lives here (the registry's annotation widens its literals away, so the
		// mapped types cannot read it yet — ADR-0006 moves the declaration there). This pin makes
		// drift a red test in the meantime: same providers, same names, same order.
		const fromRegistry: Record<string, string[]> = Object.fromEntries(
			PROVIDERS.map((meta) => [meta.id, [...meta.requiredEnvVars]]),
		);
		const fromKit: Record<string, string[]> = Object.fromEntries(
			Object.entries(DRIVER_CREDENTIALS).map(([id, credentials]) => [
				id,
				credentials
					.filter((credential) => !("optional" in credential))
					.map((credential) => credential.name),
			]),
		);
		expect(fromKit).toEqual(fromRegistry);
	});
});

describe("EnvOf", () => {
	test("derives the exact slice from the credential literals", () => {
		type _tama = Expect<Equal<EnvOf<"tama">, { readonly TAMA_TOKEN: string }>>;
		type _blaxel = Expect<
			Equal<EnvOf<"blaxel">, { readonly BL_API_KEY: string; readonly BL_WORKSPACE: string }>
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
