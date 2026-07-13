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
# > PTS_INSTALL_TESTS is a space-separated list, so split it into an array to pass each profile as
# > its own argument.
printf 'y\nn\nn\nn\nn\nn\ny\n' | phoronix-test-suite batch-setup
read -ra pts_tests <<< "${PTS_INSTALL_TESTS}"

# > The cache list DERIVES from the install list (same versioned pins — caching a different version
# > than the leaves batch-run would send the runtime back to the network), plus the build-* / git
# > profiles that are cached-but-not-preinstalled (too big to bake; not yet wired to a suite).
# > network-loopback has no downloads and no-ops here harmlessly.
phoronix-test-suite make-download-cache \
	build-linux-kernel build-nodejs git "${pts_tests[@]}"
# > PTS exits 0 even when an install fails, so verify each requested profile actually reports installed.
# > A versionless entry anchors on "<test>-<version>" (versions start with a digit); a version-pinned
# > entry ("fio-2.1.0") already ends in its version, so it anchors on a following non-name character
# > instead. Both keep a profile name that is a substring of another installed test from masking its
# > own install failure.
phoronix-test-suite batch-install "${pts_tests[@]}"
installed="$(phoronix-test-suite list-installed-tests)"
for t in "${pts_tests[@]}"; do
	echo "${installed}" | grep -qE "(^|/)${t}(-[0-9]|[[:space:]]|$)" || { echo "ERROR: pre-install of ${t} failed" >&2; exit 1; }
done
