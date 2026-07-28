// Drift gate: the PTS build/runtime apt dependencies are needed in THREE places — the toolchain
// bake (packages/templates/images/base/scripts/00-apt.sh), the stock-image fallback (lib/bench.sh
// ensure_pts), and the per-run refresh (packages/harness setup.ts). Comment-only alignment drifted
// twice for real: fast-cli's Chrome libs were missing from the runtime refresh (run 29587815350 —
// zero fast-cli metrics on modal), and pkg-config was missing everywhere, so PostgreSQL 17's ICU
// discovery failed and every image since #144 shipped pgbench as a launcher-only half-install with
// zero metrics ever recorded.
//
// The runtime refresh now interpolates the canonical PTS_APT_DEPS from the schema toolchain
// contract, so its alignment holds by construction (a wiring tripwire below keeps it honest). The
// two shell consumers cannot import TS, so like the profile-pins gate they are read as text and
// flattened — line-anchored extraction, deliberately not shell parsing.
//
// SUBSET assertion, deliberately not equality: the lists legitimately differ (ensure_pts omits the
// fonts/GTK block, and 00-apt.sh alone carries image plumbing like curl/ca-certificates). What
// must never drift is the core PTS build-dep set below — the packages the source-built profiles
// need at compile time plus PTS's own php runtime.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PTS_APT_DEPS } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();

/** The bench helpers, facade first: `lib/bench.sh` plus every module it sources. */
function benchHelperPaths(): string[] {
	let modules: string[] = [];
	try {
		modules = readdirSync(join(root, "lib", "bench"))
			.filter((f) => f.endsWith(".sh"))
			.sort()
			.map((f) => `lib/bench/${f}`);
	} catch {
		// Pre-split layout, or a checkout without the modules — the facade alone is then the source.
	}
	return ["lib/bench.sh", ...modules];
}

// The invariant: every member must appear in all three apt lists. php for PTS itself, the compiler
// toolchain for the source-built profiles, libaio-dev (fio's Linux AIO engine), libicu-dev +
// pkg-config (postgres 17's ICU discovery via PKG_CHECK_MODULES), tcl (sqlite's opcode generator).
const CORE_PTS_BUILD_DEPS = [
	"php-cli",
	"php-xml",
	"build-essential",
	"autoconf",
	"flex",
	"bison",
	"bc",
	"libelf-dev",
	"libssl-dev",
	"libaio-dev",
	"libicu-dev",
	"pkg-config",
	"tcl",
];

/**
 * Flatten the `\`-continued shell command starting at the first line matching `start` into its
 * whitespace-separated tokens. Command words and flags ride along harmlessly — no core dep collides
 * with `apt-get`/`install`/`-y`-style tokens, and a subset check ignores extras by construction.
 */
function shellInstallTokens(path: string, start: RegExp): string[] {
	return tokensFromLines(readFileSync(join(root, path), "utf8").split("\n"), start, path);
}

/**
 * The same scan across several candidate files, for a helper set that is split across modules.
 *
 * The check is about a COMMAND existing somewhere in the bench helpers, not about which file holds
 * it — pinning it to one path is how a refactor that moves the install line turns a real alignment
 * gate into a "no line matches" crash.
 */
function shellInstallTokensAcross(
	paths: readonly string[],
	start: RegExp,
	label: string,
): string[] {
	for (const path of paths) {
		let lines: string[];
		try {
			lines = readFileSync(join(root, path), "utf8").split("\n");
		} catch {
			continue;
		}
		if (lines.some((line) => start.test(line))) return tokensFromLines(lines, start, path);
	}
	throw new Error(`${label}: no line matches ${start} in any of ${paths.join(", ")}`);
}

function tokensFromLines(lines: string[], start: RegExp, path: string): string[] {
	const index = lines.findIndex((line) => start.test(line));
	if (index === -1) throw new Error(`${path}: no line matches ${start}`);
	const collected: string[] = [];
	for (let i = index; i < lines.length; i++) {
		const line = lines[i] as string;
		const continued = /\\\s*$/.test(line);
		collected.push(line.replace(/\\\s*$/, ""));
		if (!continued) break;
	}
	return collected.join(" ").split(/\s+/).filter(Boolean);
}

const sources: { path: string; tokens: () => string[] }[] = [
	{
		path: "packages/templates/images/base/scripts/00-apt.sh",
		tokens: (): string[] =>
			shellInstallTokens(
				"packages/templates/images/base/scripts/00-apt.sh",
				/^apt-get install -y --no-install-recommends/,
			),
	},
	{
		path: "lib/bench.sh + lib/bench/*.sh",
		tokens: (): string[] =>
			shellInstallTokensAcross(benchHelperPaths(), /apt-get install -y -qq /, "bench helpers"),
	},
	{
		// The canonical constant itself, imported — not re-parsed from source. The runtime refresh
		// interpolates this exact value, so checking it here covers setup.ts by construction.
		path: "packages/schema/src/toolchain.ts (PTS_APT_DEPS)",
		tokens: (): string[] => PTS_APT_DEPS.split(/\s+/).filter(Boolean),
	},
];

describe("PTS apt dep alignment", () => {
	for (const source of sources) {
		it(`keeps every core PTS build dep in ${source.path}`, () => {
			const tokens = source.tokens();
			expect(tokens.length).toBeGreaterThan(0);
			// Reported as `<pkg> missing from <path>` so a red run names the drift directly.
			const missing = CORE_PTS_BUILD_DEPS.filter((dep) => !tokens.includes(dep));
			expect(missing.map((dep) => `${dep} missing from ${source.path}`)).toEqual([]);
		});
	}

	// The by-construction claim holds only while setup.ts actually interpolates the constant — a
	// re-inlined literal would pass the subset check against the constant while drifting in the
	// sandbox. Cheap text tripwire, same spirit as the shell extraction above.
	it("keeps the runtime refresh wired to the canonical PTS_APT_DEPS constant", () => {
		const text = readFileSync(join(root, "packages/harness/src/lib/setup.ts"), "utf8");
		expect(text).toContain(`\${PTS_APT_DEPS}`);
	});
});
