#!/usr/bin/env bash
# Shared helpers for the in-sandbox benchmark producer. Source from any mise task under
# /.mise/tasks/benchmark/**:
#   REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
#   source "${REPO_ROOT}/lib/bench.sh"
#
# Error-mode conventions (every task follows one):
#   1. Orchestrators (run_task + summary):        set -uo pipefail   (NO -e: run every child, report
#      at the end; run_task isolates failures and summary exits non-zero if any failed).
#   2. Measurement leaves (run_pts_benchmark/bench_cmd): set -euo pipefail  (the measured command is
#      isolated by bench_cmd; -e only guards the scaffolding around it).
#   3. Tolerant probes (cpu/info, cpu/cache):     set -uo pipefail   ("print whatever this runner
#      exposes, never fail" — built on try/get).
#
# This slice ships the cpu-node path (info, cache, PTS node-web-tooling). Helpers stay safe to call
# from `set -e` scripts: wrap anything that may legitimately fail in `|| true` or a conditional.
# --- Layout ---
#
# The helpers live in ./bench/ and are sourced below IN ORDER; this file stays the one documented
# entry point, so every task file keeps its single `source "${REPO_ROOT}/lib/bench.sh"` line.
#
#   bench/probes.sh       try / get — never-fail probes
#   bench/results.sh      results dir, skip/fail markers, manifest, bench_cmd timing
#   bench/pts-install.sh  making PTS available and configured
#   bench/pts-run.sh      running a PTS benchmark (assumes pts-install.sh is loaded)
#   bench/orchestrate.sh  run_task / summary
#
# Order matters: results.sh defines the markers pts-install.sh writes, and pts-run.sh calls into
# pts-install.sh. Sourcing a module on its own is unsupported.

# Resolve this file's own directory rather than trusting REPO_ROOT: a task that sources the facade by
# an absolute path, or through a symlink, still finds its siblings.
_bench_lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/bench"

# A missing module EXITS the sourcing task rather than returning: orchestrators deliberately run
# without `set -e` (they isolate child failures and report at the end), so a `return` would be
# ignored and the task would carry on with helpers undefined — printing its banner, calling nothing,
# and exiting successfully. That is the one outcome worse than a crash: a producer that looks like it
# ran. The monolith could not half-load; the split can, so it is guarded here.
for _bench_module in probes results pts-install pts-run orchestrate; do
	# shellcheck source=/dev/null
	if ! source "${_bench_lib_dir}/${_bench_module}.sh"; then
		echo "FATAL: lib/bench.sh could not source bench/${_bench_module}.sh — refusing to run with an incomplete helper set" >&2
		exit 1
	fi
done
unset _bench_module _bench_lib_dir
