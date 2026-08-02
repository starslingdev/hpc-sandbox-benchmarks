// The VCR namespace is resolved once, at config module load, from the environment. `config` freezes
// at import time, so these run the resolution in a FRESH subprocess per case — the same mechanism CI
// uses (`bun -e 'import { config } …'` inside the toolchain workflow's mirror step), rather than a
// mutate-and-reimport trick that would prove nothing about the real entrypoint.
import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
	VERCEL_PROJECT_NAME_DEFAULT,
	VERCEL_TEAM_SLUG_DEFAULT,
	VERCEL_VCR_REPOSITORY,
} from "@sandbox-benchmarks/schema";

const CONFIG_PATH = join(import.meta.dir, "..", "config.ts");
const NAMESPACE_KEYS = ["VERCEL_TEAM_SLUG", "VERCEL_PROJECT_NAME"] as const;

const PROBE = `const { config } = await import(${JSON.stringify(CONFIG_PATH)});
console.log(JSON.stringify({
  teamSlug: config.vercelTeamSlug,
  projectName: config.vercelProjectName,
  image: config.vercelImage,
}));`;

interface Resolved {
	teamSlug: string;
	projectName: string;
	image: string;
}

/** Load config in a clean subprocess. Keys mapped to `null` are unset rather than blanked. */
async function resolveNamespace(
	overrides: Partial<Record<(typeof NAMESPACE_KEYS)[number], string | null>> = {},
): Promise<{ exitCode: number; stderr: string; resolved?: Resolved }> {
	// Start from the ambient environment minus the namespace keys, so a developer who exports either
	// one in their shell can't make the default-path cases pass or fail spuriously.
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined && !NAMESPACE_KEYS.includes(key as (typeof NAMESPACE_KEYS)[number])) {
			env[key] = value;
		}
	}
	for (const [key, value] of Object.entries(overrides)) {
		if (value !== null) env[key] = value;
	}
	const proc = Bun.spawn(["bun", "-e", PROBE], { env, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return {
		exitCode,
		stderr,
		resolved: exitCode === 0 ? (JSON.parse(stdout) as Resolved) : undefined,
	};
}

// `describe.concurrent` because each case is one `bun -e` boot whose cost is almost entirely loading
// config.ts's module graph; the resolution being probed is a handful of string checks. The six probes
// differ only in environment and share nothing, so overlapping them turns six serial module loads into
// one batch. The runner's own construct, rather than launching at collection time and awaiting later:
// `resolveNamespace` does `JSON.parse(stdout)` inside the promise, so a hoisted rejection would be
// reported against whichever test happened to be running, and hoisting spawns all six even under
// `bun test -t`.
describe.concurrent("Vercel VCR namespace resolution", () => {
	it("falls back to the schema defaults when neither override is set", async () => {
		const { exitCode, resolved } = await resolveNamespace({
			VERCEL_TEAM_SLUG: null,
			VERCEL_PROJECT_NAME: null,
		});
		expect(exitCode).toBe(0);
		expect(resolved?.teamSlug).toBe(VERCEL_TEAM_SLUG_DEFAULT);
		expect(resolved?.projectName).toBe(VERCEL_PROJECT_NAME_DEFAULT);
		expect(resolved?.image).toContain(
			`vcr.vercel.com/${VERCEL_TEAM_SLUG_DEFAULT}/${VERCEL_PROJECT_NAME_DEFAULT}/${VERCEL_VCR_REPOSITORY}`,
		);
	});

	it("keeps the project name paired with this repository's name", async () => {
		// The Vercel project is created to match the GitHub repository so the VCR path is guessable from
		// the repo alone. A rename on either side should be a deliberate edit, not a silent drift.
		expect(VERCEL_PROJECT_NAME_DEFAULT).toBe("hpc-sandbox-benchmarks");
	});

	it("roots the namespace at the configured team and project", async () => {
		const { exitCode, resolved } = await resolveNamespace({
			VERCEL_TEAM_SLUG: "other-team",
			VERCEL_PROJECT_NAME: "other-project",
		});
		expect(exitCode).toBe(0);
		expect(resolved?.teamSlug).toBe("other-team");
		expect(resolved?.projectName).toBe("other-project");
		expect(resolved?.image).toContain(
			`vcr.vercel.com/other-team/other-project/${VERCEL_VCR_REPOSITORY}`,
		);
	});

	it("treats an unconfigured CI variable (set-but-empty) as unset", async () => {
		// `VERCEL_TEAM_SLUG: ${{ vars.VERCEL_TEAM_SLUG }}` materializes as "" when the variable does not
		// exist. That must take the default path, not crash config load — a throw here would break every
		// provider's job at import time, not just Vercel's.
		const { exitCode, resolved } = await resolveNamespace({
			VERCEL_TEAM_SLUG: "",
			VERCEL_PROJECT_NAME: "",
		});
		expect(exitCode).toBe(0);
		expect(resolved?.teamSlug).toBe(VERCEL_TEAM_SLUG_DEFAULT);
		expect(resolved?.projectName).toBe(VERCEL_PROJECT_NAME_DEFAULT);
	});

	it("rejects the API-ID forms so they can never become registry path segments", async () => {
		// VERCEL_ORG_ID / VERCEL_PROJECT_ID carry team_*/prj_* and are what `vercel pull` links with.
		// Pasting either into the namespace vars is the obvious mix-up; fail loudly at load.
		const [team, project] = await Promise.all([
			resolveNamespace({ VERCEL_TEAM_SLUG: "team_abc123" }),
			resolveNamespace({ VERCEL_PROJECT_NAME: "prj_abc123" }),
		]);
		for (const { exitCode, stderr } of [team, project]) {
			expect(exitCode).not.toBe(0);
			expect(stderr).toContain("never an API ID");
		}
	});

	it("rejects a namespace value that would escape the repository path", async () => {
		const { exitCode, stderr } = await resolveNamespace({
			VERCEL_PROJECT_NAME: "../other-project",
		});
		expect(exitCode).not.toBe(0);
		expect(stderr).toContain("canonical lowercase name");
	});
});
