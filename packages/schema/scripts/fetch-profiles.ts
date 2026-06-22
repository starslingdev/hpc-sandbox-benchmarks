#!/usr/bin/env bun
// `fetch-profiles` — a non-build dev tool that vendors the upstream PTS profile definitions the
// Metric Catalog generator reads (see docs/pts-catalog-and-analysis-design.md §3.1). It writes
// `test-definition.xml` + `results-definition.xml` for each pinned `<name>-<ver>` into
// `src/pts-profiles/`, co-located with the catalog so the vendored file IS the version pin.
//
// This is NOT part of the build: nothing imports it, `typecheck`/`test` never run it, and the
// generator only ever reads the committed local copies. Re-run it by hand to vendor a new profile
// or re-pull an existing one (`bun run fetch-profiles`).
//
// Two distinct repos, do not conflate (design doc §3.1): the XML is fetched from the raw base of
// `phoronix-test-suite/test-profiles` under `pts/`; the catalog's `sourceUrl` provenance points at
// the *other* repo (`phoronix-test-suite/phoronix-test-suite`, `ob-cache/test-profiles/pts/...`),
// which 404s here. The GitHub Contents API truncates `pts/` (thousands of entries), so we list a
// single profile dir via the git-trees API and fetch each definition by exact-version raw URL.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Upstream repo and the profile dirs we vendor, pinned by exact `<name>-<ver>` — the suites we run
// (node-web-tooling-1.0.1, c-ray-2.0.0). Version suffixes are mandatory and non-uniform upstream, so
// the dir name is the pin; add a profile by appending its versioned dir here.
const REPO = "phoronix-test-suite/test-profiles";
const REF = "master";
const PROFILES = ["node-web-tooling-1.0.1", "c-ray-2.0.0"] as const;

// Only these definition files feed the generator; siblings (downloads.xml, install.sh) are ignored.
const VENDORED_FILES = ["test-definition.xml", "results-definition.xml"] as const;

const OUT_DIR = join(import.meta.dir, "..", "src", "pts-profiles");

const treesApi = (path: string) =>
	`https://api.github.com/repos/${REPO}/git/trees/${REF}:pts/${path}`;
const rawUrl = (path: string) => `https://raw.githubusercontent.com/${REPO}/${REF}/pts/${path}`;

interface TreeResponse {
	tree?: { path: string; type: string }[];
}

async function fetchText(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
	return res.text();
}

// List the profile dir via the git-trees API (sidesteps Contents-API truncation), so we only fetch
// definition files that actually exist for this version and fail loudly if a pinned profile is gone.
async function listProfileFiles(profile: string): Promise<Set<string>> {
	const res = await fetch(treesApi(profile));
	if (!res.ok) throw new Error(`list ${profile} -> ${res.status} ${res.statusText}`);
	const body = (await res.json()) as TreeResponse;
	return new Set((body.tree ?? []).filter((e) => e.type === "blob").map((e) => e.path));
}

async function vendorProfile(profile: string): Promise<void> {
	const present = await listProfileFiles(profile);
	for (const file of VENDORED_FILES) {
		if (!present.has(file)) {
			// node-web-tooling/c-ray both ship both files; warn rather than abort so a profile missing an
			// optional results-definition.xml still vendors its test-definition.xml.
			console.warn(`! ${profile}/${file} not found upstream, skipping`);
			continue;
		}
		const xml = await fetchText(rawUrl(`${profile}/${file}`));
		const dest = join(OUT_DIR, profile, file);
		await mkdir(dirname(dest), { recursive: true });
		await writeFile(dest, xml);
		console.log(`✓ ${profile}/${file}`);
	}
}

if (import.meta.main) {
	for (const profile of PROFILES) await vendorProfile(profile);
}
