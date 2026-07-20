import { describe, expect, it } from "bun:test";
// The stock wrapper factory, imported so the novita test can prove the connection methods were
// actually REPLACED (identity inequality against an unpatched instance's methods table).
import { e2b } from "@computesdk/e2b";
import { PROVIDERS, TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { config, NOVITA_E2B_DOMAIN, novitaCompute, novitaConnection, providers } from "./index.ts";
import { runE2bCommandAsRoot } from "./lib/e2b-root.ts";
import { assertProviderJoin } from "./lib/join.ts";

describe("@sandbox-benchmarks/providers", () => {
	it("wires every schema provider through to a computesdk factory", () => {
		// `adapters` is a Record<ProviderId, …>, so it's the same set as the schema registry by
		// construction — assert that against PROVIDERS rather than a hardcoded list.
		expect(providers.map((p) => p.name).sort()).toEqual(PROVIDERS.map((m) => m.id).sort());
		for (const p of providers) {
			expect(typeof p.createCompute).toBe("function");
			expect(p.requiredEnvVars.length).toBeGreaterThan(0);
		}
	});

	it("carries each provider's schema-owned transport capability through to the config", () => {
		// The join must surface the same transport the schema declares, so the harness selects a
		// transport from the provider's real capability rather than a hardcoded default. `providers` is
		// `PROVIDERS.map(...)`, so the two are index-aligned by construction — assert positionally
		// instead of an O(N²) `.find`, which also keeps the failure message pointing at the drift.
		expect(providers.length).toBe(PROVIDERS.length);
		for (let i = 0; i < providers.length; i++) {
			expect(providers[i]?.transport).toEqual(PROVIDERS[i]?.transport);
		}
	});

	it("pins modal's create-time spec from the shared TARGET_SPEC", () => {
		const modal = providers.find((p) => p.name === "modal");
		expect(modal).toBeDefined();
		// Modal's `cpu` unit delivers one schedulable vCPU (nproc tracks it 1:1 and throughput scales
		// with it — measured 2026-07-10), so the pinned vCPU count passes through unhalved; halving it
		// benchmarked Modal on half the CPU of every other provider.
		// `memoryLimitMiB` is the hard cap (memoryMiB alone is only a reservation, and the guest then
		// still sees the host's RAM) — assert it, or the memory fix has no regression guard at all.
		expect(modal?.createOptions).toMatchObject({
			cpu: TARGET_SPEC.vcpus,
			cpuLimit: TARGET_SPEC.vcpus,
			memoryMiB: TARGET_SPEC.memoryGb * 1024,
			memoryLimitMiB: TARGET_SPEC.memoryGb * 1024,
			experimentalOptions: { vm_runtime: true },
		});
	});

	it("re-points the e2b wrapper at Novita without the e2b_ key-format guard", () => {
		// Construction must accept an nvta_-prefixed key and still expose the universal manager surface
		// the harness drives, with the mispointed snapshot/template managers removed (their every call
		// would reconnect to e2b.dev). This also exercises the patch's runtime shape assertion, so a
		// wrapper upgrade that moves the internal methods table fails here instead of mid-run.
		const compute = novitaCompute("nvta_unit-test-key");
		expect(typeof compute.sandbox.create).toBe("function");
		expect(typeof compute.sandbox.destroy).toBe("function");
		expect(typeof compute.sandbox.list).toBe("function");
		// The stock wrapper's connection methods (whose create() enforces the e2b_ prefix and whose
		// every call omits the domain) must have been REPLACED, not just still-callable — a stock
		// `create` is also `typeof "function"`, so compare the internal methods table against an
		// unpatched wrapper's by identity. Reaches the same internal seam the patch itself asserts.
		const methodsOf = (p: unknown) =>
			(p as { sandbox: { methods: Record<string, unknown> } }).sandbox.methods;
		const stock = methodsOf(e2b({ apiKey: "e2b_unit-test-key" }));
		const patched = methodsOf(compute);
		for (const method of ["create", "getById", "destroy", "list"] as const) {
			// Precondition that makes the inequality below meaningful: the wrapper hands every instance
			// the SAME module-level methods object (defineProvider passes it by reference). If an upgrade
			// switches to per-instance closures, this fails loudly instead of the patch check passing
			// vacuously against a never-shared function.
			expect(methodsOf(e2b({ apiKey: "e2b_unit-test-key" }))[method]).toBe(stock[method]);
			expect(patched[method]).not.toBe(stock[method]);
		}
		expect(patched.runCommand).toBe(runE2bCommandAsRoot);
		expect(patched.runCommand).not.toBe(stock.runCommand);
		expect(compute.snapshot).toBeUndefined();
		// `template` is a runtime property of the generated provider (computesdk's type doesn't model
		// it), so reach through a structural cast to pin its removal too.
		expect((compute as { template?: unknown }).template).toBeUndefined();
	});

	it("refuses construction without a key, unconditionally", () => {
		// The factory (not env state) owns the missing-credential error, so this holds even in an
		// environment where NOVITA_API_KEY is set.
		expect(() => novitaCompute(undefined)).toThrow(/NOVITA_API_KEY/);
	});

	it("keeps the account key in the SDK's apiKey channel — never in connection headers", () => {
		// SECURITY PIN: the SDK replays connection `headers` into the envd RPC transport, so a
		// credential riding `headers` is delivered to the daemon INSIDE the guest on every
		// command/filesystem call — where TLS has already terminated and any root process (including
		// a supply-chain-compromised benchmark suite) can read it. `apiKey` becomes an X-API-KEY
		// header inside the control-plane ApiClient only. If a future revision reintroduces a headers
		// override (e.g. to dodge a key-format guard again), this must fail.
		const connection = novitaConnection("nvta_unit-test-key");
		expect(connection).toEqual({
			apiKey: "nvta_unit-test-key",
			domain: NOVITA_E2B_DOMAIN,
		});
		expect(connection).not.toHaveProperty("headers");
	});

	it("boots novita from the configured template, erroring on use — not import — without a key", () => {
		const novita = providers.find((p) => p.name === "novita");
		expect(novita).toBeDefined();
		expect(novita?.requiredEnvVars).toEqual(["NOVITA_API_KEY"]);
		expect(novita?.createOptions?.snapshotId).toBe(config.novitaTemplate);
		// The registry module must stay importable without credentials; the factory throws only when
		// the harness actually selects the provider (after its requiredEnvVars gate).
		if (!process.env.NOVITA_API_KEY) {
			expect(() => novita?.createCompute()).toThrow(/NOVITA_API_KEY/);
		}
	});

	it("boots e2b from the configured template and keeps Daytona alive for long suites", () => {
		const e2bAdapter = providers.find((p) => p.name === "e2b");
		expect(e2bAdapter?.createOptions?.snapshotId).toBe(config.e2bTemplate);
		const compute = e2bAdapter?.createCompute();
		const methods = (compute as unknown as { sandbox: { methods: Record<string, unknown> } })
			.sandbox.methods;
		expect(methods.runCommand).toBe(runE2bCommandAsRoot);

		const daytona = providers.find((p) => p.name === "daytona-vm");
		expect(daytona).toBeDefined();
		expect(daytona?.createOptions?.snapshotId).toBe(config.daytonaVm.snapshot);
		// ComputeSDK maps its universal timeout to the Daytona SDK's create-operation timeout, not the
		// sandbox lifetime. Pass the native option through so an 8+ minute detached suite is not stopped
		// underneath the harness; runSuite's finally block remains the cleanup authority.
		expect(daytona?.createOptions?.autoStopInterval).toBe(0);

		// The container variant shares the account key but boots its own snapshot in its own region.
		const container = providers.find((p) => p.name === "daytona-container");
		expect(container?.createOptions?.snapshotId).toBe(config.daytonaContainer.snapshot);
		expect(container?.createOptions?.target).toBe("us");

		// No adapter override — requiredEnvVars falls back to the schema meta's static list. Pin the
		// concrete value rather than only comparing the two lookups against each other: if both `find`s
		// missed (provider renamed on one side), `undefined === undefined` would pass — a false green.
		const daytonaMeta = PROVIDERS.find((m) => m.id === "daytona-vm");
		expect(daytonaMeta?.requiredEnvVars).toEqual(["DAYTONA_API_KEY"]);
		expect(daytona?.requiredEnvVars).toEqual(daytonaMeta?.requiredEnvVars);
	});

	it("passes E2B-compatible cwd and env options through envd's structured root channel", async () => {
		const calls: Array<{ command: string; options?: Record<string, unknown> }> = [];
		const sandbox = {
			commands: {
				run: async (command: string, options?: Record<string, unknown>) => {
					calls.push({ command, options });
					return { stdout: "ok", stderr: "", exitCode: 0 };
				},
			},
		};
		const result = await runE2bCommandAsRoot(sandbox as never, "echo hi", {
			cwd: "/work dir",
			env: { TOKEN: "not a shell; value" },
			timeout: 1234,
		});

		expect(result).toMatchObject({ stdout: "ok", stderr: "", exitCode: 0 });
		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({
			command: "echo hi",
			options: {
				user: "root",
				cwd: "/work dir",
				envs: { TOKEN: "not a shell; value" },
				timeoutMs: 1234,
				background: false,
			},
		});
	});

	it("translates a native background handle into ComputeSDK's completed launch result", async () => {
		const calls: Array<{ command: string; options?: Record<string, unknown> }> = [];
		const sandbox = {
			commands: {
				run: async (command: string, options?: Record<string, unknown>) => {
					calls.push({ command, options });
					return { pid: 42 };
				},
			},
		};
		const result = await runE2bCommandAsRoot(sandbox as never, "long command", {
			background: true,
		});

		expect(result).toMatchObject({ stdout: "", stderr: "", exitCode: 0 });
		expect(calls).toEqual([
			{ command: "long command", options: { user: "root", background: true } },
		]);
	});

	it("recovers a failed command's structured result when the SDK throws it", async () => {
		const sandbox = {
			commands: {
				run: async () => {
					throw { result: { stdout: "partial", stderr: "boom", exitCode: 2 } };
				},
			},
		};
		const result = await runE2bCommandAsRoot(sandbox as never, "false", {});
		expect(result).toMatchObject({ stdout: "partial", stderr: "boom", exitCode: 2 });
	});

	it("defaults a thrown result's missing fields rather than crashing", async () => {
		const sandbox = {
			commands: {
				run: async () => {
					throw { result: {} };
				},
			},
		};
		const result = await runE2bCommandAsRoot(sandbox as never, "false", {});
		expect(result).toMatchObject({ stdout: "", stderr: "", exitCode: 1 });
	});
});

describe("assertProviderJoin", () => {
	it("passes silently when the schema ids and the adapter ids are the same set", () => {
		// The real registries are already index-aligned, so the live module load (above) exercises the
		// happy path; assert it explicitly here too, including when order differs between the two sides.
		expect(() =>
			assertProviderJoin(["e2b", "daytona", "modal"], ["modal", "e2b", "daytona"]),
		).not.toThrow();
		expect(() =>
			assertProviderJoin(
				PROVIDERS.map((m) => m.id),
				providers.map((p) => p.name),
			),
		).not.toThrow();
	});

	it("throws naming a provider that's in the schema but missing an adapter", () => {
		// A provider added to the schema registry without a matching harness adapter — the compile-time
		// Record can't catch this across a version drift, so the runtime guard must.
		expect(() => assertProviderJoin(["e2b", "daytona", "modal"], ["e2b", "daytona"])).toThrow(
			/missing a harness adapter: modal/,
		);
	});

	it("throws naming an adapter that has no schema entry", () => {
		expect(() => assertProviderJoin(["e2b", "daytona"], ["e2b", "daytona", "modal"])).toThrow(
			/no schema PROVIDERS entry: modal/,
		);
	});

	it("reports both one-sided directions at once", () => {
		const err = (() => {
			try {
				assertProviderJoin(["e2b", "ghost"], ["e2b", "modal"]);
			} catch (e) {
				return e as Error;
			}
		})();
		expect(err?.message).toContain("missing a harness adapter: ghost");
		expect(err?.message).toContain("no schema PROVIDERS entry: modal");
	});
});
