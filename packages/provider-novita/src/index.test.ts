import { describe, expect, it } from "bun:test";
import { NOVITA_E2B_DOMAIN, novitaAdapter, novitaCompute } from "./index.ts";

describe("@sandbox-benchmarks/provider-novita", () => {
	it("pins the E2B-compatible control-plane domain Novita documents", () => {
		expect(NOVITA_E2B_DOMAIN).toBe("sandbox.novita.ai");
	});

	it("re-points the e2b wrapper at Novita without the e2b_ key-format guard", () => {
		// Construction must accept an nvta_-prefixed key (the stock wrapper's create() rejects those)
		// and still expose the universal manager surface the harness drives. This also exercises the
		// patch's runtime shape assertion, so a wrapper upgrade that moves the internal methods table
		// fails here instead of mid-run.
		const compute = novitaCompute("nvta_unit-test-key");
		expect(typeof compute.sandbox.create).toBe("function");
		expect(typeof compute.sandbox.destroy).toBe("function");
		expect(typeof compute.sandbox.list).toBe("function");
	});

	it("exposes no snapshot/template managers — their every call would reconnect without a domain", () => {
		// Absent managers read downstream as a clean "provider exposes no snapshot operation" skip
		// instead of a misleading failure against e2b.dev.
		const compute = novitaCompute("nvta_unit-test-key");
		expect(compute.snapshot).toBeUndefined();
		expect(compute.template).toBeUndefined();
	});

	it("exports an adapter that boots Novita's default template (no candidate artifact)", () => {
		expect(novitaAdapter.createOptions).toEqual({});
		expect(typeof novitaAdapter.createCompute).toBe("function");
	});

	it("errors on use — not at import — when NOVITA_API_KEY is missing", () => {
		// The package must stay importable without credentials; the factory throws only when the
		// harness actually selects the provider (after its requiredEnvVars gate).
		if (!process.env.NOVITA_API_KEY) {
			expect(() => novitaAdapter.createCompute()).toThrow(/NOVITA_API_KEY/);
		}
	});
});
