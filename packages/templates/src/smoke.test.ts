import { describe, expect, it } from "bun:test";
import type { SmokeExec } from "./smoke.ts";
import { runSmoke, smokeBashScript, smokeChecks } from "./smoke.ts";

describe("@sandbox-benchmarks/templates smoke", () => {
	it("defines a non-empty spec with unique names and a cmd/expect per check", () => {
		expect(smokeChecks.length).toBeGreaterThan(0);
		const names = smokeChecks.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
		for (const c of smokeChecks) {
			expect(c.cmd.length).toBeGreaterThan(0);
			expect(c.expect.length).toBeGreaterThan(0);
		}
	});

	it("emits a bash script asserting every probe", () => {
		const script = smokeBashScript();
		expect(script).toContain("set -euo pipefail");
		for (const c of smokeChecks) {
			expect(script).toContain(c.cmd);
			expect(script).toContain(c.expect);
		}
	});

	// A fake executor that echoes the matching `expect` for each cmd → every probe should pass.
	const passingExec: SmokeExec = (cmd) => {
		const check = smokeChecks.find((c) => c.cmd === cmd);
		return Promise.resolve({ stdout: check ? check.expect : "", stderr: "", exitCode: 0 });
	};

	it("passes every probe when the executor returns matching output", async () => {
		const results = await runSmoke(passingExec);
		expect(results.map((r) => r.name)).toEqual(smokeChecks.map((c) => c.name));
		expect(results.every((r) => r.ok)).toBe(true);
	});

	it("fails a probe whose output is missing the expected substring", async () => {
		const exec: SmokeExec = () =>
			Promise.resolve({ stdout: "unexpected", stderr: "", exitCode: 0 });
		const results = await runSmoke(exec);
		expect(results.every((r) => !r.ok)).toBe(true);
	});

	it("fails a probe on a non-zero exit even if output matches", async () => {
		const exec: SmokeExec = (cmd) => {
			const check = smokeChecks.find((c) => c.cmd === cmd);
			return Promise.resolve({ stdout: check ? check.expect : "", stderr: "", exitCode: 1 });
		};
		const results = await runSmoke(exec);
		expect(results.every((r) => !r.ok)).toBe(true);
	});

	it("records a thrown executor as a failed probe, not a crash", async () => {
		const exec: SmokeExec = () => Promise.reject(new Error("transport down"));
		const results = await runSmoke(exec);
		expect(results.every((r) => !r.ok && r.exitCode === -1)).toBe(true);
		expect(results[0]?.output).toContain("transport down");
	});

	it("records a nullish executor result as a failed probe, not a crash", async () => {
		// A misbehaving provider wrapper could resolve to null despite the type — must not crash.
		const exec = (() => Promise.resolve(null)) as unknown as SmokeExec;
		const results = await runSmoke(exec);
		expect(results.every((r) => !r.ok && r.exitCode === -1)).toBe(true);
	});
});
