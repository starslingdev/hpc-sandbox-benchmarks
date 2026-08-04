import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PTS_STATE_SELECT_SH } from "@sandbox-benchmarks/schema";
import type { SmokeExec } from "./smoke.ts";
import { ptsInstalledTestsSmokeCheck, runSmoke, smokeBashScript, smokeChecks } from "./smoke.ts";

/** A stand-in for an override the published image ENV already exported into the sandbox. */
const INHERITED_OVERRIDE = "/inherited-from-image-env/";

/**
 * Execute the GENERATED check under a stubbed effective uid, and report the PTS environment the
 * probe actually handed to `phoronix-test-suite`.
 *
 * Two things make the unprivileged branch genuinely executable rather than merely asserted as text:
 *
 *  - The baked root is relocated into a temp dir. The generated command guards its whole export block
 *    on `[ -d /var/lib/phoronix-test-suite ]`, which is false on every dev machine and CI runner, so
 *    without this rewrite BOTH branches would be skipped and the test would prove nothing. Only the
 *    path is relocated; the shell logic under test is byte-for-byte the shipped one.
 *  - `PTS_USER_PATH_OVERRIDE` is seeded in the child env. Dropping an override the image ENV already
 *    exported is the entire job of the non-root branch, and it is invisible unless something set it.
 */
async function runPtsCheck(
	installTests: string,
	installedProfiles: string[],
	{ uid = 0 }: { uid?: number } = {},
): Promise<{
	exitCode: number;
	stdout: string;
	/** `undefined` when the probe left PTS on its own per-user default. */
	userPathOverride: string | undefined;
	installRoot: string | undefined;
}> {
	const check = ptsInstalledTestsSmokeCheck(installTests);
	const output = installedProfiles.map((profile) => `'${profile}'`).join(" ");
	const root = await mkdtemp(join(tmpdir(), "pts-smoke-"));
	try {
		const cmd = check.cmd.replaceAll("/var/lib/phoronix-test-suite", root);
		// The stub records the resolved PTS env to a side file, leaving stdout exactly what the real
		// command emits. `${VAR-}` (no colon) distinguishes unset from set-but-empty — the difference
		// between "the override was dropped" and "it was exported as an empty string".
		const probePath = join(root, "resolved-env");
		const script =
			`id() { printf '${uid}\\n'; }; ` +
			`phoronix-test-suite() { printf 'override=%s\\ninstall_root=%s\\n' ` +
			`"\${PTS_USER_PATH_OVERRIDE-<unset>}" "\${PTS_TEST_INSTALL_ROOT_PATH-<unset>}" ` +
			`>${JSON.stringify(probePath)}; printf '%s\\n' ${output}; }; ${cmd}`;
		const proc = Bun.spawn(["bash", "-c", script], {
			stdout: "pipe",
			stderr: "pipe",
			env: { ...process.env, PTS_USER_PATH_OVERRIDE: INHERITED_OVERRIDE },
		});
		const [exitCode, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
		const probeFile = Bun.file(probePath);
		const probe = (await probeFile.exists()) ? await probeFile.text() : "";
		const read = (key: string): string | undefined => {
			const value = probe.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1];
			return value === undefined || value === "<unset>" ? undefined : value.replace(root, "<root>");
		};
		return {
			exitCode,
			stdout,
			userPathOverride: read("override"),
			installRoot: read("install_root"),
		};
	} finally {
		await rm(root, { recursive: true, force: true });
	}
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

	// The count (10) and sample profile names are hardcoded on purpose: this is a drift tripwire, not a
	// derived assertion. Deriving them from pins.ptsInstallTests would make the test a tautology that
	// tracks the generator instead of pinning it — the exact failure this guards against (a mutable-tag
	// cache once validated an old two-profile image against a nine-profile candidate). When the pin list
	// changes, update these literals deliberately. (10 = the nine long-standing profiles + iperf-1.2.0,
	// added for the network suite's iperf composition.)
	it("requires every pinned PTS profile, so a stale partial image cannot pass smoke", () => {
		const pts = smokeChecks.find((check) => check.name === "pts-installed-tests");
		expect(pts?.expect).toBe("pts-profile-count=10");
		expect(pts?.cmd).toContain("phoronix-test-suite list-installed-tests");
		// The probe must select PTS state exactly the way the benchmark lane does, so a green smoke
		// check cannot mean "root can see the profiles" while the injected run user cannot.
		expect(pts?.cmd).toContain(PTS_STATE_SELECT_SH);
		expect(pts?.cmd).toContain(
			"PTS_TEST_INSTALL_ROOT_PATH=/var/lib/phoronix-test-suite/installed-tests/",
		);
		expect(pts?.cmd).toContain("node-web-tooling-1.0.1");
		expect(pts?.cmd).toContain("fast-cli-1.0.0");
		expect(pts?.cmd).toContain("iperf-1.2.0");
		expect(pts?.cmd).toContain("git-1.1.0");
		expect(pts?.cmd).toContain('[ "$actual" -eq 10 ]');
		expect(pts?.cmd).toContain('echo "pts-profile-count=$actual"');
	});

	// Runloop injects an unprivileged runtime user, so the non-root branch is the one this probe exists
	// for — and the branch a `id() { printf '0' }`-only harness would never execute. Both identities are
	// run for real below, and every functional case after this repeats under both.
	it("keeps root on the baked state directory", async () => {
		const result = await runPtsCheck("fio-2.1.0", ["pts/fio-2.1.0"], { uid: 0 });
		expect(result.exitCode).toBe(0);
		expect(result.userPathOverride).toBe("<root>/");
		expect(result.installRoot).toBe("<root>/installed-tests/");
	});

	// The regression this pins: pointing an unprivileged user at root's state (or leaving the image
	// ENV's override in place) puts PTS on a 0600 core.pt2so and a results tree lib/bench.sh never
	// searches. The override must be DROPPED, not repointed — PTS's own $HOME default is correct — and
	// the shared install root must survive, which is the only reason the profiles stay visible.
	it("drops an inherited override for an unprivileged user while keeping the shared install root", async () => {
		const result = await runPtsCheck("fio-2.1.0", ["pts/fio-2.1.0"], { uid: 1000 });
		expect(result.exitCode).toBe(0);
		expect(result.userPathOverride).toBeUndefined();
		expect(result.installRoot).toBe("<root>/installed-tests/");
	});

	// No mkdir on either branch: the probe runs under `set -euo pipefail` in smokeBashScript(), so a
	// write that fails when HOME is unset or unwritable would abort the whole smoke run rather than
	// report one failed check. PTS creates its own state dir, so there is nothing to pre-create.
	it("never writes to the filesystem while selecting PTS state", () => {
		const pts = smokeChecks.find((check) => check.name === "pts-installed-tests");
		expect(pts?.cmd).not.toContain("mkdir");
	});

	for (const uid of [0, 1000]) {
		const as = uid === 0 ? "as root" : "as an unprivileged user";

		it(`handles an empty PTS install list without emitting invalid shell (${as})`, async () => {
			const check = ptsInstalledTestsSmokeCheck("  ");
			expect(check.cmd).not.toContain("for test in");
			expect((await runPtsCheck("  ", [], { uid })).exitCode).toBe(0);
			expect((await runPtsCheck("  ", ["pts/unexpected-1.0.0"], { uid })).exitCode).toBe(1);
		});

		it(`accepts versionless pins but requires version-pinned entries literally (${as})`, async () => {
			const result = await runPtsCheck("c-ray fio-2.1.0", ["pts/c-ray-2.0.0", "pts/fio-2.1.0"], {
				uid,
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("pts-profile-count=2");
		});

		it(`rejects an unexpected extra installed profile instead of echoing the count (${as})`, async () => {
			const result = await runPtsCheck("fio-2.1.0", ["pts/fio-2.1.0", "pts/stream-1.3.4"], { uid });
			expect(result.exitCode).toBe(1);
		});
	}

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
