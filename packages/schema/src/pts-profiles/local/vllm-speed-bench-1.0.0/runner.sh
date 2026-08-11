#!/usr/bin/env bash
# Own the online server/client pair so every PTS exit path also stops the GPU-serving process.
set -uo pipefail

vllm_bin="${BENCH_VLLM_BIN:-/opt/vllm/bin/vllm}"
dataset_dir="${SPEED_BENCH_DATASET_DIR:-/models/speed-bench}"
native_results_dir="${BENCH_VLLM_NATIVE_RESULTS_DIR:-}"
kernel_cache_dir="${BENCH_VLLM_KERNEL_CACHE_DIR:-}"
ready_timeout_seconds="${BENCH_VLLM_READY_TIMEOUT_SECONDS:-2700}"
client_timeout_seconds="${BENCH_VLLM_CLIENT_TIMEOUT_SECONDS:-600}"
log_file="${LOG_FILE:?LOG_FILE is required}"
status=1
server_pid=""
server_log=""
readiness_watchdog_pid=""
result=""

if [ -n "$native_results_dir" ]; then
	# Checked explicitly because this runner does not use errexit (see the client invocation, whose
	# exit status is inspected). Every artifact below — argv, env, native JSON, both logs — is written
	# under this directory, so continuing without it would run the benchmark and retain nothing.
	if ! mkdir -p "$native_results_dir"; then
		echo "ERROR: could not create the native results directory: ${native_results_dir}" >&2
		exit 1
	fi
fi

# shellcheck disable=SC2329 # Invoked directly and by the EXIT trap.
stop_readiness_watchdog() {
	if [ -n "$readiness_watchdog_pid" ] && kill -0 "$readiness_watchdog_pid" 2>/dev/null; then
		# The watchdog owns a process group so cancellation also stops its sleeping timer. Killing
		# only the shell leaves `sleep` alive and makes this wait consume the full readiness budget.
		kill -TERM -- "-$readiness_watchdog_pid" 2>/dev/null || true
		wait "$readiness_watchdog_pid" 2>/dev/null || true
	fi
	readiness_watchdog_pid=""
}

# shellcheck disable=SC2329 # Invoked by the EXIT trap.
stop_server() {
	stop_readiness_watchdog
	if [ -n "$server_pid" ] && kill -0 "$server_pid" 2>/dev/null; then
		kill -TERM -- "-$server_pid" 2>/dev/null || true
		for _ in $(seq 1 5); do
			server_state="$(ps -o stat= -p "$server_pid" 2>/dev/null | tr -d '[:space:]')"
			[ -n "$server_state" ] || break
			case "$server_state" in
				Z*) break ;;
			esac
			sleep 1
		done
		# Reap a stopped leader immediately and kill only any children that ignored TERM. The vLLM
		# abort path is normally immediate; five seconds is enough to flush its log without charging
		# every benchmark for a stuck multiprocessing resource tracker.
		kill -KILL -- "-$server_pid" 2>/dev/null || true
	fi
	if [ -n "$server_pid" ]; then
		wait "$server_pid" 2>/dev/null || true
	fi
	if [ -n "$native_results_dir" ] && [ -n "$server_log" ] && [ -f "$server_log" ]; then
		cp "$server_log" "$native_results_dir/server.log" ||
			echo "WARNING: could not update canonical server log" >&2
	fi
	echo "$status" >"${HOME}/test-exit-status"
}
# shellcheck disable=SC2329 # Invoked by the signal traps.
on_signal() {
	status="$1"
	exit "$status"
}

snapshot_metrics() {
	local phase="$1"
	local output="${native_results_dir}/${result}.metrics.${phase}.prom"

	[ -n "$native_results_dir" ] && [ -n "$result" ] || return 0
	if ! curl --connect-timeout 2 --max-time 5 -fsS http://127.0.0.1:8000/metrics >"$output"; then
		echo "WARNING: could not capture ${phase} vLLM metrics" >&2
		rm -f "$output"
	fi
}

write_argv() {
	local output="$1"
	shift
	printf '%q ' "$@" >"$output"
	printf '\n' >>"$output"
}
trap stop_server EXIT
trap 'on_signal 129' HUP
trap 'on_signal 130' INT
trap 'on_signal 143' TERM

if [ "${1:-}" != "speed-bench" ]; then
	echo "ERROR: expected the speed-bench workload" >&2
	exit 1
fi
shift

model=""
revision=""
client_args=()
while [ "$#" -gt 0 ]; do
	case "$1" in
		--model)
			[ "$#" -ge 2 ] || { echo "ERROR: --model requires a value" >&2; exit 1; }
			model="$2"
			client_args+=("$1" "$2")
			shift 2
			;;
		--revision)
			[ "$#" -ge 2 ] || { echo "ERROR: --revision requires a value" >&2; exit 1; }
			revision="$2"
			shift 2
			;;
		*)
			client_args+=("$1")
			shift
			;;
	esac
done

if [ -z "$model" ] || [ -z "$revision" ]; then
	echo "ERROR: the profile must pin --model and --revision" >&2
	exit 1
fi
model_cache_root="${HF_HUB_CACHE:-}"
model_slug="${model//\//--}"
model_path="${model_cache_root}/models--${model_slug}/snapshots/${revision}"
if [ -z "$model_cache_root" ] || [ ! -s "${model_path}/tokenizer.json" ]; then
	echo "ERROR: pinned local tokenizer snapshot is missing: ${model_path}" >&2
	exit 1
fi
# The profile declares RequiresInternet FALSE and the snapshot above is prepared and validated before
# the run, so pin every Hugging Face client — server and benchmark client both inherit this — to the
# local cache. An incomplete snapshot then fails immediately instead of silently re-resolving it over
# the network and charging the measured window for the transfer.
export HF_HUB_OFFLINE=1
if ! [[ "$ready_timeout_seconds" =~ ^[1-9][0-9]*$ ]]; then
	echo "ERROR: BENCH_VLLM_READY_TIMEOUT_SECONDS must be a positive integer" >&2
	exit 1
fi
if ! [[ "$client_timeout_seconds" =~ ^[1-9][0-9]*$ ]]; then
	echo "ERROR: BENCH_VLLM_CLIENT_TIMEOUT_SECONDS must be a positive integer" >&2
	exit 1
fi

# CUDA headers make FlashInfer's SM120 translation units memory intensive. Keep compile fan-out
# bounded for a cold seed. A successful seed snapshots this local cache directory into the immutable
# runtime image, so measured consumers neither copy a distributed filesystem nor compile from cold.
server_env=(
	env
	"MAX_JOBS=${BENCH_VLLM_MAX_JOBS:-1}"
	"FLASHINFER_NVCC_THREADS=${BENCH_VLLM_NVCC_THREADS:-1}"
	# The benchmark has an explicit KV-cache budget, so skip vLLM's redundant CUDA-graph memory
	# estimate. This does not disable CUDA graphs; capture remains required and verified below.
	"VLLM_MEMORY_PROFILER_ESTIMATE_CUDAGRAPHS=0"
)
if [ -n "$kernel_cache_dir" ]; then
	# This runner deliberately does not use errexit (the client's exit status is inspected, and the
	# cleanup path must survive partial failures), so a directory the server env then points at has to
	# be checked explicitly. Without it the server would start with cache paths that cannot be written
	# and silently recompile every kernel.
	if ! mkdir -p "$kernel_cache_dir/home" "$kernel_cache_dir/xdg" \
		"$kernel_cache_dir/triton" "$kernel_cache_dir/vllm"; then
		echo "ERROR: could not create the kernel cache directories under ${kernel_cache_dir}" >&2
		exit 1
	fi
	server_env+=(
		"HOME=${kernel_cache_dir}/home"
		"TRITON_CACHE_DIR=${kernel_cache_dir}/triton"
		"VLLM_CACHE_ROOT=${kernel_cache_dir}/vllm"
		"XDG_CACHE_HOME=${kernel_cache_dir}/xdg"
	)
fi
if [ ! -s "${dataset_dir}/qualitative.jsonl" ]; then
	echo "ERROR: prepared SPEED-Bench dataset not found: ${dataset_dir}/qualitative.jsonl" >&2
	exit 1
fi

num_gpus="$(nvidia-smi --query-gpu=name --format=csv,noheader | wc -l | tr -d ' ')"
if ! [[ "$num_gpus" =~ ^[1-9][0-9]*$ ]]; then
	echo "ERROR: visible GPU count is invalid: ${num_gpus}" >&2
	exit 1
fi
if [ "$num_gpus" -ne 1 ]; then
	echo "ERROR: the gVisor benchmark requires exactly one visible GPU, found ${num_gpus}" >&2
	exit 1
fi

server_args=(
	"$vllm_bin" serve "$model"
	--revision "$revision"
	--served-model-name "$model"
	--trust-remote-code
	--tokenizer "$model_path"
	--tensor-parallel-size 1
	--pipeline-parallel-size 1
	--kv-cache-dtype fp8
	--block-size 32
	--max-model-len 32768
	--max-num-seqs 16
	# Modal exposes the read-only model Volume as 9P, which vLLM cannot auto-detect as a network
	# filesystem. Explicit prefetch overlaps the four safetensors shards through the OS page cache.
	--safetensors-load-strategy prefetch
	--kv-cache-memory-bytes 48G
	--async-scheduling
	--optimization-level 2
	--compilation-config '{"cudagraph_mode":"FULL_AND_PIECEWISE"}'
	--disable-uvicorn-access-log
)
case "${BENCH_VLLM_FLASHINFER_AUTOTUNE:-disabled}" in
	disabled)
		# SM120 sparse-MLA autotuning took longer than 30 minutes in a live ephemeral Modal
		# Sandbox. Keep the critical CUDA graphs while using FlashInfer's deterministic tactic
		# heuristic; an explicit cache-warming run can enable tuning and persist its output.
		server_args+=(--kernel-config '{"enable_flashinfer_autotune":false}')
		;;
	enabled) ;;
	*)
		echo "ERROR: BENCH_VLLM_FLASHINFER_AUTOTUNE must be disabled or enabled" >&2
		exit 1
		;;
esac

benchmark_args=(
	"$vllm_bin" bench serve
	--backend openai-chat
	--endpoint /v1/chat/completions
	--host 127.0.0.1
	--port 8000
	--ready-check-timeout-sec 60
	--tokenizer "$model_path"
	--dataset-path "$dataset_dir"
	"${client_args[@]}"
)
native_args=()
if [ -n "$native_results_dir" ]; then
	# Build the recorded environment snapshots BEFORE the signature and hash the same bytes that get
	# written, so a trial can never be filed under a configuration its own recorded evidence
	# contradicts. Hashing only the argv left the inherited serving environment (NCCL/GLOO transport,
	# host IP, cache roots) and the client's thread count out of the identity, so two trials that
	# differed in any of them were grouped as repeats of one configuration. Both snapshots are emitted
	# in a fixed order, so the digest is stable across runs.
	server_env_snapshot="$(
		printf 'GLOO_SOCKET_IFNAME=%q\n' "${GLOO_SOCKET_IFNAME:-}"
		printf 'NCCL_P2P_DISABLE=%q\n' "${NCCL_P2P_DISABLE:-}"
		printf 'NCCL_SHM_DISABLE=%q\n' "${NCCL_SHM_DISABLE:-}"
		printf 'NCCL_SOCKET_IFNAME=%q\n' "${NCCL_SOCKET_IFNAME:-}"
		printf 'VLLM_HOST_IP=%q\n' "${VLLM_HOST_IP:-}"
		printf 'MAX_JOBS=%q\n' "${BENCH_VLLM_MAX_JOBS:-1}"
		printf 'FLASHINFER_NVCC_THREADS=%q\n' "${BENCH_VLLM_NVCC_THREADS:-1}"
		printf 'VLLM_MEMORY_PROFILER_ESTIMATE_CUDAGRAPHS=0\n'
		printf 'BENCH_VLLM_FLASHINFER_AUTOTUNE=%q\n' \
			"${BENCH_VLLM_FLASHINFER_AUTOTUNE:-disabled}"
		printf 'HF_HUB_CACHE=%q\n' "${HF_HUB_CACHE:-}"
		printf 'HF_HUB_OFFLINE=%q\n' "$HF_HUB_OFFLINE"
		printf 'BENCH_VLLM_KERNEL_CACHE_DIR=%q\n' "$kernel_cache_dir"
		if [ -n "$kernel_cache_dir" ]; then
			printf 'HOME=%q\n' "${kernel_cache_dir}/home"
			printf 'TRITON_CACHE_DIR=%q\n' "${kernel_cache_dir}/triton"
			printf 'VLLM_CACHE_ROOT=%q\n' "${kernel_cache_dir}/vllm"
			printf 'XDG_CACHE_HOME=%q\n' "${kernel_cache_dir}/xdg"
		fi
	)"
	client_env_snapshot="$(
		printf 'OMP_NUM_THREADS=%q\n' "${NUM_CPU_PHYSICAL_CORES:-1}"
		printf 'HF_HUB_OFFLINE=%q\n' "$HF_HUB_OFFLINE"
	)"
	# Group trials by the complete serving and client configuration, not just client flags.
	signature="$(
		printf '%s\0' "$server_env_snapshot" "$client_env_snapshot" \
			-- "${server_env[@]}" -- "${server_args[@]}" -- "${benchmark_args[@]}" |
			sha256sum | cut -c1-16
	)"
	trial=1
	while [ -e "${native_results_dir}/${signature}-${trial}.json" ] ||
		[ -e "${native_results_dir}/${signature}-${trial}.server.log" ] ||
		[ -e "${native_results_dir}/${signature}-${trial}.client.log" ]; do
		trial=$((trial + 1))
	done
	result="${signature}-${trial}"
	server_log="${native_results_dir}/${result}.server.log"
	native_args=(
		--save-result
		--save-detailed
		--result-dir "$native_results_dir"
		--result-filename "${result}.json"
		--metadata
		"model_revision=${revision}"
		"gpu_count=${num_gpus}"
		"kv_cache_dtype=fp8"
		"block_size=32"
		"max_model_len=32768"
		"max_num_seqs=16"
		"kv_cache_memory_bytes=48G"
	)

	write_argv "${native_results_dir}/${result}.server.argv" "${server_args[@]}"
	write_argv "${native_results_dir}/${result}.client.argv" \
		"${benchmark_args[@]}" "${native_args[@]}"
	printf '%s\n' "$server_env_snapshot" >"${native_results_dir}/${result}.server.env"
	printf '%s\n' "$client_env_snapshot" >"${native_results_dir}/${result}.client.env"
	"$vllm_bin" --version >"${native_results_dir}/${result}.vllm.version.txt" 2>&1 || true
else
	server_log="${log_file}.server"
fi

# Isolate the complete vLLM process tree so every exit path can signal the API server, engine,
# workers, and compiler children together instead of leaving orphaned GPU processes behind.
setsid "${server_env[@]}" "${server_args[@]}" >"$server_log" 2>&1 &
server_pid=$!

# Start the wall-clock guard before the first health probe. A curl timeout cannot protect against
# process-creation starvation when a cold CUDA build consumes the sandbox's CPU and memory budget.
# This independent process group can still signal the server when the polling shell is delayed, and
# can be cancelled as one unit without leaving its timer behind.
# shellcheck disable=SC2016 # Positional parameters expand in the child bash, not this shell.
setsid bash -c '
	trap - EXIT HUP INT TERM
	sleep "$1"
	if kill -0 "$2" 2>/dev/null; then
		echo "ERROR: hard readiness watchdog stopping vLLM after ${1}s" >&2
		kill -TERM -- "-$2" 2>/dev/null || true
		sleep 5
		kill -KILL -- "-$2" 2>/dev/null || true
	fi
' _ "$ready_timeout_seconds" "$server_pid" &
readiness_watchdog_pid=$!

# Detect a failed engine immediately and keep model initialization outside the timed client run.
echo "Starting vLLM server (readiness deadline: ${ready_timeout_seconds}s)"
ready=0
ready_started="$SECONDS"
while [ "$((SECONDS - ready_started))" -lt "$ready_timeout_seconds" ]; do
	# A vLLM process can bind port 8000 before the engine is ready. Bound each probe so a
	# connected-but-unresponsive socket cannot bypass the outer readiness deadline.
	if curl --connect-timeout 1 --max-time 2 -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
		ready=1
		break
	fi
	if ! kill -0 "$server_pid" 2>/dev/null; then
		echo "ERROR: vLLM server exited during startup" >&2
		tail -n 200 "$server_log" >&2 || true
		exit 1
	fi
	sleep 2
done
if [ "$ready" -ne 1 ]; then
	echo "ERROR: vLLM server did not become ready within ${ready_timeout_seconds}s" >&2
	tail -n 200 "$server_log" >&2 || true
	exit 1
fi
stop_readiness_watchdog
echo "vLLM server ready after $((SECONDS - ready_started))s; starting bounded client (${client_timeout_seconds}s)"

case "${BENCH_VLLM_PREPARE_KERNELS_ONLY:-0}" in
	0) ;;
	1)
		echo "Kernel-cache seed reached a healthy server; stopping before the timed client"
		status=0
		exit 0
		;;
	*)
		echo "ERROR: BENCH_VLLM_PREPARE_KERNELS_ONLY must be 0 or 1" >&2
		exit 1
		;;
esac

snapshot_metrics before
if OMP_NUM_THREADS="${NUM_CPU_PHYSICAL_CORES:-1}" \
	timeout --foreground --signal=TERM --kill-after=30s "${client_timeout_seconds}s" \
	"${benchmark_args[@]}" "${native_args[@]}" >"$log_file" 2>&1; then
	status=0
else
	status=$?
fi
snapshot_metrics after
if [ "$status" -eq 124 ]; then
	echo "ERROR: vLLM benchmark client exceeded ${client_timeout_seconds}s" >>"$log_file"
fi
if [ "$status" -ne 0 ]; then
	{
		echo
		echo "=== vLLM server tail ==="
		tail -n 200 "$server_log" || true
	} >>"$log_file"
fi
if [ -n "$native_results_dir" ] && [ -n "$result" ] && [ -f "$log_file" ]; then
	cp "$log_file" "${native_results_dir}/${result}.client.log" ||
		echo "WARNING: could not preserve vLLM client log" >&2
fi
exit "$status"
