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
//
// The dir name pins the profile *version*; `REF` pins the exact upstream *commit* the definitions
// are vendored from — a fixed revision, never a moving branch — so every run reproduces
// byte-identical output and the source is auditable. Blobs are read under that commit and pulled by
// their per-file SHAs. Bump `REF` and re-run to vendor an updated upstream.
import { Octokit } from "@octokit/rest";

// Upstream repo and the profile dirs we vendor, pinned by exact `<name>-<ver>` — the suites we run
// (node-web-tooling-1.0.1, c-ray-2.0.0). Version suffixes are mandatory and non-uniform upstream, so
// the dir name is the pin; add a profile by appending its versioned dir here.
const OWNER = "phoronix-test-suite";
const REPO = "test-profiles";
// The exact upstream commit we vendor from — a fixed revision, not a moving branch, so the same
// `REF` always yields the same blobs (reproducible vendoring). To update, bump this to a newer
// `phoronix-test-suite/test-profiles` commit SHA and re-run. Latest on master:
//   gh api repos/phoronix-test-suite/test-profiles/commits/master --jq .sha
const REF = "d2f1a150d388bd062737b445891edda0780f7e25";
const PROFILES = [
	"node-web-tooling-1.0.1",
	"c-ray-2.0.0",
	// System dimension — both single-result (no <Option> matrix), so each generates a description-less
	// wildcard entry (zero byte-match risk).
	"pybench-1.1.3",
	"sqlite-speedtest-1.0.1",
	// Memory dimension — STREAM is a multi-result option matrix (Type: Copy/Scale/Add/Triad). The
	// synthesized pts.description strings are byte-match-proven by a recorded composite golden fixture
	// (sourced from runner-benchmarking's stream-1.3.5 run; versionless join is `pts/stream` either way).
	"stream-1.3.4",
	// Disk dimension — fio's option matrix (Type × Engine × Direct × Block Size × Job Count × Disk
	// Target) is fully enumerated into the catalog; the disk suite's producer tasks pin one combination
	// per scenario via PRESET_OPTIONS (unrun combinations simply never receive samples). Each
	// combination emits TWO <Result>s under one <Description> (bandwidth MB/s + IOPS), disambiguated by
	// the generator's `pts.scale` pins and proven by a recorded composite golden fixture.
	"fio-2.1.0",
	// Network dimension — single-result (sys.time monitor, no <Option> matrix), so it generates one
	// description-less wildcard entry (zero byte-match risk).
	"network-loopback-1.0.1",
	// Cpu dimension — Zstd compression across its Compression Level matrix; two parsers per level
	// (Compression/Decompression Speed via AppendToArgumentsDescription), byte-match-proven by a
	// recorded composite golden fixture.
	"compress-zstd-1.6.0",
] as const;

// Only these definition files feed the generator; siblings (downloads.xml, install.sh) are ignored.
// `required` distinguishes the essential `test-definition.xml` (a missing one is a hard failure, not
// a warn-and-skip that would look like success) from the optional `results-definition.xml`.
const VENDORED_FILES = [
	{ name: "test-definition.xml", required: true },
	{ name: "results-definition.xml", required: false },
] as const;

// Bun normalizes the `..` and forward slashes here (every platform, Windows included) when this
// reaches `Bun.write`, so a plain template literal needs no `node:path` join.
const OUT_DIR = `${import.meta.dir}/../src/pts-profiles`;

// Optional auth lifts the unauthenticated rate limit; the script still works without it for the
// handful of blobs we pull. Read via `Bun.env` so a re-run under a token "just works", no code edit.
const octokit = new Octokit({ auth: Bun.env.GITHUB_TOKEN });

// Map each blob file name in a profile dir to its content SHA, reading the dir under the pinned
// commit `commitSha`. Listing via the git-trees API sidesteps Contents-API truncation and fails loudly
// (Octokit throws on 404) if a pinned profile is gone. A profile dir is tiny, but the trees API can
// still set `truncated`, so we reject a partial response rather than vendor an incomplete dir. Each
// entry carries its blob SHA, so this one response also pins exactly which content we later fetch.
async function listProfileBlobs(commitSha: string, profile: string): Promise<Map<string, string>> {
	const { data } = await octokit.rest.git.getTree({
		owner: OWNER,
		repo: REPO,
		tree_sha: `${commitSha}:pts/${profile}`,
	});
	if (data.truncated) {
		throw new Error(`tree for pts/${profile} was truncated; refusing to vendor a partial dir`);
	}
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

async function vendorProfile(commitSha: string, profile: string): Promise<void> {
	const blobs = await listProfileBlobs(commitSha, profile);
	// Fetch + write this profile's definitions concurrently — they're independent I/O-bound GitHub
	// calls. A rejected required-file fetch propagates out of Promise.all to the top-level boundary.
	await Promise.all(
		VENDORED_FILES.map(async ({ name, required }) => {
			const sha = blobs.get(name);
			if (!sha) {
				if (required) {
					// A missing essential definition must abort: warn-and-skip here would exit 0 and read as
					// success while silently vendoring nothing the generator can use.
					throw new Error(`${profile}/${name} is required but was not found upstream`);
				}
				// Optional sibling (e.g. results-definition.xml): warn rather than abort so a profile that
				// ships only its test-definition.xml still vendors cleanly.
				console.warn(`! ${profile}/${name} not found upstream, skipping`);
				return;
			}
			// Bun.write creates parent dirs, normalizes the path, and overwrites in place — no node:path
			// join or mkdir + writeFile dance needed.
			await Bun.write(`${OUT_DIR}/${profile}/${name}`, await fetchBlobText(sha));
			console.log(`✓ ${profile}/${name}`);
		}),
	);
}

if (import.meta.main) {
	try {
		console.log(`pinned ${OWNER}/${REPO}@${REF}`);
		// Fan out across all profiles too — the whole vendor is one big batch of independent API reads.
		await Promise.all(PROFILES.map((profile) => vendorProfile(REF, profile)));
	} catch (err) {
		console.error(`fetch-profiles failed: ${err instanceof Error ? err.message : err}`);
		process.exit(1);
	}
}
