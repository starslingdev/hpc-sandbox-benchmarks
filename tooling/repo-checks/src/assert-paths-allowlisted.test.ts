// Drift gate for scripts/assert-paths-allowlisted.sh — the path fence update-leaderboard.yml uses
// before arming auto-merge. A silent widen (or a broken argv parser) would let a release PR touch
// `.github/` and still merge.
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const ROOT = findRepoRoot();
const SCRIPT = join(ROOT, "scripts/assert-paths-allowlisted.sh");

const temps: string[] = [];

afterEach(() => {
	for (const dir of temps.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

function tempGitRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), "assert-paths-"));
	temps.push(dir);
	const git = (args: string[]) =>
		Bun.spawnSync(["git", ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" });
	expect(git(["init", "-q"]).exitCode).toBe(0);
	expect(git(["config", "user.email", "test@example.com"]).exitCode).toBe(0);
	expect(git(["config", "user.name", "test"]).exitCode).toBe(0);
	return dir;
}

function runAssert(cwd: string, args: string[]): { exitCode: number; stderr: string } {
	const result = Bun.spawnSync(["bash", SCRIPT, ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	return {
		exitCode: result.exitCode,
		stderr: new TextDecoder().decode(result.stderr),
	};
}

describe("scripts/assert-paths-allowlisted.sh", () => {
	test("accepts a staged change set that is exactly the allowlist", () => {
		const dir = tempGitRepo();
		writeFileSync(join(dir, "LEADERBOARD.md"), "# ok\n");
		Bun.spawnSync(["git", "add", "LEADERBOARD.md"], { cwd: dir });
		const { exitCode, stderr } = runAssert(dir, ["staged", "--", "LEADERBOARD.md"]);
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);
	});

	test("rejects a staged path outside the allowlist", () => {
		const dir = tempGitRepo();
		writeFileSync(join(dir, "LEADERBOARD.md"), "# ok\n");
		writeFileSync(join(dir, "evil.yml"), "name: pwn\n");
		Bun.spawnSync(["git", "add", "LEADERBOARD.md", "evil.yml"], { cwd: dir });
		const { exitCode, stderr } = runAssert(dir, ["staged", "--", "LEADERBOARD.md"]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("path not allowlisted: evil.yml");
	});

	test("rejects an empty staged change set", () => {
		const dir = tempGitRepo();
		const { exitCode, stderr } = runAssert(dir, ["staged", "--", "LEADERBOARD.md"]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("change set is empty");
	});
});
