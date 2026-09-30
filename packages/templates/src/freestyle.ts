import { readFileSync } from "node:fs";
import { PTS_PROFILE_SOURCE_REF } from "@sandbox-benchmarks/schema/pts-profile-source";
import { TOOLCHAIN_APT_GROUPS } from "@sandbox-benchmarks/schema/toolchain";
import { buildManifest } from "./manifest.ts";
import { miseToml, toolchainBuildArgs, validatedPins } from "./pins.ts";

const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

/** Remove stock runtime/global-tool links without touching the pinned tools or system binaries. */
export function freestyleStockToolsCleanup(binDir = "/usr/local/bin"): string {
	return `for executable in ${quote(binDir)}/*; do
  [ -L "$executable" ] || continue
  case "$(readlink "$executable")" in
    /usr/local/nvm/*|/opt/freestyle/python/*) rm -f "$executable";;
  esac
done`;
}

/** Install the shared toolchain directly in Ubuntu; workloads still run in the outer VM. */
export function freestyleSetupScript(): string {
	const pins = validatedPins();
	const script = (name: string) =>
		readFileSync(new URL(`../images/base/scripts/${name}`, import.meta.url), "utf8");
	const stage = (name: string) =>
		`cat > "$build_dir/${name}" <<'BENCH_INSTALL_SCRIPT'\n${script(name)}\nBENCH_INSTALL_SCRIPT`;
	const run = (name: string) => `${stage(name)}\nbash "$build_dir/${name}"`;
	return `${[
		"#!/usr/bin/env bash",
		"set -euo pipefail",
		"build_dir=$(mktemp -d); trap 'rm -rf \"$build_dir\"' EXIT",
		"export HOME=/root DEBIAN_FRONTEND=noninteractive",
		"unset BASH_ENV ENV NODE_PATH NODE_OPTIONS NVM_DIR NVM_BIN NVM_INC",
		"export MISE_DATA_DIR=/usr/local/share/mise MISE_CONFIG_DIR=/etc/mise",
		"export PATH=/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
		"export MISE_USE_VERSIONS_HOST=0 PIP_BREAK_SYSTEM_PACKAGES=1",
		freestyleStockToolsCleanup(),
		// These stock runtimes are replaced by the shared pins. Retaining their 3.5 GiB makes
		// Mastra's 30 GiB free-space guard skip on the standard 40 GiB disk.
		"rm -rf /usr/local/nvm /opt/freestyle/python",
		...Object.entries(toolchainBuildArgs(pins)).map(
			([key, value]) => `export ${key}=${quote(value)}`,
		),
		"mkdir -p /etc/mise",
		`cat > /etc/mise/config.toml <<'BENCH_MISE_CONFIG'\n${miseToml(pins)}BENCH_MISE_CONFIG`,
		`cat > /toolchain-manifest.json <<'BENCH_MANIFEST'\n${JSON.stringify(buildManifest(pins), null, 2)}\nBENCH_MANIFEST`,
		// Ubuntu noble's libasound2 is a virtual package without an install candidate.
		"apt-get update -qq",
		"ALSA_PKG=$(apt-get install -y -qq --dry-run libasound2 >/dev/null 2>&1 && echo libasound2 || echo libasound2t64)",
		...TOOLCHAIN_APT_GROUPS.map((group) =>
			[
				`export APT_GROUP_NAME=${quote(group.name)} APT_PACKAGES=${quote(group.packages)}`,
				// biome-ignore lint/suspicious/noTemplateCurlyInString: shell expansion
				'APT_PACKAGES="${APT_PACKAGES//libasound2/$ALSA_PKG}"; export APT_PACKAGES',
				run("00-apt.sh"),
			].join("\n"),
		),
		run("05-mise-binary.sh"),
		stage("10-mise.sh"),
		// A shared egress IP can exhaust anonymous GitHub attestation requests. Retry only that
		// transient failure, retaining verification and the already downloaded pinned assets.
		`for attempt in $(seq 1 21); do
  if bash "$build_dir/10-mise.sh" >"$build_dir/mise-install.log" 2>&1; then
    cat "$build_dir/mise-install.log"; break
  fi
  cat "$build_dir/mise-install.log"
  if ! grep -q 'API rate limit exceeded' "$build_dir/mise-install.log" || [ "$attempt" -eq 21 ]; then exit 1; fi
  echo "GitHub anonymous quota exhausted; retrying pinned mise install in 60s ($attempt/20)"
  sleep 60
done`,
		run("20-pts.sh"),
		// Installing on a running systemd VM can start these before 20-pts.sh masks them.
		"systemctl stop phoromatic-client phoromatic-server phoronix-result-server || true",
		// The stock PTS cache predates some pinned profiles; OpenBenchmarking challenges VM IPs.
		// Fetch the full install definitions from the same fixed revision as the metric catalog.
		`curl -fsSL --retry 5 --retry-all-errors -o "$build_dir/profiles.tar.gz" https://codeload.github.com/phoronix-test-suite/test-profiles/tar.gz/${PTS_PROFILE_SOURCE_REF}`,
		"mkdir -p /var/lib/phoronix-test-suite/test-profiles/pts",
		...pins.ptsInstallTests
			.split(" ")
			.map(
				(profile) =>
					`tar -xzf "$build_dir/profiles.tar.gz" -C /var/lib/phoronix-test-suite/test-profiles/pts --strip-components=2 test-profiles-${PTS_PROFILE_SOURCE_REF}/pts/${profile}`,
			),
		"export PTS_DIRECT_INSTALL=1",
		...pins.ptsInstallGroups.map(
			(group) => `export PTS_PROFILE_GROUP=${quote(group)}\n${run("25-pts-profiles.sh")}`,
		),
		// PTS shares installed payloads through its supported install-root override, but profile
		// definitions live in each user's own mutable state. Seed ubuntu with the pinned definitions
		// too, so a runtime list/run never needs OpenBenchmarking to rediscover a baked profile.
		'user_home="$(getent passwd ubuntu | cut -d: -f6)"; test -d "$user_home"',
		'install -d -o ubuntu -g ubuntu "$user_home/.phoronix-test-suite/test-profiles/pts"',
		...pins.ptsInstallTests
			.split(" ")
			.map(
				(profile) =>
					`cp -a /var/lib/phoronix-test-suite/test-profiles/pts/${profile} "$user_home/.phoronix-test-suite/test-profiles/pts/"`,
			),
		'chown -R ubuntu:ubuntu "$user_home/.phoronix-test-suite"',
		run("99-manifest.sh"),
		"if command -v typescript-language-server; then echo 'Unexpected global language server on benchmark PATH' >&2; exit 1; fi",
		"rm -rf /var/lib/apt/lists/*",
	].join("\n")}\n`;
}

if (import.meta.main) process.stdout.write(freestyleSetupScript());
