#!/usr/bin/env bash
# Orchestrates the base toolchain build: run either the named scripts passed by the Dockerfile or,
# when called without arguments, every numbered install script in order. The two-digit prefix encodes
# the build sequence (00-apt → 10-mise → 20-pts → 99-manifest).
#
# The pins each script needs arrive as environment variables (the Dockerfile passes them from build
# args sourced, in turn, from the arktype-validated TS config — packages/templates/src/pins.ts). Each
# script asserts what it needs with `: "${VAR:?}"`, so a missing pin fails the build loudly.
#
# > Thin Dockerfile, fat scripts: each Docker layer calls this orchestrator with one logical group.
# > Scripts run via `bash <script>` (not `./<script>`) so a lost exec bit from git/COPY never breaks
# > the build.
set -Eeuxo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# > Explicit groups let the Dockerfile bound compressed layer size for provider registries. Keep the
# > no-argument mode for local debugging and backwards compatibility.
if (( $# > 0 )); then
	scripts=()
	for name in "$@"; do
		[[ "${name}" =~ ^[0-9][0-9]-[a-z0-9_-]+\.sh$ ]] || { echo "invalid build script: ${name}" >&2; exit 1; }
		scripts+=("${HERE}/${name}")
	done
else
	shopt -s nullglob
	scripts=("${HERE}"/[0-9][0-9]-*.sh)
fi

(( ${#scripts[@]} > 0 )) || { echo "no build scripts selected" >&2; exit 1; }

for script in "${scripts[@]}"; do
	[[ -f "${script}" ]] || { echo "missing build script: ${script}" >&2; exit 1; }
	echo "::: running $(basename "${script}")"
	bash "${script}"
done

echo "::: base toolchain build complete"
