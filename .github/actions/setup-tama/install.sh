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
# tama retains archives under `downloads/<version>`, so select the immutable release in the URL as
# well as checking its archive against the sha256 committed to this repo. The independent checksum
# still protects against an upstream release being silently replaced.
set -euo pipefail

: "${TAMA_VERSION:?TAMA_VERSION is required}"
: "${TAMA_SHA256:?TAMA_SHA256 is required}"

archive="tama-x86_64-unknown-linux-gnu.tar.gz"
url="https://tama.computer/downloads/${TAMA_VERSION}/${archive}"
workdir="$(mktemp -d "${RUNNER_TEMP:-/tmp}/tama-install.XXXXXX")"
trap 'rm -rf "$workdir"' EXIT

echo "tama: downloading ${archive} (version ${TAMA_VERSION})"
echo "tama: ${url}"
curl -fsSL --retry 3 --retry-connrefused "$url" -o "${workdir}/${archive}"

observed="$(sha256sum "${workdir}/${archive}" | cut -d' ' -f1)"
if [[ "$observed" != "$TAMA_SHA256" ]]; then
	cat >&2 <<-EOF
		tama CLI checksum mismatch for ${url}
		  expected ${TAMA_SHA256}
		  observed ${observed}
		The versioned tama archive no longer matches the checksum committed to this repository.
		Verify the release before refreshing the pin in .github/actions/setup-tama/action.yml:
		  curl -fsSL ${url} | sha256sum
	EOF
	exit 1
fi

tar -xzf "${workdir}/${archive}" -C "$workdir"
if [[ ! -x "${workdir}/tama" ]]; then
	cat >&2 <<-EOF
		tama: archive layout unexpected — expected executable ${workdir}/tama after extracting ${archive}
		  url: ${url}
		  archive contents:
		$(tar -tzf "${workdir}/${archive}" | sed 's/^/    /')
	EOF
	exit 1
fi

install_dir="${TAMA_INSTALL_DIR:-/usr/local/bin}"
mkdir -p "$install_dir"
install -m 0755 "${workdir}/tama" "${install_dir}/tama"

# The pin is on the ARCHIVE; assert the version it unpacks to as well, so the log records exactly
# which CLI drove the run and a silently re-cut release under the same hash cannot pass unnoticed.
if [[ ! -x "${install_dir}/tama" ]]; then
	echo "tama: installed binary is missing or not executable at ${install_dir}/tama" >&2
	exit 1
fi
observed_version="$("${install_dir}/tama" --version | awk '{print $2}')"
if [[ "$observed_version" != "$TAMA_VERSION" ]]; then
	echo "tama CLI reports ${observed_version}, expected ${TAMA_VERSION}" >&2
	exit 1
fi
echo "tama ${observed_version} installed at ${install_dir}/tama (sha256 ${observed})"
