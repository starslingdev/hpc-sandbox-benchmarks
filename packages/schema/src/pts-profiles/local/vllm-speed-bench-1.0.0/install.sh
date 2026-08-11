#!/usr/bin/env bash
# The image owns dependencies; PTS installs only the repository-owned runner.
set -eu

# Same override the runner reads, so installation validates the executable the benchmark then runs.
vllm_bin="${BENCH_VLLM_BIN:-/opt/vllm/bin/vllm}"
profile_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
runner="${profile_dir}/runner.sh"
if [ ! -x "$vllm_bin" ] || [ ! -f "$runner" ]; then
	echo "ERROR: vLLM or runner is missing: ${vllm_bin}, ${runner}" >&2
	echo 1 >"${HOME}/install-exit-status"
	exit 1
fi
"$vllm_bin" --version
cp "$runner" "${HOME}/vllm"
chmod +x "${HOME}/vllm"
echo 0 >"${HOME}/install-exit-status"
