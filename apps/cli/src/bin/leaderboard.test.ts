import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Exercise the real bin end-to-end: the renderer it dispatches to is decided purely by the output
// path's extension (`.json` → public JSON, anything else → Markdown), and with no output path stdout
// carries the Markdown. None of that wiring is reachable as an exported function, so drive the process.
const BIN = join(import.meta.dir, "leaderboard.ts");
const REPO_ROOT = join(import.meta.dir, "..", "..", "..", "..");

/** The Run the committed dataset publishes — guaranteed present and valid, named by LEADERBOARD.md. */
function publishedRun(): { runId: string; runFile: string } {
	const leaderboard = readFileSync(join(REPO_ROOT, "LEADERBOARD.md"), "utf8");
	const runId = leaderboard.match(/^Run `([^`]+)`/m)?.[1];
	if (!runId) throw new Error("LEADERBOARD.md does not name its published Run");
	return { runId, runFile: join(REPO_ROOT, "data", "dataset", "runs", `${runId}.json`) };
}

function runBin(args: string[]): { stdout: string; status: number | null } {
	const result = spawnSync("bun", [BIN, ...args], { cwd: REPO_ROOT, encoding: "utf8" });
	return { stdout: result.stdout, status: result.status };
}

describe("leaderboard bin output dispatch", () => {
	const { runId, runFile } = publishedRun();
	const outDir = mkdtempSync(join(tmpdir(), "leaderboard-cli-"));

	test("a .json output path writes the public leaderboard JSON", () => {
		const out = join(outDir, "board.json");
		expect(runBin([runFile, out]).status).toBe(0);
		const written = readFileSync(out, "utf8");
		expect(written.endsWith("\n")).toBe(true);
		const parsed = JSON.parse(written);
		expect(parsed.schemaVersion).toBe("1");
		expect(parsed.runId).toBe(runId);
	});

	test("a .md output path writes the Markdown surface, not JSON", () => {
		const out = join(outDir, "board.md");
		expect(runBin([runFile, out]).status).toBe(0);
		const written = readFileSync(out, "utf8");
		expect(written).toContain(`Run \`${runId}\``);
		expect(written.startsWith("{")).toBe(false);
	});

	test("no output path prints the Markdown surface to stdout, unpolluted by logs", () => {
		const { stdout, status } = runBin([runFile]);
		expect(status).toBe(0);
		expect(stdout).toContain(`Run \`${runId}\``);
		expect(stdout.startsWith("{")).toBe(false);
	});
});
