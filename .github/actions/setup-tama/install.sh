#!/usr/bin/env bash
# Install the tama CLI on the runner. tama publishes no SDK, so the adapter spawns this binary for
# every control-plane call — without it the cell dies at ENOENT on its first authentication probe,
# before any sandbox exists.
#
# The vendor's own installer (`curl https://tama.computer/install | sh`) verifies the archive against
# a .sha256 served from the SAME origin, which is self-certifying: it proves the download was not
# truncated, not that the bytes are the ones anyone reviewed. So the archive is fetched directly and
# checked against a sha256 committed to THIS repo, the same posture as the pinned mise/PTS artifacts.
#
# tama serves only `downloads/latest` — a versioned path returns the marketing SPA with a 200 — so the
# pin cannot ride the URL and a new upstream release WILL fail this step. That is the intended
# failure: refresh the pin in action.yml (the command is in the error below) rather than run an
# unreviewed binary that creates billable machines.
set -euo pipefail

archive="tama-x86_64-unknown-linux-gnu.tar.gz"
url="https://tama.computer/downloads/latest/${archive}"
workdir="$(mktemp -d "${RUNNER_TEMP:-/tmp}/tama-install.XXXXXX")"
trap 'rm -rf "$workdir"' EXIT

curl -fsSL --retry 3 --retry-connrefused "$url" -o "${workdir}/${archive}"

observed="$(sha256sum "${workdir}/${archive}" | cut -d' ' -f1)"
if [[ "$observed" != "$TAMA_SHA256" ]]; then
	cat >&2 <<-EOF
		tama CLI checksum mismatch for ${url}
		  expected ${TAMA_SHA256}
		  observed ${observed}
		tama serves a single moving "latest" build, so this is most likely a new release rather than a
		compromised download. Verify the release, then refresh the pin in
		.github/actions/setup-tama/action.yml:
		  curl -fsSL ${url} | sha256sum
	EOF
	exit 1
fi

tar -xzf "${workdir}/${archive}" -C "$workdir"
install -m 0755 "${workdir}/tama" /usr/local/bin/tama

# The pin is on the ARCHIVE; assert the version it unpacks to as well, so the log records exactly
# which CLI drove the run and a silently re-cut release under the same hash cannot pass unnoticed.
observed_version="$(tama --version | awk '{print $2}')"
if [[ "$observed_version" != "$TAMA_VERSION" ]]; then
	echo "tama CLI reports ${observed_version}, expected ${TAMA_VERSION}" >&2
	exit 1
fi
echo "tama ${observed_version} installed (sha256 ${observed})"
