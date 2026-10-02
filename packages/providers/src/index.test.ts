import { describe, expect, it } from "bun:test";
import { normalizeProviderInput } from "@sandbox-benchmarks/schema/provider-meta";
import { REGISTRY } from "@sandbox-benchmarks/schema/providers";
import { ENV_KEYS } from "./config.ts";

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
});
