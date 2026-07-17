import { describe, expect, it } from "bun:test";
import type { SmokeExec } from "./smoke.ts";
import { ptsInstalledTestsSmokeCheck, runSmoke, smokeBashScript, smokeChecks } from "./smoke.ts";

async function runPtsCheck(
	installTests: string,
	installedProfiles: string[],
): Promise<{
	exitCode: number;
	stdout: string;
}> {
	const check = ptsInstalledTestsSmokeCheck(installTests);
	const output = installedProfiles.map((profile) => `'${profile}'`).join(" ");
	const script = `phoronix-test-suite() { printf '%s\\n' ${output}; }; ${check.cmd}`;
	const proc = Bun.spawn(["bash", "-c", script], { stdout: "pipe", stderr: "pipe" });
	const [exitCode, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
	return { exitCode, stdout };
}

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

	// The count (9) and sample profile names are hardcoded on purpose: this is a drift tripwire, not a
	// derived assertion. Deriving them from pins.ptsInstallTests would make the test a tautology that
	// tracks the generator instead of pinning it — the exact failure this guards against (a mutable-tag
	// cache once validated an old two-profile image against a nine-profile candidate). When the pin list
	// changes, update these literals deliberately.
	it("requires every pinned PTS profile, so a stale partial image cannot pass smoke", () => {
		const pts = smokeChecks.find((check) => check.name === "pts-installed-tests");
		expect(pts?.expect).toBe("pts-profile-count=9");
		expect(pts?.cmd).toContain("phoronix-test-suite list-installed-tests");
		expect(pts?.cmd).toContain("PTS_USER_PATH_OVERRIDE=/var/lib/phoronix-test-suite/");
		expect(pts?.cmd).toContain("node-web-tooling-1.0.1");
		expect(pts?.cmd).toContain("fast-cli-1.0.0");
		expect(pts?.cmd).toContain("git-1.1.0");
		expect(pts?.cmd).toContain('[ "$actual" -eq 9 ]');
		expect(pts?.cmd).toContain('echo "pts-profile-count=$actual"');
	});

	it("handles an empty PTS install list without emitting invalid shell", async () => {
		const check = ptsInstalledTestsSmokeCheck("  ");
		expect(check.cmd).not.toContain("for test in");
		expect((await runPtsCheck("  ", [])).exitCode).toBe(0);
		expect((await runPtsCheck("  ", ["pts/unexpected-1.0.0"])).exitCode).toBe(1);
	});

	it("accepts versionless pins but requires version-pinned entries literally", async () => {
		const result = await runPtsCheck("c-ray fio-2.1.0", ["pts/c-ray-2.0.0", "pts/fio-2.1.0"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("pts-profile-count=2");
	});

	it("rejects an unexpected extra installed profile instead of echoing the expected count", async () => {
		const result = await runPtsCheck("fio-2.1.0", ["pts/fio-2.1.0", "pts/stream-1.3.4"]);
		expect(result.exitCode).toBe(1);
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
