#!/usr/bin/env bash
# Pre-install Phoronix Test Suite profiles used by the synthetic host suites so
# `mise run benchmark:{cpu:node,disk:all,network:suite,memory:all,system:all}` spend wall time on
# measurement, not download/compile.
#
# Idempotent: already-installed profiles are skipped. Needs sudo for the first-time PTS apt path
# (via ensure_pts). Safe to re-run after a snapshot restore.
#
# Intentionally NOT part of the Cursor Cloud startup update script — a cold warm can take many
# minutes (git ~450 MB, fio/iperf/stream compiles). Run once when building the cloud VM snapshot:
#   SUDO=sudo ./scripts/warm-synthetic-pts.sh
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"
# shellcheck disable=SC1091 # sourced helpers live next to the repo root; not a shellcheck input.
source "${REPO_ROOT}/lib/bench.sh"

echo "========================================"
echo "  Warm synthetic PTS profiles (host VM)"
echo "========================================"

if ! ensure_pts; then
	echo "ERROR: ensure_pts could not make phoronix-test-suite available" >&2
	exit 1
fi

# Leaf-specific tools the skip guards check before measurement.
missing=()
for bin in stress-ng nc jq php; do
	have "$bin" || missing+=("$bin")
done
if [ "${#missing[@]}" -gt 0 ]; then
	echo "ERROR: missing required tools: ${missing[*]}" >&2
	echo "ensure_pts should have installed these; re-run with SUDO=sudo" >&2
	exit 1
fi

# Seed sources PTS's own downloader is single-shot for. Never fatal: seed_pts_download_cache
# returns 0 even when every URL fails (batch-install then gets its own chance).
#
# iperf: localhost + WAN leaves share the same tarball.
seed_pts_download_cache "iperf-3.14.tar.gz" \
	"723fcc430a027bc6952628fa2a3ac77584a1d0bd328275e573fc9b206c155004" \
	"https://downloads.es.net/pub/iperf/iperf-3.14.tar.gz" \
	"https://sources.buildroot.net/iperf3/iperf-3.14.tar.gz"
# fio: OpenBenchmarking pins http://brick.kernel.dk/snaps/fio-3.36.tar.gz, which is frequently
# unreachable (PTS issue #865). Ubuntu's fio_3.36.orig.tar.gz is the same bytes (matching SHA256);
# seed under the filename PTS looks for so batch-install copies from cache.
seed_pts_download_cache "fio-3.36.tar.gz" \
	"0a07354876ca4d23518f8aa88682f23866455bbd2ff2d0f055d6e4b72f156553" \
	"http://archive.ubuntu.com/ubuntu/pool/universe/f/fio/fio_3.36.orig.tar.gz" \
	"https://launchpad.net/ubuntu/+archive/primary/+sourcefiles/fio/3.36-1/fio_3.36.orig.tar.gz" \
	"https://web.archive.org/web/2020/http://brick.kernel.dk/snaps/fio-3.36.tar.gz"

# Repo-local profiles (PTS will not fetch these).
install_local_pts_profile "hardlink-1.0.0"
install_local_pts_profile "iperf-wan-1.0.0"

# Vendored overrides that leaves stage before install/run (same pts/<name> identifiers).
# Only restage when not already installed — install_vendored_pts_profile always discards the
# installed tree, which would force a rebuild on every warm re-run.
for vendored in iperf-1.2.0 network-loopback-1.0.3 fast-cli-1.0.0; do
	if _pts_is_installed "pts/${vendored}"; then
		echo "already installed: pts/${vendored} (skip vendored restage)"
	else
		install_vendored_pts_profile "$vendored"
	fi
done

# STREAM: pin the same working set the memory leaf measures (see benchmark:memory:pts:stream).
# Export before batch-install so a cold install compiles the pinned binary.
STREAM_ARRAY_SIZE=150000000
march=native
if grep -qi gvisor /proc/version 2>/dev/null; then
	march=x86-64-v3
fi
export CFLAGS_OVERRIDE="-O3 -march=${march} -DSTREAM_ARRAY_SIZE=${STREAM_ARRAY_SIZE}"

# Upstream OpenBenchmarking profiles the synthetic suites batch-run (version-pinned to leaves).
# Skip anything already registered so re-runs stay cheap.
pts_targets=(
	pts/pybench-1.1.3
	pts/sqlite-speedtest-1.0.1
	pts/fio-2.1.0
	pts/network-loopback-1.0.3
	pts/iperf-1.2.0
	pts/stream-1.3.4
	pts/node-web-tooling-1.0.1
	pts/fast-cli-1.0.0
	pts/git-1.1.0
	local/hardlink-1.0.0
	local/iperf-wan-1.0.0
)

to_install=()
for t in "${pts_targets[@]}"; do
	if _pts_is_installed "$t"; then
		echo "already installed: ${t}"
	else
		# A prior INSTALL_FAILED leaves a pts-install.json tombstone that can confuse a retry;
		# discard incomplete installs before batch-install (same idea as install_vendored_pts_profile).
		case "$t" in
		pts/*) rm -rf "$(pts_install_root)/pts/${t#pts/}" ;;
		local/*) rm -rf "$(pts_install_root)/local/${t#local/}" ;;
		esac
		to_install+=("$t")
	fi
done

if [ "${#to_install[@]}" -eq 0 ]; then
	echo "All synthetic PTS profiles already installed."
else
	echo "batch-install: ${to_install[*]}"
	# PTS can exit 0 after a partial failure; verify each target below.
	phoronix-test-suite batch-install "${to_install[@]}" || true
fi

failed=()
for t in "${pts_targets[@]}"; do
	if _pts_is_installed "$t"; then
		echo "OK  ${t}"
	else
		echo "MISSING  ${t}" >&2
		failed+=("$t")
	fi
done

if [ "${#failed[@]}" -gt 0 ]; then
	echo "ERROR: warm incomplete — missing: ${failed[*]}" >&2
	exit 1
fi

mkdir -p "${HOME}/.cache/sandbox-benchmarks"
date -u +%Y-%m-%dT%H:%M:%SZ >"${HOME}/.cache/sandbox-benchmarks/synthetic-pts-warm.stamp"

echo
echo "Warm complete. Synthetic suite entrypoints:"
echo "  mise run benchmark:cpu:node"
echo "  mise run benchmark:disk:all"
echo "  mise run benchmark:network:suite"
echo "  mise run benchmark:memory:all"
echo "  mise run benchmark:system:all"
echo
phoronix-test-suite list-installed-tests
