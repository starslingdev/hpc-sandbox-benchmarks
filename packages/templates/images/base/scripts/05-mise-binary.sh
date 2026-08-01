#!/usr/bin/env bash
# Install the pinned mise BINARY. Split out of 00-apt.sh so it is its own Docker layer: 00-apt.sh now
# runs once per apt group, and the mise fetch must happen exactly once, after the plumbing group has
# provided curl + ca-certificates.
#
# The tools mise MANAGES (node, python, pnpm, hyperfine, warp, jc, quarto) are installed separately in
# 10-mise.sh, which is again its own layer.
set -Eeuxo pipefail

# > MISE_VERSION is the pinned mise *release* version (see pins.ts), installed from GitHub releases
# > below — NOT apt. mise's apt repo is rolling (it only serves the latest version), so a pinned
# > `apt install mise=<ver>` breaks the moment mise publishes a new release; an immutable release
# > asset keeps the pin reproducible.
: "${MISE_VERSION:?}"

# > Install from the immutable GitHub release asset (version-locked URL, no remote install script
# > executed) to a stable system path, then verify against the sha256 pinned in pins.ts and passed as a
# > build arg — a committed checksum, not one fetched next to the binary, so a corrupted/MITM'd
# > download or a swapped release asset fails the build. dpkg arch selects both the mise asset arch and
# > its matching pinned sha.
case "$(dpkg --print-architecture)" in
	amd64) mise_arch="x64";   mise_sha="${MISE_SHA256_X64:?}" ;;
	arm64) mise_arch="arm64"; mise_sha="${MISE_SHA256_ARM64:?}" ;;
	*) echo "unsupported architecture: $(dpkg --print-architecture)" >&2; exit 1 ;;
esac
mise_url="https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/mise-v${MISE_VERSION}-linux-${mise_arch}"
curl -fsSL --retry 5 --retry-all-errors -o /usr/local/bin/mise "${mise_url}"
echo "${mise_sha}  /usr/local/bin/mise" | sha256sum -c -
chmod +x /usr/local/bin/mise
mise --version
