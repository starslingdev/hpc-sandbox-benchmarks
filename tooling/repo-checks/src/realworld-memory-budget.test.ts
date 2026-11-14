import { describe, expect, it } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();

function stagedBudget(budget?: string, profileBudget?: string) {
	const directory = mkdtempSync(join(tmpdir(), "realworld-memory-"));
	try {
		const source = join(directory, "source");
		const profile = "packages/schema/src/pts-profiles/local/realworld-better-auth-1.0.0";
		mkdirSync(source);
		symlinkSync(join(root, "lib"), join(source, "lib"));
		cpSync(join(root, profile), join(source, profile), { recursive: true });
		if (profileBudget !== undefined) {
			writeFileSync(
				join(source, profile, "target.env"),
				`REALWORLD_TASK_MEM_MAX_BYTES=${profileBudget}\n`,
			);
		}
		const result = Bun.spawnSync(
			[
				"bash",
				"-euc",
				`
source "$REPO_ROOT/lib/bench.sh"
have() { return 0; }
pts_init() { :; }
pts_user_dir() { printf '%s\\n' "$TEST_PTS_DIR"; }
run_pts_benchmark() {
  env -u REALWORLD_TASK_MEM_MAX_BYTES sh -euc '
    . "$1"
    printf "MEMORY_GUARD=%s\\n" "\${REALWORLD_TASK_MEM_MAX_BYTES:-unset}"
  ' sh "$TEST_PTS_DIR/test-profiles/local/realworld-better-auth-1.0.0/target.env"
}
run_realworld_pts better-auth
`,
			],
			{
				env: {
					...process.env,
					REPO_ROOT: source,
					TEST_PTS_DIR: directory,
					REALWORLD_TASK_MEM_MAX_BYTES: budget,
				},
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		return {
			code: result.exitCode,
			stdout: result.stdout.toString(),
			stderr: result.stderr.toString(),
		};
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

describe("realworld task memory budget", () => {
	it("preserves a configured budget when PTS clears the inherited environment", () => {
		const result = stagedBudget("7516192768");
		expect(result.code).toBe(0);
		expect(result.stdout).toContain("MEMORY_GUARD=7516192768");
	});

	it("keeps the runner's default policy when no budget is configured", () => {
		const result = stagedBudget();
		expect(result.code).toBe(0);
		expect(result.stdout).toContain("MEMORY_GUARD=unset");
	});

	it("preserves an explicit per-profile budget such as the OOM selftest limit", () => {
		const result = stagedBudget("7516192768", "268435456");
		expect(result.code).toBe(0);
		expect(result.stdout).toContain("MEMORY_GUARD=268435456");
	});

	it.each(["0", "-1", "not-a-number"])("rejects the invalid budget %s", (budget) => {
		const result = stagedBudget(budget);
		expect(result.code).not.toBe(0);
		expect(result.stderr).toContain("must be a positive integer");
		expect(result.stdout).not.toContain("MEMORY_GUARD=");
	});
});
