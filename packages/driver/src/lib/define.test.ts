import { describe, expect, test } from "bun:test";
import type { ArtifactOf, EnvOf, ResolvedArtifactOf } from "./define.ts";
import { defineDriver } from "./define.ts";
import { FailedCreateCleanupError } from "./errors.ts";
import type { CreateRequest, SandboxDriver, SandboxSession } from "./port.ts";

// Minimal type-level assertion helpers (kept local; this is the package's only type-test site).
type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

const stubDriver: SandboxDriver = {
	create: async () => {
		throw new Error("stub driver — never created in tests");
	},
};

const policy = {
	provenance: { packageName: "tama", version: "0.1.17" },
	readiness: { startup: "create-returns-ready" },
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
} as const;

const context = {
	env: { TAMA_TOKEN: "tok" },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: "ghcr.io/example/toolchain:v1" },
} as const;

const request: CreateRequest = {
	spec: { vcpus: 2, memoryGb: 4 },
	artifact: context.resolvedArtifact,
	deadlineMs: 60_000,
};

function session(destroy: () => Promise<void>): SandboxSession {
	return {
		sandboxRef: { provider: "tama", id: "machine-abcdefghijkl" },
		artifact: request.artifact,
		native: undefined,
		exec: async () => ({
			exit: { kind: "exited", code: 0 },
			stdout: "",
			stderr: "",
			durationMs: 0,
			truncated: false,
		}),
		destroy,
	};
}

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

	test("derives exact artifact descriptors and resolved shapes from the same provider id", () => {
		type _e2bDescriptor = Expect<Equal<ArtifactOf<"e2b">, { readonly kind: "baked" }>>;
		type _e2bResolved = Expect<
			Equal<ResolvedArtifactOf<"e2b">, { readonly kind: "baked"; readonly ref: string }>
		>;
		type _blaxelResolved = Expect<Equal<ResolvedArtifactOf<"blaxel">, { readonly kind: "none" }>>;
		expect(true).toBe(true);
	});
});

describe("defineDriver", () => {
	test("carries the id and spec through unchanged", () => {
		const module_ = defineDriver("tama", {
			...policy,
			createBudget: { owner: "driver", attemptCeilingMs: 60_000 },
			driver: ({ env, artifact, resolvedArtifact }) => {
				// env is the exact tama slice; both lines below are type-checked by `tsc --noEmit`.
				const token: string = env.TAMA_TOKEN;
				void token;
				// @ts-expect-error — tama declares no E2B_API_KEY; the registry is the source of truth
				void env.E2B_API_KEY;
				expect(artifact).toEqual({ kind: "image" });
				expect(resolvedArtifact.kind).toBe("image");
				return stubDriver;
			},
		});
		expect(module_.id).toBe("tama");
		expect(module_.provenance).toEqual({ packageName: "tama", version: "0.1.17" });
		expect(module_.readiness).toEqual({ startup: "create-returns-ready" });
		expect(module_.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
		expect(module_.createBudget).toEqual({ owner: "driver", attemptCeilingMs: 60_000 });
		expect(Object.isFrozen(module_)).toBe(true);
		expect(Object.isFrozen(module_.execution)).toBe(true);
		const driver = module_.driver({
			env: { TAMA_TOKEN: "tok" },
			artifact: { kind: "image" },
			resolvedArtifact: { kind: "image", ref: "ghcr.io/example/toolchain:v1" },
		});
		expect(typeof driver.create).toBe("function");
	});

	test("rejects unregistered provider ids at compile time", () => {
		// @ts-expect-error — "not-a-provider" is not a ProviderId
		const bad = () => defineDriver("not-a-provider", { ...policy, driver: () => stubDriver });
		void bad;
		expect(true).toBe(true);
	});

	test("makes a finite synchronous cap without a durable route unconstructable", () => {
		const bad = () =>
			defineDriver("tama", {
				...policy,
				// @ts-expect-error — a finite sync cap requires native-launch or shell-detach
				execution: { syncCapMs: 60_000, durable: "none" },
				driver: () => stubDriver,
			});
		void bad;
		expect(true).toBe(true);
	});

	test("rejects invalid policy values at the runtime boundary", () => {
		expect(() =>
			defineDriver("tama", {
				...policy,
				readiness: {
					startup: "create-then-poll",
					signal: "exec",
					totalBudgetMs: 1_000,
					attemptTimeoutMs: 2_000,
					probe: async () => ({ status: "ready" }),
				},
				driver: () => stubDriver,
			}),
		).toThrow(/attemptTimeoutMs cannot exceed totalBudgetMs/);

		expect(() =>
			defineDriver("tama", {
				...policy,
				execution: { syncCapMs: 60_000, durable: "none" } as never,
				driver: () => stubDriver,
			}),
		).toThrow(/finite execution syncCapMs requires a durable route/);

		for (const field of ["packageName", "version"] as const) {
			expect(() =>
				defineDriver("tama", {
					...policy,
					provenance: { ...policy.provenance, [field]: "x".repeat(257) },
					driver: () => stubDriver,
				}),
			).toThrow(/at most 256 characters/);
		}
	});

	test("rejects an unsupported GPU request before invoking provider create", async () => {
		let creates = 0;
		const module_ = defineDriver("tama", {
			...policy,
			driver: () => ({
				create: async () => {
					creates += 1;
					return session(async () => {});
				},
			}),
		});
		await expect(
			module_.driver(context).create({ ...request, gpu: { model: "H100", count: 1 } }),
		).rejects.toMatchObject({ code: "invalid-create-request", provider: "tama" });
		expect(creates).toBe(0);
	});

	test("tears down a session that contradicts native-launch policy", async () => {
		let destroys = 0;
		const module_ = defineDriver("tama", {
			...policy,
			execution: { syncCapMs: 60_000, durable: "native-launch" },
			driver: () => ({
				create: async () =>
					session(async () => {
						destroys += 1;
					}),
			}),
		});
		await expect(module_.driver(context).create(request)).rejects.toMatchObject({
			code: "vendor-contract-violation",
			provider: "tama",
		});
		expect(destroys).toBe(1);
	});

	test("retains cleanup when native-launch contradiction teardown fails", async () => {
		let destroys = 0;
		const module_ = defineDriver("tama", {
			...policy,
			execution: { syncCapMs: 60_000, durable: "native-launch" },
			driver: () => ({
				create: async () =>
					session(async () => {
						destroys += 1;
						if (destroys === 1) throw new Error("transient cleanup failure");
					}),
			}),
		});
		const error = (await module_
			.driver(context)
			.create(request)
			.catch((caught: unknown) => caught)) as FailedCreateCleanupError;
		expect(error).toBeInstanceOf(FailedCreateCleanupError);
		expect(error.locator).toEqual({ kind: "id", value: "machine-abcdefghijkl" });
		await error.cleanup();
		expect(destroys).toBe(2);
	});

	test("snapshots nested policy records once", () => {
		const mutableExecution = { syncCapMs: 60_000, durable: "shell-detach" } as const;
		const module_ = defineDriver("tama", {
			...policy,
			execution: mutableExecution,
			driver: () => stubDriver,
		});
		(mutableExecution as { syncCapMs: number }).syncCapMs = 1;
		expect(module_.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
	});
});
