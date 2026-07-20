/**
 * Sandbox initialization for a suite run: clone the repo (which carries the in-sandbox producer under
 * /.mise/tasks + /lib/bench.sh), bring a stock image up to the toolchain (no-ops on the pre-baked
 * image), and probe the sandbox's observed specs (we pin a target spec, then always record the actuals).
 *
 * Env:
 *   BENCH_REPO_URL    Repo to clone (default: this repo, so the cloned producer matches the harness).
 *   BENCH_REPO_REF    Ref to check out (default: main; CI passes the commit SHA).
 *   BENCH_REPO_TOKEN  Token for cloning a private repo; stripped from the remote right after clone.
 */
import type { Suite } from "@sandbox-benchmarks/schema";
import { MIN } from "./execute.ts";

export const REPO_URL =
	process.env.BENCH_REPO_URL || "https://github.com/starslingdev/sandbox-benchmarks";
export const REPO_REF = process.env.BENCH_REPO_REF || "main";
const REPO_TOKEN = process.env.BENCH_REPO_TOKEN || "";

const CLONE_URL = REPO_TOKEN
	? REPO_URL.replace(/^https:\/\//, `https://x-access-token:${encodeURIComponent(REPO_TOKEN)}@`)
	: REPO_URL;

// Resolved in-sandbox: images differ on user (root vs daytona), so the checkout lives under $HOME.
export const DIR = '"$HOME/sandbox-benchmarks"';

// Runtime versions for the stock-image fallback path (no-ops on the baked image, which already
// ships them). Keep node/pnpm aligned with packages/templates/images/base/mise.toml. These stay as
// local constants rather than a templates-package import so the harness remains decoupled.
const MISE_VERSION = "v2026.5.16";
const MISE_SHA256_X64 = "fb2d7bf1a3751398a5c336a3565cd3c60af9b41952abe6fd62e2f2f0d5f06b60";
const MISE_SHA256_ARM64 = "a068f29d8821ab0707f1a006721b5ab0baa80acaafc5a7b71e04371287108b92";
const NODE_VERSION = "22.22.3";
const PNPM_VERSION = "10.34.3";
const PTS_VERSION = "10.8.4";

export interface SetupStep {
	label: string;
	script: string;
	timeoutMs: number;
	/** Extra attempts for steps prone to transient network failures. */
	retries?: number;
}

export function setupSteps(suite: Suite): SetupStep[] {
	const steps: SetupStep[] = [
		{
			label: "install base packages",
			// No-op on pre-baked images; fall back gracefully on images that already ship git/curl.
			script:
				"(command -v git && command -v curl && command -v python3) >/dev/null 2>&1 " +
				"|| ($SUDO apt-get update -qq && $SUDO apt-get install -y -qq git curl ca-certificates tar gzip xz-utils unzip python3) " +
				"|| (command -v git >/dev/null && command -v curl >/dev/null)",
			timeoutMs: 10 * MIN,
		},
		{
			label: "clone repo",
			// Drop the token from the remote immediately so later steps can't leak it. Branch refs need
			// the origin/ fallback: bare `checkout --detach <branch>` DWIMs a remote branch into -b mode.
			script: `rm -rf ${DIR} && git clone "${CLONE_URL}" ${DIR} && cd ${DIR} && git remote set-url origin "${REPO_URL}" && (git checkout --detach "${REPO_REF}" 2>/dev/null || git checkout --detach "origin/${REPO_REF}") && git log -1 --oneline`,
			timeoutMs: 5 * MIN,
		},
		{
			label: "install mise",
			// No-op on pre-baked images. Install the same pinned, checksum-verified static binary as the
			// toolchain image; GitHub is already required for the repository clone immediately above.
			script: [
				"command -v mise >/dev/null 2>&1 || {",
				'mkdir -p "$HOME/.local/bin";',
				'arch=$(uname -m); case "$arch" in',
				`aarch64|arm64) a=arm64; sha=${MISE_SHA256_ARM64};;`,
				`x86_64|amd64) a=x64; sha=${MISE_SHA256_X64};;`,
				'*) echo "Unsupported architecture for mise: $arch" >&2; exit 1;; esac;',
				"tmp=$(mktemp); trap 'rm -f \"$tmp\"' EXIT;",
				`curl -fsSL --retry 5 --retry-all-errors --retry-delay 2 -o "$tmp" "https://github.com/jdx/mise/releases/download/${MISE_VERSION}/mise-${MISE_VERSION}-linux-$a"`,
				'&& printf "%s  %s\\n" "$sha" "$tmp" | sha256sum -c -',
				'&& chmod +x "$tmp" && mv "$tmp" "$HOME/.local/bin/mise"; };',
				"mise --version",
			].join(" "),
			timeoutMs: 5 * MIN,
			retries: 2,
		},
		{
			label: "trust mise config",
			// Trust the cloned task definitions without installing the repository's developer-only tools.
			script: `cd ${DIR} && mise trust --yes`,
			timeoutMs: MIN,
		},
	];

	if (suite.setupNode) {
		steps.push({
			label: "setup node 22 + pnpm 10",
			// Activate only the benchmark runtimes from outside the checkout. Exact Node avoids version
			// discovery, and pnpm comes from npm rather than mise's GitHub-API-backed aqua plugin. Blaxel
			// matrix cells share one unauthenticated egress IP, so even the one pnpm API lookup can hit an
			// exhausted 60-request quota. Later `mise run` commands inherit the global Node config while
			// task auto-install stays off. The pinned baked image takes the fast path for both checks.
			script: [
				`cd "$HOME"`,
				`(node -e 'process.exit(process.versions.node === "${NODE_VERSION}" ? 0 : 1)' 2>/dev/null || mise use --global --yes node@${NODE_VERSION})`,
				`if command -v pnpm >/dev/null 2>&1 && [ "$(pnpm -v)" = "${PNPM_VERSION}" ]; then :; else npm install --global --prefix "$HOME/.local" pnpm@${PNPM_VERSION}; fi`,
				"node -v && pnpm -v",
			].join(" && "),
			timeoutMs: 10 * MIN,
			retries: 2,
		});
	}

	if (suite.setupPts) {
		// Refresh the apt index and ensure PTS's build/runtime deps at runtime unconditionally. A baked
		// image deliberately cleans /var/lib/apt/lists, while a stock-image provider must compile every
		// profile locally; in either case PTS's own dependency install needs a usable package index.
		// Best-effort lets a healthy baked image proceed when a provider cannot reach its distro mirror.
		// Keep this set aligned with packages/templates/images/base/scripts/00-apt.sh.
		//
		// The fonts/GTK/X11 block is fast-cli's Puppeteer/Chrome runtime dependencies. Without them, a
		// stock-image provider (e.g. modal, which takes this fallback path rather than the baked image)
		// downloads a fresh Chrome via npm install that fails immediately with "error while loading
		// shared libraries: libglib-2.0.so.0: cannot open shared object file" — a same-day-observed live
		// failure (run 29587815350, modal/network) with zero fast-cli metrics produced. 00-apt.sh already
		// bakes these for the pre-baked image path; this was the one runtime fallback that had drifted
		// out of lockstep with it.
		const ptsDeps =
			"php-cli php-xml build-essential autoconf flex bison bc libelf-dev libssl-dev " +
			"libaio-dev libicu-dev dnsutils jq netcat-openbsd iputils-ping tcl stress-ng unzip procps " +
			"fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 " +
			"libcairo2 libcups2 libdbus-1-3 libdrm2 libfontconfig1 libgbm1 libglib2.0-0 libgtk-3-0 " +
			"libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 " +
			"libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 " +
			"libxext6 libxfixes3 libxi6 libxkbcommon0 libxrandr2 libxrender1 libxss1 libxtst6 " +
			"xdg-utils";
		steps.push({
			label: "ensure PTS build deps + fresh apt index",
			script:
				"$SUDO apt-get -o Acquire::Retries=3 update -qq || true; " +
				`$SUDO apt-get install -y -qq ${ptsDeps} || echo "WARNING: apt dep refresh failed (best-effort); relying on the baked image"`,
			timeoutMs: 15 * MIN,
		});
		steps.push({
			label: "setup phoronix-test-suite",
			// No-op on pre-baked images; on stock images the step above already populated apt's index and
			// installed the profile build dependencies.
			script:
				"command -v phoronix-test-suite >/dev/null 2>&1 || { " +
				[
					`curl -fsSL --retry 5 --retry-all-errors --retry-delay 2 "https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/v${PTS_VERSION}/phoronix-test-suite_${PTS_VERSION}_all.deb" -o /tmp/phoronix-test-suite.deb`,
					"($SUDO dpkg -i /tmp/phoronix-test-suite.deb || $SUDO apt-get install -y -qq -f)",
				].join(" && ") +
				"; }; phoronix-test-suite version",
			timeoutMs: 10 * MIN,
			retries: 2,
		});
	}

	return steps;
}

/**
 * Captures the sandbox's actual specs into benchmark-results/observed-specs.json before the suite
 * runs, so the normalizer reads it with the other results. nproc / /proc/meminfo see the HOST on
 * cgroup-limited containers (Daytona: a 4-vCPU quota on a 48-thread host), so prefer the cgroup quota
 * as the effective Sandbox size and keep the host reading as hostVcpus/hostMemoryGb disclosure.
 */
export const OBSERVED_SPECS_SCRIPT = [
	`cd ${DIR} && mkdir -p benchmark-results`,
	"host_vcpus=$(nproc)",
	`host_memory_gb=$(awk '/^MemTotal:/ { printf "%.2f", $2 / 1048576 }' /proc/meminfo)`,
	'vcpus=$host_vcpus; memory_gb=$host_memory_gb; limited=""',
	"if [ -f /sys/fs/cgroup/cpu.max ]; then",
	`  q=$(awk '$1 != "max" { printf "%.2f", $1 / $2 }' /sys/fs/cgroup/cpu.max)`,
	'  [ -n "$q" ] && vcpus=$q && limited=1',
	"fi",
	"if [ -f /sys/fs/cgroup/memory.max ] && grep -qv max /sys/fs/cgroup/memory.max; then",
	`  memory_gb=$(awk '{ printf "%.2f", $1 / 1073741824 }' /sys/fs/cgroup/memory.max) && limited=1`,
	"fi",
	// Report the disk the benchmark actually writes to, not the sandbox root: the PTS data dir when it
	// exists (on Blaxel that's the mounted 40 GiB volume; on baked-image providers it's on the root fs,
	// so identical to `/`), else `/` (a stock gVisor root pre-PTS — Modal). Keep this dir in sync with
	// the harness disk gate and the blaxel volume mount path.
	`disk_src=/var/lib/phoronix-test-suite; [ -d "$disk_src" ] || disk_src=/`,
	// gVisor (Modal) reports the root as 2^63 bytes — a "no limit" sentinel, not a size. Emit diskGb only
	// when df's answer is plausible for a sandbox (positive, < 100 TB); a sentinel, a failed df, or
	// a non-numeric column all leave it unset as unknown.
	`disk_gb=$(df -Pk "$disk_src" | awk 'NR==2 && $2 + 0 > 0 && $2 / 1048576 < 100000 { printf "%.1f", $2 / 1048576 }')`,
	`cpu_model=$(LC_ALL=C lscpu 2>/dev/null | sed -n 's/^Model name:[[:space:]]*//p' | head -1 || true)`,
	"kernel=$(uname -r)",
	`os=$(sed -n 's/^PRETTY_NAME=//p' /etc/os-release 2>/dev/null | tr -d '"' || true)`,
	"virt=$(systemd-detect-virt 2>/dev/null || echo unknown)",
	// Best-effort isolation classification — a cross-check on the declared per-provider isolation, never
	// authoritative (see run.ts observedSpecs.detectedIsolation: the probe cannot separate every type).
	// gVisor announces itself in /proc/version; a cgroup quota well below the disclosed host means we're
	// seeing THROUGH a container to a bigger host; `systemd-detect-virt --vm` confirms a real hypervisor.
	// (`--vm` restricts detection to VM technologies — bare `systemd-detect-virt` also reports container
	// types like docker/lxc/podman, which must NOT read as a VM here; `--quiet` gives just an exit status.)
	"detected=unknown",
	"if grep -qi gvisor /proc/version 2>/dev/null; then",
	"  detected=gvisor",
	// `vcpus` only drops below `host_vcpus` in the cpu.max branch, which is also the only place that
	// sets `limited` — so `host_vcpus > vcpus` already implies a limit; no separate `[ -n "$limited" ]`.
	`elif awk -v h="$host_vcpus" -v v="$vcpus" 'BEGIN { exit !(h > v + 0.5) }'; then`,
	"  detected=container",
	"elif systemd-detect-virt --vm --quiet 2>/dev/null; then",
	"  detected=vm",
	"fi",
	"user=$(id -un)",
	String.raw`esc() { printf '%s' "$1" | sed 's/["\\]/\\&/g'; }`,
	"{",
	`  printf '{"vcpus":%s,"memoryGb":%s' "$vcpus" "$memory_gb"`,
	`  if [ -n "$disk_gb" ]; then printf ',"diskGb":%s' "$disk_gb"; fi`,
	`  if [ -n "$limited" ]; then printf ',"hostVcpus":%s,"hostMemoryGb":%s' "$host_vcpus" "$host_memory_gb"; fi`,
	`  if [ -n "$cpu_model" ]; then printf ',"cpuModel":"%s"' "$(esc "$cpu_model")"; fi`,
	String.raw`  printf ',"kernel":"%s","os":"%s","virtualization":"%s","detectedIsolation":"%s","user":"%s"}\n' "$(esc "$kernel")" "$(esc "$os")" "$(esc "$virt")" "$(esc "$detected")" "$(esc "$user")"`,
	"} > benchmark-results/observed-specs.json",
	"cat benchmark-results/observed-specs.json",
].join("\n");
