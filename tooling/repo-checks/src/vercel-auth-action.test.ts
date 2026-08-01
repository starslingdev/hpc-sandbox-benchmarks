import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const roots: string[] = [];
afterEach(async () => {
	for (const root of roots.splice(0)) await Bun.$`rm -rf ${root}`.quiet();
});

function fixture(tokenLine: string, vcrLogin: boolean) {
	const root = mkdtempSync(join(tmpdir(), "vercel-auth-action-"));
	roots.push(root);
	const calls = join(root, "calls");
	const githubEnv = join(root, "github-env");
	const fakeVercel = join(root, "vercel");
	writeFileSync(
		fakeVercel,
		`#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> ${JSON.stringify(calls)}
if [[ "$1 $2" == "env pull" ]]; then
  printf '%s\\n' ${JSON.stringify(tokenLine)} > "$3"
fi
`,
	);
	chmodSync(fakeVercel, 0o755);
	return { root, calls, githubEnv, fakeVercel, vcrLogin };
}

async function runAction(f: ReturnType<typeof fixture>) {
	const script = join(findRepoRoot(), ".github/actions/vercel-auth/auth.sh");
	return Bun.spawn([script], {
		cwd: f.root,
		env: {
			...process.env,
			GITHUB_ENV: f.githubEnv,
			RUNNER_TEMP: f.root,
			VERCEL_BIN: f.fakeVercel,
			VERCEL_TOKEN: "bootstrap-token",
			VERCEL_ORG_ID: "team_test",
			VERCEL_PROJECT_ID: "prj_test",
			VCR_LOGIN: String(f.vcrLogin),
		},
		stdout: "pipe",
		stderr: "pipe",
	});
}

describe("Vercel authentication composite", () => {
	test("exports and masks the pulled OIDC token and optionally logs in to VCR", async () => {
		for (const vcrLogin of [false, true]) {
			const f = fixture('VERCEL_OIDC_TOKEN="short-lived-token"', vcrLogin);
			const process = await runAction(f);
			expect(await process.exited).toBe(0);
			expect(await new Response(process.stdout).text()).toBe("::add-mask::short-lived-token\n");
			expect(readFileSync(f.githubEnv, "utf8")).toBe("VERCEL_OIDC_TOKEN=short-lived-token\n");
			const calls = readFileSync(f.calls, "utf8");
			expect(calls).toContain("pull --yes --non-interactive --environment=production");
			expect(calls).toContain("env pull");
			expect(calls.includes("vcr login docker")).toBe(vcrLogin);
			expect(existsSync(join(f.root, ".vercel/.env.production.local"))).toBe(false);
		}
	});

	test("fails closed and cleans up when env pull omits the OIDC token", async () => {
		const f = fixture("OTHER=value", false);
		const process = await runAction(f);
		expect(await process.exited).not.toBe(0);
		expect(existsSync(f.githubEnv)).toBe(false);
		const leftovers = await Array.fromAsync(new Bun.Glob("vercel-env.*").scan(f.root));
		expect(leftovers).toEqual([]);
	});
});
