#!/usr/bin/env bash
# Verification manifest — enforced, not assumed. Each probe below fails the build if its component
# is missing or broken, and the resulting /toolchain-manifest.json lets CI diff toolchains across
# providers and fail on drift.
set -Eeuxo pipefail

: "${IMAGE_NAME:?}"
: "${IMAGE_VERSION:?}"
: "${BASE_IMAGE:?}"
: "${PTS_INSTALL_TESTS:?}"

# > Probe each component; any failure here aborts the build (set -e). Output is staged in /tmp and
# > consumed by the python step below. node/python come from mise (10-mise); PTS from 20-pts.
mise --version > /tmp/m.mise_version
mise ls --json > /tmp/m.mise_ls
bench-node --version > /tmp/m.node_version
python3 --version > /tmp/m.python_version
phoronix-test-suite version > /tmp/m.pts_version
phoronix-test-suite list-installed-tests > /tmp/m.installed
ls -1 /var/lib/phoronix-test-suite/download-cache > /tmp/m.dlcache
# > PTS exits 0 even when downloads fail, so an empty cache would silently ship a toolchain that
# > benchmarks nothing — fail the build instead (the whole point of baking is the pre-seeded cache).
[ -s /tmp/m.dlcache ] || { echo "ERROR: PTS download-cache is empty (make-download-cache failed?)" >&2; exit 1; }
# > Stable content hash of the system-wide mise tree (excluding the volatile cache) — a cheap
# > fingerprint CI can compare across rebuilds.
find /usr/local/share/mise -type f ! -path '*/cache/*' -print0 | sort -z \
	| xargs -r0 sha256sum | sha256sum | cut -d' ' -f1 > /tmp/m.mise_sha

python3 - <<'PY'
import json
import os


def slurp(path):
    with open(path) as f:
        return f.read().strip()


manifest = {
    "image_name": os.environ["IMAGE_NAME"],
    "image_version": os.environ["IMAGE_VERSION"],
    "base_image": os.environ["BASE_IMAGE"],
    "pts_install_tests": os.environ["PTS_INSTALL_TESTS"],
    "node_version": slurp("/tmp/m.node_version"),
    "python_version": slurp("/tmp/m.python_version"),
    "mise_version": slurp("/tmp/m.mise_version"),
    "mise_ls": json.loads(slurp("/tmp/m.mise_ls")),
    "mise_tree_sha256": slurp("/tmp/m.mise_sha"),
    "pts_version": slurp("/tmp/m.pts_version"),
    "pts_download_cache": sorted(slurp("/tmp/m.dlcache").splitlines()),
    "pts_installed_tests": sorted(
        # > Keep only the test identifier; list-installed-tests appends a volatile description that
        # > would otherwise churn the manifest and trip CI's cross-provider drift diff.
        line.strip().split()[0]
        for line in slurp("/tmp/m.installed").splitlines()
        if line.strip().startswith(("pts/", "local/"))
    ),
}
with open("/toolchain-manifest.json", "w") as f:
    json.dump(manifest, f, indent=2, sort_keys=True)
    f.write("\n")
PY

# > Clean up the scratch probes; keep only the manifest.
rm -f /tmp/m.*
cat /toolchain-manifest.json
