#!/usr/bin/env bun
// `fetch-profiles` — a non-build dev tool that vendors the upstream PTS profile definitions the
// Metric Catalog generator reads (see docs/pts-catalog-and-analysis-design.md §3.1). It writes
// `test-definition.xml` + `results-definition.xml` for each pinned `<name>-<ver>` into
// `src/pts-profiles/`, co-located with the catalog so the vendored file IS the version pin.
//
// This is NOT part of the build: nothing imports it, `typecheck`/`test` never run it, and the
// generator only ever reads the committed local copies. Re-run it by hand to vendor a new profile
// or re-pull an existing one (`bun run fetch-profiles`). It is idempotent: every run overwrites the
// vendored copies in place from the pinned upstream blobs, so re-running against unchanged upstream
// leaves git clean.
//
// Two distinct repos, do not conflate (design doc §3.1): the XML is fetched from
// `phoronix-test-suite/test-profiles` under `pts/`; the catalog's `sourceUrl` provenance points at
// the *other* repo (`phoronix-test-suite/phoronix-test-suite`, `ob-cache/test-profiles/pts/...`),
// which 404s here. The GitHub Contents API truncates `pts/` (thousands of entries), so we read a
// single profile dir via the git-trees API and pull each definition by its exact blob SHA — both
// through Octokit rather than hand-built REST calls, so responses stay typed against the GitHub
// OpenAPI schema.
import { join } from "node:path";
import { Octokit } from "@octokit/rest";

// Upstream repo and the profile dirs we vendor, pinned by exact `<name>-<ver>` — the suites we run
// (node-web-tooling-1.0.1, c-ray-2.0.0). Version suffixes are mandatory and non-uniform upstream, so
// the dir name is the pin; add a profile by appending its versioned dir here.
const OWNER = "phoronix-test-suite";
const REPO = "test-profiles";
const REF = "master";
const PROFILES = ["node-web-tooling-1.0.1", "c-ray-2.0.0"] as const;

// Only these definition files feed the generator; siblings (downloads.xml, install.sh) are ignored.
const VENDORED_FILES = ["test-definition.xml", "results-definition.xml"] as const;

const OUT_DIR = join(import.meta.dir, "..", "src", "pts-profiles");

// Optional auth lifts the unauthenticated rate limit; the script still works without it for the
// handful of blobs we pull. Read via `Bun.env` so a re-run under a token "just works", no code edit.
const octokit = new Octokit({ auth: Bun.env.GITHUB_TOKEN });

// Map each blob file name in a profile dir to its content SHA. Listing via the git-trees API
// sidesteps Contents-API truncation and fails loudly (Octokit throws on 404) if a pinned profile is
// gone. Each entry carries its blob SHA, so this one response also pins exactly which content we
// later fetch.
async function listProfileBlobs(profile: string): Promise<Map<string, string>> {
	const { data } = await octokit.rest.git.getTree({
		owner: OWNER,
		repo: REPO,
		tree_sha: `${REF}:pts/${profile}`,
	});
	return new Map(
		data.tree.flatMap((entry) =>
			entry.type === "blob" && entry.path && entry.sha ? [[entry.path, entry.sha]] : [],
		),
	);
}

// Fetch one blob by SHA and decode it to text. getBlob returns base64-encoded content; assert the
// encoding instead of trusting it blindly, so an upstream API change can't silently vendor garbage.
async function fetchBlobText(file_sha: string): Promise<string> {
	const { data } = await octokit.rest.git.getBlob({ owner: OWNER, repo: REPO, file_sha });
	if (data.encoding !== "base64") {
		throw new Error(`blob ${file_sha} -> unexpected encoding ${data.encoding}`);
	}
	return Buffer.from(data.content, "base64").toString("utf8");
}

async function vendorProfile(profile: string): Promise<void> {
	const blobs = await listProfileBlobs(profile);
	for (const file of VENDORED_FILES) {
		const sha = blobs.get(file);
		if (!sha) {
			// node-web-tooling/c-ray both ship both files; warn rather than abort so a profile missing an
			// optional results-definition.xml still vendors its test-definition.xml.
			console.warn(`! ${profile}/${file} not found upstream, skipping`);
			continue;
		}
		// Bun.write creates parent dirs and overwrites in place — no mkdir + writeFile dance needed.
		await Bun.write(join(OUT_DIR, profile, file), await fetchBlobText(sha));
		console.log(`✓ ${profile}/${file}`);
	}
}

if (import.meta.main) {
	for (const profile of PROFILES) await vendorProfile(profile);
}
