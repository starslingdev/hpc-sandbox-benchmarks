// `@sandbox-benchmarks/templates/smoke` — the single smoke spec that proves the baked toolchain
// survived a provider's packaging. ONE list of probes drives both checks so they can't drift:
//   - the docker-level check in toolchain-image.yml (via `smokeBashScript()`, run with `bash -lc`)
//   - the in-sandbox check in `bench-smoke` (via `runSmoke()`, driven by a provider's runCommand)
// The probes mirror what 99-manifest.sh bakes into the image; expects are pinned to pins.ts versions,
// so a check fails loudly if the exact toolchain didn't make it through e2b's envd injection,
// daytona's snapshot, or modal's fromRegistry.
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { pins } from "./pins.ts";

/** A single smoke probe: run `cmd`, pass iff it exits 0 and its output contains `expect`. */
export interface SmokeCheck {
	/** Stable id used in logs and structured results. */
	name: string;
	/** Shell command to run inside the image / sandbox. */
	cmd: string;
	/** Substring the command's combined output (stdout+stderr) must contain to pass. */
	expect: string;
}

/** The outcome of one probe — the structured, debuggable unit `bench-smoke` emits. */
export interface SmokeResult {
	name: string;
	cmd: string;
	ok: boolean;
	exitCode: number;
	durationMs: number;
	/** Combined stdout+stderr, kept so a failure is debuggable from the result alone. */
	output: string;
}

/** What a runner must provide: execute a command, return its output and exit code. */
export interface SmokeExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}
export type SmokeExec = (cmd: string) => Promise<SmokeExecResult>;

/**
 * The probes, in run order. Expects are pinned to the same pins.ts that built the image, so this
 * asserts the *exact* toolchain is present — not merely that "a" node/python exists.
 */
export const smokeChecks: readonly SmokeCheck[] = [
	// Stable node path consumers depend on (10-mise.sh symlink) resolves the pinned node.
	{ name: "node", cmd: "bench-node --version", expect: `v${pins.nodeVersion}` },
	// mise-managed python on PATH at the pinned version (not distro python).
	{ name: "python", cmd: "python3 --version", expect: `Python ${pins.pythonVersion}` },
	// mise itself is the pinned release (stronger than asserting it merely lists a tool).
	{ name: "mise", cmd: "mise --version", expect: pins.miseVersion },
	// Every other mise-managed tool resolves on PATH at its exact pinned version — proves the *whole*
	// toolchain (not just node/python) survived the provider's packaging, not merely that "a" tool exists.
	{ name: "pnpm", cmd: "pnpm --version", expect: pins.pnpmVersion },
	{ name: "hyperfine", cmd: "hyperfine --version", expect: pins.hyperfineVersion },
	{ name: "jc", cmd: "jc --version", expect: pins.jcVersion },
	{ name: "quarto", cmd: "quarto --version", expect: pins.quartoVersion },
	{ name: "warp", cmd: "warp --version", expect: pins.warpVersion },
	// PTS offline caches were pre-seeded (the whole point of baking the base). `find … -type f` lists
	// the cached files; the trailing-slash expect matches a real file path (…/download-cache/<file>)
	// but NOT find's missing-dir error (…/download-cache'), so this proves the cache is NON-EMPTY —
	// not merely that the directory exists. A single command with no shell operators, so it behaves
	// the same whether the executor runs it through a shell or via exec.
	{
		name: "pts-download-cache",
		cmd: "find /var/lib/phoronix-test-suite/download-cache -type f",
		expect: "download-cache/",
	},
	// The enforced verification manifest is present (proves the base build's 99-manifest step ran)…
	{ name: "manifest", cmd: "cat /toolchain-manifest.json", expect: TOOLCHAIN_IMAGE_NAME },
	// …and declares the expected toolchain version, so a stale/wrong-version manifest fails loudly.
	// A distinct `grep` cmd (not a second `cat`) keeps every probe's cmd unique and stays operator-free.
	{
		name: "manifest-version",
		cmd: "grep image_version /toolchain-manifest.json",
		expect: `"image_version": "${TOOLCHAIN_VERSION}"`,
	},
];

/**
 * Drive the probes against any executor (a provider's runCommand). Never throws on a failed probe —
 * it records `ok: false` with the captured output so the caller decides how to report/exit.
 */
export async function runSmoke(exec: SmokeExec): Promise<SmokeResult[]> {
	const results: SmokeResult[] = [];
	for (const check of smokeChecks) {
		const start = performance.now();
		try {
			const res = await exec(check.cmd);
			if (!res) throw new Error("executor returned an empty result");
			const output = [res.stdout, res.stderr].filter(Boolean).join("\n");
			results.push({
				name: check.name,
				cmd: check.cmd,
				ok: res.exitCode === 0 && output.includes(check.expect),
				exitCode: res.exitCode,
				durationMs: performance.now() - start,
				output,
			});
		} catch (err) {
			// Any failure — a thrown/empty executor or bad output — is a failed probe, never a crash
			// of the run (runSmoke's contract: it records the failure and keeps going).
			results.push({
				name: check.name,
				cmd: check.cmd,
				ok: false,
				exitCode: -1,
				durationMs: performance.now() - start,
				output: err instanceof Error ? err.message : String(err),
			});
		}
	}
	return results;
}

/**
 * Emit a `bash -lc`-ready script asserting the same probes, for the docker-level smoke in CI. Each
 * probe prints a `>>> [smoke] <name>` marker and, on failure, the captured output before exiting 1 —
 * so the CI docker log alone tells you which probe broke and why. Single-quotes are escaped for safe
 * embedding; the cmd/expect strings are repo-controlled (no external input).
 */
export function smokeBashScript(): string {
	const esc = (s: string) => s.replace(/'/g, `'\\''`);
	const lines = ["set -euo pipefail", ""];
	for (const { name, cmd, expect } of smokeChecks) {
		// `if cmd; then … else … fi` (not `if ! cmd`) so `$?` in the else branch is the command's real
		// exit code — under `if ! cmd` it would always read 0 (the negation's status), mislabeling failures.
		lines.push(
			`echo '>>> [smoke] ${esc(name)}: ${esc(cmd)}'`,
			`if out="$(${cmd} 2>&1)"; then`,
			`	if ! printf '%s\\n' "$out" | grep -qF -- '${esc(expect)}'; then`,
			`		echo "[smoke] FAIL ${esc(name)}: expected '${esc(expect)}' in output"; printf '%s\\n' "$out"; exit 1`,
			`	fi`,
			`	echo "[smoke] ok ${esc(name)}"`,
			`else`,
			`	echo "[smoke] FAIL ${esc(name)} (exit $?)"; printf '%s\\n' "$out"; exit 1`,
			`fi`,
			"",
		);
	}
	lines.push('echo "[smoke] all checks passed"');
	return `${lines.join("\n")}\n`;
}

if (import.meta.main) {
	// `--bash` emits the docker-level script; default emits the structured spec as JSON.
	if (process.argv[2] === "--bash") {
		process.stdout.write(smokeBashScript());
	} else {
		console.log(JSON.stringify(smokeChecks, null, 2));
	}
}
