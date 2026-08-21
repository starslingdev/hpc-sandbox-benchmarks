// Drift gate: Vercel Functions still treat `"bunVersion": "1.x"` as Bun 1.3.14. Preview
// deployments only pick up Bun 1.4 after an explicit `"1.4.x"` opt-in in vercel.json
// (https://vercel.com/changelog/bun-1-4-is-now-available-in-vercel-functions). CI and
// @types/bun pin the exact patch this workspace develops against; the preview runtime
// is the floating 1.4 line Vercel manages.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();

describe("Vercel preview Bun runtime", () => {
	it("opts into Bun 1.4.x rather than the 1.x alias that still resolves to 1.3", () => {
		const cfg = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as {
			bunVersion?: unknown;
		};
		expect(cfg.bunVersion).toBe("1.4.x");
	});
});
