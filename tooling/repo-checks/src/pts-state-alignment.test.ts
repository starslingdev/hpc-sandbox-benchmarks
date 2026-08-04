// Drift gate: which PTS state directory a sandbox uses is decided in THREE places — the harness
// preamble that prefixes every command (packages/harness/src/lib/execute.ts), the generated smoke
// probe that validates a published image (packages/templates/src/smoke.ts), and lib/bench.sh, which
// every measurement leaf sources. They must agree, because the run and the check that clears the run
// would otherwise be reading different trees.
//
// The two TS consumers now interpolate the canonical PTS_STATE_SELECT_SH, so their alignment holds by
// construction and only the wiring needs a tripwire. lib/bench.sh cannot import TS and restates the
// decision in multi-line shell, so it is gated as text — same shape as the PTS_APT_DEPS gate next
// door, and deliberately not shell parsing.
//
// What the assertions below actually protect, all of which produced real failures:
//   - dropping PTS_TEST_INSTALL_ROOT_PATH makes an unprivileged run report ZERO installed profiles,
//     because PTS falls back to the config's ~/.phoronix-test-suite/installed-tests/;
//   - pointing an unprivileged user at the baked root puts it on root's 0600 core.pt2so and a
//     HOME-expanded results tree that bench.sh's composite finder never searches;
//   - a write (mkdir) while selecting state runs under `set -e` in all three contexts, so it takes
//     down the whole step — including leaves that never touch PTS — when HOME is unset or unwritable.

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PTS_BAKED_ROOT, PTS_STATE_SELECT_SH } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();
const read = (path: string): string => readFileSync(join(root, path), "utf8");

/** The bench.sh block, extracted line-anchored on its guard through the matching `fi`. */
function benchShStateBlock(): string {
	const lines = read("lib/bench.sh").split("\n");
	const start = lines.findIndex((line) => line.trim() === `if [ -d ${PTS_BAKED_ROOT} ]; then`);
	if (start === -1) throw new Error("lib/bench.sh: no PTS state selection block");
	const end = lines.findIndex((line, i) => i > start && line.trim() === "fi");
	if (end === -1) throw new Error("lib/bench.sh: unterminated PTS state selection block");
	return lines.slice(start, end + 1).join("\n");
}

describe("PTS state selection alignment", () => {
	// The canonical snippet itself. Asserted here rather than only at its consumers so a change to the
	// policy has to be a deliberate edit to this list, not a silent one-character fix.
	it("keeps the shared install root and leaves an unprivileged user on PTS's own default", () => {
		expect(PTS_STATE_SELECT_SH).toContain(
			`export PTS_TEST_INSTALL_ROOT_PATH=${PTS_BAKED_ROOT}/installed-tests/`,
		);
		expect(PTS_STATE_SELECT_SH).toContain(`export PTS_USER_PATH_OVERRIDE=${PTS_BAKED_ROOT}/`);
		// UNSET, never repointed: an inherited image ENV must be dropped, and PTS's default already is
		// $HOME/.phoronix-test-suite.
		expect(PTS_STATE_SELECT_SH).toContain("unset PTS_USER_PATH_OVERRIDE");
	});

	it("selects state without writing to the filesystem", () => {
		expect(PTS_STATE_SELECT_SH).not.toContain("mkdir");
	});

	// By-construction only holds while the consumers really interpolate the constant; a re-inlined
	// literal would drift in the sandbox while every unit test still passed.
	for (const path of ["packages/harness/src/lib/execute.ts", "packages/templates/src/smoke.ts"]) {
		it(`keeps ${path} wired to the canonical PTS_STATE_SELECT_SH`, () => {
			expect(read(path)).toContain("PTS_STATE_SELECT_SH");
		});
	}

	// lib/bench.sh is the text-gated copy: same decision, multi-line shell.
	it("keeps lib/bench.sh making the same decision as the canonical snippet", () => {
		const block = benchShStateBlock();
		expect(block).toContain(`export PTS_TEST_INSTALL_ROOT_PATH=${PTS_BAKED_ROOT}/installed-tests/`);
		expect(block).toContain('if [ "$(id -u)" -eq 0 ]');
		expect(block).toContain(`export PTS_USER_PATH_OVERRIDE=${PTS_BAKED_ROOT}/`);
		expect(block).toContain("unset PTS_USER_PATH_OVERRIDE");
		expect(block).not.toContain("mkdir");
	});

	// The image ENV is the fourth copy of this policy and the one that outlives a rebuild. It must
	// carry the shared install root and must NOT re-introduce a shared user path, which is what every
	// runtime snippet above exists to correct on already-published images.
	it("keeps the baked image ENV on the install root alone", () => {
		const dockerfile = read("packages/templates/images/base/Dockerfile");
		expect(dockerfile).toContain(
			`PTS_TEST_INSTALL_ROOT_PATH=${PTS_BAKED_ROOT}/installed-tests/ \\`,
		);
		expect(dockerfile).not.toMatch(/^\s*ENV\s+PTS_USER_PATH_OVERRIDE/m);
		expect(dockerfile).not.toMatch(/^\s+PTS_USER_PATH_OVERRIDE=/m);
	});
});
