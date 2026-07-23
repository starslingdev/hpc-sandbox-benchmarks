#!/bin/sh
# Shared environment setup for the realworld PTS scripts (ENG-135/136/137/138), SOURCED by both
# install.sh and realworld-runner.sh — never executed on its own. install.sh copies it next to
# target.env + the runner into the PTS install dir (exactly as it copies realworld-runner.sh), and
# both scripts `.` it, so the HOME/mise/Node fix lives in ONE place instead of drifting across two
# near-identical copies.
#
# Why it exists: PTS invokes install.sh and the generated executable wrapper with HOME pointed at
# the installed-test dir (often with a trailing slash) and frequently strips MISE_*, so mise shims
# fall through to an ambient nvm/distro Node instead of the harness-provisioned one — which broke
# mastra's tilde tests, openclaw's path-normalization unit tests, and openclaw's engines gate.
#
# Effect of sourcing (under the callers' `set -eu`):
#   - REALWORLD_HOME -> the real user home, trailing slash stripped (resolved from the passwd db,
#     never from $HOME, which PTS owns and mangles).
#   - MISE_DATA_DIR / MISE_CONFIG_DIR / MISE_CACHE_DIR -> the real user's mise (or the container
#     image's /mise), so `mise which node` resolves the harness toolchain.
#   - PATH -> mise shims + the resolved node dir prepended, so the intended Node wins.
# It deliberately does NOT touch HOME: install.sh leaves PTS's HOME as-is (no tests run at install
# time), and realworld-runner.sh resets HOME to REALWORLD_HOME itself — only the runner needs it,
# for the upstream suites' tilde-path assertions.

# Real user home. PTS points HOME at the install dir, so resolve it from the passwd db, not $HOME.
REALWORLD_HOME="$(getent passwd "$(id -un)" 2>/dev/null | cut -d: -f6 || true)"
if [ -z "${REALWORLD_HOME}" ] || [ ! -d "${REALWORLD_HOME}" ]; then
	REALWORLD_HOME="/home/$(id -un)"
fi
REALWORLD_HOME="${REALWORLD_HOME%/}"

# Point mise at the real user's data/config (PTS strips MISE_*), or the container image's /mise if
# present, and put its shims first on PATH.
if [ -d "${REALWORLD_HOME}/.local/share/mise" ]; then
	export MISE_DATA_DIR="${REALWORLD_HOME}/.local/share/mise"
	export MISE_CONFIG_DIR="${REALWORLD_HOME}/.config/mise"
	export MISE_CACHE_DIR="${REALWORLD_HOME}/.cache/mise"
fi
if [ -d /mise ]; then
	export MISE_DATA_DIR=/mise MISE_CONFIG_DIR=/mise MISE_CACHE_DIR=/mise/cache
	PATH="/mise/shims:${PATH}"
elif [ -d "${REALWORLD_HOME}/.local/share/mise/shims" ]; then
	PATH="${REALWORLD_HOME}/.local/share/mise/shims:${REALWORLD_HOME}/.local/bin:${PATH}"
fi
# Resolve the concrete node binary — shims alone still resolve the wrong binary if mise is missing
# from PATH under PTS's sanitized env.
if command -v mise >/dev/null 2>&1; then
	_node_bin="$(mise which node 2>/dev/null || true)"
	if [ -n "${_node_bin}" ] && [ -x "${_node_bin}" ]; then
		PATH="$(dirname "${_node_bin}"):${PATH}"
	fi
fi
export PATH
unset _node_bin
