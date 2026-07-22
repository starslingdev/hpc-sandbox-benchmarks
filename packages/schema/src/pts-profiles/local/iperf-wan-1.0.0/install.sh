#!/bin/sh
# PTS local-profile install script: builds iperf 3.14 from the PTS-fetched tarball and stages the
# WAN runner + curated server list beside it. Same build conventions as the vendored pts/iperf-1.2.0
# repair: install prefix under this profile's own installed-tests dir (never $HOME — blaxel's root
# fs is RAM-backed and only the PTS data dir volume may take heavy writes), and generic -O3 instead
# of upstream iperf's -march=native (binaries may run on different hardware than they were built on;
# iperf's own CPU tuning is not the thing being benchmarked). CFLAGS_OVERRIDE still wins when set.
set -eu

# shellcheck disable=SC1007 # CDPATH= (no value) is the idiom that disables CDPATH's cd-echoes-a-path behavior for this one invocation; shellcheck misreads it as a mistyped assignment.
SRC_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if [ ! -f "${SRC_DIR}/runner.sh" ] || [ ! -f "${SRC_DIR}/servers.json" ]; then
	echo "ERROR: runner.sh or servers.json missing next to install.sh (${SRC_DIR})" >&2
	echo 1 > ~/install-exit-status
	exit 1
fi

prefix="$(pwd)/iperf-install"
rm -rf iperf-3.14 "$prefix"
tar -zxf iperf-3.14.tar.gz
cd iperf-3.14
if [ "${CFLAGS_OVERRIDE:-}" = "" ]; then
	CFLAGS="${CFLAGS:-} -O3"
else
	CFLAGS="$CFLAGS_OVERRIDE"
fi
./configure --prefix="$prefix" CFLAGS="$CFLAGS"
make -j "${NUM_CPU_CORES:-2}"
make install
cd ..
rm -rf iperf-3.14

cp "${SRC_DIR}/servers.json" .
# The PTS executable convention: an executable named after the versionless profile dir.
cp "${SRC_DIR}/runner.sh" iperf-wan
chmod +x iperf-wan

echo 0 > ~/install-exit-status
