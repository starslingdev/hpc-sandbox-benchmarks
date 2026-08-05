// Canonical identity of the shared toolchain image, in ONE place at the bottom of the dependency DAG
// so the build pins (@sandbox-benchmarks/templates) and the runtime config
// (@sandbox-benchmarks/providers) both derive from the same constants and cannot drift. The version
// tag is immutable: a change to the toolchain image means bumping TOOLCHAIN_VERSION.

import type { ProviderId } from "./providers.ts";

export const TOOLCHAIN_IMAGE_NAME = "sandbox-benchmarks-toolchain";
/** Project-scoped VCR repository containing the thin Vercel variant. */
export const VERCEL_VCR_REPOSITORY = `${TOOLCHAIN_IMAGE_NAME}-vercel`;
// v6: the bake gains pts/iperf-1.2.0 (packages/templates/src/lib/pins.ts — ptsInstallTests 9 → 10
// profiles) for the network suite's iperf composition. Pre-installing the upstream profile caches
// its source tarball in the image, so the iperf-localhost leaf's vendored-subset re-install
// rebuilds offline instead of re-downloading inside every cell's budget (bake↔leaf agreement is
// gated by tooling/repo-checks pts-profile-pins.test.ts). Every mise-managed toolchain pin is
// unchanged from v5 (mise 2026.7.11, node 22.23.1, pnpm 10.34.5, jc 1.25.7). Re-bake all providers
// before the runs that consume v6.
// v7: no toolchain pin changed from v6 — this is a pure LAYER restructure. The apt install and the
// PTS pre-install were each one RUN, producing compressed layers of 624.7 MB and 970.0 MB. Vercel
// Container Registry rejects any compressed layer over 500 MB mid-push with an opaque HTTP 413
// (https://vercel.com/docs/container-registry/limits-and-pricing), so the bake now installs apt in
// TOOLCHAIN_APT_GROUPS-sized layers and PTS one profile group at a time. The image content is
// identical; only its layer boundaries moved. Re-bake all providers before the runs that consume v7.
// v8: no toolchain pin changed from v7 — mise 2026.7.11, node 22.23.1, pnpm 10.34.5, jc 1.25.7, PTS
// 10.8.4 and the same 10 pre-installed profiles. The delta is entirely about the UNPRIVILEGED runtime
// user E2B-compatible providers inject (Runloop runs its whole lane that way), and it is two things:
//   - The image ENV no longer exports PTS_USER_PATH_OVERRIDE, only PTS_TEST_INSTALL_ROOT_PATH. Sharing
//     root's mutable state put an injected user on a 0600 core.pt2so and — because PTS expands its
//     non-daemon ResultsDirectory through HOME regardless of the override — on a results tree
//     lib/bench.sh's composite finder never searched. Dropping the override leaves that user on PTS's
//     own $HOME default while the baked profiles stay shared, which is the only path PTS 10.8.4
//     exposes an override for. Root is unaffected: its daemonized branch pins the baked root anyway.
//   - installed-tests/pts and its parent are now group/other-writable. batch-install created them 0755
//     root inside the profile layers, AFTER 20-pts.sh's blanket chmod, so an unprivileged user could
//     read every baked profile but could neither install a new one nor discard a baked install — the
//     latter is what install_vendored_pts_profile must do to replace a broken upstream runner, and its
//     silent no-op meant the network suite benchmarked the unrepaired iperf profile.
// v7 published WITHOUT PTS_TEST_INSTALL_ROOT_PATH (the ENV postdates that bake), which is why an
// unprivileged run on it reports 0 of 10 installed profiles; the runtime entry points now set it
// themselves, so v7 images keep working, but Runloop's vendored-profile path needs THIS image.
// Numbers stay comparable across v7↔v8: no pin, profile, or build flag changed — only an env var and
// a directory mode. Re-bake all providers before the runs that consume v8.
export const TOOLCHAIN_VERSION = "v8";

const VCR_NAMESPACE_COMPONENT = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

// The Vercel namespace this repository's own CI publishes into. These are DEFAULTS, not constants: a
// fork, a renamed team, or a second project overrides them through VERCEL_TEAM_SLUG /
// VERCEL_PROJECT_NAME (see packages/providers/src/lib/config.ts) without touching code.
//
// Both are the human-readable *names*, never the `team_*` / `prj_*` API IDs the Vercel CLI consumes
// as VERCEL_ORG_ID / VERCEL_PROJECT_ID — those two identify the project to `vercel pull` and stay in
// CI secrets, while these two only ever become Docker path segments. vercelVcrImageRefs() rejects the
// ID forms outright so the pair can never be swapped by accident.
/** Default Vercel team slug (the org) the VCR namespace is rooted at. */
export const VERCEL_TEAM_SLUG_DEFAULT = "starsling";
/** Default Vercel project name; matches this repository's name so the two stay obviously paired. */
export const VERCEL_PROJECT_NAME_DEFAULT = "hpc-sandbox-benchmarks";

/**
 * Build canonical VCR refs from human-readable Vercel namespace names. API IDs (`team_*`, `prj_*`)
 * are deliberately rejected so they can never accidentally become Docker path segments.
 */
export function vercelVcrImageRefs(teamSlug: string, projectName: string) {
	for (const [label, value, idPrefix] of [
		["team slug", teamSlug, "team_"],
		["project name", projectName, "prj_"],
	] as const) {
		if (value.startsWith(idPrefix) || !VCR_NAMESPACE_COMPONENT.test(value)) {
			throw new Error(
				`Invalid Vercel VCR ${label} "${value}": use the canonical lowercase name, never an API ID`,
			);
		}
	}
	const repository = `vcr.vercel.com/${teamSlug}/${projectName}/${VERCEL_VCR_REPOSITORY}`;
	const version = `${repository}:${TOOLCHAIN_VERSION}`;
	return Object.freeze({
		repository,
		version,
		candidate: `${version}-candidate`,
	});
}

/** Reject an override that escapes the configured VCR repository or contains API-ID path segments. */
export function validateVercelVcrImageRef(
	ref: string,
	teamSlug: string,
	projectName: string,
): string {
	const refs = vercelVcrImageRefs(teamSlug, projectName);
	const escapedRepository = refs.repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const digestRef = new RegExp(`^${escapedRepository}@sha256:[a-f0-9]{64}$`);
	if (
		(ref !== refs.version && ref !== refs.candidate && !digestRef.test(ref)) ||
		/\/(?:team_|prj_)[^/]+\//.test(ref)
	) {
		throw new Error(
			`Invalid Vercel VCR image ref "${ref}": expected repository ${refs.repository}`,
		);
	}
	return ref;
}

// The apt packages PTS needs beyond a stock image — PTS's own php runtime, the compiler toolchain
// for the source-built profiles, and fast-cli's Chrome runtime libs.
//
// These used to be one flat PTS_APT_DEPS string that 00-apt.sh restated by hand, gated by
// tooling/repo-checks/src/pts-dep-alignment.test.ts because the two drifted twice for real. The
// groups below are now the source: the bake receives them as build args (one layer each) and
// PTS_APT_DEPS is derived from them, so that particular drift is gone by construction. lib/bench.sh's
// stock-image ensure_pts cannot import TS and is still gated as text.

/** One bake layer's worth of apt packages. The Dockerfile runs one `apt-get install` per group. */
export interface ToolchainAptGroup {
	/** Layer identity; also the `--build-arg APT_GROUP_<NAME>` the Dockerfile passes. */
	name: string;
	/**
	 * Needed only to BUILD the image, so excluded from {@link PTS_APT_DEPS} — the runtime refresh and
	 * the stock-image fallback both run on hosts that already have these.
	 */
	bakeOnly?: boolean;
	packages: string;
}

/**
 * The bake's apt install, partitioned into layer-sized groups — installed in this order, one Docker
 * layer each.
 *
 * The partition exists to bound compressed layer size, not for tidiness: a single apt layer measured
 * 624.7 MB compressed, and Vercel Container Registry rejects any layer over 500 MB with an opaque
 * HTTP 413 mid-push. Daytona's snapshot registry rejects oversized layers too (see the base
 * Dockerfile). Groups are semantic so the boundaries survive a dependency being added — put a new
 * package in the group it belongs to and the layer math stays roughly where it is.
 *
 * Order matters only for `plumbing`, which must come first: curl + ca-certificates are what the
 * pinned-mise fetch in 05-mise-binary.sh needs.
 */
export const TOOLCHAIN_APT_GROUPS: readonly ToolchainAptGroup[] = Object.freeze([
	{
		name: "plumbing",
		bakeOnly: true,
		// Image plumbing: the mise fetch's prerequisites plus the archive tools the PTS profile
		// installers shell out to. Never part of the runtime dep list — every host has these.
		packages: "curl git ca-certificates tar gzip xz-utils",
	},
	{
		name: "build",
		// Compilers + headers for the source-built profiles (fio, pgbench, sqlite-speedtest). The
		// largest group by far — gcc/g++/cpp-14 and libllvm19 land here.
		// pkg-config rides with libicu-dev: postgres 17's configure discovers ICU exclusively via
		// PKG_CHECK_MODULES, so without the binary pgbench's build aborts "ICU library not found".
		// tcl: sqlite's Makefile shells out to tclsh to generate opcodes.h.
		packages:
			"build-essential autoconf flex bison bc libelf-dev libssl-dev " +
			"libaio-dev libicu-dev pkg-config tcl",
	},
	{
		name: "runtime",
		// PTS's own php runtime plus the probe/runner utilities the leaves shell out to.
		packages: "php-cli php-xml dnsutils jq netcat-openbsd iputils-ping stress-ng unzip procps",
	},
	{
		name: "chrome",
		// fast-cli's Puppeteer/Chrome runtime dependencies. Without them, a stock-image provider (e.g.
		// modal, which takes the fallback path rather than the baked image) downloads a fresh Chrome via
		// npm install that fails immediately with "error while loading shared libraries:
		// libglib-2.0.so.0: cannot open shared object file" — a live-observed failure (run 29587815350,
		// modal/network) with zero fast-cli metrics produced.
		packages:
			"fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 " +
			"libcairo2 libcups2 libdbus-1-3 libdrm2 libfontconfig1 libgbm1 libglib2.0-0 libgtk-3-0 " +
			"libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 " +
			"libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 " +
			"libxext6 libxfixes3 libxi6 libxkbcommon0 libxrandr2 libxrender1 libxss1 libxtst6 " +
			"xdg-utils",
	},
]);

/**
 * The apt packages PTS needs beyond a stock image. DERIVED from {@link TOOLCHAIN_APT_GROUPS} rather
 * than restated, so the bake and the runtime can no longer disagree about a package — the union is
 * the definition, not something a drift gate has to re-prove.
 *
 * Consumed by the per-run dep refresh (packages/harness setup.ts), which interpolates it directly.
 * lib/bench.sh's stock-image `ensure_pts` cannot import TS and is still gated as text by
 * tooling/repo-checks/src/pts-dep-alignment.test.ts.
 */
export const PTS_APT_DEPS = TOOLCHAIN_APT_GROUPS.filter((group) => !group.bakeOnly)
	.map((group) => group.packages)
	.join(" ");

/** The bake's PTS root: profiles, installed tests and root's own mutable state all live under here. */
export const PTS_BAKED_ROOT = "/var/lib/phoronix-test-suite";

/**
 * How every runtime entry point selects PTS's state directory, as ONE shell snippet.
 *
 * The bake installs profiles as root under {@link PTS_BAKED_ROOT}, but E2B-compatible providers
 * (Runloop especially) inject an unprivileged runtime user. Those two identities need DIFFERENT
 * mutable state and the SAME installed profiles, which is exactly the split below:
 *
 *   - `PTS_TEST_INSTALL_ROOT_PATH` keeps the baked installed tests shared. It is the only path PTS
 *     10.8.4 exposes its own env override for, and without it an unprivileged run falls back to the
 *     config's `~/.phoronix-test-suite/installed-tests/` and reports ZERO installed tests — the
 *     Runloop failure this exists to prevent. The published v7 image predates this ENV, so setting it
 *     at runtime is what makes an already-published image work.
 *   - `PTS_USER_PATH_OVERRIDE` is UNSET for a non-root user rather than pointed anywhere. PTS's own
 *     per-user default is already `$HOME/.phoronix-test-suite`, and it creates that directory itself —
 *     so there is no mkdir here to fail under `set -e` when HOME is unset or unwritable. Pointing an
 *     unprivileged user at the baked root instead is what breaks: root's `core.pt2so` is mode 0600
 *     (the bake's chmod runs before the profile layers rewrite it), and PTS expands its non-daemon
 *     `ResultsDirectory` through HOME regardless of the override — so the shared setting yields
 *     permission errors AND a results tree lib/bench.sh's composite finder never searches.
 *
 * Root keeps the explicit override. It is redundant when PTS reaches its daemonized branch (writable
 * /var/lib + /etc, which forces PTS_USER_PATH to the baked root anyway), and load-bearing when it
 * does not — without it a root sandbox with a read-only /etc silently switches to
 * /root/.phoronix-test-suite and loses every baked profile.
 *
 * Interpolated verbatim by the harness preamble (packages/harness/src/lib/execute.ts) and the
 * generated smoke probe (packages/templates/src/smoke.ts). lib/bench.sh cannot import TS and restates
 * the same decision in multi-line shell; tooling/repo-checks/src/pts-state-alignment.test.ts gates
 * that copy as text, matching the {@link PTS_APT_DEPS} precedent.
 */
export const PTS_STATE_SELECT_SH =
	`if [ -d ${PTS_BAKED_ROOT} ]; then ` +
	`export PTS_TEST_INSTALL_ROOT_PATH=${PTS_BAKED_ROOT}/installed-tests/; ` +
	`if [ "$(id -u)" -eq 0 ]; then export PTS_USER_PATH_OVERRIDE=${PTS_BAKED_ROOT}/; ` +
	`else unset PTS_USER_PATH_OVERRIDE; fi; fi`;

/**
 * Whether a release publishes a VERSION-named artifact for this provider — a template, snapshot,
 * Blueprint, or registry retag that has to be BUILT during promote — as opposed to a provider that
 * simply boots the published base image by ref and needs nothing built for it.
 *
 * It lives in the registry rather than in the CLI because three independent consumers must agree on
 * it and none of them can see the others: `promote`'s per-provider build switch, the toolchain
 * workflow's version-artifact fan-out (one hand-written step per provider), and the drift gate in
 * tooling/repo-checks that holds that fan-out to this answer. A provider added to PROVIDERS without a
 * branch here is a compile error; a provider whose answer here disagrees with the workflow is a failed
 * build. Neither can end as a release that quietly never published someone's artifact.
 *
 * Deliberately its own exhaustive switch rather than a predicate over the bake's `baseImageUse`:
 * "does the base decide my bytes" and "do I have an artifact to publish" are different questions that
 * agree today except at vercel — whose artifact is a retag of its own mirrored candidate rather than
 * anything baked from the base — and a new provider must be made to answer both.
 */
export function hasVersionArtifact(id: ProviderId): boolean {
	switch (id) {
		case "e2b":
		case "daytona-vm":
		case "daytona-container":
		case "novita":
		case "runloop":
		case "vercel":
			return true;
		case "modal-gvisor":
		case "modal-vm":
		case "microsandbox-local":
		case "microsandbox-cloud":
		case "namespace":
		case "runcloud":
		case "blaxel":
			return false;
	}
}
