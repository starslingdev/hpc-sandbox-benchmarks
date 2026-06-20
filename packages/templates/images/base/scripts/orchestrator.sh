#!/usr/bin/env bash
# Orchestrates the base toolchain build: run each numbered install script in order. The two-digit
# prefix encodes the build sequence (00-apt → 10-mise → 20-pts → 99-manifest); dropping a new
# NN-*.sh into this directory adds it to the build with no edit here.
#
# The pins each script needs arrive as environment variables (the Dockerfile passes them from build
# args sourced, in turn, from the arktype-validated TS config — packages/templates/src/pins.ts). Each
# script asserts what it needs with `: "${VAR:?}"`, so a missing pin fails the build loudly.
#
# > Thin Dockerfile, fat scripts: the Dockerfile's only RUN is this orchestrator. Scripts run via
# > `bash <script>` (not `./<script>`) so a lost exec bit from git/COPY never breaks the build.
set -Eeuxo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# > nullglob so the loop is a no-op (not the literal pattern) if a stage hasn't landed yet.
shopt -s nullglob
for script in "${HERE}"/[0-9][0-9]-*.sh; do
	echo "::: running $(basename "${script}")"
	bash "${script}"
done

echo "::: base toolchain build complete"
