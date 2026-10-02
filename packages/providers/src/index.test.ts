import { describe, expect, it } from "bun:test";
import { normalizeProviderInput } from "@sandbox-benchmarks/schema/provider-meta";
import { REGISTRY } from "@sandbox-benchmarks/schema/providers";
import { ENV_KEYS } from "./config.ts";
import { NOVITA_E2B_DOMAIN, novitaConnection } from "./index.ts";

describe("@sandbox-benchmarks/providers", () => {
	// The failure this prevents is not hypothetical: TAMA_CLI was declared in the registry as an
	// optional variable but never added to the gatekeeper's key list, so the tama adapter read it
	// straight off process.env. CI exports an unconfigured variable input as `X: ${{ … || '' }}` —
	// set AND EMPTY, because GitHub Actions cannot express "unset" — `??` accepted that empty string
	// as a value, and spawn("") killed all 54 tama replicates of matrix run 33712242440 before a
	// single sandbox existed.
	//
	// The gatekeeper is where that empty-is-unset rule lives, so every optional variable has to pass
	// through it. A subset assertion rather than deriving ENV_KEYS outright: the list legitimately
	// carries keys with no registry input (BENCH_TOOLCHAIN_IMAGE, VERCEL_CANDIDATE_IMAGE, and the
	// API keys re-exposed as config). Required inputs need no coverage — the driver env gate already treats
	// "" as missing, which is why a raw process.env read of a TOKEN is safe and a variable is not.
	it("routes every optional provider variable through the config gatekeeper", () => {
		const optionalVariables = Object.values(REGISTRY)
			.flatMap((meta) => meta.inputs.map(normalizeProviderInput))
			.filter((input) => input.source.kind === "variable" && !input.required)
			.map((input) => input.name);
		expect(optionalVariables.length).toBeGreaterThan(0);
		// Widened: ENV_KEYS is `as const`, so its literal union would reject a registry-derived string
		// at the call rather than reporting the drift this test exists to report.
		const covered: readonly string[] = ENV_KEYS;
		for (const name of new Set(optionalVariables)) {
			expect(covered).toContain(name);
		}
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
});
