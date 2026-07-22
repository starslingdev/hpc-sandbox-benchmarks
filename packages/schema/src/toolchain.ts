// Canonical identity of the shared toolchain image, in ONE place at the bottom of the dependency DAG
// so the build pins (@sandbox-benchmarks/templates) and the runtime config
// (@sandbox-benchmarks/providers) both derive from the same constants and cannot drift. The version
// tag is immutable: a change to the toolchain image means bumping TOOLCHAIN_VERSION.

export const TOOLCHAIN_IMAGE_NAME = "sandbox-benchmarks-toolchain";
// v6: the bake gains pts/iperf-1.2.0 (packages/templates/src/lib/pins.ts — ptsInstallTests 9 → 10
// profiles) for the network suite's iperf composition. Pre-installing the upstream profile caches
// its source tarball in the image, so the iperf-localhost leaf's vendored-subset re-install
// rebuilds offline instead of re-downloading inside every cell's budget (bake↔leaf agreement is
// gated by tooling/repo-checks pts-profile-pins.test.ts). Every mise-managed toolchain pin is
// unchanged from v5 (mise 2026.7.11, node 22.23.1, pnpm 10.34.5, jc 1.25.7). Re-bake all providers
// before the runs that consume v6.
export const TOOLCHAIN_VERSION = "v6";

// The apt packages PTS needs beyond a stock image — PTS's own php runtime, the compiler toolchain
// for the source-built profiles, and fast-cli's Chrome runtime libs. ONE canonical list: the
// per-run dep refresh (packages/harness setup.ts) interpolates it directly, while the two shell
// consumers (the bake's 00-apt.sh and lib/bench.sh's stock-image ensure_pts) cannot import TS, so
// tooling/repo-checks/src/pts-dep-alignment.test.ts gates their core set against this constant.
//
// The fonts/GTK/X11 block is fast-cli's Puppeteer/Chrome runtime dependencies. Without them, a
// stock-image provider (e.g. modal, which takes the fallback path rather than the baked image)
// downloads a fresh Chrome via npm install that fails immediately with "error while loading
// shared libraries: libglib-2.0.so.0: cannot open shared object file" — a live-observed failure
// (run 29587815350, modal/network) with zero fast-cli metrics produced.
export const PTS_APT_DEPS =
	"php-cli php-xml build-essential autoconf flex bison bc libelf-dev libssl-dev " +
	// pkg-config rides with libicu-dev: postgres 17's configure discovers ICU exclusively via
	// PKG_CHECK_MODULES, so without the binary pgbench's build aborts "ICU library not found".
	"libaio-dev libicu-dev pkg-config dnsutils jq netcat-openbsd iputils-ping tcl stress-ng unzip procps " +
	"fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 " +
	"libcairo2 libcups2 libdbus-1-3 libdrm2 libfontconfig1 libgbm1 libglib2.0-0 libgtk-3-0 " +
	"libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 " +
	"libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 " +
	"libxext6 libxfixes3 libxi6 libxkbcommon0 libxrandr2 libxrender1 libxss1 libxtst6 " +
	"xdg-utils";
