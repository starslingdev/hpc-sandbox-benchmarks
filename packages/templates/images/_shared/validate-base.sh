#!/usr/bin/env bash
# Shared base-validation run by every provider variant right after `FROM ${BASE_IMAGE}`. Asserts the
# base actually is the sandbox-benchmarks toolchain — failing the build with a clear, actionable
# message rather than letting a wrong/stale BASE_IMAGE fail opaquely at benchmark time.
set -Eeuxo pipefail

fail() {
	echo "ERROR: $* — BASE_IMAGE is not a current sandbox-benchmarks toolchain base." >&2
	echo "       Rebuild the base first (images/base) and pass its tag via --build-arg BASE_IMAGE=." >&2
	exit 1
}

# > mise + the pinned toolchain.
command -v mise >/dev/null 2>&1 || fail "mise not found on PATH"

# > The stable node path the base resolves once; consumers depend on it, not a versioned path.
[[ -x /usr/local/bin/bench-node ]] || fail "stable node symlink /usr/local/bin/bench-node missing"
bench-node --version >/dev/null 2>&1 || fail "/usr/local/bin/bench-node is not runnable"

# > Phoronix Test Suite + at least one completely pre-installed profile for offline execution.
command -v phoronix-test-suite >/dev/null 2>&1 || fail "phoronix-test-suite not found on PATH"
pts_installed="$(find /var/lib/phoronix-test-suite/installed-tests -name pts-install.json -type f -print -quit 2>/dev/null)"
[[ -n "${pts_installed}" ]] || fail "pre-installed PTS profiles missing"

# > The base's enforced manifest — present iff the base build's verification step ran.
[[ -f /toolchain-manifest.json ]] || fail "/toolchain-manifest.json missing"

echo "validate-base: ok"
