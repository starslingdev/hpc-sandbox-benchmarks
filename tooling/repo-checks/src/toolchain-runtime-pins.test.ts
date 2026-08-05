// Drift gate: the runtime toolchain versions exist in TWO places — the bake pins
// (packages/templates/src/lib/pins.ts, rendered into the image's mise.toml) and the harness's
// stock-image fallback constants (packages/harness/src/lib/setup.ts). Comment-only alignment, and it
// drifted for real: #243 refreshed the pins (node 22.22.3 → 22.23.1, pnpm 10.34.3 → 10.34.5, mise
// 2026.5.16 → 2026.7.11) and left setup.ts behind for two weeks.
//
// Why that is worse than a cosmetic mismatch: every check in setup.ts is EXACT, so a stale constant
// makes the baked toolchain MISS on every provider and every sandbox. The fallback then downloads the
// stale node and rewrites the image's own /etc/mise/config.toml to point at it, and the four
// setupNode suites measure a runtime-fetched toolchain rather than the pinned one — silently,
// wherever the sandbox user is root. Where it is not (runloop), the write is denied and the step
// dies, which is how a repo-wide measurement bug surfaced as one provider looking flaky.
//
// The harness deliberately does NOT import the templates package (it stays decoupled from the bake),
// so the coupling cannot hold by construction the way PTS_APT_DEPS does — this gate is the
// replacement for that. Both sides are read as TEXT and extracted line-anchored, following
// pts-profile-pins: parsing pins.ts as a module would drag a workspace dependency into repo-checks
// for a handful of strings.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();
const setupSource = readFileSync(join(root, "packages/harness/src/lib/setup.ts"), "utf8");
const pinsSource = readFileSync(join(root, "packages/templates/src/lib/pins.ts"), "utf8");

function extract(source: string, label: string, pattern: RegExp, name: string): string {
	const match = source.match(pattern);
	if (!match?.[1]) {
		throw new Error(
			`${label} no longer declares ${name} in the shape this gate extracts; it is read as text, ` +
				"so update the extraction alongside the rename rather than deleting the assertion",
		);
	}
	return match[1];
}

/** `const <name> = "<value>";` at the top level of setup.ts. */
function harnessConstant(name: string): string {
	return extract(
		setupSource,
		"packages/harness/src/lib/setup.ts",
		new RegExp(`^const ${name} = "([^"]+)";$`, "m"),
		`\`const ${name}\``,
	);
}

/** `<name>: "<value>",` inside the rawPins object literal. */
function bakePin(name: string): string {
	return extract(
		pinsSource,
		"packages/templates/src/lib/pins.ts",
		new RegExp(`^\\t${name}: "([^"]+)",$`, "m"),
		`\`${name}\``,
	);
}

describe("harness runtime pins match the baked toolchain", () => {
	// node/pnpm are what the setupNode step version-checks and, on a miss, installs. These are the two
	// that decide WHICH toolchain the benchmarks actually measure.
	it("pins the same node the image bakes", () => {
		expect(harnessConstant("NODE_VERSION")).toBe(bakePin("nodeVersion"));
	});

	it("pins the same pnpm the image bakes", () => {
		expect(harnessConstant("PNPM_VERSION")).toBe(bakePin("pnpmVersion"));
	});

	// mise carries a `v` prefix in the harness because it interpolates straight into the GitHub release
	// URL, while pins.ts stores the bare version for the same reason on its side.
	it("pins the same mise release the image installs, modulo the tag prefix", () => {
		expect(harnessConstant("MISE_VERSION")).toBe(`v${bakePin("miseVersion")}`);
	});

	// The checksums travel WITH the version: a bumped version beside a stale sha256 turns the fallback
	// into a hard `sha256sum -c` failure on any stock-image provider, which is a different outage from
	// the one above but the same root drift.
	it("pins the same per-arch mise checksums", () => {
		expect(harnessConstant("MISE_SHA256_X64")).toBe(bakePin("miseSha256X64"));
		expect(harnessConstant("MISE_SHA256_ARM64")).toBe(bakePin("miseSha256Arm64"));
	});

	// The gate is only meaningful while the version check stays exact — a fuzzy check (node@22) would
	// satisfy every assertion above while silently reintroducing "some node, whichever we find".
	it("keeps the version check exact, which is what makes a stale pin fail loudly", () => {
		expect(setupSource).toContain('process.versions.node === "');
		expect(setupSource).toMatch(/mise use --global --yes node@\$\{NODE_VERSION\}/);
	});
});
