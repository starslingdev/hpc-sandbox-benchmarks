#!/usr/bin/env bash
# Install the Phoronix Test Suite, pre-seed its offline download caches, and pre-install the small
# profiles so sandbox wall time goes to benchmarks, not setup. Pins arrive as environment variables
# (from the arktype-validated packages/templates/src/pins.ts via build-args). Runs after 10-mise so
# pyperformance's pip-install targets the mise-managed python on PATH.
set -Eeuxo pipefail

# > Fail fast if a pin didn't make it into the env (build.sh + arktype already validated the values).
: "${PTS_VERSION:?}"
: "${PTS_DEB_SHA256:?}"
: "${PTS_INSTALL_TESTS:?}"

# > Fetch + verify the .deb from GitHub releases (the only host reliably reachable from sandbox
# > networks), then install. dpkg first, apt -f to pull any missing runtime deps.
curl -fsSL --retry 5 --retry-all-errors -o /tmp/pts.deb \
	"https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/v${PTS_VERSION}/phoronix-test-suite_${PTS_VERSION}_all.deb"
echo "${PTS_DEB_SHA256}  /tmp/pts.deb" | sha256sum -c -
apt-get update
dpkg -i /tmp/pts.deb || apt-get install -y --no-install-recommends -f
rm -rf /tmp/pts.deb /var/lib/apt/lists/*
phoronix-test-suite version

# > Non-interactive batch config + offline download caches for the PTS-backed suites. Build and
# > sandboxes both run as root, so PTS state under /var/lib/phoronix-test-suite lines up at runtime.
# > (network-loopback has no downloads — its runner is a generated dd|nc script.)
printf 'y\nn\nn\nn\nn\nn\ny\n' | phoronix-test-suite batch-setup
phoronix-test-suite make-download-cache \
	build-linux-kernel build-nodejs c-ray compress-zstd fio git node-web-tooling pyperformance

# > Pre-install the small profiles so every provider runs byte-identical harnesses. PTS_INSTALL_TESTS
# > is a space-separated list, so split it into an array to pass each profile as its own argument.
read -ra pts_tests <<< "${PTS_INSTALL_TESTS}"
# > PTS exits 0 even when an install fails, so verify each requested profile actually reports installed.
# > Anchor on "<test>-<version>" (versions start with a digit) so a profile name that is a substring of
# > another installed test can't mask its own install failure.
phoronix-test-suite batch-install "${pts_tests[@]}"
installed="$(phoronix-test-suite list-installed-tests)"
for t in "${pts_tests[@]}"; do
	echo "${installed}" | grep -qE "(^|/)${t}-[0-9]" || { echo "ERROR: pre-install of ${t} failed" >&2; exit 1; }
done
