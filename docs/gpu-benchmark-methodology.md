# GPU inference benchmark methodology

The GPU lane measures online coding-model inference in Modal gVisor sandboxes. It is intentionally
separate from the CPU sandbox leaderboard because its hardware, cost, and metrics are different.

## Fixed workload

- PTS profile: `local/vllm-speed-bench-1.0.0`
- Model: `Qwen/Qwen3-Coder-30B-A3B-Instruct-FP8` at a pinned Hugging Face revision
- Dataset: NVIDIA SPEED-Bench `qualitative` / `coding` at a pinned dataset revision, prepared by a
  checksum-pinned upstream script
- Server: vLLM 0.26.0 on Python 3.13 and its resolved PyTorch CUDA 13 wheel stack
- Image: digest-pinned `nvidia/cuda:13.3.1-devel-ubuntu24.04`
- Sandbox: one RTX PRO 6000, 8 vCPU, 96 GiB RAM, gVisor runtime
- Full client: 80 prompts, 1,024 output tokens, eight warmups, concurrency 16

The server uses TP=1 and PP=1, avoiding unsupported multi-GPU P2P and shared-memory transports. It
enables asynchronous scheduling, FP8 KV cache, safetensors prefetch, optimization level 2, and
`FULL_AND_PIECEWISE` CUDA graphs. A run is rejected unless its server log proves that eager execution
is disabled and graph capture completed.

## Cached inputs

Model weights and the prepared SPEED-Bench dataset live in a named Modal Volume. A CPU-only workflow
job populates the Volume incrementally, writes a manifest containing every immutable source revision,
and commits it before a GPU is allocated. Benchmark sandboxes mount it read-only with Hugging Face and
Transformers offline modes enabled.

Every Hugging Face download this repository issues is pinned to a full commit SHA — the model
weights, and the SPEED-Bench dataset itself, whose upstream preparation script otherwise reads the
default branch. Branch and tag names resolve at download time, so they could serve different weights
or different prompts on any run (CWE-494). The preparation script refuses to download anything pinned
to a mutable reference, verifies the cached model snapshot is the pinned commit, and re-derives the
dataset whenever the manifest on the Volume records different pins than the ones in force.

The prepared rows also cite external sources that the upstream script fetches. At the pinned dataset
revision the coding rows cite only commit-pinned ones, and the category filter runs before that
resolution — so no unpinned fetch is reachable, but that is a property of the pinned revision's
contents rather than a guarantee of the upstream script. Re-check it when refreshing the dataset pin,
alongside the coding-row count.

Blackwell kernel preparation is a separate idempotent GPU job. It starts the exact production server,
warms its compilation caches, verifies CUDA-graph capture, writes a configuration-keyed manifest, and
snapshots the sandbox filesystem. The benchmark starts directly from that immutable Modal image, with
an ephemeral writable overlay. A small registry Volume stores only the current snapshot ID and its
manifest; a mismatch fails before allocating benchmark GPUs.

Changing the model, dataset, local PTS profile, Python, vLLM, CUDA image, GPU selector, or serving
configuration invalidates the snapshot. Report-only changes do not.

## Replication and precision

The confirmatory workflow launches 20 independent Modal sandboxes concurrently through the shared
replicate pool. Each sandbox executes the fixed PTS workload once and writes to `replicates/rN/`.
Requests and warmups inside a sandbox are not treated as independent machines.

For each metric, the report computes the median of the 20 sandbox medians and a deterministic 95%
cluster percentile interval using 10,000 whole-sandbox bootstrap resamples. Output-token throughput is
the predeclared primary endpoint. Its precision gate requires all 20 allocations to complete and

```text
(upper - lower) / (2 * median) <= 0.005
```

The same interval is descriptive for request throughput, total-token throughput, TTFT, TPOT, and ITL.
A confidence interval for one configuration is not a significance test against another configuration;
comparisons require an independently replicated baseline and an interval or test of the difference.

PTS dynamic convergence is not used as a substitute for independent sandbox replication. The workflow
also has a separate lifecycle gate requiring every allocation to finish creation through artifact
collection within 300 seconds.

## Lifecycle and evidence

The GPU command uses the harness's shared process-level sandbox owner, including its pending-create
tracking and signal cleanup. Modal's adapter terminates with `wait: true` and verifies that the sandbox
ID disappears from provider inventory. A replicate counts as complete only after that verification.

The shared harness collector pulls the complete `benchmark-results/` tree with the same retry and
content-validation path as other benchmark suites. Each replicate retains PTS XML and metadata, native
vLLM JSON and argv, server/client logs, CUDA-graph evidence, pinned asset manifests, the resolved Python
environment, observed hardware/software metadata, and its lifecycle record. The aggregate artifact
contains the fleet summary, Markdown report, and SVG confidence-interval charts.

## References

- [Modal Sandbox filesystem snapshots](https://modal.com/docs/guide/sandbox-snapshots)
- [Modal Volumes](https://modal.com/docs/guide/volumes)
- [Modal GPU selection](https://modal.com/docs/guide/gpu)
- [vLLM 0.26 serving benchmark CLI](https://docs.vllm.ai/en/v0.26.0/cli/bench/serve/)
- [NVIDIA SPEED-Bench](https://huggingface.co/datasets/nvidia/SPEED-Bench)
- [Qwen3 Coder 30B-A3B FP8](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct-FP8)
