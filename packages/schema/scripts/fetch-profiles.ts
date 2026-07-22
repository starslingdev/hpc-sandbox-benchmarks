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
// (e.g. node-web-tooling-1.0.1). Version suffixes are mandatory and non-uniform upstream, so
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
	// per scenario via PRESET_OPTIONS (added by the fio producer-tasks slice; unrun combinations simply
	// never receive samples). Each
	// combination emits TWO <Result>s under one <Description> (bandwidth MB/s + IOPS), disambiguated by
	// the generator's `pts.scale` pins and proven by a recorded composite golden fixture.
	"fio-2.1.0",
	// Network dimension — single-result (sys.time monitor, no <Option> matrix), so it generates one
	// description-less wildcard entry (zero byte-match risk). 1.0.3 carries the repo's deterministic
	// netcat-openbsd runner override (install.sh) — the upstream dd|nc runner races its listener.
	// Retained for manual runs; the network SUITE now measures the localhost stack via iperf below.
	"network-loopback-1.0.3",
	// Network dimension — a real Internet transfer through Netflix's fast.com CDN. The profile emits
	// download/upload throughput plus idle/loaded latency from fast-cli's JSON output. Retained for
	// manual runs; the network SUITE now measures WAN throughput via local/iperf-wan (run 29937467891:
	// the Chrome-driven fast.com measurement was structurally unreliable on fast datacenter paths).
	"fast-cli-1.0.0",
	// Network dimension — iperf3 driven as a client against a runner-local server. The vendored copy
	// is a deliberate LOCALHOST SUBSET of upstream (see IPERF_LOCALHOST_TEST_SETTINGS below): the
	// free-text server-address/port axes become pinned single-entry menus (the catalog synthesizer
	// cannot enumerate free text, and the pinned menus make the localhost topology part of the metric
	// identity) and the duration/test/parallel menus are trimmed to the two combinations the network
	// suite runs (TCP 10s, -P 1 and -P 10).
	"iperf-1.2.0",
	// System dimension — PostgreSQL via its integrated pgbench, fully in-sandbox (the profile builds
	// postgres 17.0 and runs server + client locally, so every provider measures the same topology).
	// The producer pins one (Scaling Factor, Clients) point per mode via PRESET_OPTIONS; two parsers
	// per combination (TPS + Average Latency, distinct descriptions), proven by a recorded fixture.
	// 1.15.0 is the newest pgbench profile published upstream at REF.
	"pgbench-1.15.0",
	// System dimension — common Git operations over a fixed GTK repository checkout. Kept alongside
	// the realworld repo clones: this synthetic profile isolates Git itself and is short enough to run
	// in the system matrix cell.
	"git-1.1.0",
] as const;

// These short profiles intentionally use two trials in the benchmark matrix. Keep that local
// runtime policy in the vendoring tool itself so a refresh remains byte-for-byte idempotent instead
// of silently restoring upstream's three-trial default. Longer profiles retain their upstream count.
const TWO_TRIAL_PROFILES = new Set([
	"node-web-tooling-1.0.1",
	"pybench-1.1.3",
	"sqlite-speedtest-1.0.1",
	"fast-cli-1.0.0",
	"iperf-1.2.0",
	"git-1.1.0",
]);

// The pinned <TestSettings> block for the vendored iperf localhost subset. Kept in the vendoring
// tool (like the TimesToRun patch) so a refresh stays byte-for-byte idempotent instead of silently
// restoring upstream's free-text server axes and full duration/test/parallel matrix. Every entry
// carries an explicit <Value> (the catalog parser requires one; " " is the pgbench precedent for a
// no-argument entry).
const IPERF_LOCALHOST_TEST_SETTINGS = `  <TestSettings>
    <Default>
      <PostArguments>-V -f m </PostArguments>
    </Default>
    <Option>
      <DisplayName>Server Address</DisplayName>
      <Identifier>server-address</Identifier>
      <ArgumentPrefix>-c </ArgumentPrefix>
      <Menu>
        <Entry>
          <Name>localhost</Name>
          <Value>localhost</Value>
        </Entry>
      </Menu>
    </Option>
    <Option>
      <DisplayName>Server Port</DisplayName>
      <Identifier>positive-number</Identifier>
      <ArgumentPrefix>-p </ArgumentPrefix>
      <Menu>
        <Entry>
          <Name>5201</Name>
          <Value>5201</Value>
        </Entry>
      </Menu>
    </Option>
    <Option>
      <DisplayName>Duration</DisplayName>
      <Identifier>duration</Identifier>
      <ArgumentPrefix>-t </ArgumentPrefix>
      <Menu>
        <Entry>
          <Name>10 Seconds</Name>
          <Value>10</Value>
        </Entry>
      </Menu>
    </Option>
    <Option>
      <DisplayName>Test</DisplayName>
      <Identifier>test</Identifier>
      <Menu>
        <Entry>
          <Name>TCP</Name>
          <Value> </Value>
        </Entry>
      </Menu>
    </Option>
    <Option>
      <DisplayName>Parallel</DisplayName>
      <Identifier>parallel</Identifier>
      <ArgumentPrefix>-P </ArgumentPrefix>
      <Menu>
        <Entry>
          <Name>1</Name>
          <Value>1</Value>
        </Entry>
        <Entry>
          <Name>10</Name>
          <Value>10</Value>
        </Entry>
      </Menu>
    </Option>
  </TestSettings>`;

// Vendored-subset description: upstream's "requires you have access to an iperf server" is wrong for
// the self-hosted localhost runner, and the Description feeds the catalog verbatim.
const IPERF_LOCALHOST_DESCRIPTION =
	"iPerf is a network bandwidth throughput testing software. This vendored subset benchmarks the " +
	"sandbox's own network stack: the profile's runner starts a local iperf3 server and the client " +
	"measures TCP throughput over localhost, so the result isolates virtualization/network-stack " +
	"overhead from Internet weather.";

/**
 * Rewrite upstream iperf-1.2.0 into the repo's localhost subset (see the PROFILES entry). Applied
 * after the TimesToRun patch; each replacement is anchored so a silent upstream reshape fails loudly
 * here rather than vendoring a half-patched profile.
 */
function patchIperfLocalhostSubset(contents: string): string {
	const patched = contents
		.replace(/<Description>[\s\S]*?<\/Description>/, () => {
			return `<Description>${IPERF_LOCALHOST_DESCRIPTION}</Description>`;
		})
		// The self-hosted runner makes upstream's "ensure you have a server running" prompt noise.
		.replace(/\n\s*<PreInstallMessage>[\s\S]*?<\/PreInstallMessage>/, "")
		.replace(/ {2}<TestSettings>[\s\S]*?<\/TestSettings>/, () => IPERF_LOCALHOST_TEST_SETTINGS);
	for (const marker of [IPERF_LOCALHOST_DESCRIPTION, "<Name>10 Seconds</Name>"]) {
		if (!patched.includes(marker)) {
			throw new Error(`iperf-1.2.0 subset patch did not land (missing ${JSON.stringify(marker)})`);
		}
	}
	if (patched.includes("PreInstallMessage")) {
		throw new Error("iperf-1.2.0 subset patch left the PreInstallMessage behind");
	}
	return patched;
}

// Repo-local test-definition transforms beyond the TimesToRun patch, keyed by profile.
const TEST_DEFINITION_PATCHES: Record<string, (contents: string) => string> = {
	"iperf-1.2.0": patchIperfLocalhostSubset,
};

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
			let contents = await fetchBlobText(sha);
			if (name === "test-definition.xml" && TWO_TRIAL_PROFILES.has(profile)) {
				contents = contents.replace(/<TimesToRun>\d+<\/TimesToRun>/, "<TimesToRun>2</TimesToRun>");
			}
			if (name === "test-definition.xml") {
				contents = TEST_DEFINITION_PATCHES[profile]?.(contents) ?? contents;
			}
			await Bun.write(`${OUT_DIR}/${profile}/${name}`, contents);
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
