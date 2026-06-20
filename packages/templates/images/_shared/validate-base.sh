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

# > Phoronix Test Suite + its pre-seeded offline caches (the whole point of baking the base).
command -v phoronix-test-suite >/dev/null 2>&1 || fail "phoronix-test-suite not found on PATH"
[[ -d /var/lib/phoronix-test-suite/download-cache ]] || fail "PTS download cache missing"

# > The base's enforced manifest — present iff the base build's verification step ran.
[[ -f /toolchain-manifest.json ]] || fail "/toolchain-manifest.json missing"

echo "validate-base: ok"
