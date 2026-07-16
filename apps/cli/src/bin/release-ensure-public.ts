#!/usr/bin/env bun
// `release-ensure-public` — the script behind the `ensure-package-public` composite action. Fails fast
// (with rich @actions/core annotations) if the candidate base package is not public. e2b builds its
// template on E2B's REMOTE builder (FROM the ghcr candidate base) and daytona/modal/novita pull it to
// snapshot/boot — none are handed ghcr pull credentials, so the candidate package MUST be public. GHCR
// packages are created PRIVATE on first push with no API to flip visibility, so making it public is a
// one-time manual bootstrap; this guard surfaces that plainly instead of an opaque provider pull error.
//
// Inputs arrive as env (the composite maps its `with:` inputs). Uses Bun's fetch + a real JSON parse
// (not a curl+grep), and core.setFailed/warning so the outcome renders as a run annotation.
import * as core from "@actions/core";

const owner = process.env.OWNER?.trim() ?? "";
const pkg = process.env.PACKAGE?.trim() ?? "";
const token = process.env.GH_TOKEN?.trim() ?? "";

// Refuse to run on a missing input rather than probing a malformed URL. With an empty OWNER/PACKAGE the
// URL degenerates to `…/orgs//packages/container/`, which the API answers 404 — and 404 is the one
// status this gate treats as a WARNING (the package legitimately may not exist yet). So a typo'd or
// unwired composite input would make a SECURITY GATE pass silently while checking nothing at all.
const inputs: Array<[name: string, value: string]> = [
	["OWNER", owner],
	["PACKAGE", pkg],
	["GH_TOKEN", token],
];
const missing = inputs.filter(([, value]) => value.length === 0).map(([name]) => name);
if (missing.length > 0) {
	core.setFailed(
		`release-ensure-public: missing required input(s): ${missing.join(", ")}. Refusing to run — an empty input would probe a malformed URL, 404, and let the public-package gate pass without checking anything.`,
	);
	process.exit(1);
}

const label = `${owner}/${pkg}`;
const api = `https://api.github.com/orgs/${owner}/packages/container/${encodeURIComponent(pkg)}`;

await core.group(`Ensure GHCR package ${label} is public`, async () => {
	let res: Response;
	try {
		// Distinguish a real transport failure (throws) from an HTTP status (a 404/403 does NOT throw) —
		// the whole point of the guard is not to publish blind on a swallowed error.
		res = await fetch(api, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "sandbox-benchmarks-release",
			},
			signal: AbortSignal.timeout(30_000),
		});
	} catch (err) {
		core.setFailed(
			`Could not reach the GHCR package API (network/transport error) — refusing to publish blind: ${err instanceof Error ? err.message : String(err)}`,
		);
		return;
	}

	if (res.status === 200) {
		const body = (await res.json().catch(() => ({}))) as { visibility?: string };
		if (body.visibility === "public") {
			core.info(`GHCR package ${label} is public — providers can pull the candidate.`);
		} else {
			core.error(
				`GHCR package ${label} is ${body.visibility ?? "not public"}. e2b/daytona/modal/novita pull the candidate base anonymously, so set it Public once (org package settings or link it to this repo), then re-run.`,
				{ title: "GHCR candidate package is not public" },
			);
			core.setFailed(`GHCR package ${label} is not public.`);
		}
	} else if (res.status === 404) {
		core.warning(
			`GHCR package ${label} not found yet — the build below creates it PRIVATE. After this run, set it Public once so the candidate validate and the providers can pull it; this run's bake will fail until then.`,
			{ title: "GHCR candidate package not found yet" },
		);
	} else {
		core.setFailed(
			`GHCR package API returned HTTP ${res.status} (expected 200 or 404) — likely a token-scope gap or org SSO enforcement, not a missing package. Resolve and re-run instead of publishing blind.`,
		);
	}
});
