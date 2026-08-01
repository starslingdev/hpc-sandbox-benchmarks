// Drift gate: the toolchain base image installs apt and PTS profiles in GROUPS, one Docker layer
// each, because provider registries reject oversized compressed layers — Vercel Container Registry
// hard-caps a layer at 500 MB (HTTP 413 mid-push) and Daytona's snapshot import fails past ~1 GiB.
//
// The groups are defined in TypeScript (packages/schema/src/toolchain.ts for apt,
// packages/templates/src/lib/pins.ts for PTS) and consumed by the Dockerfile as one ARG + one RUN per
// group. Nothing in Docker notices a group that is defined but never installed: the build simply
// succeeds with packages or profiles missing, and the failure surfaces much later as a benchmark that
// records no metrics. These assertions are what make adding a group without wiring it a red test.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PTS_APT_DEPS, TOOLCHAIN_APT_GROUPS } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const root = findRepoRoot();
const dockerfile = readFileSync(join(root, "packages/templates/images/base/Dockerfile"), "utf8");
const pinsSource = readFileSync(join(root, "packages/templates/src/lib/pins.ts"), "utf8");

/** The PTS profile groups, read as text so this gate stays free of a templates dependency. */
function ptsGroups(): string[] {
	const block = pinsSource.match(/const ptsInstallGroups = \[([\s\S]*?)\n\];/);
	expect(block).not.toBeNull();
	return [...(block?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1] as string);
}

describe("toolchain layer groups", () => {
	it("wires every apt group to its own ARG and RUN in the base Dockerfile", () => {
		expect(TOOLCHAIN_APT_GROUPS.length).toBeGreaterThan(1);
		for (const group of TOOLCHAIN_APT_GROUPS) {
			const arg = `APT_GROUP_${group.name.toUpperCase().replace(/-/g, "_")}`;
			expect(`${arg} declared: ${dockerfile.includes(`ARG ${arg}`)}`).toBe(`${arg} declared: true`);
			expect(`${arg} installed: ${dockerfile.includes(`APT_PACKAGES="\${${arg}}"`)}`).toBe(
				`${arg} installed: true`,
			);
			expect(`${arg} named: ${dockerfile.includes(`APT_GROUP_NAME=${group.name} `)}`).toBe(
				`${arg} named: true`,
			);
		}
	});

	it("wires every PTS profile group to its own ARG and RUN in the base Dockerfile", () => {
		const groups = ptsGroups();
		expect(groups.length).toBeGreaterThan(1);
		groups.forEach((_group, index) => {
			const arg = `PTS_GROUP_${index + 1}`;
			expect(`${arg} declared: ${dockerfile.includes(`ARG ${arg}`)}`).toBe(`${arg} declared: true`);
			expect(`${arg} installed: ${dockerfile.includes(`PTS_PROFILE_GROUP="\${${arg}}"`)}`).toBe(
				`${arg} installed: true`,
			);
		});
		// An extra RUN for a group that no longer exists would install nothing and mask the removal.
		expect(dockerfile).not.toContain(`ARG PTS_GROUP_${groups.length + 1}`);
	});

	it("puts every apt package in exactly one group", () => {
		const seen = new Map<string, string>();
		for (const group of TOOLCHAIN_APT_GROUPS) {
			for (const pkg of group.packages.split(/\s+/).filter(Boolean)) {
				const previous = seen.get(pkg);
				// A duplicate is not fatal to apt, but it means two layers both pull the package's
				// dependency closure — the exact thing the partition exists to control.
				expect(previous ? `${pkg} in both ${previous} and ${group.name}` : pkg).toBe(pkg);
				seen.set(pkg, group.name);
			}
		}
		expect(seen.size).toBeGreaterThan(40);
	});

	it("derives the runtime dep list from the non-bake-only groups", () => {
		// PTS_APT_DEPS is what the per-run refresh installs inside a stock-image sandbox. Bake-only
		// plumbing (curl, ca-certificates, tar…) must stay out of it, and everything else must be in.
		const runtime = new Set(PTS_APT_DEPS.split(/\s+/).filter(Boolean));
		for (const group of TOOLCHAIN_APT_GROUPS) {
			for (const pkg of group.packages.split(/\s+/).filter(Boolean)) {
				expect(`${pkg}:${runtime.has(pkg)}`).toBe(`${pkg}:${!group.bakeOnly}`);
			}
		}
	});

	it("keeps each PTS profile in exactly one group", () => {
		const groups = ptsGroups();
		const flattened = groups.flatMap((group) => group.split(/\s+/)).filter(Boolean);
		expect(flattened.length).toBe(new Set(flattened).size);
		// Exactly one fio entry: 25-pts-profiles.sh patches it to build portable (--disable-native) and
		// validatedPins() refuses to build otherwise. Asserted here too so the pin list is gated even
		// when nothing invokes the templates package.
		expect(flattened.filter((test) => test.startsWith("fio-")).length).toBe(1);
	});

	it("keeps every group's install, prune and chmod inside a single RUN", () => {
		// The correctness property that makes the split work at all: deleting a file in a later layer
		// cannot shrink the earlier layer that added it, and a later `chmod -R` copies everything it
		// touches into itself. Both re-inflate the image while every other check still passes, so the
		// per-group script must own its own cleanup.
		const profiles = readFileSync(
			join(root, "packages/templates/images/base/scripts/25-pts-profiles.sh"),
			"utf8",
		);
		expect(profiles).toContain("phoronix-test-suite batch-install");
		expect(profiles).toContain("pruning duplicate PTS download");
		expect(profiles).toContain("chmod -R a+rwX");
		// The blanket recursive chmod over the whole PTS tree belongs to the state-only setup layer.
		expect(profiles).not.toContain("chmod -R a+rwX /var/lib/phoronix-test-suite\n");
	});
});
