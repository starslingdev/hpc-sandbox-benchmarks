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

// mise/PTS versions for the runtime-setup fallback path (no-ops on the baked image, which already
// ships them). Kept as best-effort constants rather than a pins import to keep the harness decoupled.
const MISE_VERSION = "v2026.5.16";
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
			// No-op on pre-baked images. mise.run can be unreachable from some sandbox networks — fall
			// back to the static binary from GitHub releases (GitHub is reachable: we clone from it).
			script: [
				"command -v mise >/dev/null 2>&1 || {",
				'mkdir -p "$HOME/.local/bin";',
				"(curl -fsSL --retry 3 --retry-all-errors --retry-delay 2 https://mise.run | sh)",
				'|| { arch=$(uname -m); case "$arch" in aarch64|arm64) a=arm64;; *) a=x64;; esac;',
				`curl -fsSL --retry 5 --retry-all-errors --retry-delay 2 -o "$HOME/.local/bin/mise" "https://github.com/jdx/mise/releases/download/${MISE_VERSION}/mise-${MISE_VERSION}-linux-$a" && chmod +x "$HOME/.local/bin/mise"; }; };`,
				"mise --version",
			].join(" "),
			timeoutMs: 5 * MIN,
			retries: 2,
		},
		{
			label: "mise install",
			script: `cd ${DIR} && mise trust --yes && mise install --yes`,
			timeoutMs: 20 * MIN,
			retries: 2,
		},
	];

	if (suite.setupNode) {
		steps.push({
			label: "setup node 22 + pnpm 10",
			script: `cd ${DIR} && mise use --yes node@22 pnpm@10 && node -v && pnpm -v`,
			timeoutMs: 10 * MIN,
			retries: 2,
		});
	}

	if (suite.setupPts) {
		steps.push({
			label: "setup phoronix-test-suite",
			// No-op on pre-baked images.
			script:
				"command -v phoronix-test-suite >/dev/null 2>&1 || { " +
				[
					`curl -fsSL --retry 5 --retry-all-errors --retry-delay 2 "https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/v${PTS_VERSION}/phoronix-test-suite_${PTS_VERSION}_all.deb" -o /tmp/phoronix-test-suite.deb`,
					"$SUDO apt-get update -qq",
					"$SUDO apt-get install -y -qq php-cli php-xml build-essential flex bison bc libelf-dev libssl-dev",
					"($SUDO dpkg -i /tmp/phoronix-test-suite.deb || $SUDO apt-get install -y -qq -f)",
				].join(" && ") +
				"; }; phoronix-test-suite version",
			timeoutMs: 15 * MIN,
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
	`disk_gb=$(df -Pk / | awk 'NR==2 { printf "%.1f", $2 / 1048576 }')`,
	`cpu_model=$(LC_ALL=C lscpu 2>/dev/null | sed -n 's/^Model name:[[:space:]]*//p' | head -1 || true)`,
	"kernel=$(uname -r)",
	`os=$(sed -n 's/^PRETTY_NAME=//p' /etc/os-release 2>/dev/null | tr -d '"' || true)`,
	"virt=$(systemd-detect-virt 2>/dev/null || echo unknown)",
	"user=$(id -un)",
	String.raw`esc() { printf '%s' "$1" | sed 's/["\\]/\\&/g'; }`,
	"{",
	`  printf '{"vcpus":%s,"memoryGb":%s,"diskGb":%s' "$vcpus" "$memory_gb" "$disk_gb"`,
	`  if [ -n "$limited" ]; then printf ',"hostVcpus":%s,"hostMemoryGb":%s' "$host_vcpus" "$host_memory_gb"; fi`,
	`  if [ -n "$cpu_model" ]; then printf ',"cpuModel":"%s"' "$(esc "$cpu_model")"; fi`,
	String.raw`  printf ',"kernel":"%s","os":"%s","virtualization":"%s","user":"%s"}\n' "$(esc "$kernel")" "$(esc "$os")" "$(esc "$virt")" "$(esc "$user")"`,
	"} > benchmark-results/observed-specs.json",
	"cat benchmark-results/observed-specs.json",
].join("\n");
